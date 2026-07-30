import { Router } from "express";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { stripSpoofedTenantFromBody } from "../middleware/stripSpoofedTenantFromBody";
import { USER_ROLE } from "../User/user.constant";
import { SalesReturnController } from "./salesReturn.controller";
import {
  createSalesReturnSchema,
  updateSalesReturnSchema,
  salesReturnIdParamSchema,
  getSalesReturnListQuerySchema,
} from "./salesReturn.validation";

const router = Router();
router.use(stripSpoofedTenantFromBody);

const writers = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];
const readers = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

router.post("/", auth(...writers), validateRequest(createSalesReturnSchema), SalesReturnController.create);
router.get("/", auth(...readers), validateRequest(getSalesReturnListQuerySchema), SalesReturnController.getAll);
router.get("/:id", auth(...readers), validateRequest(salesReturnIdParamSchema), SalesReturnController.getSingle);
router.patch("/:id", auth(...writers), validateRequest(updateSalesReturnSchema), SalesReturnController.update);
router.delete("/:id", auth(...writers), validateRequest(salesReturnIdParamSchema), SalesReturnController.remove);

export const SalesReturnRoutes = router;
