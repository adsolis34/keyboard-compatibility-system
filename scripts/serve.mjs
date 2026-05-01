import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT ?? 5173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".map": "application/json; charset=utf-8",
};

function resolveRequestPath(url) {
  const cleanUrl = decodeURIComponent(new URL(url, `http://127.0.0.1:${port}`).pathname);
  const requestedPath = cleanUrl === "/" ? "/index.html" : cleanUrl;
  const fullPath = resolve(join(root, normalize(requestedPath)));

  if (!fullPath.startsWith(root)) {
    return null;
  }

  return fullPath;
}

const server = createServer((request, response) => {
  const fullPath = resolveRequestPath(request.url);

  if (!fullPath || !existsSync(fullPath) || statSync(fullPath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(fullPath)] ?? "application/octet-stream",
  });
  createReadStream(fullPath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Keyboard Compatibility System running at http://127.0.0.1:${port}`);
});
