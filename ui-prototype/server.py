"""Throwaway, dependency-free UI prototype. Run: python3 ui-prototype/server.py"""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import gzip
import io


class PrototypeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = Path(self.translate_path(self.path))
        if path.is_dir():
            if not self.path.split("?", 1)[0].endswith("/"):
                return super().send_head()
            path = path / "index.html"
        if path.suffix in {".html", ".css", ".js", ".svg"} and "gzip" in self.headers.get("Accept-Encoding", "") and path.is_file():
            data = gzip.compress(path.read_bytes(), mtime=0)
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(str(path)))
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Vary", "Accept-Encoding")
            self.end_headers()
            return io.BytesIO(data)
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404)
        return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    handler = partial(PrototypeHandler, directory=str(root))
    print(f"UI prototype: http://127.0.0.1:{args.port}", flush=True)
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        server.serve_forever()
