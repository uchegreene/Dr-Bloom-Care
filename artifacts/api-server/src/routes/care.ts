import { Router, type IRouter, type ErrorRequestHandler } from "express";
import { requireBloomProfile, requireBloomAdmin } from "../middlewares/bloomAuth";
import { MedicalError } from "../lib/medicalAccess";
import communityRouter from "./community";
import medicalRouter from "./medical";
import medicalTeamRouter from "./medicalTeam";

const router: IRouter = Router();
router.use(["/community", "/medical", "/admin/medical-team"], (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

for (const child of [communityRouter, medicalRouter]) {
  child.param("id", (_req, res, next, value) => {
    if (!Number.isSafeInteger(Number(value)) || Number(value) < 1) {
      res.status(400).json({ error: "Invalid record ID." });
      return;
    }
    next();
  });
}
router.use("/community", requireBloomProfile, communityRouter);
router.use("/medical", requireBloomProfile, medicalRouter);
router.use("/admin/medical-team", requireBloomAdmin, medicalTeamRouter);

const handleError: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) { next(error); return; }
  if (error instanceof MedicalError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  // Never log private message contents or query parameters from DB errors.
  req.log?.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "Care request failed");
  res.status(500).json({ error: "Unable to complete this request. Please try again." });
};
router.use(handleError);
export default router;
