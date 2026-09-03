'use client';

import { useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getRecentActivityAction, ActivityEvent } from '@/app/actions/header';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useOnClickOutside(wrapperRef, () => setIsOpen(false));

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (newIsOpen) {
      setIsLoading(true);
      getRecentActivityAction(5)
        .then(setEvents)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  };

  const handleSelect = (caseId: string) => {
    setIsOpen(false);
    if (caseId) {
      router.push(`/recovery/${caseId}`);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className={`text-muted-foreground transition-colors ${isOpen ? 'bg-slate-100 text-slate-900' : ''}`}
        onClick={handleToggle}
      >
        <Bell className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-sm text-slate-900">Recent Activity</h3>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-slate-500 text-center">Loading...</div>
            ) : events.length > 0 ? (
              events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleSelect(event.caseId)}
                  className="w-full text-left p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-slate-900 truncate">{event.eventType.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{event.description}</p>
                </button>
              ))
            ) : (
              <div className="p-4 text-sm text-slate-500 text-center">
                No recent activity.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
