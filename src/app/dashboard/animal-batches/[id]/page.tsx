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

const mortalitySchema = z.object({
  quantity: z.coerce.number().min(1),
  cause: z.string().optional(),
  date: z.string().min(1),
  notes: z.string().optional(),
});

const vaccinationSchema = z.object({
  vaccine_name: z.string().min(1),
  due_date: z.string().min(1),
  status: z.enum(["PENDING", "COMPLETED", "OVERDUE"]),
  notes: z.string().optional(),
});

export default function BatchDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      const res = await fetch("/api/mortalities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, batch_id: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to record mortality");
      toast.success("Mortality recorded");
      mForm.reset();
      fetchBatch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const onVaccinationSubmit = async (data: any) => {
    try {
      const res = await fetch("/api/vaccinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, batch_id: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to add vaccination");
      toast.success("Vaccination added");
      vForm.reset();
      fetchBatch();
    } catch (err: any) {
      toast.error(err.message);
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

  if (loading) return <div>Loading...</div>;
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
            <div><p className="text-sm text-gray-500">Cost per Animal</p><p className="font-semibold">${batch.cost_per_animal}</p></div>
            <div><p className="text-sm text-gray-500">Status</p><span className="inline-flex px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">{batch.status}</span></div>
          </div>
        </div>

        {/* Mortality Management */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-red-500"/> Record Mortality</h2>
            <form onSubmit={mForm.handleSubmit(onMortalitySubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <input type="number" {...mForm.register("quantity")} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="text-sm font-medium">Cause</label>
                <input {...mForm.register("cause")} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <input type="date" {...mForm.register("date")} className="w-full border p-2 rounded" />
              </div>
              <button className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600">Record Death</button>
            </form>
          </div>
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
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><ShieldPlus className="w-5 h-5 text-blue-500"/> Schedule Vaccination</h2>
            <form onSubmit={vForm.handleSubmit(onVaccinationSubmit)} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Vaccine Name</label>
                <input {...vForm.register("vaccine_name")} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <input type="date" {...vForm.register("due_date")} className="w-full border p-2 rounded" />
              </div>
              <div className="col-span-2">
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Add Schedule</button>
              </div>
            </form>
          </div>
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
                        {v.status !== "COMPLETED" && (
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
