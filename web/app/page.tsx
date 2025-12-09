'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';
import MembershipApplicationForm from '@/components/forms/MembershipApplicationForm';
import { 
  Building2, 
  Users, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Package, 
  ShoppingCart,
  TrendingUp,
  Shield,
  CheckCircle,
  ArrowRight,
  Sparkles,
  BarChart3,
  Wallet,
  MapPin,
  Phone,
  Mail
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
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Calendar,
      title: 'Appointment Scheduling',
      description: 'Streamline bookings with an intuitive calendar and scheduling system',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: ShoppingCart,
      title: 'Point of Sale (POS)',
      description: 'Complete sales management with inventory tracking and reporting',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Package,
      title: 'Inventory Management',
      description: 'Track products, stock levels, and manage your salon supplies',
      gradient: 'from-orange-500 to-red-500',
    },
    {
      icon: DollarSign,
      title: 'Accounting & Finance',
      description: 'Comprehensive financial management with real-time reporting',
      gradient: 'from-indigo-500 to-violet-500',
    },
    {
      icon: CreditCard,
      title: 'Micro-Lending',
      description: 'Access financial services and manage loans for your business',
      gradient: 'from-yellow-500 to-amber-500',
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-cyan-600 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-white/20">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Join the Salon Association</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Transform Your Salon Business
              <span className="block text-cyan-200">With Digital Excellence</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Integrated digital platform for salon operations, membership management, 
              accounting, and micro-lending. Everything you need in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={() => {
                  document.getElementById('membership-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                variant="primary"
                className="bg-white text-primary hover:bg-blue-50 px-8 py-4 text-lg font-semibold shadow-xl"
              >
                Apply for Membership
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Link href="/login">
                <Button
                  variant="secondary"
                  className="bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20 px-8 py-4 text-lg font-semibold"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-background-light dark:bg-background-dark">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-text-light dark:text-text-dark mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-text-light/60 dark:text-text-dark/60 max-w-2xl mx-auto">
              Comprehensive tools designed specifically for salon businesses and associations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-text-light/60 dark:text-text-dark/60">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Membership Application Section */}
      <section id="membership-form" className="py-20 md:py-32 bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-text-light dark:text-text-dark mb-4">
              Join Our Association
            </h2>
            <p className="text-lg text-text-light/60 dark:text-text-dark/60 max-w-2xl mx-auto">
              Apply for membership to access all platform features and start managing your salon business digitally
            </p>
          </div>

          <MembershipApplicationForm showTitle={false} showProgress={true} />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 md:py-32 bg-background-light dark:bg-background-dark">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-text-light dark:text-text-dark mb-6">
                Why Choose Our Platform?
              </h2>
              <p className="text-lg text-text-light/60 dark:text-text-dark/60 mb-8">
                We provide everything you need to run a successful salon business, 
                from appointment scheduling to financial management.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success/20 flex items-center justify-center mt-0.5">
                      <CheckCircle className="w-4 h-4 text-success" />
                    </div>
                    <p className="text-text-light dark:text-text-dark font-medium">
                      {benefit}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-primary/10 to-cyan-500/10 rounded-3xl p-8 border border-primary/20">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-text-light dark:text-text-dark">Secure & Reliable</h3>
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60">Your data is protected with enterprise-grade security</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-text-light dark:text-text-dark">Real-Time Analytics</h3>
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60">Make data-driven decisions with comprehensive insights</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-text-light dark:text-text-dark">Financial Tools</h3>
                      <p className="text-sm text-text-light/60 dark:text-text-dark/60">Manage payments, loans, and accounting seamlessly</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary via-blue-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of salon owners who are already using our platform to grow their business
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => {
                document.getElementById('membership-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              variant="primary"
              className="bg-white text-primary hover:bg-blue-50 px-8 py-4 text-lg font-semibold shadow-xl"
            >
              Apply Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Link href="/login">
              <Button
                variant="secondary"
                className="bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20 px-8 py-4 text-lg font-semibold"
              >
                Sign In to Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-text-light dark:text-text-dark mb-4">Platform</h3>
              <ul className="space-y-2 text-text-light/60 dark:text-text-dark/60">
                <li><Link href="#membership-form" className="hover:text-primary transition">Membership</Link></li>
                <li><Link href="/login" className="hover:text-primary transition">Sign In</Link></li>
                <li><Link href="/register" className="hover:text-primary transition">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-text-light dark:text-text-dark mb-4">Features</h3>
              <ul className="space-y-2 text-text-light/60 dark:text-text-dark/60">
                <li>Salon Management</li>
                <li>Appointment Scheduling</li>
                <li>Financial Tools</li>
                <li>Inventory Management</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-text-light dark:text-text-dark mb-4">Contact</h3>
              <ul className="space-y-2 text-text-light/60 dark:text-text-dark/60">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  support@salonassociation.com
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +250 7XX XXX XXX
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Kigali, Rwanda
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border-light dark:border-border-dark text-center text-text-light/60 dark:text-text-dark/60">
            <p>&copy; {new Date().getFullYear()} Salon Association Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
