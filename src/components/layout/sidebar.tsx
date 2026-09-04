'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navigationConfig } from '@/config/navigation';
import { ResetDemoButton } from '@/components/layout/ResetDemoButton';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-background flex flex-col h-screen fixed top-0 left-0">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg leading-none">R</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight leading-none">RecoverX</span>
          </div>
        </Link>
        <p className="text-xs text-muted-foreground mt-2 font-medium">Revenue Recovery</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4">
        {navigationConfig.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-secondary text-secondary-foreground" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "")} />
              {item.title}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">Recover revenue before it becomes lost revenue.</p>
        <ResetDemoButton />
      </div>
    </aside>
  );
}
