import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { demoRepo } from '@/services/data/demoRepository';
import { RecoveryEngine } from '@/services/engine/core';
import { getProvider } from '@/services/providers/factory';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Configuration
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Razorpay webhook secret missing in environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 2. Read Raw Body and Signature
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const eventId = req.headers.get('x-razorpay-event-id');

    if (!signature || !eventId) {
      return NextResponse.json({ error: 'Missing required Razorpay headers' }, { status: 400 });
    }

    // 3. Verify Signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid Razorpay signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 4. Parse JSON now that signature is verified
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
    }

    // 5. Idempotency Check
    if (await demoRepo.hasProcessedEvent(eventId)) {
      return NextResponse.json({ success: true, message: 'Event already processed' }, { status: 200 });
    }

    // 6. Event Processing
    const eventName = payload.event;
    const payment = payload.payload?.payment?.entity;

    if (!payment) {
      return NextResponse.json({ success: true, message: 'Ignored: No payment entity' }, { status: 200 });
    }

    const paymentId = payment.id;
    // Razorpay webhook amount is in paise, convert to INR by dividing by 100
    const amount = (payment.amount || 0) / 100;
    const failureReason = payment.error_description || payment.error_reason || 'Unknown error';
    const method = payment.method || 'Unknown method';

    // Check for stale out-of-order events
    const existingPayment = demoRepo.payments[paymentId] as { status?: string } | undefined;
    if (existingPayment?.status === 'captured' && eventName === 'payment.failed') {
      await demoRepo.markEventProcessed(eventId);
      return NextResponse.json({ success: true, message: 'Ignored stale payment.failed for already captured payment' }, { status: 200 });
    }

    // Normalize and Upsert Payment
    await demoRepo.upsertPayment(paymentId, payment);

    const engine = new RecoveryEngine(demoRepo, getProvider());

    if (eventName === 'payment.failed') {
      const orderId = payment.order_id;
      let caseCtx = await demoRepo.getCaseByPaymentId(paymentId);
      
      // If we don't find it by payment ID, check if this is a failure of a RECOVERY order we created
      if (!caseCtx && orderId) {
        caseCtx = Object.values(demoRepo.cases).find(c => c.metadata?.recoveryOrderId === orderId) || null;
      }
      
      if (caseCtx) {
        // This is a failed payment attempt on an EXISTING case
        if (caseCtx.metadata?.recoveryOrderId === orderId) {
          await demoRepo.saveAudit(caseCtx.id, 'RECOVERY_PAYMENT_FAILED', 'Customer recovery payment attempt failed.');
          await demoRepo.markEventProcessed(eventId);
          return NextResponse.json({ success: true, message: 'Recovery payment attempt failed logged' }, { status: 200 });
        }
        // If it matches by paymentId but it's not a recovery order, just use existing caseId
      }
      
      let caseId = '';
      if (!caseCtx) {
        const customerName = payment.notes?.name || payment.email || payment.contact || 'Razorpay Customer';
        caseId = await demoRepo.createCaseFromPayment(paymentId, amount, failureReason, method, customerName);
      } else {
        caseId = caseCtx.id;
      }

      // Invoke Detection & Domain Orchestration
      await engine.processNextBoundedAction(caseId);
      await demoRepo.markEventProcessed(eventId);

      return NextResponse.json({ success: true, caseId }, { status: 200 });
    }
    
    if (eventName === 'payment.captured' || eventName === 'payment.authorized') {
      const orderId = payment.order_id;
      // First try to find by original payment ID (if it's a late capture of the original)
      let caseCtx = await demoRepo.getCaseByPaymentId(paymentId);
      
      // If not found, see if it correlates to a recovery order we created
      if (!caseCtx && orderId) {
        caseCtx = Object.values(demoRepo.cases).find(c => c.metadata?.recoveryOrderId === orderId) || null;
      }
      
      if (caseCtx) {
        if (caseCtx.status !== 'recovered') {
          await demoRepo.saveCaseState(caseCtx.id, 'recovered', { expectedRecovery: caseCtx.expectedRecovery });
          await demoRepo.markRecoveryActionSuccessful(caseCtx.id, amount);
          await demoRepo.saveAudit(caseCtx.id, 'RAZORPAY_PAYMENT_CAPTURED', `Recovery payment captured for ₹${amount}`);
          await demoRepo.saveAudit(caseCtx.id, 'RECOVERY_COMPLETED', `Successfully recovered ₹${amount}`);
        }
      }

      await demoRepo.markEventProcessed(eventId);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Ignore other events safely
    await demoRepo.markEventProcessed(eventId);
    return NextResponse.json({ success: true, message: `Ignored event: ${eventName}` }, { status: 200 });

  } catch (err: unknown) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
