import { createColumnHelper } from "@tanstack/react-table";

const columnHelper = createColumnHelper<any>();

const col = columnHelper.accessor("batch.batch_number", {
  header: "Batch"
});

// simulate react table
const row = { batch: null };
try {
  // @ts-ignore
  const val = col.accessorFn ? col.accessorFn(row) : undefined;
  console.log("Value:", val);
} catch (e: any) {
  console.error("CRASH:", e.message);
}
