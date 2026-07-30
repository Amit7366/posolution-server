import { Request, Response, NextFunction } from "express";

/**
 * Tenant id must come from JWT (or superAdmin ?tenantId via resolveTenantId), never from the client body.
 */
export const stripSpoofedTenantFromBody = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (
    (req.method === "POST" || req.method === "PATCH" || req.method === "PUT") &&
    req.body &&
    typeof req.body === "object" &&
    "tenantId" in req.body
  ) {
    delete (req.body as { tenantId?: unknown }).tenantId;
  }
  next();
};
