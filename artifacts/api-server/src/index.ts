import app from "./app";
import { logger } from "./lib/logger";
import { startDailyTipWorker } from "./jobs/dailyTips";
import { ensureSuperAdminIdentity } from "./lib/superAdminBootstrap";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Development and production have separate identity stores. Run this in the
// deployed service, not by trying to copy a development user into production.
try {
  const state = await ensureSuperAdminIdentity(process.env.SUPER_ADMIN_EMAIL);
  if (state === "not_configured") {
    logger.warn("SUPER_ADMIN_EMAIL is not configured; no super administrator was provisioned.");
  } else {
    logger.info({ state }, "Super administrator identity bootstrap completed");
  }
} catch {
  // Do not publish a seemingly healthy replacement whose owner cannot sign in.
  // Avoid logging provider request payloads, which can include credentials.
  logger.fatal("Super administrator identity bootstrap failed. Check SUPER_ADMIN_EMAIL and the authentication service. Existing identities were not changed.");
  process.exit(1);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startDailyTipWorker();
});
