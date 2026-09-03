export class RazorpayAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RazorpayAuthenticationError';
  }
}

export class RazorpayNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RazorpayNetworkError';
  }
}

export class RazorpayClient {
  private keyId: string;
  private keySecret: string;
  private baseUrl = 'https://api.razorpay.com/v1';

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      throw new RazorpayAuthenticationError('Missing Razorpay API credentials. Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set.');
    }
    
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const authHeader = `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new RazorpayAuthenticationError('Invalid Razorpay API credentials.');
        }
        const errorData = await response.json().catch(() => null);
        throw new Error(`Razorpay API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error: unknown) {
      if (error instanceof RazorpayAuthenticationError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new RazorpayNetworkError(`Failed to communicate with Razorpay: ${message}`);
    }
  }

  async getPayment(paymentId: string) {
    return this.request(`/payments/${paymentId}`);
  }

  async getPayments(params?: { from?: number; to?: number; count?: number; skip?: number }) {
    const query = new URLSearchParams();
    if (params) {
      if (params.from) query.append('from', params.from.toString());
      if (params.to) query.append('to', params.to.toString());
      if (params.count) query.append('count', params.count.toString());
      if (params.skip) query.append('skip', params.skip.toString());
    }
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/payments${queryString}`);
  }

  async createOrder(amountInPaise: number, currency: string = 'INR') {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt: `receipt_${Date.now()}`
      })
    });
  }

  getKeyId() {
    return this.keyId;
  }
}
