import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bloomRouter from "./bloom";
import careRouter from "./care";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bloomRouter);
router.use(careRouter);

export default router;
