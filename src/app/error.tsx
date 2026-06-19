"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="text-center max-w-md">
        <div className="bg-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-200">
          <AlertOctagon className="w-12 h-12 text-red-600" />
        </div>
        
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Something went wrong!</h1>
        
        <p className="text-gray-500 mb-6 leading-relaxed">
          We're sorry, but an unexpected error has occurred. Our engineers have been notified. Please try again or return to the dashboard.
        </p>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8 text-left text-xs font-mono text-gray-600 overflow-x-auto">
          {error.message || "Internal Server Error"}
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button 
            onClick={() => reset()} 
            className="w-full sm:w-auto px-6 py-3 bg-[var(--color-brand-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-brand-hover)] transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          <Link href="/dashboard" className="w-full sm:w-auto px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
