'use client';

import { useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

type Props = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  caseId?: string;
  buttonText?: string;
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonClassName?: string;
  containerClassName?: string;
};

export function RazorpayRecoveryCheckout({ 
  orderId, 
  amount, 
  currency, 
  keyId, 
  caseId,
  buttonText, 
  buttonSize = "lg", 
  buttonClassName, 
  containerClassName 
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handlePayment = async () => {
    setLoading(true);
    setMessage(null);

    // If orderId is a simulated order (e.g. ends with _sim) or keyId is empty,
    // do not send the fake order to live Razorpay servers (which rejects it with 'Payment Failed').
    // Instead, safely complete the simulated recovery payment.
    const isSimulated = !orderId || orderId.endsWith('_sim') || !keyId || keyId === '';

    if (isSimulated) {
      try {
        const { completeRecoveryPaymentAction } = await import('@/app/actions/recovery');
        const res = await completeRecoveryPaymentAction(caseId || '', amount);
        if (res.success) {
          setMessage('Simulated recovery payment captured successfully!');
          router.refresh();
        } else {
          setMessage(res.error || 'Failed to complete simulated payment');
        }
      } catch (error: unknown) {
        setMessage(error instanceof Error ? error.message : 'An error occurred during checkout.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const options = {
        key: keyId,
        amount: Math.round(amount * 100), // in paise
        currency: currency,
        order_id: orderId,
        name: 'RecoverX Recovery Payment',
        description: 'Recovery Payment',
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay using UPI',
                instruments: [
                  {
                    method: 'upi',
                    flows: ['qr', 'intent'],
                  },
                ],
              },
              other: {
                name: 'Cards, Netbanking & Wallets',
                instruments: [
                  { method: 'card' },
                  { method: 'netbanking' },
                  { method: 'wallet' },
                ],
              },
            },
            sequence: ['block.upi', 'block.other'],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        handler: async function (response: { razorpay_payment_id?: string }) {
          setMessage('Payment submitted — confirming recovery...');
          if (caseId) {
            try {
              const { completeRecoveryPaymentAction } = await import('@/app/actions/recovery');
              await completeRecoveryPaymentAction(caseId, amount, response?.razorpay_payment_id);
            } catch (err) {
              console.error('Error confirming recovery payment:', err);
            }
          }
          router.refresh();
        },
        theme: {
          color: '#0f172a',
        },
      };

      // @ts-expect-error - Razorpay is loaded dynamically
      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function () {
        setMessage('Payment failed. Please try another method or retry.');
      });

      rzp.open();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'An error occurred during checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${containerClassName || ''}`}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <Button 
        onClick={handlePayment} 
        disabled={loading}
        size={buttonSize}
        className={buttonClassName || "w-full max-w-xs mx-auto font-semibold"}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Initializing...
          </>
        ) : (
          buttonText || 'Complete Payment'
        )}
      </Button>

      {message && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <p className="text-sm text-center font-medium text-slate-700 bg-slate-50 border p-3 rounded-md w-full">
            {message}
          </p>
          <Link href="/" className="text-indigo-600 text-sm font-semibold hover:underline">
            Return to RecoverX Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
