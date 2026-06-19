"use client";

import { Save, Loader2, Lock, Eye, EyeOff, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [formData, setFormData] = useState({
    theme: "light",
    currency: "USD",
    date_format: "YYYY-MM-DD",
  });

  const pwForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setFormData({
            theme: d.data.theme || "light",
            currency: d.data.currency || "USD",
            date_format: d.data.date_format || "YYYY-MM-DD",
          });
        }
        setIsLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load settings");
        setIsLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (session?.user?.role !== "Owner") {
      toast.error("Only Farm Owners can modify settings");
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Settings saved! Refresh to see theme changes.");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const onChangePassword = async (data: any) => {
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update password");
      toast.success("Password updated successfully");
      pwForm.reset();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="flex p-10 justify-center"><Loader2 className="animate-spin w-8 h-8 text-gray-400" /></div>;
  }

  const isOwner = session?.user?.role === "Owner";

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-heading">Settings</h1>
      </div>

      {/* Farm Settings */}
      <div className="bg-card-bg rounded-[var(--radius-card)] shadow-soft border border-border-main max-w-4xl">
        <div className="p-6 border-b border-border-divider">
          <h2 className="text-[16px] font-bold text-text-heading">Farm Settings</h2>
          <p className="text-[13px] text-text-secondary mt-1">Theme, currency, and date format preferences.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1.5 uppercase tracking-wide">Theme</label>
              <select name="theme" value={formData.theme} onChange={handleChange} disabled={!isOwner} className="w-full border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 border focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-[14px] transition-all outline-none disabled:opacity-60">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1.5 uppercase tracking-wide">Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange} disabled={!isOwner} className="w-full border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 border focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-[14px] transition-all outline-none disabled:opacity-60">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="PKR">PKR (₨)</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1.5 uppercase tracking-wide">Date Format</label>
              <select name="date_format" value={formData.date_format} onChange={handleChange} disabled={!isOwner} className="w-full border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 border focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-[14px] transition-all outline-none disabled:opacity-60">
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
          </div>
          {!isOwner && (
            <p className="text-[13px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              Only the Farm Owner can modify farm settings.
            </p>
          )}
          <div className="pt-6 border-t border-border-divider flex justify-end">
            <button
              onClick={handleSave}
              disabled={isPending || !isOwner}
              className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white font-semibold py-2.5 px-6 rounded-[var(--radius-btn)] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-card-bg rounded-[var(--radius-card)] shadow-soft border border-border-main max-w-4xl">
        <div className="p-6 border-b border-border-divider">
          <h2 className="text-[16px] font-bold text-text-heading flex items-center gap-2">
            <Lock className="w-4 h-4 text-text-secondary" /> Change Password
          </h2>
          <p className="text-[13px] text-text-secondary mt-1">Update your account password. Min 8 characters, 1 uppercase, 1 number.</p>
        </div>
        <div className="p-6">
          <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="space-y-4 max-w-md">
            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  {...pwForm.register("currentPassword")}
                  className="w-full border border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 pr-10 text-[14px] outline-none focus:border-brand-primary"
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwForm.formState.errors.currentPassword && <p className="text-red-500 text-xs mt-1">{pwForm.formState.errors.currentPassword.message as string}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  {...pwForm.register("newPassword")}
                  className="w-full border border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 pr-10 text-[14px] outline-none focus:border-brand-primary"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwForm.formState.errors.newPassword && <p className="text-red-500 text-xs mt-1">{pwForm.formState.errors.newPassword.message as string}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1.5">Confirm New Password</label>
              <input
                type="password"
                {...pwForm.register("confirmPassword")}
                className="w-full border border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 text-[14px] outline-none focus:border-brand-primary"
                placeholder="Repeat new password"
              />
              {pwForm.formState.errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{pwForm.formState.errors.confirmPassword.message as string}</p>}
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={pwForm.formState.isSubmitting}
                className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2.5 px-6 rounded-[var(--radius-btn)] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {pwForm.formState.isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : <><Lock className="w-4 h-4" /> Update Password</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
