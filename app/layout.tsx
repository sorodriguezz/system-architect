import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SysArchitect — Visual System Design & Simulation',
  description: 'Design, visualize and simulate distributed system architectures in real-time',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Inter', sans-serif", height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
