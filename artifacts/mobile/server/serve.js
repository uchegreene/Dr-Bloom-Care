/**
 * Standalone production server for Expo static builds.
 *
 * Browser requests open the exported web app on both member and admin domains.
 * Preserve native Expo manifest requests for development/native clients:
 * - GET / or /manifest with expo-platform header → platform manifest JSON
 * Web assets come from admin-web-build/; native assets from static-build/.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const ADMIN_WEB_ROOT = path.resolve(__dirname, "..", "admin-web-build");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

// Fail the deployment health check instead of accepting traffic with a missing portal.
if (!fs.existsSync(path.join(ADMIN_WEB_ROOT, "index.html"))) {
  throw new Error("Admin web export is missing from the deployment. Run the complete mobile build and include admin-web-build in the published image.");
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveStaticFile(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "content-type": contentType });
  res.end(content);
}

function serveWebApp(pathname, res) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { res.writeHead(400); return res.end("Invalid path"); }
  const candidate = path.resolve(ADMIN_WEB_ROOT, "." + decoded);
  if (!candidate.startsWith(ADMIN_WEB_ROOT + path.sep) && candidate !== ADMIN_WEB_ROOT) {
    res.writeHead(403); return res.end("Forbidden");
  }
  const staticFile = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : null;
  const file = staticFile || (path.extname(decoded) ? null : path.join(ADMIN_WEB_ROOT, "index.html"));
  if (!file) return serveStaticFile(decoded, res);
  res.setHeader("Cache-Control", "no-store");
  res.writeHead(200, { "content-type": MIME_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
  return res.end(fs.readFileSync(file));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;
  const hostname = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().split(":")[0].toLowerCase().replace(/\.$/, "");
  if (hostname === "admin.drbloomcare.com") {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Cache-Control", "no-store");
    if (pathname === "/sign-up" || pathname === "/(auth)/sign-up") {
      res.writeHead(302, { Location: "/sign-in" });
      return res.end();
    }
    return serveWebApp(pathname, res);
  }

  if (basePath && (pathname === basePath || pathname.startsWith(basePath + "/"))) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, res);
    }

    if (pathname === "/manifest") { res.writeHead(404); return res.end("Native platform required"); }
  }

  serveWebApp(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
if (require.main === module) {
  server.listen(port, "0.0.0.0", () => {
    console.log(`Serving Dr Bloom Care web app and native assets on port ${port}`);
  });
}
module.exports = server;
