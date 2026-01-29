'use client';

import Link from 'next/link';
import Image from 'next/image';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin, 
  MapPin, 
  Mail, 
  Phone,
  ArrowRight
} from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { label: 'About Us', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Partners', href: '#' },
      { label: 'News', href: '#' },
    ],
    resources: [
      { label: 'Documentation', href: '#' },
      { label: 'Help Center', href: '#' },
      { label: 'Tutorials', href: '#' },
      { label: 'Blog', href: '#' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
      { label: 'GDPR', href: '#' },
    ],
  };

  const socialLinks = [
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ];

  return (
    <footer className="bg-background-light dark:bg-background-dark border-t border-border-light dark:border-border-dark pt-10 pb-6">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 mb-10">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 relative overflow-hidden rounded-lg border border-border-light dark:border-border-dark flex items-center justify-center bg-white shadow-sm transition-all group-hover:scale-105">
                <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-cover" />
              </div>
              <span className="text-lg font-black text-text-light dark:text-text-dark tracking-tighter leading-none">
                Uruti<span className="text-primary">.</span>
              </span>
            </Link>
            <p className="text-xs text-text-light/60 dark:text-text-dark/60 leading-relaxed max-w-sm font-medium">
              Empowering Rwanda's beauty industry with professional digital tools. Manage bookings, inventory, and finance in one unified platform.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social, i) => (
                <Link 
                  key={i} 
                  href={social.href} 
                  className="w-8 h-8 rounded-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-center justify-center text-text-light/60 dark:text-text-dark/60 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all group"
                  aria-label={social.label}
                >
                  <social.icon className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                </Link>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-2 md:col-span-4">
            <h4 className="font-extrabold text-xs uppercase tracking-widest text-text-light dark:text-text-dark mb-3">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 md:col-span-4">
            <h4 className="font-extrabold text-xs uppercase tracking-widest text-text-light dark:text-text-dark mb-3">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="text-xs font-medium text-text-light/60 dark:text-text-dark/60 hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact / Newsletter Column */}
          <div className="lg:col-span-4 md:col-span-4 space-y-4">
            <h4 className="font-extrabold text-xs uppercase tracking-widest text-text-light dark:text-text-dark mb-3">Contact & Updates</h4>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-xs font-medium text-text-light/60 dark:text-text-dark/60">
                  KG 622 St, Kigali, Rwanda<br />
                  Fairview Building, 3rd Floor
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-text-light/60 dark:text-text-dark/60">
                  +250 788 000 000
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-text-light/60 dark:text-text-dark/60">
                  support@urutisaluni.cloud
                </span>
              </div>
            </div>

            <div className="pt-2">
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="Enter email for updates" 
                  className="w-full h-10 pl-3 pr-10 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs font-medium transition-all"
                />
                <button 
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                  aria-label="Subscribe"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[9px] text-text-light/40 dark:text-text-dark/40 mt-1.5 font-medium">
                Subscribe for platform updates and salon growth tips.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border-light dark:border-border-dark flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-text-light/40 dark:text-text-dark/40 uppercase tracking-widest">
            &copy; {currentYear} Uruti Saluni. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            {footerLinks.legal.map((link, i) => (
              <Link key={i} href={link.href} className="text-[9px] font-bold uppercase tracking-widest text-text-light/40 dark:text-text-dark/40 hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
