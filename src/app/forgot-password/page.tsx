"use client";

import { useState } from "react";
import { Tractor, Loader2, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    setIsPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request");
      }
      
      setIsSubmitted(true);
      toast.success("Password reset instructions sent");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-gray-50 font-sans items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8 sm:p-10 space-y-8">
          <div className="flex justify-center mb-2">
            <div className="bg-[var(--color-brand-primary)] p-3 rounded-xl flex items-center justify-center shadow-md">
              <Tractor className="text-white w-8 h-8 stroke-[1.5]" />
            </div>
          </div>
          
          {!isSubmitted ? (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-text-heading mb-2">Forgot Password</h2>
                <p className="text-text-secondary text-sm">Enter your email address and we'll send you instructions to reset your password.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-text-heading uppercase tracking-wide">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isPending}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-[var(--radius-input)] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/20 focus:border-[var(--color-brand-primary)] transition-all disabled:opacity-50"
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-[var(--radius-btn)] font-semibold text-[15px] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending Instructions...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-text-heading mb-2">Check Your Email</h2>
              <p className="text-text-secondary text-sm">
                We've sent password reset instructions to <strong>{email}</strong>. Please check your inbox and spam folder.
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-[var(--color-brand-primary)] hover:text-[var(--color-brand-hover)] text-sm font-semibold"
              >
                Try a different email
              </button>
            </div>
          )}

          <div className="text-center pt-6 border-t border-gray-100">
            <Link href="/login" className="flex items-center justify-center gap-2 text-[14px] font-semibold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
