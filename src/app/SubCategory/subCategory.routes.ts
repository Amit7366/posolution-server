import { Router } from "express";
import { SubCategoryController } from "./subCategory.controller";


import {
  createSubCategorySchema,
  updateSubCategorySchema,
  subCategoryIdParamSchema,
  getSubCategoryListQuerySchema,
} from "./subCategory.validation";
import auth from "../middleware/auth";
import { USER_ROLE } from "../User/user.constant";
import validateRequest from "../middleware/validateRequest";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const subCategoryWriters = [
  USER_ROLE.superAdmin,
  USER_ROLE.admin,
  USER_ROLE.user,
];

const subCategoryReaders = [
  USER_ROLE.superAdmin,
  USER_ROLE.admin,
  USER_ROLE.user,
];

router.post(
  "/",
  auth(...subCategoryWriters),
  validateRequest(createSubCategorySchema),
  SubCategoryController.create
);

router.get(
  "/",
  auth(...subCategoryReaders),
  validateRequest(getSubCategoryListQuerySchema),
  SubCategoryController.getAll
);

router.get(
  "/:id",
  auth(...subCategoryReaders),
  validateRequest(subCategoryIdParamSchema),
  SubCategoryController.getSingle
);

router.patch(
  "/:id",
  auth(...subCategoryWriters),
  validateRequest(updateSubCategorySchema),
  SubCategoryController.update
);

router.delete(
  "/:id",
  auth(...subCategoryWriters),
  validateRequest(subCategoryIdParamSchema),
  SubCategoryController.remove
);

export const SubCategoryRoutes = router;
