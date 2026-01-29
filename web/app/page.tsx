'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';
import MembershipApplicationForm from '@/components/forms/MembershipApplicationForm';
import {
  Calendar,
  DollarSign,
  CreditCard,
  Package,
  ShoppingCart,
  Shield,
  Sparkles,
  BarChart3,
  Wallet,
  Search,
  Phone,
  Mail,
  ChevronRight,
  Scissors,
  CheckCircle2,
  LogIn,
  UserPlus,
  BookOpen,
  Users,
  Smartphone,
  Zap
} from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Footer from '@/components/layout/Footer';
import GlobalSearch from '@/components/navigation/GlobalSearch';

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Compute authentication status as a boolean
  const isAuthenticated = !!(user && token);

  useEffect(() => {
    setMounted(true);
    
    // Global keyboard shortcut for search
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  const features = [
    { icon: Scissors, title: 'Memberships', color: 'text-primary' },
    { icon: Calendar, title: 'Scheduling', color: 'text-primary' },
    { icon: ShoppingCart, title: 'POS Tools', color: 'text-primary' },
    { icon: Package, title: 'Inventory', color: 'text-primary' },
    { icon: DollarSign, title: 'Finance', color: 'text-primary' },
    { icon: CreditCard, title: 'Lending', color: 'text-primary' },
  ];

  const highlights = [
    { icon: Shield, title: 'Secure' },
    { icon: BarChart3, title: 'Live Data' },
    { icon: Wallet, title: 'Growth' }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      {/* NavigationBar - Ultra Compact */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-border-light dark:border-border-dark">
        <div className="max-w-7xl mx-auto px-8 md:px-12 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-7 h-7 relative overflow-hidden rounded-lg border border-border-light dark:border-border-dark flex items-center justify-center bg-white transition-all group-hover:scale-105">
              <Image src="/logo.png" alt="Logo" width={28} height={28} className="object-cover" />
            </div>
            <span className="text-base font-extrabold text-text-light dark:text-text-dark tracking-tighter leading-none">
              Uruti<span className="text-primary">.</span>
            </span>
          </Link>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/salons/browse" className="text-[10px] font-black uppercase tracking-widest text-text-light/40 dark:text-text-dark/40 hover:text-primary transition-colors">
              Find a Salon
            </Link>
            <button 
              onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[10px] font-black uppercase tracking-widest text-text-light/40 dark:text-text-dark/40 hover:text-primary transition-colors"
            >
              Explore Tools
            </button>
            <button 
              onClick={() => document.getElementById('roadmap-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[10px] font-black uppercase tracking-widest text-text-light/40 dark:text-text-dark/40 hover:text-primary transition-colors"
            >
              Future Journey
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSearch(true)}
              className="p-2 text-text-light/40 dark:text-text-dark/40 hover:text-primary transition-colors"
              title="Search (⌘K)"
            >
              <Search className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border-light dark:border-border-dark hidden md:block" />
            <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-text-light/50 dark:text-text-dark/50 hover:text-primary transition-colors">
              Portal Access
            </Link>
            <Button
              onClick={() => document.getElementById('membership-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-primary hover:bg-primary/90 text-white text-[11px] font-bold px-5 h-9 rounded-xl border-none transition-all active:scale-95"
            >
              Partner with Us
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Global Search */}
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />

      {/* Integrated Hero Section - Everything Visible Above the Fold */}
      <section className="relative pt-20 pb-10 container mx-auto px-8 md:px-12 max-w-7xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative grid lg:grid-cols-12 gap-8 items-start">
          {/* Main Messaging - 7 cols */}
          <div className="lg:col-span-7 space-y-4 animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-primary/10 border border-primary/20 rounded-full">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[8px] font-black text-primary uppercase tracking-widest">Digital Command Center</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-text-light dark:text-text-dark leading-none">
              Better Beauty <span className="text-primary italic">Operations</span>
            </h1>
            
            <p className="text-xs md:text-sm text-text-light/50 dark:text-text-dark/50 max-w-md font-bold leading-tight">
              Manage memberships, bookings, inventory & finance in one sleek dashboard.
            </p>

            <div className="flex flex-wrap gap-4 pt-3">
              <Button
                onClick={() => router.push('/salons/browse')}
                className="h-12 px-8 rounded-sm text-sm font-bold bg-slate-950 dark:bg-white text-white dark:text-slate-950 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5"
              >
                <BookOpen className="w-5 h-5" />
                Find an Appointment
              </Button>
              <Button
                variant="outline"
                onClick={() => document.getElementById('membership-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="h-12 px-8 rounded-sm text-sm border-[1px] font-bold border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5"
              >
                <UserPlus className="w-5 h-5" />
                Register Salon
              </Button>
            </div>

            {/* Quick Stats - Inline */}
            <div className="flex items-center gap-8 pt-4">
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter">2.4k+</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-light/30 dark:text-text-dark/30">Active Salons</span>
              </div>
              <div className="w-px h-8 bg-border-light dark:border-border-dark" />
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter">98%</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-light/30 dark:text-text-dark/30">Client Joy</span>
              </div>
            </div>

            {/* Features Mini-Grid - Pulled into Hero */}
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 gap-3 pt-6 lg:pt-8 bg-surface-light/30 dark:bg-surface-dark/30 p-4 rounded-2xl border border-border-light/50 dark:border-border-dark/50">
              {features.map((f, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-1.5 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-default border border-transparent hover:border-primary/20 group">
                  <f.icon className="w-4 h-4 text-primary transition-transform group-hover:scale-110" />
                  <span className="text-[9px] font-black uppercase tracking-tighter text-text-light/60 dark:text-text-dark/60">{f.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Side & Ecosystem Pulled in - 5 cols */}
          <div className="lg:col-span-5 space-y-6 animate-in fade-in slide-in-from-right-4 duration-700 delay-150">
            {/* Visual Header */}
            <div className="relative group overflow-hidden rounded-3xl border border-border-light dark:border-border-dark">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600')] bg-cover bg-center brightness-50 contrast-125" />
              <div className="relative p-10 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center animate-bounce-slow overflow-hidden p-2.5">
                  <Image src="/urutisalunilogo.png" alt="Logo" width={44} height={44} className="object-cover" />
                </div>
                <span className="text-xl font-black tracking-tighter text-white">Uruti Saluni<span className="text-primary italic">.cloud</span></span>
              </div>
            </div>

            {/* Ecosystem Highlights - Pulled in */}
            <div className="bg-slate-950 dark:bg-white rounded-3xl p-6 text-white dark:text-slate-950 space-y-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">System Core</p>
              <div className="grid gap-4">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-9 h-9 rounded-xl bg-white/10 dark:bg-slate-950/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <h.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black tracking-tight uppercase tracking-widest">{h.title}</h4>
                      <p className="text-[10px] font-medium opacity-50">Enterprise protocols</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW SECTION: System Capabilities - The Bridge between Hero and Form */}
      <section id="features-section" className="py-16 bg-white dark:bg-slate-900 border-y border-border-light/50 dark:border-border-dark/50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
        
        <div className="max-w-7xl mx-auto px-8 md:px-12 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <h2 className="text-3xl md:text-5xl font-black text-text-light dark:text-text-dark tracking-tighter mb-6 leading-tight">
              A Complete <span className="text-primary italic">Ecosystem</span> for Growth.
            </h2>
            <p className="text-sm md:text-base font-medium text-text-light/60 dark:text-text-dark/60 leading-relaxed">
              We've consolidated the fragmented tools of the trade into one powerful, cohesive platform. 
              Run your entire salon operation from a single, beautiful dashboard.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              { 
                icon: Calendar, 
                title: 'Smart Scheduling', 
                desc: 'Intelligent booking engine that manages staff availability, minimizes gaps, and prevents double-bookings automatically.' 
              },
              { 
                icon: Wallet, 
                title: 'Financial Automations', 
                desc: 'Instantly calculate complex commissions, track revenue streams, and generate P&L reports without the spreadsheet headache.' 
              },
              { 
                icon: Users,
                title: 'Client Retention (CRM)', 
                desc: 'Deep client profiles that track service history, preferences, and purchase frequency to help you build lasting loyalty.' 
              },
              { 
                icon: Package, 
                title: 'Inventory Control', 
                desc: 'Real-time stock management that tracks usage per service and alerts you before you run out of critical supplies.' 
              },
              { 
                icon: ShoppingCart, 
                title: 'Integrated POS', 
                desc: 'A seamless checkout experience that handles mixed baskets of services and products with support for split payments.' 
              },
              { 
                icon: Smartphone, 
                title: 'Mobile Commander', 
                desc: 'Give your staff the power to manage their day, check their earnings, and view their schedule from their own devices.' 
              }
            ].map((feature, idx) => (
              <div key={idx} className="group p-8 rounded-3xl bg-surface-light/50 dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary/30 transition-all duration-500 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-black text-text-light dark:text-text-dark tracking-tight mb-3">{feature.title}</h3>
                <p className="text-xs font-medium text-text-light/50 dark:text-text-dark/50 leading-relaxed min-h-[4.5em]">{feature.desc}</p>
                <div className="mt-4 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                  <span className="text-[10px] font-black uppercase tracking-widest">See how it works</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-16 p-8 md:p-12 rounded-[2.5rem] bg-slate-950 dark:bg-white overflow-hidden relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16">
              <div className="absolute inset-0 bg-primary/20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/40 via-transparent to-transparent opacity-50" />
              
              <div className="relative z-10 flex-1 text-center md:text-left space-y-4">
                 <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 dark:bg-slate-900/10 rounded-full border border-white/20 dark:border-slate-900/20 w-fit mx-auto md:mx-0">
                    <Zap className="w-3 h-3 text-white dark:text-slate-900" />
                    <span className="text-[9px] font-black text-white dark:text-slate-900 uppercase tracking-widest">Simple Setup</span>
                 </div>
                 <h3 className="text-2xl md:text-3xl font-black text-white dark:text-slate-950 tracking-tighter">
                    Ready to modernize your salon?
                 </h3>
                 <p className="text-sm font-medium text-white/60 dark:text-slate-950/60 max-w-lg">
                    Join the network of professional salons using Uruti to scale their operations. Application takes less than 5 minutes.
                 </p>
              </div>

              <div className="relative z-10 flex-shrink-0">
                  <button
                    onClick={() => document.getElementById('membership-form')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-white dark:bg-slate-950 text-slate-950 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-900 text-sm font-bold px-10 h-14 rounded-2xl border-none transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <span>Begin My Application</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
              </div>
          </div>
        </div>
      </section>

      {/* Form Section - Integrated Tight */}
      <section id="membership-form" className="py-4 bg-surface-light/50 dark:bg-surface-dark/50 border-y border-border-light dark:border-border-dark relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-2 md:px-4 relative z-10">
          <div className="text-center mb-6 max-w-2xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-black text-text-light dark:text-text-dark tracking-tighter mb-3">
              Official Partner Application
            </h2>
            <p className="text-sm font-medium text-text-light/60 dark:text-text-dark/60 leading-relaxed">
               Please complete the form below to register your salon with the association. 
               This process verifies your business identity, establishes your location for client bookings, 
               and creates your secure administrative account.
            </p>
          </div>
          <MembershipApplicationForm showTitle={false} showProgress={true} compact={true} />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
             style={{ backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
      </section>

      {/* NEW SECTION: Post-Application Roadmap & Global Trust */}
      <section id="roadmap-section" className="py-16 bg-background-light dark:bg-background-dark relative">
        <div className="max-w-7xl mx-auto px-8 md:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row items-end justify-between gap-8 mb-12 px-4">
            <div className="max-w-2xl text-center lg:text-left">
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-4">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">What Happens Next?</span>
               </div>
               <h2 className="text-3xl md:text-5xl font-black text-text-light dark:text-text-dark tracking-tighter mb-4 leading-none">
                  Your Journey to <span className="text-primary italic">Digital Excellence.</span>
               </h2>
               <p className="text-sm font-medium text-text-light/50 dark:text-text-dark/50">
                  Submitting your application is just the first step. Here is what happens as we welcome you into the Uruti ecosystem.
               </p>
            </div>
            
            <div className="hidden lg:flex items-center gap-12 pb-2">
                <div className="text-center group">
                  <p className="text-3xl font-black tracking-tighter text-text-light dark:text-text-dark group-hover:text-primary transition-colors">24h</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-light/30 dark:text-text-dark/30">Review Time</p>
                </div>
                <div className="text-center group">
                  <p className="text-3xl font-black tracking-tighter text-text-light dark:text-text-dark group-hover:text-primary transition-colors">100%</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-light/30 dark:text-text-dark/30">Secure Data</p>
                </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-0 md:border border-border-light dark:border-border-dark rounded-[3rem] overflow-hidden">
              {[
                {
                  step: "01",
                  title: "Rapid Review",
                  desc: "Our board reviews your enterprise data to ensure compatibility with our partner standards. Approval is typically granted within 24 business hours.",
                  icon: Shield,
                  color: "bg-primary/5 text-primary"
                },
                {
                  step: "02",
                  title: "Digital Setup",
                  desc: "Once approved, you'll gain full access to configure your salon profile, onboard your stylists, and define your specialized service catalog.",
                  icon: Zap,
                  color: "bg-warning/10 text-warning"
                },
                {
                  step: "03",
                  title: "Go Live",
                  desc: "Activate your booking link, push your services to the browse directory, and begin processing sales through our high-performance POS system.",
                  icon: Sparkles,
                  color: "bg-success/10 text-success"
                }
              ].map((item, i) => (
                <div key={i} className={`p-10 md:p-14 relative group ${i !== 2 ? 'md:border-r border-border-light dark:border-border-dark' : ''} bg-white dark:bg-slate-900 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                    <div className="flex justify-between items-start mb-10">
                      <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                        <item.icon className="w-7 h-7" />
                      </div>
                      <span className="text-6xl font-black text-border-light dark:text-border-dark opacity-30 group-hover:opacity-100 transition-all duration-700 select-none tracking-tighter">
                        {item.step}
                      </span>
                    </div>
                    
                    <h3 className="text-2xl font-black text-text-light dark:text-text-dark tracking-tight mb-4">{item.title}</h3>
                    <p className="text-sm font-medium text-text-light/50 dark:text-text-dark/50 leading-relaxed mb-8">
                      {item.desc}
                    </p>
                    
                    <div className="absolute bottom-0 left-0 h-1.5 bg-primary transition-all duration-700 w-0 group-hover:w-full" />
                </div>
              ))}
          </div>

          {/* Ecosystem Trust Banner */}
          <div className="mt-16 py-8 px-8 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark flex flex-wrap items-center justify-center md:gap-x-20 gap-y-10 opacity-70 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-default">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center p-1.5">
                    <Image src="/logo.png" alt="Trust1" width={24} height={24} className="opacity-80" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-text-light/40 dark:text-text-dark/40 italic">Global Standard</span>
              </div>
              <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-default">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-text-light/40 dark:text-text-dark/40">Secure Enterprise</span>
              </div>
              <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-default">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-text-light/40 dark:text-text-dark/40">Real-time Analytics</span>
              </div>
              <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-default">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-text-light/40 dark:text-text-dark/40">Community Driven</span>
              </div>
          </div>
        </div>

        {/* Floating gradient decoration */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      </section>

      {/* Footer - Ultra Compact */}
      {/* Footer */}
      <Footer />
    </div>
  );
}
