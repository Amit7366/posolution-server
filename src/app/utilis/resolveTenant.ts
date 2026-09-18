import httpStatus from "http-status";
import AppError from "../errors/AppError";

const PLATFORM_ROLES = new Set(["superAdmin", "admin"]);

export const isPlatformRole = (role: unknown): boolean =>
  typeof role === "string" && PLATFORM_ROLES.has(role);

export const resolveTenantId = (req: any) => {
  const role = req.user?.role;

  if (isPlatformRole(role) && req.query?.tenantId) {
    return String(req.query.tenantId);
  }

  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new AppError(httpStatus.BAD_REQUEST, "tenantId is required");
  return String(tenantId);
};
