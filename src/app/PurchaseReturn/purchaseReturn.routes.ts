import { Router } from "express";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";
import { USER_ROLE } from "../User/user.constant";
import { PurchaseReturnController } from "./purchaseReturn.controller";
import {
  createPurchaseReturnSchema,
  updatePurchaseReturnSchema,
  purchaseReturnIdParamSchema,
  getPurchaseReturnListQuerySchema,
} from "./purchaseReturn.validation";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const writers = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];
const readers = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.post(
  "/",
  auth(...writers),
  validateRequest(createPurchaseReturnSchema),
  PurchaseReturnController.create
);
router.get(
  "/",
  auth(...readers),
  validateRequest(getPurchaseReturnListQuerySchema),
  PurchaseReturnController.getAll
);
router.get(
  "/:id",
  auth(...readers),
  validateRequest(purchaseReturnIdParamSchema),
  PurchaseReturnController.getSingle
);
router.patch(
  "/:id",
  auth(...writers),
  validateRequest(updatePurchaseReturnSchema),
  PurchaseReturnController.update
);
router.delete(
  "/:id",
  auth(...writers),
  validateRequest(purchaseReturnIdParamSchema),
  PurchaseReturnController.remove
);

export const PurchaseReturnRoutes = router;
