'use client';

import { useState, useRef } from 'react';
import { User, Settings, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { Badge } from '@/components/ui/badge';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useOnClickOutside(wrapperRef, () => setIsOpen(false));

  const navigateTo = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`h-8 w-8 rounded-full flex items-center justify-center border transition-colors ${isOpen ? 'bg-slate-200 border-slate-300' : 'bg-secondary hover:bg-slate-200'}`}
      >
        <User className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden z-50">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-md flex items-center justify-center shrink-0">
                <Building className="h-5 w-5 text-indigo-700" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-semibold text-sm text-slate-900 truncate">RecoverX Merchant</span>
                <span className="text-xs text-slate-500 truncate">Demo Merchant</span>
              </div>
            </div>
            <div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium text-[10px]">
                Razorpay Test Mode
              </Badge>
            </div>
          </div>
          
          <div className="p-1">
            <button
              onClick={() => navigateTo('/settings')}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-sm flex items-center gap-2 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
