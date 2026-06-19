"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tractor, Loader2, Mail, Lock, User, Home, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    farmName: "",
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create account");
      } else {
        toast.success("Account created successfully!");
        router.push("/login");
      }
    } catch (err) {
      toast.error("An error occurred during signup.");
    } finally {
      setIsPending(false);
    }
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
              Start Your <br />
              <span className="text-[var(--color-brand-primary)]">Digital Farm</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-md leading-relaxed">
              Join thousands of modern farmers optimizing their operations, maximizing yield, and reducing mortality rates.
            </p>
          </div>
          
          <div className="mt-auto">
            <p className="text-sm text-gray-500">© 2026 Farm ERP. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white relative overflow-y-auto">
        <Link href="/" className="absolute top-6 right-6 lg:top-8 lg:right-8 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors z-10">
          <X className="w-6 h-6" />
        </Link>
        <div className="w-full max-w-[420px] space-y-8 py-8">
          <div className="text-left">
            <h2 className="text-3xl font-bold text-text-heading mb-2">Create Account</h2>
            <p className="text-text-secondary text-sm">Register your farm and become an owner</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-text-heading uppercase tracking-wide">Farm Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="farmName"
                  value={formData.farmName}
                  onChange={handleChange}
                  disabled={isPending}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-[var(--radius-input)] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/20 focus:border-[var(--color-brand-primary)] transition-all disabled:opacity-50"
                  placeholder="Green Valley Farms"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-text-heading uppercase tracking-wide">Owner Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  disabled={isPending}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-[var(--radius-input)] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/20 focus:border-[var(--color-brand-primary)] transition-all disabled:opacity-50"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-text-heading uppercase tracking-wide">Email Address <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isPending}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-[var(--radius-input)] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/20 focus:border-[var(--color-brand-primary)] transition-all disabled:opacity-50"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-text-heading uppercase tracking-wide">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-text-heading uppercase tracking-wide">Confirm Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isPending}
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-[var(--radius-input)] text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/20 focus:border-[var(--color-brand-primary)] transition-all disabled:opacity-50"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-[var(--radius-btn)] font-semibold text-[15px] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 mt-6"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-[14px] text-text-secondary">
              Already have an account? <Link href="/login" className="font-semibold text-[var(--color-brand-primary)] hover:text-[var(--color-brand-hover)]">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
