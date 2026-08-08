import { Router } from "express";
import { CustomerController } from "./customer.controller";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdParamSchema,
  getCustomerListQuerySchema,
} from "./customer.validation";
import { USER_ROLE } from "../User/user.constant";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const customerAccess = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.post(
  "/",
  auth(...customerAccess),
  validateRequest(createCustomerSchema),
  CustomerController.create
);

router.get(
  "/",
  auth(...customerAccess),
  validateRequest(getCustomerListQuerySchema),
  CustomerController.getAll
);

router.get(
  "/:id/summary",
  auth(...customerAccess),
  validateRequest(customerIdParamSchema),
  CustomerController.getSummary
);

router.get(
  "/:id",
  auth(...customerAccess),
  validateRequest(customerIdParamSchema),
  CustomerController.getSingle
);

router.patch(
  "/:id",
  auth(...customerAccess),
  validateRequest(updateCustomerSchema),
  CustomerController.update
);

router.delete(
  "/:id",
  auth(...customerAccess),
  validateRequest(customerIdParamSchema),
  CustomerController.remove
);

export const CustomerRoutes = router;
