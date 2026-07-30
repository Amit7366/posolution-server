import { Router } from "express";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { USER_ROLE } from "../User/user.constant";

import { ProductController } from "./product.controller";
import { createProductSchema, updateProductSchema, productIdParamSchema, getProductListQuerySchema } from "./product.validation";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const productWriters = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];
const productReaders = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.post(
  "/",
  auth(...productWriters),
  validateRequest(createProductSchema),
  ProductController.create
);

router.get(
  "/",
  auth(...productReaders),
  validateRequest(getProductListQuerySchema),
  ProductController.getAll
);

router.get(
  "/:id",
  auth(...productReaders),
  validateRequest(productIdParamSchema),
  ProductController.getSingle
);

router.patch(
  "/:id",
  auth(...productWriters),
  validateRequest(updateProductSchema),
  ProductController.update
);

router.delete(
  "/:id",
  auth(...productWriters),
  validateRequest(productIdParamSchema),
  ProductController.remove
);

export const ProductRoutes = router;
