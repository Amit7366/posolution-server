import { Router } from "express";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { USER_ROLE } from "../User/user.constant";
import { StoreController } from "./store.controller";
import { createStoreSchema, updateStoreSchema, storeIdParamSchema, getStoreListQuerySchema } from "./store.validation";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const storeWriters = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];
const storeReaders = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.post("/", auth(...storeWriters), validateRequest(createStoreSchema), StoreController.create);
router.get("/", auth(...storeReaders), validateRequest(getStoreListQuerySchema), StoreController.getAll);
router.get("/:id", auth(...storeReaders), validateRequest(storeIdParamSchema), StoreController.getSingle);
router.patch("/:id", auth(...storeWriters), validateRequest(updateStoreSchema), StoreController.update);
router.delete("/:id", auth(...storeWriters), validateRequest(storeIdParamSchema), StoreController.remove);

export const StoreRoutes = router;
