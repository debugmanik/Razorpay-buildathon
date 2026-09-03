import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// A simple deterministic pseudo-random number generator
class PRNG {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  nextRange(min: number, max: number) {
    return min + this.next() * (max - min);
  }
  nextInt(min: number, max: number) {
    return Math.floor(this.nextRange(min, max + 1));
  }
  nextElement<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
  nextBoolean(probability: number = 0.5) {
    return this.next() < probability;
  }
}

async function main() {
  console.log('Starting deterministic seed...');
  const prng = new PRNG(12345);

  // Clear existing data safely
  await prisma.auditEvent.deleteMany();
  await prisma.recoveryAction.deleteMany();
  await prisma.recoveryCase.deleteMany();
  await prisma.checkoutSession.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.recoveryPolicy.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.merchant.deleteMany();

  // 1. Create Merchant
  const merchant = await prisma.merchant.create({
    data: {
      id: 'merch_demo_123',
      name: 'RecoverX Demo Merchant',
      email: 'admin@demo-merchant.in',
      currency: 'INR',
    },
  });

  // 2. Create Policies
  const policies = await Promise.all([
    prisma.recoveryPolicy.create({
      data: {
        id: 'pol_payment_standard',
        merchantId: merchant.id,
        name: 'Standard Payment Failure',
        caseType: 'payment_failure',
        maxAttempts: 3,
        cooldownMinutes: 60,
        recoveryWindowHours: 48,
        escalationThreshold: 50000,
      }
    }),
    prisma.recoveryPolicy.create({
      data: {
        id: 'pol_payment_strict',
        merchantId: merchant.id,
        name: 'Strict Payment Retry (Bounded)',
        caseType: 'payment_failure',
        maxAttempts: 2, // Strict limit for Priya Kapoor case
        cooldownMinutes: 30,
        recoveryWindowHours: 24,
        escalationThreshold: 20000,
      }
    }),
    prisma.recoveryPolicy.create({
      data: {
        id: 'pol_checkout_reminder',
        merchantId: merchant.id,
        name: 'Checkout Abandonment Flow',
        caseType: 'checkout_abandonment',
        maxAttempts: 2,
        cooldownMinutes: 120,
        recoveryWindowHours: 72,
        escalationThreshold: 100000,
      }
    }),
    // Create 5 more basic policies...
    ...Array.from({ length: 5 }).map((_, i) => prisma.recoveryPolicy.create({
      data: {
        id: `pol_generic_${i}`,
        merchantId: merchant.id,
        name: `Generic Policy ${i}`,
        caseType: 'subscription_failure',
        maxAttempts: 3,
        cooldownMinutes: 1440,
        recoveryWindowHours: 168,
        escalationThreshold: 5000,
      }
    }))
  ]);

  // 3. Create Specific Customers for Demos
  const aarav = await prisma.customer.create({
    data: {
      id: 'cust_aarav_hero',
      merchantId: merchant.id,
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.in',
      phone: '+919876543210',
    }
  });

  const priya = await prisma.customer.create({
    data: {
      id: 'cust_priya_bounded',
      merchantId: merchant.id,
      name: 'Priya Kapoor',
      email: 'priya.k@example.in',
      phone: '+919876543211',
    }
  });

  // 4. Create Background Customers (approx 30)
  const indianNames = ['Vikram Singh', 'Neha Gupta', 'Rohan Patel', 'Ananya Desai', 'Aditya Verma', 'Riya Joshi', 'Karan Malhotra', 'Sneha Rao', 'Arjun Nair', 'Pooja Reddy'];
  const customers = await Promise.all(
    Array.from({ length: 30 }).map((_, i) => prisma.customer.create({
      data: {
        id: `cust_bg_${i}`,
        merchantId: merchant.id,
        name: indianNames[i % indianNames.length] + ` ${i}`,
        email: `customer${i}@example.in`,
      }
    }))
  );

  const allCustomers = [aarav, priya, ...customers];
  const amounts = [799, 1499, 2999, 4999, 12500, 25000, 84000];

  // 5. Generate Background Payments (approx 60)
  for (let i = 0; i < 60; i++) {
    const cust = prng.nextElement(allCustomers);
    const amt = prng.nextElement(amounts);
    const status = prng.nextElement(['captured', 'captured', 'captured', 'failed', 'failed', 'refunded']);
    
    await prisma.payment.create({
      data: {
        id: `pay_bg_${i}`,
        merchantId: merchant.id,
        customerId: cust.id,
        amount: amt,
        status,
        paymentMethod: prng.nextElement(['upi', 'credit_card', 'debit_card', 'netbanking']),
        failureReason: status === 'failed' ? prng.nextElement(['insufficient_funds', 'network_error', 'bank_timeout']) : null,
      }
    });
  }

  // Generate Background Checkouts (10)
  for (let i = 0; i < 10; i++) {
    await prisma.checkoutSession.create({
      data: {
        id: `chk_bg_${i}`,
        merchantId: merchant.id,
        customerId: prng.nextElement(allCustomers).id,
        amount: prng.nextElement(amounts),
        status: prng.nextElement(['abandoned', 'completed', 'expired']),
      }
    });
  }

  // Generate Background Subscriptions (10)
  for (let i = 0; i < 10; i++) {
    await prisma.subscription.create({
      data: {
        id: `sub_bg_${i}`,
        merchantId: merchant.id,
        customerId: prng.nextElement(allCustomers).id,
        amount: 1499,
        status: prng.nextElement(['active', 'past_due', 'cancelled']),
      }
    });
  }

  // Generate Background Invoices (10)
  for (let i = 0; i < 10; i++) {
    await prisma.invoice.create({
      data: {
        id: `inv_bg_${i}`,
        merchantId: merchant.id,
        customerId: prng.nextElement(allCustomers).id,
        amount: 84000,
        status: prng.nextElement(['paid', 'overdue', 'due']),
      }
    });
  }

  // 6. Generate Background Recovery Cases & Actions & Audits (approx 20)
  for (let i = 0; i < 20; i++) {
    const amt = prng.nextElement(amounts);
    const prob = prng.nextRange(0.1, 0.9);
    
    const rc = await prisma.recoveryCase.create({
      data: {
        id: `case_bg_${i}`,
        merchantId: merchant.id,
        customerId: prng.nextElement(customers).id,
        type: prng.nextElement(['payment_failure', 'checkout_abandonment']),
        status: prng.nextElement(['recovered', 'failed', 'stopped', 'recovering', 'escalated']),
        riskLevel: prng.nextElement(['low', 'medium', 'high']),
        recoveryProbability: prob,
        expectedRecovery: amt * prob,
        amountAtRisk: amt,
      }
    });

    // Action 1
    const act = await prisma.recoveryAction.create({
      data: {
        id: `act_bg_${i}_1`,
        recoveryCaseId: rc.id,
        policyId: policies[0].id,
        type: 'retry_payment',
        status: rc.status === 'recovered' ? 'succeeded' : 'failed',
        attemptNumber: 1,
      }
    });

    // Audits
    await prisma.auditEvent.create({
      data: {
        id: `aud_bg_${i}_1`,
        merchantId: merchant.id,
        recoveryCaseId: rc.id,
        eventType: 'RECOVERY_DETECTED',
        description: 'Revenue at risk detected',
        actor: 'system',
      }
    });
    
    await prisma.auditEvent.create({
      data: {
        id: `aud_bg_${i}_2`,
        merchantId: merchant.id,
        recoveryCaseId: rc.id,
        actionId: act.id,
        eventType: 'ACTION_EXECUTED',
        description: 'Automated retry executed',
        actor: 'system',
      }
    });
  }

  // 7. HERO CASE (Aarav Sharma)
  // 4 previous success
  for (let i = 0; i < 4; i++) {
    await prisma.payment.create({
      data: {
        id: `pay_aarav_succ_${i}`,
        merchantId: merchant.id,
        customerId: aarav.id,
        amount: 12500,
        status: 'captured',
        paymentMethod: 'upi',
      }
    });
  }
  
  // The failed payment
  const heroPayment = await prisma.payment.create({
    data: {
      id: 'pay_aarav_failed',
      merchantId: merchant.id,
      customerId: aarav.id,
      amount: 12500,
      status: 'failed',
      paymentMethod: 'upi',
      failureReason: 'Temporary payment/network failure',
    }
  });

  const heroCase = await prisma.recoveryCase.create({
    data: {
      id: 'case_hero_aarav',
      merchantId: merchant.id,
      customerId: aarav.id,
      paymentId: heroPayment.id,
      type: 'payment_failure',
      status: 'ready',
      riskLevel: 'high',
      recoveryProbability: 0.78,
      amountAtRisk: 12500,
      expectedRecovery: 9750, // 12500 * 0.78
      recommendedAction: 'retry_payment',
      attemptCount: 0,
    }
  });

  await prisma.auditEvent.create({
    data: {
      id: 'aud_hero_1',
      merchantId: merchant.id,
      recoveryCaseId: heroCase.id,
      eventType: 'RECOVERY_DETECTED',
      description: 'Detected ₹12,500 failure for Aarav Sharma',
      actor: 'system',
    }
  });

  await prisma.auditEvent.create({
    data: {
      id: 'aud_hero_2',
      merchantId: merchant.id,
      recoveryCaseId: heroCase.id,
      eventType: 'DIAGNOSIS_COMPLETED',
      description: 'Diagnosis: Temporary network failure. 78% recovery probability.',
      actor: 'system',
    }
  });

  // 8. BOUNDED FAILURE CASE (Priya Kapoor)
  // 3 previous failures
  for (let i = 0; i < 3; i++) {
    await prisma.payment.create({
      data: {
        id: `pay_priya_fail_${i}`,
        merchantId: merchant.id,
        customerId: priya.id,
        amount: 25000,
        status: 'failed',
        paymentMethod: 'credit_card',
        failureReason: 'insufficient_funds',
      }
    });
  }

  const boundedPayment = await prisma.payment.create({
    data: {
      id: 'pay_priya_current',
      merchantId: merchant.id,
      customerId: priya.id,
      amount: 25000,
      status: 'failed',
      paymentMethod: 'credit_card',
      failureReason: 'bank_timeout',
    }
  });

  const boundedCase = await prisma.recoveryCase.create({
    data: {
      id: 'case_bounded_priya',
      merchantId: merchant.id,
      customerId: priya.id,
      paymentId: boundedPayment.id,
      type: 'payment_failure',
      status: 'recovering', // It's currently in process, let's say 2 attempts already failed
      riskLevel: 'critical',
      recoveryProbability: 0.18,
      amountAtRisk: 25000,
      expectedRecovery: 4500, // 25000 * 0.18
      attemptCount: 2,
    }
  });

  // The actions that failed
  const act1 = await prisma.recoveryAction.create({
    data: {
      id: 'act_priya_1',
      recoveryCaseId: boundedCase.id,
      policyId: 'pol_payment_strict',
      type: 'retry_payment',
      status: 'failed',
      attemptNumber: 1,
    }
  });

  const act2 = await prisma.recoveryAction.create({
    data: {
      id: 'act_priya_2',
      recoveryCaseId: boundedCase.id,
      policyId: 'pol_payment_strict',
      type: 'retry_payment',
      status: 'failed',
      attemptNumber: 2,
    }
  });

  // The audit trail for Priya showing it's about to be stopped
  await prisma.auditEvent.create({
    data: {
      id: 'aud_priya_1',
      merchantId: merchant.id,
      recoveryCaseId: boundedCase.id,
      actionId: act1.id,
      eventType: 'ACTION_EXECUTED',
      description: 'Retry #1 executed',
      actor: 'system',
    }
  });

  await prisma.auditEvent.create({
    data: {
      id: 'aud_priya_2',
      merchantId: merchant.id,
      recoveryCaseId: boundedCase.id,
      actionId: act1.id,
      eventType: 'STATUS_CHANGED',
      description: 'Retry #1 failed',
      actor: 'system',
    }
  });

  await prisma.auditEvent.create({
    data: {
      id: 'aud_priya_3',
      merchantId: merchant.id,
      recoveryCaseId: boundedCase.id,
      actionId: act2.id,
      eventType: 'ACTION_EXECUTED',
      description: 'Retry #2 executed',
      actor: 'system',
    }
  });

  await prisma.auditEvent.create({
    data: {
      id: 'aud_priya_4',
      merchantId: merchant.id,
      recoveryCaseId: boundedCase.id,
      actionId: act2.id,
      eventType: 'POLICY_CHECKED',
      description: 'Policy limit reached. Automation stopping.',
      actor: 'system',
    }
  });

  await prisma.auditEvent.create({
    data: {
      id: 'aud_priya_5',
      merchantId: merchant.id,
      recoveryCaseId: boundedCase.id,
      eventType: 'RECOVERY_STOPPED',
      description: 'Merchant escalation created',
      actor: 'system',
    }
  });

  // Update Priya's case status to stopped/escalated to match the requirement exactly
  await prisma.recoveryCase.update({
    where: { id: boundedCase.id },
    data: { status: 'escalated' }
  });

  console.log('Deterministic seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
