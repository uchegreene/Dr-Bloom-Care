// One web export serves member and admin browsers; native bundles stay separate.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const result = spawnSync("pnpm", ["exec", "expo", "export", "--platform", "web", "--output-dir", "admin-web-build"], {
  cwd: path.resolve(__dirname, ".."),
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
    EXPO_PUBLIC_API_BASE_URL: "",
    EXPO_PUBLIC_CLERK_PROXY_URL: "/api/__clerk",
  },
});
process.exitCode = result.status ?? 1;
if (process.exitCode === 0) {
  const output = path.resolve(__dirname, "..", "admin-web-build");
  const html = fs.readFileSync(path.join(output, "index.html"), "utf8");
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)];
  if (!scripts.length) throw new Error("Admin web export has no application scripts.");
  for (const [, src] of scripts) {
    const asset = path.resolve(output, "." + new URL(src, "https://admin.drbloomcare.com").pathname);
    if (!asset.startsWith(output + path.sep) || !fs.existsSync(asset)) {
      throw new Error("Admin web export is missing an application script.");
    }
  }
  console.log("Admin web export verified for production packaging.");
}
