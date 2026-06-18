"use client";

import { Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-heading">Settings</h1>
      </div>
      
      <div className="bg-card-bg rounded-[var(--radius-card)] shadow-soft border border-border-main max-w-4xl">
        <div className="p-6 border-b border-border-divider">
          <h2 className="text-[16px] font-bold text-text-heading">General Settings</h2>
          <p className="text-[13px] text-text-secondary mt-1">Manage your farm settings, theme, and localization.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1.5 uppercase tracking-wide">Theme</label>
              <select className="w-full border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 border focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-[14px] text-text-body transition-all outline-none">
                <option>Light</option>
                <option>Dark</option>
                <option>System</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1.5 uppercase tracking-wide">Currency</label>
              <select className="w-full border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 border focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-[14px] text-text-body transition-all outline-none">
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>GBP (£)</option>
                <option>INR (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1.5 uppercase tracking-wide">Date Format</label>
              <select className="w-full border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 border focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-[14px] text-text-body transition-all outline-none">
                <option>YYYY-MM-DD</option>
                <option>DD/MM/YYYY</option>
                <option>MM/DD/YYYY</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-text-heading mb-1.5 uppercase tracking-wide">Active Farm</label>
              <select className="w-full border-border-main bg-page-bg rounded-[var(--radius-input)] p-2.5 border focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-[14px] text-text-body transition-all outline-none">
                <option>Main Farm</option>
                <option>North Branch</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-border-divider flex justify-end">
            <button className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white font-semibold py-2.5 px-6 rounded-[var(--radius-btn)] transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
