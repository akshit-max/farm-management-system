import { z } from "zod";

const createFeedTypeSchema = z.object({
  name: z.string().min(1, "Feed name is required"),
  supplier_id: z.string().optional().nullable(),
  cost_per_kg: z.coerce.number().min(0, "Cost must be >= 0"),
  stock_quantity: z.coerce.number().min(0, "Stock must be >= 0"),
  reorder_level: z.coerce.number().min(0, "Reorder level must be >= 0"),
  feed_efficiency_baseline: z.coerce.number().optional().nullable(),
  notes: z.string().optional(),
});

try {
  const result = createFeedTypeSchema.parse({
    name: "Test",
    supplier_id: "",
    cost_per_kg: 1,
    stock_quantity: 1,
    reorder_level: 1
  });
  console.log("Parsed:", result);
} catch (e: any) {
  console.log("Error:", e.flatten());
}
