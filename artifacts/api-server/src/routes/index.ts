import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bloomRouter from "./bloom";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bloomRouter);

export default router;
