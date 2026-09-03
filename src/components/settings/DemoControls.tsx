'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { resetDemoData } from '@/app/actions/demo';

export function DemoControls() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    try {
      const res = await resetDemoData();
      if (!res?.success) {
        alert(res?.error || 'Failed to reset demo data');
        return;
      }
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
      
    } catch (error) {
      console.error(error);
      alert('An unexpected error occurred while resetting demo data.');
    }
  };

  return (
    <>
      <Button 
        variant="destructive" 
        onClick={() => setOpen(true)}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Reset Demo Data
      </Button>
      
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden relative p-6">
            <h2 className="text-xl font-bold mb-2">Reset Demo Data</h2>
            
            {success ? (
              <div className="flex flex-col items-center justify-center py-6 text-emerald-600">
                <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="font-semibold text-lg">Demo data reset successfully.</p>
                <p className="text-sm text-slate-500 mt-2">Redirecting to Overview...</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-6">
                  This will permanently delete all simulated cases, payments, and audit logs. The system will be re-seeded with the initial hero scenario. 
                  <br/><br/>
                  <strong className="text-rose-600">Note:</strong> Razorpay credentials and core configurations are completely safe and will not be deleted.
                </p>
                
                <div className="flex items-center justify-end space-x-3">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => startTransition(() => handleReset())} disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      'Confirm Reset'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
