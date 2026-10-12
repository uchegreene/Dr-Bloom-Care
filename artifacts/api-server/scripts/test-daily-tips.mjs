import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const output = "node_modules/.cache/daily-tips.test.cjs";
await mkdir("node_modules/.cache", { recursive: true });
await build({
  entryPoints: ["test/dailyTips.test.ts"], outfile: output, bundle: true,
  platform: "node", format: "cjs", external: ["pg-native"], logLevel: "warning",
  alias: {
    "@workspace/integrations-gemini-ai/batch": resolve("../../lib/integrations-gemini-ai/src/batch/index.ts"),
    "@clerk/express": resolve("test/dailyTipsFixtures.ts"),
    "@workspace/integrations-gemini-ai": resolve("test/dailyTipsFixtures.ts"),
  },
});
const schema = `tip_test_${randomUUID().replaceAll("-", "")}`;
const result = spawnSync(process.execPath, [output], { stdio: "inherit", env: {
  ...process.env, NODE_ENV: "production", PGOPTIONS: `-c search_path=${schema},public`, TIP_TEST_SCHEMA: schema,
} });
process.exitCode = result.status ?? 1;
