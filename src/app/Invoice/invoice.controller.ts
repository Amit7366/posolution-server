import httpStatus from "http-status";
import catchAsync from "../utilis/catchAsync";
import sendResponse from "../utilis/sendResponse";
import { resolveTenantId } from "../utilis/resolveTenant";
import { InvoiceService } from "./invoice.service";

export const InvoiceController = {
  create: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await InvoiceService.createIntoDB(req.body, req.user, tenantId);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Invoice created",
      data: result,
    });
  }),

  getAll: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const q = req.query as Record<string, string | undefined>;
    const result = await InvoiceService.getAllFromDB(tenantId, {
      page: q.page ? Number(q.page) : undefined,
      limit: q.limit ? Number(q.limit) : undefined,
      search: q.search,
      status: (q.status as "all" | "paid" | "unpaid" | "overdue" | "due") || "all",
      since: q.since,
      customer: q.customer,
    });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Invoices",
      data: result.data,
      meta: result.meta,
    });
  }),

  getSingle: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await InvoiceService.getSingleFromDB(req.params.id, tenantId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Invoice",
      data: result,
    });
  }),

  update: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await InvoiceService.updateIntoDB(req.params.id, tenantId, req.body, req.user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Invoice updated",
      data: result,
    });
  }),

  collect: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await InvoiceService.collectDueIntoDB(
      req.params.id,
      tenantId,
      req.body,
      req.user
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Due collected",
      data: result,
    });
  }),

  getCollections: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await InvoiceService.getCollectionsFromDB(req.params.id, tenantId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Due collections",
      data: result,
    });
  }),

  remove: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await InvoiceService.deleteIntoDB(req.params.id, tenantId, req.user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Invoice deleted",
      data: result,
    });
  }),
};
