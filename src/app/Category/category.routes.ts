import { Router } from "express";
import { CategoryController } from "./category.controller";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  getCategoryListQuerySchema,
} from "./category.validation";
import { USER_ROLE } from "../User/user.constant";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const categoryWriters = [
  USER_ROLE.superAdmin,
  USER_ROLE.admin,
  USER_ROLE.user,
];

const categoryReaders = [
  USER_ROLE.superAdmin,
  USER_ROLE.admin,
  USER_ROLE.user,
];

router.post(
  "/",
  auth(...categoryWriters),
  validateRequest(createCategorySchema),
  CategoryController.create
);

router.get(
  "/",
  auth(...categoryReaders),
  validateRequest(getCategoryListQuerySchema),
  CategoryController.getAll
);

router.get(
  "/:id",
  auth(...categoryReaders),
  validateRequest(categoryIdParamSchema),
  CategoryController.getSingle
);

router.patch(
  "/:id",
  auth(...categoryWriters),
  validateRequest(updateCategorySchema),
  CategoryController.update
);

router.delete(
  "/:id",
  auth(...categoryWriters),
  validateRequest(categoryIdParamSchema),
  CategoryController.remove
);

export const CategoryRoutes = router;
