import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="text-center max-w-md">
        <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-100">
          <ShieldAlert className="w-12 h-12 text-red-500" />
        </div>
        
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Access Denied</h1>
        <h2 className="text-lg font-bold text-gray-800 mb-3">403 - Unauthorized Request</h2>
        
        <p className="text-gray-500 mb-8 leading-relaxed text-sm">
          You do not have the required permissions to view this page or perform this action. If you believe this is a mistake, please contact your Farm Owner.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard" className="w-full sm:w-auto px-6 py-3 bg-[var(--color-brand-primary)] text-white rounded-[var(--radius-btn)] font-medium hover:bg-[var(--color-brand-hover)] transition-colors flex items-center justify-center gap-2 text-sm shadow-sm">
            <Home className="w-4 h-4" /> Go to Dashboard
          </Link>
          <Link href="/login" className="w-full sm:w-auto px-6 py-3 bg-white text-gray-700 border border-border-main rounded-[var(--radius-btn)] font-medium hover:bg-page-bg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
