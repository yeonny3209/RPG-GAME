# 개발용 로컬 서버: 브라우저가 옛 파일을 캐시하지 않도록 no-store 헤더를 붙인다
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCacheHandler).serve_forever()
