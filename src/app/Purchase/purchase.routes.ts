import { Router } from "express";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";
import { USER_ROLE } from "../User/user.constant";
import { PurchaseController } from "./purchase.controller";
import {
  createPurchaseSchema,
  updatePurchaseSchema,
  purchaseIdParamSchema,
  getPurchaseListQuerySchema,
  payDueSchema,
} from "./purchase.validation";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const writers = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];
const readers = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.post("/", auth(...writers), validateRequest(createPurchaseSchema), PurchaseController.create);
router.get(
  "/",
  auth(...readers),
  validateRequest(getPurchaseListQuerySchema),
  PurchaseController.getAll
);
router.post("/:id/pay", auth(...writers), validateRequest(payDueSchema), PurchaseController.pay);
router.get(
  "/:id/payments",
  auth(...readers),
  validateRequest(purchaseIdParamSchema),
  PurchaseController.getPayments
);
router.get(
  "/:id",
  auth(...readers),
  validateRequest(purchaseIdParamSchema),
  PurchaseController.getSingle
);
router.patch(
  "/:id",
  auth(...writers),
  validateRequest(updatePurchaseSchema),
  PurchaseController.update
);
router.delete(
  "/:id",
  auth(...writers),
  validateRequest(purchaseIdParamSchema),
  PurchaseController.remove
);

export const PurchaseRoutes = router;
