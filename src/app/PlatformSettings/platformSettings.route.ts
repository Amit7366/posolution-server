import { Router } from "express";
import { z } from "zod";
import httpStatus from "http-status";
import auth from "../middleware/auth";
import validateRequest from "../middleware/validateRequest";
import { USER_ROLE } from "../User/user.constant";
import catchAsync from "../utilis/catchAsync";
import sendResponse from "../utilis/sendResponse";
import { PlatformSettingsService } from "./platformSettings.service";

const updateSchema = z.object({
  body: z.object({
    defaultSubscriptionDays: z.coerce.number().min(1).max(3650).optional(),
  }),
});

const router = Router();

router.get(
  "/",
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  catchAsync(async (_req, res) => {
    const data = await PlatformSettingsService.get();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Platform settings",
      data,
    });
  })
);

router.patch(
  "/",
  auth(USER_ROLE.superAdmin),
  validateRequest(updateSchema),
  catchAsync(async (req, res) => {
    const data = await PlatformSettingsService.update(req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Settings updated",
      data,
    });
  })
);

export const PlatformSettingsRoutes = router;
