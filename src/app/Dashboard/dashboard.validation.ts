import { z } from "zod";

export const dashboardSummaryQuerySchema = z.object({
  query: z.object({
    chartRange: z.enum(["1D", "1W", "1M", "3M", "6M", "1Y"]).optional(),
  }),
});
