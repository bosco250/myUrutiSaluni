import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  var initialTheme = theme || systemTheme;
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
      <body>
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider>
              <QueryProvider>{children}</QueryProvider>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

