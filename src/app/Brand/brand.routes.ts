import { Router } from "express";


import { BrandController } from "./brand.controller";
import {
  createBrandSchema,
  updateBrandSchema,
  brandIdParamSchema,
  getBrandListQuerySchema,
} from "./brand.validation";
import { USER_ROLE } from "../User/user.constant";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const brandWriters = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];
const brandReaders = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.post(
  "/",
  auth(...brandWriters),
  validateRequest(createBrandSchema),
  BrandController.create
);

router.get(
  "/",
  auth(...brandReaders),
  validateRequest(getBrandListQuerySchema),
  BrandController.getAll
);

router.get(
  "/:id",
  auth(...brandReaders),
  validateRequest(brandIdParamSchema),
  BrandController.getSingle
);

router.patch(
  "/:id",
  auth(...brandWriters),
  validateRequest(updateBrandSchema),
  BrandController.update
);

router.delete(
  "/:id",
  auth(...brandWriters),
  validateRequest(brandIdParamSchema),
  BrandController.remove
);

export const BrandRoutes = router;
