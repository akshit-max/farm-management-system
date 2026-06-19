"use client";

import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tractor, Loader2, Mail, Lock, CheckCircle2, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Invalid email or password");
      } else {
        toast.success("Login successful");
        router.push("/dashboard");
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans">
      {/* Left side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-[var(--color-brand-sidebar)] relative overflow-hidden flex-col">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--color-brand-primary)]/10 blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--color-brand-primary)]/5 blur-3xl"></div>
        </div>
        
        <div className="relative z-10 p-12 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-auto">
            <div className="bg-transparent rounded flex items-center justify-center">
              <Tractor className="text-white w-10 h-10 stroke-[1.5]" />
            </div>
            <span className="text-white text-3xl font-bold tracking-wide">Farm ERP</span>
          </div>
          
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Enterprise Farm<br />
              <span className="text-[var(--color-brand-primary)]">Operations OS</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-md leading-relaxed mb-8">
              The complete ecosystem to manage your livestock, feed, water, electricity, and financials in one unified platform.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-[var(--color-brand-primary)]" />
                <span>Real-time livestock mortality & vaccination tracking</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-[var(--color-brand-primary)]" />
                <span>Automated room capacity & stage planning</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-[var(--color-brand-primary)]" />
                <span>Integrated financial ledgers & predictive analytics</span>
              </div>
            </div>
          </div>
          
          <div className="mt-auto">
            <p className="text-sm text-gray-500">© 2026 Farm ERP. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative">
        <Link href="/" className="absolute top-6 right-6 lg:top-8 lg:right-8 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </Link>
        <div className="w-full max-w-[420px] space-y-8">
          <div className="text-left">
            <h2 className="text-3xl font-bold text-text-heading mb-2">Welcome Back</h2>
            <p className="text-text-secondary text-sm">Sign in to your account to continue</p>
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-text-heading uppercase tracking-wide">Password</label>
                <Link href="/forgot-password" className="text-[13px] font-semibold text-[var(--color-brand-primary)] hover:text-[var(--color-brand-hover)]">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-[var(--radius-input)] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/20 focus:border-[var(--color-brand-primary)] transition-all disabled:opacity-50"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]" />
                <span className="text-[14px] text-text-secondary">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-[var(--radius-btn)] font-semibold text-[15px] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-[14px] text-text-secondary">
              Don't have an account? <Link href="/signup" className="font-semibold text-[var(--color-brand-primary)] hover:text-[var(--color-brand-hover)]">Sign Up Now</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
