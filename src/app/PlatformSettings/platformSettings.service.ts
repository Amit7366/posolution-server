import { PlatformSettings } from "./platformSettings.model";

const DEFAULTS = { defaultSubscriptionDays: 30 };

const get = async () => {
  const doc = await PlatformSettings.findOneAndUpdate(
    { key: "platform" },
    { $setOnInsert: DEFAULTS },
    { new: true, upsert: true }
  ).lean();
  return {
    defaultSubscriptionDays: doc?.defaultSubscriptionDays ?? 30,
    paymentMediums: ["bkash", "nagad", "rocket", "bank"] as const,
  };
};

const update = async (payload: { defaultSubscriptionDays?: number }) => {
  const doc = await PlatformSettings.findOneAndUpdate(
    { key: "platform" },
    { $set: payload, $setOnInsert: { key: "platform" } },
    { new: true, upsert: true }
  ).lean();
  return {
    defaultSubscriptionDays: doc?.defaultSubscriptionDays ?? 30,
    paymentMediums: ["bkash", "nagad", "rocket", "bank"] as const,
  };
};

export const PlatformSettingsService = { get, update };
