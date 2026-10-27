import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Vyfster Focus — Corridor Study Tracker',
  description: 'Track study time, mandatory sessions, leaderboards, and fines for the Vyfster corridor.',
  keywords: 'study tracker, corridor, vyfster, leaderboard, focus, time tracking',
  authors: [{ name: 'Vyfster Corridor' }],
  openGraph: {
    title: 'Vyfster Focus',
    description: 'The Vyfster corridor study tracker & leaderboard platform.',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="bg-noise" />
        <div className="bg-grid" />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#18181B',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#22C55E', secondary: '#18181B' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#18181B' },
            },
          }}
        />
      </body>
    </html>
  );
}
