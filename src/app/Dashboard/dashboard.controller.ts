import httpStatus from "http-status";
import catchAsync from "../utilis/catchAsync";
import sendResponse from "../utilis/sendResponse";
import { resolveTenantId } from "../utilis/resolveTenant";
import { DashboardService, type ChartRange, type ProfitLossPreset } from "./dashboard.service";

export const DashboardController = {
  summary: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const q = req.query as Record<string, string | undefined>;
    const chartRange = (q.chartRange as ChartRange) || "1W";
    const allowed: ChartRange[] = ["1D", "1W", "1M", "3M", "6M", "1Y"];
    const range = allowed.includes(chartRange) ? chartRange : "1W";
    const result = await DashboardService.getSummary(tenantId, range);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Dashboard summary",
      data: result,
    });
  }),

  profitLoss: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const q = req.query as Record<string, string | undefined>;
    const preset = (q.preset as ProfitLossPreset) || "1D";
    const result = await DashboardService.getProfitLoss(tenantId, {
      preset,
      from: q.from,
      to: q.to,
    });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Profit & loss report",
      data: result,
    });
  }),
};
