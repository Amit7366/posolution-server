import { Router } from "express";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { USER_ROLE } from "../User/user.constant";
import { DashboardController } from "./dashboard.controller";
import {
  dashboardProfitLossQuerySchema,
  dashboardSummaryQuerySchema,
} from "./dashboard.validation";

const router = Router();

const readers = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.get(
  "/summary",
  auth(...readers),
  validateRequest(dashboardSummaryQuerySchema),
  DashboardController.summary
);

router.get(
  "/profit-loss",
  auth(...readers),
  validateRequest(dashboardProfitLossQuerySchema),
  DashboardController.profitLoss
);

export const DashboardRoutes = router;
