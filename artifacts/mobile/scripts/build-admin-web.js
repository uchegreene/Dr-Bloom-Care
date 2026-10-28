// Admin browsers need a web export; the existing native bundles/landing page stay unchanged.
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const result = spawnSync("pnpm", ["exec", "expo", "export", "--platform", "web", "--output-dir", "admin-web-build"], {
  cwd: path.resolve(__dirname, ".."),
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
    EXPO_PUBLIC_API_BASE_URL: "",
    EXPO_PUBLIC_CLERK_PROXY_URL: "https://admin.drbloomcare.com/api/__clerk",
  },
});
process.exitCode = result.status ?? 1;
