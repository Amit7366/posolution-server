import { Router } from "express";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { USER_ROLE } from "../User/user.constant";

import { UnitController } from "./unit.controller";
import {
  createUnitSchema,
  updateUnitSchema,
  unitIdParamSchema,
  getUnitListQuerySchema,
} from "./unit.validation";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const unitWriters = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];
const unitReaders = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.post(
  "/",
  auth(...unitWriters),
  validateRequest(createUnitSchema),
  UnitController.create
);

router.get(
  "/",
  auth(...unitReaders),
  validateRequest(getUnitListQuerySchema),
  UnitController.getAll
);

router.get(
  "/:id",
  auth(...unitReaders),
  validateRequest(unitIdParamSchema),
  UnitController.getSingle
);

router.patch(
  "/:id",
  auth(...unitWriters),
  validateRequest(updateUnitSchema),
  UnitController.update
);

router.delete(
  "/:id",
  auth(...unitWriters),
  validateRequest(unitIdParamSchema),
  UnitController.remove
);

export const UnitRoutes = router;
