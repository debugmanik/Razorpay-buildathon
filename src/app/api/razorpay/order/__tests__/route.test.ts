import { POST } from '../route';
import { getProviderConfig } from '@/services/providers/config';
import { RazorpayClient } from '@/services/providers/razorpay/client';

// Mock dependencies
jest.mock('@/services/providers/config', () => ({
  getProviderConfig: jest.fn(),
}));

jest.mock('@/services/providers/razorpay/client', () => {
  return {
    RazorpayClient: jest.fn().mockImplementation(() => {
      return {
        createOrder: jest.fn(),
        getKeyId: jest.fn().mockReturnValue('rzp_test_key_123'),
      };
    }),
  };
});

describe('POST /api/razorpay/order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects order creation if provider is not razorpay', async () => {
    (getProviderConfig as jest.Mock).mockReturnValue({ provider: 'simulation' });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Razorpay provider is not active.');
  });

  it('handles missing credentials/client init errors cleanly', async () => {
    (getProviderConfig as jest.Mock).mockReturnValue({ provider: 'razorpay' });
    (RazorpayClient as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Missing credentials');
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create order.');
  });

  it('handles Razorpay API failures securely', async () => {
    (getProviderConfig as jest.Mock).mockReturnValue({ provider: 'razorpay' });
    
    const mockCreateOrder = jest.fn().mockRejectedValue(new Error('Razorpay API error details'));
    (RazorpayClient as jest.Mock).mockImplementationOnce(() => ({
      createOrder: mockCreateOrder,
      getKeyId: jest.fn(),
    }));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create order.');
  });

  it('successfully creates an order and returns safe fields', async () => {
    (getProviderConfig as jest.Mock).mockReturnValue({ provider: 'razorpay' });
    
    const mockOrder = {
      id: 'order_123',
      amount: 1250000,
      currency: 'INR',
      receipt: 'receipt_123',
      status: 'created',
      attempts: 0,
    };
    
    const mockCreateOrder = jest.fn().mockResolvedValue(mockOrder);
    (RazorpayClient as jest.Mock).mockImplementationOnce(() => ({
      createOrder: mockCreateOrder,
      getKeyId: jest.fn().mockReturnValue('rzp_test_key_123'),
    }));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.order_id).toBe('order_123');
    expect(data.amount).toBe(1250000);
    expect(data.currency).toBe('INR');
    expect(data.key_id).toBe('rzp_test_key_123');
    
    // Ensure no secrets are leaked
    expect(data.keySecret).toBeUndefined();
    expect(data.secret).toBeUndefined();
    
    expect(mockCreateOrder).toHaveBeenCalledWith(1250000, 'INR');
  });
});
