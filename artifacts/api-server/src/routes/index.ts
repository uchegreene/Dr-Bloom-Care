import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bloomRouter from "./bloom";
import careRouter from "./care";
import dailyTipRouter from "./dailyTips";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bloomRouter);
router.use(careRouter);
router.use(dailyTipRouter);

export default router;
