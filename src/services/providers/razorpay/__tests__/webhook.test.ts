import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/razorpay/route';
import { demoRepo } from '@/services/data/demoRepository';
import crypto from 'crypto';

describe('Razorpay Webhook Handler', () => {
  const webhookSecret = 'test_secret_123';
  
  beforeAll(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
    process.env.RECOVERX_PROVIDER = 'simulation'; // engine execution won't fail
  });

  beforeEach(() => {
    // Reset idempotency state
    demoRepo.processedEventIds = new Set();
  });

  function createRequest(body: unknown, secret: string, eventId: string) {
    const rawBody = JSON.stringify(body);
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    
    return new NextRequest('http://localhost:3000/api/webhooks/razorpay', {
      method: 'POST',
      body: rawBody,
      headers: {
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': eventId,
        'content-type': 'application/json',
      }
    });
  }

  function createInvalidSignatureRequest(body: unknown, eventId: string) {
    const rawBody = JSON.stringify(body);
    
    return new NextRequest('http://localhost:3000/api/webhooks/razorpay', {
      method: 'POST',
      body: rawBody,
      headers: {
        'x-razorpay-signature': 'invalid_signature_string',
        'x-razorpay-event-id': eventId,
        'content-type': 'application/json',
      }
    });
  }

  function createMissingSignatureRequest(body: unknown, eventId: string) {
    const rawBody = JSON.stringify(body);
    
    return new NextRequest('http://localhost:3000/api/webhooks/razorpay', {
      method: 'POST',
      body: rawBody,
      headers: {
        'x-razorpay-event-id': eventId,
        'content-type': 'application/json',
      }
    });
  }

  it('rejects missing signature', async () => {
    const req = createMissingSignatureRequest({}, 'evt_missing');
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects invalid signature', async () => {
    const req = createInvalidSignatureRequest({}, 'evt_invalid');
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('ignores duplicate event ID idempotently', async () => {
    const payload = { event: 'payment.failed', payload: { payment: { entity: { id: 'pay_idempotent' } } } };
    demoRepo.processedEventIds.add('evt_duplicate');
    
    const req = createRequest(payload, webhookSecret, 'evt_duplicate');
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe('Event already processed');
  });

  it('processes payment.failed and detects revenue risk', async () => {
    const payload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_fail_test',
            amount: 1250000, // 1,250,000 paise = 12,500 INR
            error_description: 'Test network error',
            method: 'upi'
          }
        }
      }
    };

    const req = createRequest(payload, webhookSecret, 'evt_fail_1');
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.caseId).toBeDefined();

    // Verify it was persisted correctly in demoRepo
    const caseCtx = await demoRepo.getCaseByPaymentId('pay_fail_test');
    expect(caseCtx).toBeDefined();
    // 1250000 paise should become 12500 INR
    expect(caseCtx?.amountAtRisk).toBe(12500);
    expect(caseCtx?.paymentDetails?.failureReason).toBe('Test network error');
    // Ensure it transition past detected via processing and does NOT escalate due to amount threshold
    expect(['analyzing', 'ready', 'recovering', 'recovered']).toContain(caseCtx?.status);
    expect(caseCtx?.status).not.toBe('escalated');
  });

  it('processes payment.captured and confirms recovery', async () => {
    const caseId = await demoRepo.createCaseFromPayment('pay_cap_test', 50000, 'Test error', 'upi');
    demoRepo.cases[caseId].status = 'ready'; // simulated starting state
    
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_cap_test',
            amount: 50000,
          }
        }
      }
    };

    const req = createRequest(payload, webhookSecret, 'evt_cap_1');
    const res = await POST(req);
    
    expect(res.status).toBe(200);

    const caseCtx = await demoRepo.getCaseByPaymentId('pay_cap_test');
    expect(caseCtx?.status).toBe('recovered');
  });

  it('ignores payment.failed if payment is already captured (stale/out-of-order event)', async () => {
    // 1. Send captured event first
    const capturedPayload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_out_of_order', amount: 100000, status: 'captured' } } }
    };
    await POST(createRequest(capturedPayload, webhookSecret, 'evt_cap_ooo'));
    
    // 2. Send failed event later
    const failedPayload = {
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_out_of_order', amount: 100000, status: 'failed', error_description: 'Test' } } }
    };
    const res = await POST(createRequest(failedPayload, webhookSecret, 'evt_fail_ooo'));
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.message).toContain('Ignored stale payment.failed');
    
    const payment = demoRepo.payments['pay_out_of_order'] as { status?: string };
    expect(payment?.status).toBe('captured'); 
    
    // Ensure no case was mistakenly fabricated by the failed event
    const caseCtx = await demoRepo.getCaseByPaymentId('pay_out_of_order');
    expect(caseCtx).toBeNull(); // Because captured didn't have a case, and failed was ignored
  });
  it('TEST F - Complete recovery after a recovery-payment failure', async () => {
    // 1. Create a RecoveryCase from payment.failed
    const failedPayload1 = {
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_test_f', amount: 1500000, error_description: 'Test' } } }
    };
    const res1 = await POST(createRequest(failedPayload1, webhookSecret, 'evt_tf_1'));
    const data1 = await res1.json();
    const caseId = data1.caseId;
    
    let caseCtx = await demoRepo.getCaseContext(caseId);
    expect(caseCtx).toBeDefined();

    // 2. Create a recovery payment
    // Simulate action creation by directly updating metadata as the action provider would
    demoRepo.cases[caseId].metadata = { ...demoRepo.cases[caseId].metadata, recoveryOrderId: 'order_test_f' };
    demoRepo.cases[caseId].status = 'recovering';

    // 4. Intentionally fail the recovery payment
    const failedRecoveryPayload = {
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_recovery_f', order_id: 'order_test_f', amount: 1500000, error_description: 'Card declined' } } }
    };
    const res2 = await POST(createRequest(failedRecoveryPayload, webhookSecret, 'evt_tf_2'));
    expect(res2.status).toBe(200);
    
    // 5. Confirm: NO second RecoveryCase is created.
    const duplicateCase = await demoRepo.getCaseByPaymentId('pay_recovery_f');
    expect(duplicateCase).toBeNull();
    
    // Original case remains the same case.
    caseCtx = await demoRepo.getCaseContext(caseId);
    expect(caseCtx?.status).toBe('recovering'); // still recovering, not failed/ready because it just logged an audit
    
    // RECOVERY_PAYMENT_FAILED audit event is recorded exactly once.
    const audits = demoRepo.getAuditsForCase(caseId);
    const failAudits = audits.filter(a => a.eventType === 'RECOVERY_PAYMENT_FAILED');
    expect(failAudits.length).toBe(1);
    
    // 7. Successfully complete the customer payment.
    const capturedPayload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_success_f', order_id: 'order_test_f', amount: 1500000 } } }
    };
    await POST(createRequest(capturedPayload, webhookSecret, 'evt_tf_3'));
    
    // 8. Confirm payment.captured transitions the correct case to recovered
    caseCtx = await demoRepo.getCaseContext(caseId);
    expect(caseCtx?.status).toBe('recovered');
    
    // creates the appropriate audit events exactly once.
    const recoveredAudits = demoRepo.getAuditsForCase(caseId).filter(a => a.eventType === 'RECOVERY_COMPLETED');
    expect(recoveredAudits.length).toBe(1);
    
    // 9. Replay the same payment.captured event and confirm nothing is duplicated.
    await POST(createRequest(capturedPayload, webhookSecret, 'evt_tf_3'));
    const recoveredAuditsAfter = demoRepo.getAuditsForCase(caseId).filter(a => a.eventType === 'RECOVERY_COMPLETED');
    expect(recoveredAuditsAfter.length).toBe(1);
  });
});
