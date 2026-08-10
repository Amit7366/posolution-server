import { z } from "zod";

export const dashboardSummaryQuerySchema = z.object({
  query: z.object({
    chartRange: z.enum(["1D", "1W", "1M", "3M", "6M", "1Y"]).optional(),
  }),
});

export const dashboardProfitLossQuerySchema = z.object({
  query: z
    .object({
      preset: z.enum(["1D", "3D", "7D", "1M", "1Y", "custom"]).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .superRefine((q, ctx) => {
      const preset = q.preset ?? "1D";
      if (preset === "custom" && (!q.from || !q.to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Custom range requires from and to dates",
          path: ["from"],
        });
      }
    }),
});
