import httpStatus from "http-status";
import catchAsync from "../utilis/catchAsync";
import sendResponse from "../utilis/sendResponse";
import { resolveTenantId } from "../utilis/resolveTenant";
import { PurchaseReturnService } from "./purchaseReturn.service";

export const PurchaseReturnController = {
  create: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await PurchaseReturnService.createIntoDB(req.body, req.user, tenantId);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Purchase return created",
      data: result,
    });
  }),

  getAll: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const q = req.query as Record<string, string | undefined>;
    const result = await PurchaseReturnService.getAllFromDB(tenantId, {
      page: q.page ? Number(q.page) : undefined,
      limit: q.limit ? Number(q.limit) : undefined,
      search: q.search,
      returnStatus: (q.returnStatus as "all" | "pending" | "received") || "all",
      paymentStatus: (q.paymentStatus as "all" | "paid" | "unpaid" | "overdue") || "all",
      since: q.since,
      supplier: q.supplier,
    });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase returns",
      data: result.data,
      meta: result.meta,
    });
  }),

  getSingle: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await PurchaseReturnService.getSingleFromDB(req.params.id, tenantId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase return",
      data: result,
    });
  }),

  update: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await PurchaseReturnService.updateIntoDB(
      req.params.id,
      tenantId,
      req.body,
      req.user
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase return updated",
      data: result,
    });
  }),

  remove: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await PurchaseReturnService.deleteIntoDB(
      req.params.id,
      tenantId,
      req.user
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase return deleted",
      data: result,
    });
  }),
};
