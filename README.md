<img src="assets/icon.svg" width="64" height="64" alt="">

# screw-claude

Created in [T3 Code](https://t3.codes).

## UI prototype

Run the dependency-free, UI-only prototype:

```sh
python3 ui-prototype/server.py
```

Open `http://127.0.0.1:4173` for the refined Focus layout: C's centered design with D's copy, one clear scan button, outline icons, readable text, and plain open content sections. The bottom arrows cycle through seven sample states. Add `?review=1` to compare all five designs, or `?review=0` to hide preview controls. A (Paper), B (Console), D (Overview), and E (Report) remain available at their `?variant=` URLs. Chinese is available at `/zh/` and Russian at `/ru/`. The language links preserve the selected design, sample state, appearance, and section.

The prototype uses sample data only. See [prototype notes](ui-prototype/NOTES.md) for design URLs and the temporary tailnet preview command.
