import { Sidebar } from "@/features/shared/components/Sidebar";
import { Navbar } from "@/features/shared/components/Navbar";

export default function SettingsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 max-w-3xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">General Settings</h2>
              <p className="text-sm text-gray-500">Manage your farm settings, theme, and localization.</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                <select className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-emerald-500 focus:border-emerald-500 text-gray-800">
                  <option>Light</option>
                  <option>Dark</option>
                  <option>System</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-emerald-500 focus:border-emerald-500 text-gray-800">
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                  <option>INR (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                <select className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-emerald-500 focus:border-emerald-500 text-gray-800">
                  <option>YYYY-MM-DD</option>
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Active Farm</label>
                <select className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-emerald-500 focus:border-emerald-500 text-gray-800">
                  <option>Main Farm</option>
                  <option>North Branch</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end">
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
