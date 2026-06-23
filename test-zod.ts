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
  const parsed = createFeedTypeSchema.parse({
    name: "Test",
    supplier_id: null,
    cost_per_kg: 10,
    stock_quantity: 10,
    reorder_level: 10
  });
  console.log("Parsed Feed Type:", parsed);
} catch (err: any) {
  console.error("Zod FeedType Error:", err.flatten().fieldErrors);
}

const createSlaughterSchema = z.object({
  batch_id: z.string().min(1, "Batch is required"),
  slaughter_date: z.string().or(z.date()).transform(d => new Date(d)),
  quantity_slaughtered: z.coerce.number().min(1, "Must slaughter at least 1 animal"),
  average_live_weight: z.coerce.number().min(0.01, "Average weight must be > 0"),
  notes: z.string().optional(),
  
  yield: z.object({
    carcass_weight: z.coerce.number().min(0.01, "Carcass weight must be > 0"),
    usable_meat_weight: z.coerce.number().min(0.01, "Usable meat weight must be > 0"),
  }),
  
  waste: z.object({
    bones_weight: z.coerce.number().min(0).default(0),
    fat_weight: z.coerce.number().min(0).default(0),
    organ_weight: z.coerce.number().min(0).default(0),
    waste_weight: z.coerce.number().min(0).default(0),
    notes: z.string().optional(),
  }),
  
  inventory_items: z.array(z.object({
    name: z.string().min(1, "Name required"),
    category: z.string().min(1, "Category required"),
    quantity: z.coerce.number().min(0, "Must be >= 0"),
    unit: z.string().min(1, "Unit required"),
    cost_basis: z.coerce.number().min(0, "Must be >= 0"),
  })).min(1, "At least one inventory item must be generated")
}).refine(data => data.yield.usable_meat_weight <= data.yield.carcass_weight, {
  message: "Usable meat weight cannot exceed carcass weight",
  path: ["yield.usable_meat_weight"]
});

try {
  const parsed2 = createSlaughterSchema.parse({
    batch_id: "batch-1",
    slaughter_date: new Date().toISOString(),
    quantity_slaughtered: 1,
    average_live_weight: 10,
    yield: { carcass_weight: 8, usable_meat_weight: 7 },
    waste: { bones_weight: 0, fat_weight: 0, organ_weight: 0, waste_weight: 0 },
    inventory_items: [
      { name: "Meat", category: "Meat", quantity: 7, unit: "kg", cost_basis: 10 }
    ]
  });
  console.log("Parsed Slaughter:", parsed2);
} catch (err: any) {
  console.error("Zod Slaughter Error:", err.flatten().fieldErrors);
}
