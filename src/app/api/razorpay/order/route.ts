import { NextResponse } from 'next/server';
import { getProviderConfig } from '@/services/providers/config';
import { RazorpayClient } from '@/services/providers/razorpay/client';

export async function POST() {
  const providerConfig = getProviderConfig();

  if (providerConfig.provider !== 'razorpay') {
    return NextResponse.json(
      { error: 'Razorpay provider is not active.' },
      { status: 400 }
    );
  }

  try {
    const client = new RazorpayClient();
    const amount = 1250000; // ₹12,500
    const currency = 'INR';

    const order = await client.createOrder(amount, currency);

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: client.getKeyId(),
    });
  } catch (error: unknown) {
    console.error('Order creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create order.' },
      { status: 500 }
    );
  }
}
