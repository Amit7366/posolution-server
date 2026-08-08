import httpStatus from "http-status";

import { CustomerService } from "./customer.service";
import catchAsync from "../utilis/catchAsync";
import { resolveTenantId } from "../utilis/resolveTenant";
import sendResponse from "../utilis/sendResponse";

export const CustomerController = {
  create: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await CustomerService.createIntoDB(req.body, req.user, tenantId);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Customer created",
      data: result,
    });
  }),

  getAll: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await CustomerService.getAllFromDB(tenantId, req.query as any);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customer list",
      data: result.data,
      meta: result.meta,
    });
  }),

  getSingle: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await CustomerService.getSingleFromDB(req.params.id, tenantId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customer",
      data: result,
    });
  }),

  getSummary: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await CustomerService.getSummaryFromDB(req.params.id, tenantId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customer summary",
      data: result,
    });
  }),

  update: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await CustomerService.updateIntoDB(
      req.params.id,
      tenantId,
      req.body,
      req.user
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customer updated",
      data: result,
    });
  }),

  remove: catchAsync(async (req, res) => {
    const tenantId = resolveTenantId(req);
    const result = await CustomerService.deleteIntoDB(req.params.id, tenantId, req.user);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Customer deleted",
      data: result,
    });
  }),
};
