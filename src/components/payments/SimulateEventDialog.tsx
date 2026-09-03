'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { simulateRevenueEventAction } from '@/app/actions/demo';
import { useRouter } from 'next/navigation';

export function SimulateEventDialog({ triggerText = "Simulate Revenue Event" }: { triggerText?: string }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [successCaseId, setSuccessCaseId] = useState<string | null>(null);
  
  const [eventType, setEventType] = useState('payment_failure');
  const [amount, setAmount] = useState('12500');
  
  const router = useRouter();

  const handleSimulate = async () => {
    setLoading(true);
    setSuccessCaseId(null);
    
    try {
      const res = await simulateRevenueEventAction({ type: eventType, amount: parseInt(amount, 10) });
      if (!res.success) {
        console.error('Failed to simulate:', res.error);
        alert('Failed to simulate event');
        return;
      }
      
      setSuccessCaseId(res.caseId as string);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSuccessCaseId(null);
    }
    setOpen(newOpen);
  };

  return (
    <>
      <Button onClick={() => handleOpenChange(true)} className="w-full font-semibold">{triggerText}</Button>
      
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden relative">
            <button 
              onClick={() => handleOpenChange(false)} 
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2">Simulate Revenue Event</h2>
              <p className="text-sm text-slate-500 mb-6">
                Trigger a revenue-risk scenario to test the recovery engine.
              </p>
              
              {successCaseId ? (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border rounded-md text-center space-y-4">
                  <div className="text-emerald-600 font-medium text-lg">Event Simulated Successfully</div>
                  <div className="text-slate-600 text-sm">Recovery case created automatically.</div>
                  <Button 
                    onClick={() => { handleOpenChange(false); router.push(`/recovery/${successCaseId}`); }} 
                    className="mt-4 font-semibold w-full"
                  >
                    View Recovery Case →
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Event Type</label>
                    <select 
                      value={eventType} 
                      onChange={(e) => setEventType(e.target.value)}
                      className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-slate-900 outline-none"
                    >
                      <option value="payment_failure">Payment Failure</option>
                      <option value="checkout_dropoff">Checkout Drop-off</option>
                      <option value="subscription_failure">Subscription Failure</option>
                      <option value="mandate_failure">Mandate Failure</option>
                      <option value="receivable">Overdue Invoice</option>
                    </select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Amount (₹)</label>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)}
                      className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-slate-900 outline-none"
                    />
                  </div>
                  
                  <Button onClick={handleSimulate} disabled={loading} className="w-full font-semibold mt-4">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Simulating...
                      </>
                    ) : (
                      'Simulate Event'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
