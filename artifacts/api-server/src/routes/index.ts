import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import incomeRouter from "./income";
import expensesRouter from "./expenses";
import budgetsRouter from "./budgets";
import savingsRouter from "./savings";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(incomeRouter);
router.use(expensesRouter);
router.use(budgetsRouter);
router.use(savingsRouter);
router.use(dashboardRouter);

export default router;
