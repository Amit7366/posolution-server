// supplier.controller.ts
import catchAsync from "../utilis/catchAsync";
import sendResponse from "../utilis/sendResponse";
import httpStatus from "http-status";
import { SupplierService } from "./supplier.service";
import AppError from "../errors/AppError";
import { resolveTenantId } from "../utilis/resolveTenant";


const createSupplier = catchAsync(async (req, res) => {
  const tenantId = resolveTenantId(req);

  const result = await SupplierService.createSupplierIntoDB(
    req.body,
    req.user,
    tenantId
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Supplier created successfully",
    data: result,
  });
});

const getAllSuppliers = catchAsync(async (req, res) => {
  const tenantId = resolveTenantId(req);
  const q = req.query as Record<string, string | undefined>;

  const result = await SupplierService.getAllSuppliersFromDB(tenantId, {
    search: q.search,
    status: q.status,
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Suppliers retrieved",
    data: result,
  });
});

const getSupplier = catchAsync(async (req, res) => {
  const tenantId = resolveTenantId(req);

  const result = await SupplierService.getSupplierFromDB(
    req.params.supplierId,
    tenantId
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Supplier retrieved",
    data: result,
  });
});

const getSummary = catchAsync(async (req, res) => {
  const tenantId = resolveTenantId(req);

  const result = await SupplierService.getSummaryFromDB(
    req.params.supplierId,
    tenantId
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Supplier summary",
    data: result,
  });
});

const updateSupplier = catchAsync(async (req, res) => {
  const tenantId = resolveTenantId(req);

  const result = await SupplierService.updateSupplierIntoDB(
    req.params.supplierId,
    tenantId,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Supplier updated",
    data: result,
  });
});

const deleteSupplier = catchAsync(async (req, res) => {
  const tenantId = resolveTenantId(req);

  const result = await SupplierService.deleteSupplierFromDB(
    req.params.supplierId,
    tenantId
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Supplier deleted",
    data: result,
  });
});

export const SupplierController = {
  createSupplier,
  getAllSuppliers,
  getSupplier,
  getSummary,
  updateSupplier,
  deleteSupplier,
};
