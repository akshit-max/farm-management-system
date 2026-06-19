"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Users, Plus, Pencil, Trash2, ShieldCheck, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const ROLE_COLORS: Record<string, string> = {
  Owner: "bg-purple-100 text-purple-700",
  Manager: "bg-blue-100 text-blue-700",
  Accountant: "bg-amber-100 text-amber-700",
  Worker: "bg-green-100 text-green-700",
};

const createSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role_id: z.string().uuid("Please select a role"),
});

export default function UserManagementPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editRoleId, setEditRoleId] = useState("");
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(createSchema),
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/roles"),
      ]);
      if (usersRes.ok) setUsers((await usersRes.json()).data || []);
      if (rolesRes.ok) setRoles((await rolesRes.json()).data || []);
    } catch {
      toast.error("Failed to load user data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onCreateUser = async (data: any) => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to create user");
      toast.success("User created successfully");
      reset();
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    }
  };

  const updateUser = async (id: string, payload: any) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to update user");
      toast.success("User updated");
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed to delete user");
      toast.success("User removed");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setUserToDelete(null);
    }
  };

  if (session?.user?.role !== "Owner") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldCheck className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500 font-medium">Only Farm Owners can manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-heading">User Management</h1>
          <p className="text-sm text-text-secondary mt-1">Manage farm staff and their roles</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); reset(); }}
          className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white font-semibold py-2 px-4 rounded-[var(--radius-btn)] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {showForm && (
        <div className="bg-card-bg border border-border-main rounded-[var(--radius-card)] p-6 shadow-soft">
          <h2 className="text-[16px] font-bold text-text-heading mb-4">Create New User</h2>
          <form onSubmit={handleSubmit(onCreateUser)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1">Full Name <span className="text-red-500">*</span></label>
              <input {...register("name")} className="w-full border border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 text-[14px]" placeholder="John Doe" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1">Email <span className="text-red-500">*</span></label>
              <input {...register("email")} type="email" className="w-full border border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 text-[14px]" placeholder="john@farm.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1">Password <span className="text-red-500">*</span></label>
              <input {...register("password")} type="password" className="w-full border border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 text-[14px]" placeholder="Min 6 characters" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1">Role <span className="text-red-500">*</span></label>
              <select {...register("role_id")} className="w-full border border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 text-[14px]">
                <option value="">Select a role...</option>
                {roles.filter(r => r.name !== "Owner").map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {errors.role_id && <p className="text-red-500 text-xs mt-1">{errors.role_id.message as string}</p>}
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); reset(); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="bg-[var(--color-brand-primary)] text-white px-6 py-2 rounded-[var(--radius-btn)] font-semibold disabled:opacity-50 flex items-center gap-2">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card-bg border border-border-main rounded-[var(--radius-card)] shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-32"><Loader2 className="animate-spin w-6 h-6 text-gray-400" /></div>
        ) : (
          <table className="min-w-full divide-y divide-border-divider">
            <thead className="bg-page-bg">
              <tr>
                <th className="px-6 py-3 text-left text-[12px] font-bold text-text-secondary uppercase tracking-wide">Name</th>
                <th className="px-6 py-3 text-left text-[12px] font-bold text-text-secondary uppercase tracking-wide">Email</th>
                <th className="px-6 py-3 text-left text-[12px] font-bold text-text-secondary uppercase tracking-wide">Role</th>
                <th className="px-6 py-3 text-left text-[12px] font-bold text-text-secondary uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-left text-[12px] font-bold text-text-secondary uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-divider">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-page-bg transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-[13px]">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-text-heading text-[14px]">{user.name}</span>
                      {user.id === session?.user?.id && <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">You</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[14px] text-text-secondary">{user.email}</td>
                  <td className="px-6 py-4">
                    {editingUser?.id === user.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editRoleId}
                          onChange={e => setEditRoleId(e.target.value)}
                          className="border border-border-main rounded px-2 py-1 text-[13px]"
                        >
                          {roles.filter(r => r.name !== "Owner").map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        <button onClick={() => updateUser(user.id, { role_id: editRoleId })} className="text-xs bg-brand-primary text-white px-2 py-1 rounded">Save</button>
                        <button onClick={() => setEditingUser(null)} className="text-xs text-gray-500 px-2 py-1">Cancel</button>
                      </div>
                    ) : (
                      <span className={`inline-flex px-2 py-1 rounded-full text-[12px] font-medium ${ROLE_COLORS[user.role?.name] || "bg-gray-100 text-gray-600"}`}>
                        {user.role?.name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => updateUser(user.id, { active_status: !user.active_status })}
                      disabled={user.id === session?.user?.id}
                      className="flex items-center gap-1 text-[13px] disabled:opacity-40"
                    >
                      {user.active_status
                        ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600">Active</span></>
                        : <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-500">Disabled</span></>
                      }
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.id !== session?.user?.id && user.role?.name !== "Owner" && (
                        <>
                          <button
                            onClick={() => { setEditingUser(user); setEditRoleId(user.role?.id || ""); }}
                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                            title="Edit Role"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setUserToDelete({ id: user.id, name: user.name })}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Remove User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-text-secondary">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No users yet. Add your first team member above.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal 
        isOpen={!!userToDelete}
        title="Remove User"
        message={`Are you sure you want to remove ${userToDelete?.name}? This cannot be undone.`}
        onConfirm={deleteUser}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
