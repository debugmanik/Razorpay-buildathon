import { demoRepo } from '@/services/data/demoRepository';
import { notFound } from 'next/navigation';
import { RazorpayRecoveryCheckout } from '@/components/payments/RazorpayRecoveryCheckout';
import { Separator } from '@/components/ui/separator';

export const dynamic = 'force-dynamic';

export default async function RecoveryPayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseCtx = await demoRepo.getCaseContext(id);
  
  if (!caseCtx) notFound();
  
  const recoveryOrderId = caseCtx.metadata?.recoveryOrderId as string;
  if (!recoveryOrderId) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-2xl mx-auto w-full mt-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Checkout Not Ready</h1>
        <p className="text-muted-foreground">
          No active recovery payment order found for this case.
        </p>
      </div>
    );
  }

  // The key ID is safe to expose to the client for Razorpay Checkout
  const keyId = process.env.RAZORPAY_KEY_ID || '';

  return (
    <div className="flex flex-col gap-6 p-8 max-w-2xl mx-auto w-full mt-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Complete Payment</h1>
        <p className="text-muted-foreground mt-2">
          Your previous payment failed. Please complete this new payment attempt to restore your service.
        </p>
      </div>
      <Separator />
      
      <div className="border rounded-lg bg-card p-8 shadow-sm text-center">
        <div className="text-sm text-slate-500 mb-2">Amount to recover</div>
        <p className="text-4xl font-bold font-mono tracking-tight text-primary mb-8">
          ₹{caseCtx.amountAtRisk.toLocaleString('en-IN')}
        </p>
        
        <RazorpayRecoveryCheckout 
          orderId={recoveryOrderId} 
          amount={caseCtx.amountAtRisk} 
          currency="INR" 
          keyId={keyId}
          caseId={id}
        />
      </div>
    </div>
  );
}
