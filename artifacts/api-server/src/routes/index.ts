import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import incomeRouter from "./income";
import expensesRouter from "./expenses";
import budgetsRouter from "./budgets";
import savingsRouter from "./savings";
import dashboardRouter from "./dashboard";
import loansRouter from "./loans";
import notesRouter from "./notes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

router.use(requireAuth);

router.use(categoriesRouter);
router.use(incomeRouter);
router.use(expensesRouter);
router.use(budgetsRouter);
router.use(savingsRouter);
router.use(dashboardRouter);
router.use(loansRouter);
router.use(notesRouter);

export default router;
