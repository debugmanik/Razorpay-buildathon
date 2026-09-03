import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/format';
import { demoRepo } from '@/services/data/demoRepository';
import { getProviderConfig } from '@/services/providers/config';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { RazorpayRecoveryCheckout } from '@/components/payments/RazorpayRecoveryCheckout';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const providerConfig = getProviderConfig();
  const keyId = process.env.RAZORPAY_KEY_ID || '';

  // ONLY show cases that are in "recovering" state and already have a recovery order ID
  const activeCases = Object.values(demoRepo.cases)
    .filter(c => c.status === 'recovering' && c.metadata?.recoveryOrderId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 pb-24 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recovery Checkout</h1>
          <p className="text-slate-500 mt-1">Open a customer payment checkout for an approved recovery opportunity.</p>
        </div>
        <div className="flex items-center">
          <Badge variant="outline" className={`ml-auto ${providerConfig.provider === 'razorpay' ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}>
            {providerConfig.provider === 'razorpay' ? 'RAZORPAY TEST MODE' : 'SIMULATION'}
          </Badge>
        </div>
      </div>
      <Separator />

      {activeCases.length === 0 ? (
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
            <ShoppingCart className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No active recovery checkouts</h3>
            <p className="text-slate-500 mb-6 max-w-sm">
              No customer payments waiting for completion. Ready cases must first have a recovery payment created.
            </p>
            <Link href="/recovery">
              <Button>View Recovery Opportunities</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Recovery Payments</CardTitle>
              <CardDescription>Customer checkouts awaiting payment completion.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeCases.map((c) => (
                  <div key={c.id} className="flex flex-col md:flex-row md:items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-all">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full items-center">
                      
                      <div className="flex flex-col justify-center">
                        <p className="text-sm font-semibold text-slate-900">{c.metadata?.customerName as string || 'Razorpay Customer'}</p>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">{c.id}</p>
                      </div>
                      
                      <div className="flex flex-col justify-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Amount</p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">{formatINR(c.amountAtRisk)}</p>
                      </div>
                      
                      <div className="flex flex-col justify-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Recovery Order</p>
                        <p className="text-xs font-mono text-slate-700 mt-0.5">{c.metadata?.recoveryOrderId as string}</p>
                      </div>

                      <div className="flex flex-col justify-center md:items-end gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{c.status}</span>
                        </div>
                        <RazorpayRecoveryCheckout
                          orderId={c.metadata?.recoveryOrderId as string}
                          amount={c.amountAtRisk}
                          currency="INR"
                          keyId={keyId}
                          buttonSize="sm"
                          buttonText="Open Customer Checkout"
                          buttonClassName="w-full md:w-auto"
                          containerClassName="w-full md:w-auto"
                        />
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
