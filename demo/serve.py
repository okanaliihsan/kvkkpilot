"""Yerel önizleme sunucusu: Vercel'in cleanUrls davranışını taklit eder."""
import http.server, os, sys

ROOT = sys.argv[1]
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8790


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a):
        pass

    def do_GET(self):
        path = self.path.split("?")[0].split("#")[0]
        if path.startswith("/api/ai"):
            body = b'{"ai":false,"provider":null}'
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path in ("/", ""):
            self.path = "/index.html"
        elif not os.path.splitext(path)[1] and os.path.exists(os.path.join(ROOT, path.lstrip("/") + ".html")):
            self.path = path + ".html"
        return super().do_GET()


http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
