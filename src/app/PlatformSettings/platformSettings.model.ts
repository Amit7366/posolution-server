import { Schema, model } from "mongoose";

export type TPlatformSettings = {
  key: "platform";
  defaultSubscriptionDays: number;
};

const schema = new Schema<TPlatformSettings>(
  {
    key: { type: String, default: "platform", unique: true },
    defaultSubscriptionDays: { type: Number, default: 30, min: 1, max: 3650 },
  },
  { timestamps: true }
);

export const PlatformSettings = model<TPlatformSettings>(
  "PlatformSettings",
  schema
);
