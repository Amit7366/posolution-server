import httpStatus from "http-status";
import catchAsync from "../utilis/catchAsync";
import sendResponse from "../utilis/sendResponse";
import { resolveTenantId } from "../utilis/resolveTenant";
import { PurchaseService } from "./purchase.service";

export const PurchaseController = {
  create: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await PurchaseService.createIntoDB(req.body, req.user, tenantId);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Purchase created",
      data: result,
    });
  }),

  getAll: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const q = req.query as Record<string, string | undefined>;
    const result = await PurchaseService.getAllFromDB(tenantId, {
      page: q.page ? Number(q.page) : undefined,
      limit: q.limit ? Number(q.limit) : undefined,
      search: q.search,
      status: (q.status as "all" | "paid" | "unpaid" | "overdue" | "due") || "all",
      since: q.since,
      supplier: q.supplier,
      supplierId: q.supplierId,
    });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchases",
      data: result.data,
      meta: result.meta,
    });
  }),

  getSingle: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await PurchaseService.getSingleFromDB(req.params.id, tenantId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase",
      data: result,
    });
  }),

  update: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await PurchaseService.updateIntoDB(
      req.params.id,
      tenantId,
      req.body,
      req.user
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase updated",
      data: result,
    });
  }),

  pay: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await PurchaseService.payDueIntoDB(
      req.params.id,
      tenantId,
      req.body,
      req.user
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase due paid",
      data: result,
    });
  }),

  getPayments: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await PurchaseService.getPaymentsFromDB(req.params.id, tenantId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase payments",
      data: result,
    });
  }),

  remove: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await PurchaseService.deleteIntoDB(req.params.id, tenantId, req.user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Purchase deleted",
      data: result,
    });
  }),
};
