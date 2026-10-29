const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("member and admin browsers get the web app, while native manifests and assets still work", async t => {
  const root = path.resolve(__dirname, "..");
  const files = new Map([
    [path.join(root, "admin-web-build/index.html"), '<html><body>Dr Bloom Care web app<script src="/_expo/web-test.js"></script></body></html>'],
    [path.join(root, "admin-web-build/_expo/web-test.js"), "/* web app fixture */"],
    [path.join(root, "static-build/ios/manifest.json"), '{"id":"native-ios-fixture"}'],
    [path.join(root, "static-build/android/manifest.json"), '{"id":"native-android-fixture"}'],
    [path.join(root, "static-build/assets/native-test.hbc"), "native-bundle-fixture"],
  ]);
  const originals = { existsSync: fs.existsSync, readFileSync: fs.readFileSync, statSync: fs.statSync };
  fs.existsSync = filename => files.has(String(filename)) ||
    (!String(filename).startsWith(path.join(root, "admin-web-build")) && originals.existsSync(filename));
  fs.readFileSync = (filename, ...args) => files.has(String(filename))
    ? (args[0] ? files.get(String(filename)) : Buffer.from(files.get(String(filename))))
    : originals.readFileSync(filename, ...args);
  fs.statSync = filename => files.has(String(filename))
    ? { isFile: () => true, isDirectory: () => false }
    : originals.statSync(filename);
  const server = require("../server/serve.js");
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    Object.assign(fs, originals);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (route, hostname = "drbloomcare.com", headers = {}) =>
    fetch(origin + route, { headers: { "x-forwarded-host": hostname, ...headers }, redirect: "manual" });
  for (const route of ["/", "/sign-in", "/sign-up", "/onboarding", "/pregnancy"]) {
    const response = await request(route);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Dr Bloom Care web app/);
    assert.match(response.headers.get("content-type"), /text\/html/);
  }
  const webScript = await request("/_expo/web-test.js");
  assert.match(webScript.headers.get("content-type"), /javascript/);
  assert.match(await webScript.text(), /web app fixture/);
  assert.equal((await request("/missing-script.js")).status, 404);
  const admin = await request("/", "admin.drbloomcare.com");
  assert.equal(admin.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(await admin.text(), /Dr Bloom Care web app/);
  for (const route of ["/sign-up", "/(auth)/sign-up"]) {
    const blocked = await request(route, "admin.drbloomcare.com");
    assert.equal(blocked.status, 302);
    assert.equal(blocked.headers.get("location"), "/sign-in");
  }
  for (const platform of ["ios", "android"]) {
    for (const route of ["/", "/manifest"]) {
      const native = await request(route, "drbloomcare.com", { "expo-platform": platform });
      assert.equal(native.status, 200);
      assert.equal((await native.json()).id, `native-${platform}-fixture`);
    }
  }
  assert.equal(await (await request("/assets/native-test.hbc")).text(), "native-bundle-fixture");
  assert.equal((await request("/manifest")).status, 404);
  assert.equal((await request("/%2e%2e%2fprivate.txt")).status, 403);
});
