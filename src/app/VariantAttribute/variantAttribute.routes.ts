import { Router } from "express";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { USER_ROLE } from "../User/user.constant";

import { VariantAttributeController } from "./variantAttribute.controller";
import {
    createVariantAttributeSchema,
    updateVariantAttributeSchema,
    variantAttributeIdParamSchema,
    getVariantAttributeListQuerySchema,
} from "./variantAttribute.validation";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const variantWriters = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];
const variantReaders = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.post(
    "/",
    auth(...variantWriters),
    validateRequest(createVariantAttributeSchema),
    VariantAttributeController.create
);

router.get(
    "/",
    auth(...variantReaders),
    validateRequest(getVariantAttributeListQuerySchema),
    VariantAttributeController.getAll
);

router.get(
    "/:id",
    auth(...variantReaders),
    validateRequest(variantAttributeIdParamSchema),
    VariantAttributeController.getSingle
);

router.patch(
    "/:id",
    auth(...variantWriters),
    validateRequest(updateVariantAttributeSchema),
    VariantAttributeController.update
);

router.delete(
    "/:id",
    auth(...variantWriters),
    validateRequest(variantAttributeIdParamSchema),
    VariantAttributeController.remove
);

export const VariantAttributeRoutes = router;
