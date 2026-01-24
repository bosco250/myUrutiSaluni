import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CompactModeProvider } from '@/context/CompactModeContext'
import { BackendStatusBanner } from '@/components/layout/BackendStatusBanner'

// Optimized font loading with next/font
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap', // Use swap to prevent FOIT (flash of invisible text)
  variable: '--font-manrope',
  preload: true,
})

export const metadata: Metadata = {
  title: 'Salon Association Platform',
  description: 'Integrated digital system for salon operations, membership, accounting, and micro-lending',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={manrope.variable}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var initialTheme = theme || 'light';
                  if (initialTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={manrope.className}>
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider>
              <QueryProvider>
                <BackendStatusBanner />
                <CompactModeProvider>{children}</CompactModeProvider>
              </QueryProvider>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
