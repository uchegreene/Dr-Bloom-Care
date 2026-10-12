import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
const output = "node_modules/.cache/bloom-care.test.cjs";
await mkdir("node_modules/.cache", { recursive: true });
await build({
  entryPoints: ["test/care.test.ts"], outfile: output, bundle: true,
  platform: "node", format: "cjs", external: ["pg-native"], logLevel: "warning",
});
// Node's --test discovery excludes node_modules; node:test also runs directly.
const result = spawnSync(process.execPath, [output], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
