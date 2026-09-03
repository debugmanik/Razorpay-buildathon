import {
  Merchant as PrismaMerchant,
  Customer as PrismaCustomer,
  Payment as PrismaPayment,
  RecoveryCase as PrismaRecoveryCase,
  RecoveryPolicy as PrismaRecoveryPolicy,
  RecoveryAction as PrismaRecoveryAction,
  AuditEvent as PrismaAuditEvent,
  CheckoutSession as PrismaCheckoutSession,
  Subscription as PrismaSubscription,
  Invoice as PrismaInvoice,
} from '@prisma/client';

export type Currency = 'INR' | 'USD';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
export type CaseStatus = 'detected' | 'analyzing' | 'ready' | 'recovering' | 'recovered' | 'failed' | 'stopped' | 'escalated';
export type ActionType = 'create_recovery_payment' | 'retry_payment' | 'send_checkout_recovery' | 'retry_subscription' | 'retry_mandate' | 'send_payment_reminder' | 'start_promise_to_pay' | 'hinglish_recovery_message' | 'manual_review' | 'stop_recovery';
export type CaseType = 'payment_failure' | 'checkout_dropoff' | 'subscription_failure' | 'receivable' | 'mandate_failure';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ActionStatus = 'pending' | 'approved' | 'executing' | 'succeeded' | 'failed' | 'cancelled' | 'blocked';
export type PolicyAction = 'allow' | 'deny' | 'require_approval';
export type PromiseStatus = 'none' | 'promised' | 'due' | 'paid' | 'missed';

// Re-export Prisma types so the application layer can use them seamlessly
export type Merchant = PrismaMerchant;
export type Customer = PrismaCustomer;

// We can extend Prisma types if our UI requires additional computed fields not in DB
export type Payment = PrismaPayment;

export interface RecoveryCase extends PrismaRecoveryCase {
  // We can strongly type the status/type fields that Prisma treats as strings
  status: CaseStatus;
  type: CaseType;
  riskLevel: RiskLevel;
}

export type RecoveryPolicy = PrismaRecoveryPolicy;

export interface RecoveryAction extends PrismaRecoveryAction {
  type: ActionType;
  status: ActionStatus;
}

export type AuditEvent = PrismaAuditEvent;
export type CheckoutSession = PrismaCheckoutSession;
export type Subscription = PrismaSubscription;
export type Invoice = PrismaInvoice;
