import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'RecoverX - Revenue Recovery',
  description: 'Recover revenue before it becomes lost revenue.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased h-full`}>
      <body className="h-full bg-background flex">
        <Sidebar />
        <div className="flex-1 flex flex-col pl-64 h-full">
          <Header />
          <main className="flex-1 overflow-auto bg-muted/20">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
