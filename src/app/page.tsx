import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { Tractor, ArrowRight, CheckCircle2, LayoutDashboard, Shield, Smartphone, Zap, Activity, Users, ShoppingCart, Leaf, Star, ChevronRight } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 font-sans selection:bg-brand-primary/20 selection:text-brand-primary">
      {/* Premium Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-300 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-brand-primary to-emerald-600 p-2.5 rounded-xl shadow-lg shadow-brand-primary/20">
              <Tractor className="w-6 h-6 text-white stroke-[1.5]" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">Farm ERP</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-600">
            <a href="#features" className="hover:text-brand-primary transition-colors">Features</a>
            <a href="#testimonials" className="hover:text-brand-primary transition-colors">Customers</a>
            <a href="#pwa" className="hover:text-brand-primary transition-colors">App</a>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-md shadow-gray-900/10"
              >
                Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block text-gray-600 hover:text-gray-900 text-sm font-semibold transition-colors">
                  Sign In
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-gradient-to-r from-brand-primary to-emerald-600 hover:from-brand-hover hover:to-emerald-700 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Premium Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-primary/5 via-white to-[#FAFAFA] -z-10" />
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-brand-primary/5 rounded-full blur-[100px] -z-10 mix-blend-multiply"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] -z-10 mix-blend-multiply"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200/60 shadow-sm text-gray-600 font-medium text-sm mb-8 hover:shadow-md transition-shadow cursor-pointer">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
            </span>
            Discover the new standard in farm management <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1]">
            The intelligent OS for <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-emerald-500">
              modern farm operations.
            </span>
          </h1>
          
          <p className="mt-6 max-w-2xl text-xl text-gray-500 mx-auto mb-10 leading-relaxed">
            Unify your livestock, feed, and financial management in one beautifully designed, offline-ready platform. Built specifically for commercial scale agriculture.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!session ? (
              <Link 
                href="/signup" 
                className="w-full sm:w-auto flex justify-center items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-xl shadow-gray-900/10"
              >
                Start Free Trial
              </Link>
            ) : (
              <Link 
                href="/dashboard" 
                className="w-full sm:w-auto flex justify-center items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-xl shadow-gray-900/10"
              >
                Go to Dashboard
              </Link>
            )}
            <a href="#features" className="w-full sm:w-auto flex justify-center items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-sm">
              Explore Features
            </a>
          </div>

          {/* Premium Image Mockup */}
          <div className="mt-20 relative max-w-5xl mx-auto rounded-[2rem] p-4 bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl shadow-brand-primary/10">
            <div className="relative rounded-[1.5rem] overflow-hidden border border-gray-200/50 bg-gray-100 aspect-[16/9]">
              <Image 
                src="/hero-mockup-2.png" 
                alt="Farm ERP Dashboard Dashboard" 
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Trusted By */}
      <section className="py-12 border-y border-gray-200/60 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-[0.2em] mb-8">Trusted by innovative farms worldwide</p>
          <div className="flex flex-wrap justify-center gap-10 md:gap-20 items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="text-2xl font-bold flex items-center gap-2 text-gray-800"><Leaf className="w-6 h-6 text-brand-primary"/> AgriCorp</div>
            <div className="text-2xl font-bold flex items-center gap-2 text-gray-800"><Zap className="w-6 h-6 text-brand-primary"/> FutureFarm</div>
            <div className="text-2xl font-bold flex items-center gap-2 text-gray-800"><Shield className="w-6 h-6 text-brand-primary"/> SafeHarvest</div>
            <div className="text-2xl font-bold flex items-center gap-2 text-gray-800"><Activity className="w-6 h-6 text-brand-primary"/> LiveStock Pro</div>
          </div>
        </div>
      </section>

      {/* Core Modules Highlight */}
      <section id="features" className="py-32 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary font-bold text-sm mb-6">
              Complete Ecosystem
            </div>
            <h3 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">Everything you need to run your farm</h3>
            <p className="text-xl text-gray-500">Farm ERP unifies your livestock, inventory, and financials into a single source of truth, eliminating the need for spreadsheets.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Activity, title: "Animal Operations", desc: "Track batches, mortality, vaccinations, and movement across stages and rooms with precision." },
              { icon: Leaf, title: "Feed Management", desc: "Manage feed inventory, supplier deliveries, and daily batch consumption with strict stock enforcement." },
              { icon: ShoppingCart, title: "Sales & Invoicing", desc: "Generate professional POS invoices, track batch deductions, and monitor accounts receivable automatically." },
              { icon: Users, title: "Supplier & CRM", desc: "Maintain a complete, searchable database of your suppliers and customers with full historical reporting." },
              { icon: LayoutDashboard, title: "Real-time Analytics", desc: "Monitor daily revenue, feed stock levels, mortality rates, and overdue tasks at a single glance." },
              { icon: Shield, title: "Enterprise Security", desc: "Role-based access control (Owner, Manager, Accountant) backed by immutable audit logs for every action." },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-8 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 border border-gray-200/60 group">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center mb-6 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 transition-colors">
                  <feature.icon className="w-7 h-7 text-gray-700 group-hover:text-brand-primary transition-colors" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Redesigned PWA App Cards Section */}
      <section id="pwa" className="py-32 bg-white border-y border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-bold text-sm">
                <Smartphone className="w-4 h-4" /> Installable Web App
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Works offline.<br />Installs instantly.
              </h2>
              <p className="text-xl text-gray-500 leading-relaxed">
                Farm ERP is built as a Progressive Web App (PWA). Install it directly from your browser to your phone, tablet, or desktop. No app store required.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6 pt-4">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200/60">
                  <Zap className="w-8 h-8 text-amber-500 mb-4" />
                  <h4 className="font-bold text-gray-900 mb-2">Lightning Fast</h4>
                  <p className="text-sm text-gray-500">Loads instantly from your home screen with zero downloading delays.</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200/60">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-4" />
                  <h4 className="font-bold text-gray-900 mb-2">Offline Ready</h4>
                  <p className="text-sm text-gray-500">Built to handle remote farm locations with spotty internet connections.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-blue-500/20 rounded-[3rem] blur-3xl -z-10"></div>
              <div className="bg-gray-900 rounded-[2rem] p-10 text-white shadow-2xl border border-gray-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Tractor className="w-40 h-40" />
                </div>
                <Smartphone className="w-12 h-12 text-blue-400 mb-6 relative z-10" />
                <h3 className="text-2xl font-bold mb-4 relative z-10">Get the App</h3>
                <p className="text-gray-400 mb-8 relative z-10 max-w-sm">
                  Look for the install icon in your browser's address bar or use the install button inside the dashboard to add Farm ERP to your device.
                </p>
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white font-medium transition-colors cursor-default backdrop-blur-md relative z-10">
                  Install App
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-32 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center max-w-3xl mx-auto mb-20">
            <h3 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">Loved by farm owners</h3>
            <p className="text-xl text-gray-500">See how Farm ERP is changing the way modern agriculture operates.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Sarah Jenkins", role: "Owner, Green Valley Farms", text: "We completely eliminated our spreadsheet chaos. The batch-wise tracking and mortality metrics alone saved us thousands this quarter." },
              { name: "Michael Chen", role: "Operations Manager", text: "The offline capability is a lifesaver. Our barns have terrible reception, but my team can log feed consumption without missing a beat." },
              { name: "David Miller", role: "Chief Accountant", text: "The integration between the POS invoicing and the general ledger is seamless. The RBAC ensures my workers only see what they need to." }
            ].map((t, idx) => (
              <div key={idx} className="bg-white p-8 rounded-3xl border border-gray-200/60 shadow-sm relative">
                <div className="flex gap-1 text-amber-400 mb-6">
                  <Star className="w-5 h-5 fill-current" />
                  <Star className="w-5 h-5 fill-current" />
                  <Star className="w-5 h-5 fill-current" />
                  <Star className="w-5 h-5 fill-current" />
                  <Star className="w-5 h-5 fill-current" />
                </div>
                <p className="text-gray-700 text-lg mb-8 italic">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary font-bold text-lg">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">{t.name}</h5>
                    <p className="text-sm text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-900 z-0"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-primary/20 to-transparent z-0"></div>
        
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Ready to modernize your operations?</h2>
          <p className="text-xl text-gray-400 mb-10">Join the next generation of farm management today.</p>
          {!session ? (
            <Link 
              href="/signup" 
              className="inline-flex justify-center items-center gap-2 bg-gradient-to-r from-brand-primary to-emerald-500 hover:from-brand-hover hover:to-emerald-600 text-white px-10 py-5 rounded-full text-lg font-bold transition-all shadow-xl shadow-brand-primary/30"
            >
              Start Your Free Trial
            </Link>
          ) : (
            <Link 
              href="/dashboard" 
              className="inline-flex justify-center items-center gap-2 bg-gradient-to-r from-brand-primary to-emerald-500 hover:from-brand-hover hover:to-emerald-600 text-white px-10 py-5 rounded-full text-lg font-bold transition-all shadow-xl shadow-brand-primary/30"
            >
              Enter Dashboard
            </Link>
          )}
        </div>
      </section>

      {/* Proper Footer */}
      <footer className="bg-white pt-20 pb-10 border-t border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-brand-primary p-2 rounded-lg">
                  <Tractor className="w-5 h-5 text-white stroke-[1.5]" />
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-900">Farm ERP</span>
              </div>
              <p className="text-gray-500 mb-6 max-w-sm">
                The intelligent operating system for modern livestock, poultry, and agricultural management.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-3 text-gray-500 text-sm">
                <li><a href="#features" className="hover:text-brand-primary transition-colors">Features</a></li>
                <li><a href="#testimonials" className="hover:text-brand-primary transition-colors">Customers</a></li>
                <li><a href="#pwa" className="hover:text-brand-primary transition-colors">Mobile App</a></li>
                <li><a href="#" className="hover:text-brand-primary transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-3 text-gray-500 text-sm">
                <li><a href="#" className="hover:text-brand-primary transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-brand-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-brand-primary transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-brand-primary transition-colors">Community</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-3 text-gray-500 text-sm">
                <li><a href="#" className="hover:text-brand-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-brand-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-brand-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-brand-primary transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-200/60 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} Farm ERP Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-gray-900 transition-colors">Twitter</a>
              <a href="#" className="hover:text-gray-900 transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-gray-900 transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
