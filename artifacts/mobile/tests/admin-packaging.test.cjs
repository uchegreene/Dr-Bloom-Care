const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../../..");

test("admin web output is excluded from Git but included in publishing", () => {
  const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
  const deploymentIgnore = fs.readFileSync(path.join(root, ".replitignore"), "utf8");
  assert.match(gitignore, /\/artifacts\/mobile\/admin-web-build\//);
  assert.doesNotMatch(deploymentIgnore, /^[^#\n]*admin-web-build/m);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "artifacts/mobile/package.json"), "utf8"));
  assert.match(pkg.scripts.build, /build\.js && node scripts\/build-admin-web\.js/);
});

test("production server fails before listening when admin export is absent", () => {
  const result = spawnSync(process.execPath, ["-e", `
    const fs = require("node:fs");
    const original = fs.existsSync;
    fs.existsSync = p => String(p).endsWith("admin-web-build/index.html") ? false : original(p);
    require(${JSON.stringify(path.join(root, "artifacts/mobile/server/serve.js"))});
  `], { cwd: path.join(root, "artifacts/mobile/server"), encoding: "utf8", timeout: 5000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Admin web export is missing from the deployment/);
});
