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
  Phone,
  Mail,
  ChevronRight,
  Scissors,
  LogIn,
  UserPlus,
  BookOpen
} from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);

  // Compute authentication status as a boolean
  const isAuthenticated = !!(user && token);

  useEffect(() => {
    setMounted(true);
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
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 relative overflow-hidden rounded-lg border border-border-light dark:border-border-dark flex items-center justify-center bg-white shadow-sm transition-all group-hover:scale-105">
              <Image src="/logo.png" alt="Logo" width={28} height={28} className="object-cover" />
            </div>
            <span className="text-base font-extrabold text-text-light dark:text-text-dark tracking-tighter leading-none">
              Uruti<span className="text-primary">.</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-text-light/50 hover:text-primary transition-colors">
              Sign In
            </Link>
            <Button
              onClick={() => document.getElementById('membership-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-primary hover:bg-primary/90 text-white text-[11px] font-bold px-5 h-9 rounded-xl shadow-lg shadow-primary/20 border-none transition-all active:scale-95"
            >
              Apply Now
            </Button>
          </div>
        </div>
      </nav>

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
                className="h-12 px-8 rounded-sm text-sm font-bold bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xl shadow-slate-900/10 dark:shadow-white/5 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5"
              >
                <BookOpen className="w-5 h-5" />
                Book Service
              </Button>
              <Button
                variant="outline"
                onClick={() => document.getElementById('membership-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="h-12 px-8 rounded-sm text-sm border-[1px] font-bold border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5"
              >
                <UserPlus className="w-5 h-5" />
                Join Membership
              </Button>
            </div>

            {/* Quick Stats - Inline */}
            <div className="flex items-center gap-8 pt-4">
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter">2.4k+</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-light/30">Active Salons</span>
              </div>
              <div className="w-px h-8 bg-border-light dark:border-border-dark" />
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter">98%</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-light/30">Client Joy</span>
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
            <div className="relative group overflow-hidden rounded-3xl border border-border-light dark:border-border-dark shadow-2xl">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600')] bg-cover bg-center brightness-50 contrast-125" />
              <div className="relative p-10 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-2xl animate-bounce-slow overflow-hidden p-2.5">
                  <Image src="/urutisalunilogo.png" alt="Logo" width={44} height={44} className="object-cover" />
                </div>
                <span className="text-xl font-black tracking-tighter text-white">Uruti Saluni<span className="text-primary italic">.cloud</span></span>
              </div>
            </div>

            {/* Ecosystem Highlights - Pulled in */}
            <div className="bg-slate-950 dark:bg-white rounded-3xl p-6 text-white dark:text-slate-950 shadow-2xl space-y-4">
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

      {/* Form Section - Integrated Tight */}
      <section id="membership-form" className="py-8 bg-surface-light/50 dark:bg-surface-dark/50 border-y border-border-light dark:border-border-dark relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-2 md:px-4 relative z-10">
          <div className="text-center mb-4">
            <h2 className="text-3xl font-black text-text-light dark:text-text-dark tracking-tighter">Scalable Membership</h2>
            <p className="text-xs font-bold text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest mt-1">Apply for your digital command center</p>
          </div>
          <MembershipApplicationForm showTitle={false} showProgress={true} compact={true} />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
             style={{ backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
      </section>

      {/* Footer - Ultra Compact */}
      <footer className="bg-background-light dark:bg-background-dark py-12">
        <div className="max-w-7xl mx-auto px-8 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
             <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md border border-primary/20 flex items-center justify-center bg-white shadow-sm overflow-hidden text-[10px] font-black">U</div>
              <span className="text-sm font-black tracking-tighter">Uruti<span className="text-primary">.</span>Saluni</span>
            </Link>
            <p className="text-[10px] font-bold text-text-light/30 dark:text-text-dark/30 uppercase tracking-widest">Digital tools for professional beauty commerce</p>
          </div>
          
          <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-text-light/50">
            <Link href="/login" className="hover:text-primary transition-colors">Sign In</Link>
            <Link href="#membership-form" className="hover:text-primary transition-colors">Apply</Link>
            <div className="flex items-center gap-4 border-l border-border-light pl-8 ml-4">
              <span className="opacity-30">Kigali, Rwanda</span>
            </div>
          </div>
        </div>
        <div className="mt-12 text-[8px] font-bold text-center uppercase tracking-[0.4em] text-text-light/10 dark:text-text-dark/10">
          &copy; {new Date().getFullYear()} UrutiSaluni Platform &bull; Made with pride
        </div>
      </footer>
    </div>
  );
}
