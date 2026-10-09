#!/usr/bin/env python3
"""Regenerate the local Chinese font subsets from Noto Sans SC (OFL).

The app ships its own small CJK subset so the Chinese UI renders on machines
without system CJK fonts. The subset must cover every Chinese character the
shipped copy can display, so this script collects the inventory from the
sources, instances the upstream variable font at weight 400 and writes:

    fonts/ui-cjk.ttf         family 'Prototype CJK'  (styles.css, variants A/B)
    taste-assets/cjk.woff2   family 'Taste CJK'      (variants C/D/E, the live app)

Run it whenever Chinese copy changes. Maintenance only: it needs network access
plus fontTools, and it is not part of `npm run check`.

    sfw pip install --target /tmp/pylibs fonttools brotli
    curl -sSLo /tmp/NotoSansSC.ttf \
      'https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf'
    python3 tools/subset-cjk.py --source /tmp/NotoSansSC.ttf
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Every file that can contribute Chinese text to a rendered page.
COPY_SOURCES = [
    'src/content/locales.ts',
    'src/content/commands.ts',
    'src/content/site.ts',
    'src/ui/render.ts',
    'app.js',
    'taste-variants.js',
    'zh/index.html',
]

# CJK ideographs, CJK punctuation and fullwidth forms, plus the symbols the
# English copy uses that DejaVu-style fallbacks often lack.
RANGES = [
    (0x2E80, 0x2EFF),
    (0x3000, 0x303F),
    (0x3400, 0x4DBF),
    (0x4E00, 0x9FFF),
    (0xFF00, 0xFFEF),
]
EXTRA = '±×≈→—·…'

OUTPUTS = [
    ('fonts/ui-cjk.ttf', 'truetype'),
    ('taste-assets/cjk.woff2', 'woff2'),
]


def in_range(code: int) -> bool:
    return any(low <= code <= high for low, high in RANGES)


def collect_inventory() -> set[str]:
    characters: set[str] = set()
    for relative in COPY_SOURCES:
        path = ROOT / relative
        if not path.exists():
            raise SystemExit(f'missing copy source: {relative}')
        for character in path.read_text(encoding='utf8'):
            if in_range(ord(character)) or character in EXTRA:
                characters.add(character)
    return characters


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, help='path to the variable Noto Sans SC TTF')
    parser.add_argument('--pythonpath', default='/tmp/pylibs', help='where fontTools is installed')
    parser.add_argument('--weight', type=int, default=400, help='instance weight to subset')
    parser.add_argument('--check', action='store_true', help='only report the inventory size')
    arguments = parser.parse_args()

    sys.path.insert(0, arguments.pythonpath)
    try:
        from fontTools import subset
        from fontTools.ttLib import TTFont
        from fontTools.varLib import instancer
    except ImportError as error:  # pragma: no cover - maintenance path
        raise SystemExit(
            f'fontTools is not importable from {arguments.pythonpath}; '
            f'run `sfw pip install --target {arguments.pythonpath} fonttools brotli`',
        ) from error

    inventory = collect_inventory()
    print(f'inventory: {len(inventory)} characters from {len(COPY_SOURCES)} sources')
    if arguments.check:
        return 0

    source = pathlib.Path(arguments.source)
    if not source.exists():
        raise SystemExit(f'source font not found: {source}')

    with tempfile.TemporaryDirectory() as workspace:
        workspace_path = pathlib.Path(workspace)
        text_file = workspace_path / 'characters.txt'
        text_file.write_text(''.join(sorted(inventory)), encoding='utf8')

        instance_path = workspace_path / 'instance.ttf'
        font = TTFont(source)
        if 'fvar' in font:
            axes = {axis.axisTag: arguments.weight for axis in font['fvar'].axes if axis.axisTag == 'wght'}
            font = instancer.instantiateVariableFont(font, axes, inplace=False, updateFontNames=False)
        font.save(instance_path)
        print(f'instanced {source.name} at wght={arguments.weight}')

        for relative, flavor in OUTPUTS:
            target = ROOT / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            options = [
                str(instance_path),
                f'--text-file={text_file}',
                f'--output-file={target}',
                '--layout-features=*',
                '--glyph-names',
                '--symbol-cmap',
                '--legacy-cmap',
                '--notdef-glyph',
                '--notdef-outline',
                '--recommended-glyphs',
                '--name-IDs=*',
                '--name-legacy',
                '--name-languages=*',
            ]
            if flavor != 'truetype':
                options.append(f'--flavor={flavor}')
            subset.main(options)
            size = target.stat().st_size
            print(f'wrote {relative} ({size // 1024} KB)')

            written = TTFont(target)
            codepoints = set(written.getBestCmap())
            missing = sorted(character for character in inventory if ord(character) not in codepoints)
            if missing:
                raise SystemExit(f'{relative} is missing {len(missing)} characters: {"".join(missing[:20])}')

            expected_flavor = 'woff2' if flavor == 'woff2' else None
            detected = 'woff2' if written.flavor == 'woff2' else ('woff' if written.flavor == 'woff' else None)
            if detected != expected_flavor:
                raise SystemExit(f'{relative} has the wrong flavour: {detected or "truetype"}')

    print('subsets cover the full Chinese inventory')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
