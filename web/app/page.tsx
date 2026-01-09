'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';
import MembershipApplicationForm from '@/components/forms/MembershipApplicationForm';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Package, 
  ShoppingCart,
  Shield,
  CheckCircle,
  ArrowRight,
  Sparkles,
  BarChart3,
  Wallet,
  MapPin,
  Phone,
  Mail,
  ChevronRight
} from 'lucide-react';
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
    {
      icon: Building2,
      title: 'Membership Management',
      description: 'Register and manage salon owners, employees, and members with ease',
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Streamline bookings with an intuitive calendar and scheduling system',
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
    {
      icon: ShoppingCart,
      title: 'Point of Sale (POS)',
      description: 'Complete sales management with inventory tracking and reporting',
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
    {
      icon: Package,
      title: 'Inventory Control',
      description: 'Track products, stock levels, and manage your salon supplies',
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
    {
      icon: DollarSign,
      title: 'Finance & Accounting',
      description: 'Comprehensive financial management with real-time reporting',
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
    {
      icon: CreditCard,
      title: 'Micro-Lending',
      description: 'Access financial services and manage loans for your business',
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
  ];

  const benefits = [
    'Professional salon management tools',
    'Real-time analytics and reporting',
    'Secure payment processing',
    'Mobile-friendly interface',
    '24/7 customer support',
    'Regular platform updates',
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark selection:bg-primary/20 selection:text-primary">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background-light dark:bg-background-dark pt-32 pb-24 lg:pt-40 lg:pb-32">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-full">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-text-light dark:text-text-dark">Professional Salon Management</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-text-light dark:text-text-dark leading-[1.1]">
              Elevate Your
              <span className="block text-primary mt-2">
                Salon Business
              </span>
            </h1>
            
            <p className="text-xl text-text-light/70 dark:text-text-dark/70 max-w-2xl mx-auto leading-relaxed">
              Complete digital platform for salon operations. 
              Manage memberships, bookings, finances, and inventory with professional-grade tools.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button
                onClick={() => {
                  document.getElementById('membership-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="h-14 px-10 rounded-lg text-lg font-semibold bg-primary text-white hover:bg-primary/90 shadow-lg transition-all"
              >
                Apply for Membership
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Link href="/login">
                <Button
                  variant="outline"
                  className="h-14 px-10 rounded-lg text-lg font-semibold border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-all"
                >
                  Sign In
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-surface-light/50 dark:bg-surface-dark/50 border-y border-border-light dark:border-border-dark">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-text-light dark:text-text-dark mb-4">
              Everything You Need
            </h2>
            <p className="text-base text-text-light/60 dark:text-text-dark/60">
              Powerful tools designed specifically for salon businesses, helping you save time and grow revenue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 hover:border-primary/30 transition-all duration-300"
                >
                  <div className={`inline-flex p-3 rounded-lg ${feature.bg} ${feature.color} mb-5 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-light/60 dark:text-text-dark/60 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Membership Application Section */}
      <section id="membership-form" className="py-24 bg-background-light dark:bg-background-dark">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-light dark:text-text-dark mb-4">
              Join Our Network
            </h2>
            <p className="text-base text-text-light/70 dark:text-text-dark/70 max-w-2xl mx-auto">
              Apply for membership to unlock the full potential of your salon business.
            </p>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-lg overflow-hidden">
            <MembershipApplicationForm showTitle={false} showProgress={true} />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-surface-light/30 dark:bg-surface-dark/30 border-t border-border-light dark:border-border-dark">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-text-light dark:text-text-dark mb-6">
                Why Choose Us?
              </h2>
              <p className="text-lg text-text-light/70 dark:text-text-dark/70 mb-8 leading-relaxed">
                We provide an ecosystem that scales with your business, from a single chair to a franchise.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-base text-text-light/80 dark:text-text-dark/80">
                      {benefit}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-8 border border-border-light dark:border-border-dark shadow-lg">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-1">Bank-Grade Security</h3>
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                        Your data is encrypted and protected with enterprise-level security protocols.
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-full h-px bg-border-light dark:bg-border-dark" />
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-1">Real-Time Analytics</h3>
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                        Make informed decisions with live dashboards and comprehensive reports.
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-full h-px bg-border-light dark:bg-border-dark" />
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-1">Financial Growth</h3>
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60">
                        Access micro-loans and manage your cash flow effectively.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-surface-light/50 dark:bg-surface-dark/50 border-t border-border-light dark:border-border-dark">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-text-light dark:text-text-dark">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-text-light/70 dark:text-text-dark/70 mb-10 max-w-2xl mx-auto">
            Join hundreds of salon owners who are already transforming their business with our platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => {
                document.getElementById('membership-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="h-14 px-10 rounded-lg text-lg font-semibold bg-primary text-white hover:bg-primary/90 shadow-lg transition-all"
            >
              Apply Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Link href="/login">
              <Button
                variant="outline"
                className="h-14 px-10 rounded-lg text-lg font-semibold border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-all"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <span className="text-xl font-bold text-text-light dark:text-text-dark tracking-tight">
                Uruti<span className="text-primary">Saluni</span>
              </span>
              <p className="mt-4 text-sm text-text-light/60 dark:text-text-dark/60 leading-relaxed">
                Empowering salon businesses with next-generation digital tools.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm text-text-light dark:text-text-dark uppercase tracking-wider mb-4">Platform</h3>
              <ul className="space-y-3 text-sm text-text-light/60 dark:text-text-dark/60">
                <li><Link href="#membership-form" className="hover:text-primary transition-colors">Membership</Link></li>
                <li><Link href="/login" className="hover:text-primary transition-colors">Sign In</Link></li>
                <li><Link href="/register" className="hover:text-primary transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm text-text-light dark:text-text-dark uppercase tracking-wider mb-4">Features</h3>
              <ul className="space-y-3 text-sm text-text-light/60 dark:text-text-dark/60">
                <li>Salon Management</li>
                <li>Appointment Scheduling</li>
                <li>Financial Tools</li>
                <li>Inventory Management</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm text-text-light dark:text-text-dark uppercase tracking-wider mb-4">Contact</h3>
              <ul className="space-y-3 text-sm text-text-light/60 dark:text-text-dark/60">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  support@urutisaluni.com
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  +250 7XX XXX XXX
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Kigali, Rwanda
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border-light dark:border-border-dark text-center text-sm text-text-light/40 dark:text-text-dark/40">
            <p>&copy; {new Date().getFullYear()} UrutiSaluni Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
