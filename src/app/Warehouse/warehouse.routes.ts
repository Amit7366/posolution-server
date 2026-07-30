import { Router } from "express";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { USER_ROLE } from "../User/user.constant";

import { WarehouseController } from "./warehouse.controller";
import { createWarehouseSchema, updateWarehouseSchema, warehouseIdParamSchema, getWarehouseListQuerySchema } from "./warehouse.validation";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const whWriters = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];
const whReaders = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.post("/", auth(...whWriters), validateRequest(createWarehouseSchema), WarehouseController.create);
router.get("/", auth(...whReaders), validateRequest(getWarehouseListQuerySchema), WarehouseController.getAll);
router.get("/:id", auth(...whReaders), validateRequest(warehouseIdParamSchema), WarehouseController.getSingle);
router.patch("/:id", auth(...whWriters), validateRequest(updateWarehouseSchema), WarehouseController.update);
router.delete("/:id", auth(...whWriters), validateRequest(warehouseIdParamSchema), WarehouseController.remove);

export const WarehouseRoutes = router;
