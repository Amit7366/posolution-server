import { Router } from "express";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { USER_ROLE } from "../User/user.constant";

import { WarrantyController } from "./warranty.controller";
import {
    createWarrantySchema,
    updateWarrantySchema,
    warrantyIdParamSchema,
    getWarrantyListQuerySchema,
} from "./warranty.validation";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const warrantyWriters = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];
const warrantyReaders = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.post(
    "/",
    auth(...warrantyWriters),
    validateRequest(createWarrantySchema),
    WarrantyController.create
);

router.get(
    "/",
    auth(...warrantyReaders),
    validateRequest(getWarrantyListQuerySchema),
    WarrantyController.getAll
);

router.get(
    "/:id",
    auth(...warrantyReaders),
    validateRequest(warrantyIdParamSchema),
    WarrantyController.getSingle
);

router.patch(
    "/:id",
    auth(...warrantyWriters),
    validateRequest(updateWarrantySchema),
    WarrantyController.update
);

router.delete(
    "/:id",
    auth(...warrantyWriters),
    validateRequest(warrantyIdParamSchema),
    WarrantyController.remove
);

export const WarrantyRoutes = router;
