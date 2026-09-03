export type ProviderType = 'simulation' | 'razorpay';

export function getProviderConfig() {
  const provider = (process.env.RECOVERX_PROVIDER || 'simulation') as ProviderType;
  
  if (provider === 'razorpay') {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay configuration missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }
  }

  return {
    provider,
    label: provider === 'razorpay' ? 'RAZORPAY TEST MODE' : 'SIMULATION',
    isSimulation: provider === 'simulation'
  };
}
