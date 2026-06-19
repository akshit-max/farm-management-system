"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Activity, ShieldPlus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRBAC } from "@/lib/rbac-client";
import { Skeleton } from "@/components/ui/Skeleton";

const mortalitySchema = z.object({
  quantity: z.coerce.number().min(1, "Must be at least 1"),
  cause: z.string().min(1, "Cause is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

const vaccinationSchema = z.object({
  vaccine_name: z.string().min(1, "Vaccine name is required"),
  due_date: z.string().min(1, "Due date is required"),
  status: z.enum(["PENDING", "COMPLETED", "OVERDUE"]),
  notes: z.string().optional(),
});

export default function BatchDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { canMutate } = useRBAC();

  const mForm = useForm({
    resolver: zodResolver(mortalitySchema),
    defaultValues: { quantity: 1, cause: "", date: new Date().toISOString().split("T")[0], notes: "" }
  });

  const vForm = useForm({
    resolver: zodResolver(vaccinationSchema),
    defaultValues: { vaccine_name: "", due_date: new Date().toISOString().split("T")[0], status: "PENDING", notes: "" }
  });

  const fetchBatch = async () => {
    if (!id) return;
    setLoading(true);
    const res = await fetch(`/api/animal-batches/${id}`);
    if (res.ok) {
      setBatch(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBatch();
  }, [id]);

  const onMortalitySubmit = async (data: any) => {
    try {
      const formattedDate = new Date(data.date).toISOString();
      const res = await fetch("/api/mortalities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, date: formattedDate, batch_id: id }),
      });
      const resData = await res.json();
      if (!res.ok) {
        const errorMsg = typeof resData.error === 'string' ? resData.error : JSON.stringify(resData.error) || "Failed to record mortality";
        throw new Error(errorMsg);
      }
      toast.success("Mortality recorded");
      mForm.reset();
      fetchBatch();
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    }
  };

  const onVaccinationSubmit = async (data: any) => {
    try {
      const formattedDate = new Date(data.due_date).toISOString();
      const res = await fetch("/api/vaccinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, due_date: formattedDate, batch_id: id }),
      });
      const resData = await res.json();
      if (!res.ok) {
        const errorMsg = typeof resData.error === 'string' ? resData.error : JSON.stringify(resData.error) || "Failed to add vaccination";
        throw new Error(errorMsg);
      }
      toast.success("Vaccination added");
      vForm.reset();
      fetchBatch();
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    }
  };

  const markVaccineCompleted = async (id: string) => {
    try {
      const res = await fetch(`/api/vaccinations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (res.ok) {
        toast.success("Vaccination marked complete");
        fetchBatch();
      }
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  if (loading) return (
    <div className="space-y-6 pb-12">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-32 w-full lg:col-span-3" />
        <Skeleton className="h-64 w-full lg:col-span-1" />
        <Skeleton className="h-64 w-full lg:col-span-2" />
      </div>
    </div>
  );
  if (!batch) return <div>Batch not found</div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/animal-batches" className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Batch Details: {batch.batch_number}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="bg-white p-6 rounded-xl border shadow-sm col-span-1 lg:col-span-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-sm text-gray-500">Category</p><p className="font-semibold">{batch.animal_category?.name}</p></div>
            <div><p className="text-sm text-gray-500">Room</p><p className="font-semibold">{batch.room?.name}</p></div>
            <div><p className="text-sm text-gray-500">Stage</p><p className="font-semibold">{batch.current_stage?.stage_name}</p></div>
            <div><p className="text-sm text-gray-500">Current Quantity</p><p className="font-semibold text-xl text-emerald-600">{batch.quantity}</p></div>
            <div><p className="text-sm text-gray-500">Arrival Date</p><p className="font-semibold">{format(new Date(batch.arrival_date), "PP")}</p></div>
            <div><p className="text-sm text-gray-500">Avg Weight</p><p className="font-semibold">{batch.average_weight} kg</p></div>
            <div><p className="text-sm text-gray-500">Cost per Animal</p><p className="font-semibold">₹{batch.cost_per_animal}</p></div>
            <div><p className="text-sm text-gray-500">Status</p><span className="inline-flex px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">{batch.status}</span></div>
          </div>
        </div>

        {/* Mortality Management */}
        <div className="lg:col-span-1 space-y-6">
          {canMutate && (
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-red-500"/>Record Mortality</h2>
              <form onSubmit={mForm.handleSubmit(onMortalitySubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Quantity <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    max={batch?.quantity}
                    {...mForm.register("quantity")}
                    className="w-full border p-2 rounded mt-1"
                  />
                  {mForm.formState.errors.quantity && <p className="text-red-500 text-xs mt-1">{mForm.formState.errors.quantity.message as string}</p>}
                  {batch?.quantity && <p className="text-xs text-gray-400 mt-0.5">Max: {batch.quantity}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Cause <span className="text-red-500">*</span></label>
                  <input {...mForm.register("cause")} className="w-full border p-2 rounded mt-1" placeholder="e.g. Disease, Injury" />
                  {mForm.formState.errors.cause && <p className="text-red-500 text-xs mt-1">{mForm.formState.errors.cause.message as string}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Date <span className="text-red-500">*</span></label>
                  <input type="date" {...mForm.register("date")} className="w-full border p-2 rounded mt-1" />
                  {mForm.formState.errors.date && <p className="text-red-500 text-xs mt-1">{mForm.formState.errors.date.message as string}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <input {...mForm.register("notes")} className="w-full border p-2 rounded mt-1" />
                </div>
                <button type="submit" disabled={mForm.formState.isSubmitting} className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600 disabled:opacity-50">
                  {mForm.formState.isSubmitting ? "Saving..." : "Record Death"}
                </button>
              </form>
            </div>
          )}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-medium mb-3">Mortality History</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {batch.mortalities?.map((m: any) => (
                <div key={m.id} className="text-sm border-b pb-2">
                  <span className="font-bold text-red-600">-{m.quantity}</span> on {format(new Date(m.date), "MMM d, yyyy")}
                  <p className="text-gray-500">{m.cause || "No cause specified"}</p>
                </div>
              ))}
              {batch.mortalities?.length === 0 && <p className="text-sm text-gray-500">No mortality recorded.</p>}
            </div>
          </div>
        </div>

        {/* Vaccination Tracking */}
        <div className="lg:col-span-2 space-y-6">
        {canMutate && (
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><ShieldPlus className="w-5 h-5 text-blue-500"/> Schedule Vaccination</h2>
              <form onSubmit={vForm.handleSubmit(onVaccinationSubmit)} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Vaccine Name <span className="text-red-500">*</span></label>
                  <input {...vForm.register("vaccine_name")} className="w-full border p-2 rounded mt-1" placeholder="e.g. Newcastle Disease" />
                  {vForm.formState.errors.vaccine_name && <p className="text-red-500 text-xs mt-1">{vForm.formState.errors.vaccine_name.message as string}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Due Date <span className="text-red-500">*</span></label>
                  <input type="date" {...vForm.register("due_date")} className="w-full border p-2 rounded mt-1" />
                  {vForm.formState.errors.due_date && <p className="text-red-500 text-xs mt-1">{vForm.formState.errors.due_date.message as string}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <input {...vForm.register("notes")} className="w-full border p-2 rounded mt-1" />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button type="submit" disabled={vForm.formState.isSubmitting} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50">
                    {vForm.formState.isSubmitting ? "Saving..." : "Add Schedule"}
                  </button>
                </div>
              </form>
            </div>
          )}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-medium mb-3">Vaccination Schedule</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm divide-y">
                <thead>
                  <tr>
                    <th className="text-left py-2 font-medium">Vaccine</th>
                    <th className="text-left py-2 font-medium">Due Date</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batch.vaccinations?.map((v: any) => (
                    <tr key={v.id}>
                      <td className="py-2">{v.vaccine_name}</td>
                      <td>{format(new Date(v.due_date), "MMM d, yyyy")}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          v.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td>
                        {canMutate && v.status !== "COMPLETED" && (
                          <button onClick={() => markVaccineCompleted(v.id)} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200">
                            Mark Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {batch.vaccinations?.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-500">No vaccinations scheduled.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
