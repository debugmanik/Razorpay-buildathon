export function formatINR(amount: number, compact: boolean = false): string {
  if (compact) {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2).replace(/\.00$/, '')}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(0)}K`;
    }
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatActionName(action: string): string {
  const map: Record<string, string> = {
    'create_recovery_payment': 'Create Recovery Payment',
    'retry_payment': 'Retry Payment',
    'send_checkout_recovery': 'Send Checkout Recovery',
    'retry_subscription': 'Retry Subscription',
    'retry_mandate': 'Retry Mandate',
    'send_payment_reminder': 'Send Payment Reminder',
    'start_promise_to_pay': 'Start Promise to Pay',
    'hinglish_recovery_message': 'Hinglish Recovery',
    'manual_review': 'Manual Review',
    'escalate': 'Manual Review',
    'stop_recovery': 'Stop Recovery'
  };
  return map[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function formatCaseType(type: string): string {
  const map: Record<string, string> = {
    'payment_failure': 'Payment Failure',
    'checkout_dropoff': 'Checkout Drop-off',
    'subscription_failure': 'Subscription',
    'mandate_failure': 'Mandate',
    'receivable': 'Receivable'
  };
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function formatAuditDescription(description: string): string {
  return description
    .replace(/\bcreate_recovery_payment\b/g, 'Create Recovery Payment')
    .replace(/\bretry_payment\b/g, 'Retry Payment')
    .replace(/\bsend_checkout_recovery\b/g, 'Send Checkout Recovery')
    .replace(/\bretry_subscription\b/g, 'Retry Subscription')
    .replace(/\bretry_mandate\b/g, 'Retry Mandate')
    .replace(/\bsend_payment_reminder\b/g, 'Send Payment Reminder')
    .replace(/\bstart_promise_to_pay\b/g, 'Start Promise to Pay')
    .replace(/\bhinglish_recovery_message\b/g, 'Hinglish Recovery')
    .replace(/\bmanual_review\b/g, 'Manual Review')
    .replace(/\bstop_recovery\b/g, 'Stop Recovery')
    .replace(/\bALREADY_PAID\b/g, 'Already Paid')
    .replace(/\bREMIND_LATER\b/g, 'Remind Me Later')
    .replace(/\bPAY_NOW\b/g, 'Pay Now');
}

export function formatAuditEventType(eventType: string): string {
  return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

