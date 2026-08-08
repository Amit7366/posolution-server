import { Router } from "express";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";
import { USER_ROLE } from "../User/user.constant";
import { InvoiceController } from "./invoice.controller";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceIdParamSchema,
  getInvoiceListQuerySchema,
  collectDueSchema,
} from "./invoice.validation";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const writers = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];
const readers = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.post("/", auth(...writers), validateRequest(createInvoiceSchema), InvoiceController.create);
router.get("/", auth(...readers), validateRequest(getInvoiceListQuerySchema), InvoiceController.getAll);
router.post(
  "/:id/collect",
  auth(...writers),
  validateRequest(collectDueSchema),
  InvoiceController.collect
);
router.get(
  "/:id/collections",
  auth(...readers),
  validateRequest(invoiceIdParamSchema),
  InvoiceController.getCollections
);
router.get("/:id", auth(...readers), validateRequest(invoiceIdParamSchema), InvoiceController.getSingle);
router.patch("/:id", auth(...writers), validateRequest(updateInvoiceSchema), InvoiceController.update);
router.delete("/:id", auth(...writers), validateRequest(invoiceIdParamSchema), InvoiceController.remove);

export const InvoiceRoutes = router;
