'use client';

import { useState } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export function RazorpayTestCheckout({ buttonText }: { buttonText?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/razorpay/order', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize checkout');
      }

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: 'RecoverX Test',
        description: 'Developer Verification Checkout',
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
        handler: function () {
          setMessage('Payment submitted — waiting for Razorpay confirmation via webhook.');
        },
        theme: {
          color: '#0f172a',
        },
      };

      // @ts-expect-error - Razorpay is loaded dynamically
      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function () {
        setMessage('Payment failure simulated. Webhook delivered to RecoverX. You can now close this and return to the dashboard.');
      });

      rzp.open();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'An error occurred during checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <Button 
        onClick={handlePayment} 
        disabled={loading}
        size="lg"
        className="w-full max-w-xs mx-auto font-semibold"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Initializing...
          </>
        ) : (
          buttonText || 'Pay ₹12,500'
        )}
      </Button>

      {message && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <p className="text-sm text-center font-medium text-slate-700 bg-slate-50 border p-3 rounded-md w-full">
            {message}
          </p>
          {message.includes('failure simulated') && (
            <Link href="/" className="text-indigo-600 text-sm font-semibold hover:underline">
              Return to RecoverX Dashboard
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
