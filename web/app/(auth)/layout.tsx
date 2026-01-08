'use client';

import { Sparkles, Scissors, CalendarCheck, TrendingUp } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[100svh] w-full bg-background-light dark:bg-background-dark flex overflow-hidden">
      {/* Left Side - Premium Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary to-primary/80 flex-col overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Decorative Circles */}
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-black/20 blur-3xl" />

        {/* Main Content */}
        <div className="relative z-10 flex flex-col justify-center items-start h-full p-6 lg:p-8 xl:p-12">
          {/* Logo Area */}
          <div className="mb-auto pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Uruti Saluni</span>
            </div>
          </div>

          {/* Hero Text */}
          <div className="max-w-md">
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-xs font-semibold text-white uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Premium Salon Management</span>
            </div>
            
            <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-4 leading-tight">
              Your Beauty Business, <span className="text-white/80">Simplified.</span>
            </h1>
            
            <p className="text-sm text-white/70 leading-relaxed mb-6">
              The all-in-one platform trusted by thousands of salons to manage appointments, staff, and finances.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-primary text-xs font-semibold shadow-lg">
                <CalendarCheck className="w-3 h-3" />
                <span>Easy Booking</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white text-xs font-medium border border-white/20">
                <TrendingUp className="w-3 h-3" />
                <span>Smart Analytics</span>
              </div>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="mt-auto pb-4 w-full max-w-md">
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/20">
              <div>
                <p className="text-xl font-bold text-white">2.5k+</p>
                <p className="text-xs text-white/60">Salons</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">50k+</p>
                <p className="text-xs text-white/60">Bookings</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">98%</p>
                <p className="text-xs text-white/60">Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-4 sm:px-6 sm:py-6 md:p-8 relative h-full overflow-hidden">
        <div className="absolute top-4 right-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold text-text-light dark:text-text-dark">Uruti</span>
          </div>
        </div>
        
        {children}
      </div>
    </div>
  );
}
