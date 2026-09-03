import { SimulationActionProvider } from './SimulationActionProvider';
import { RazorpayActionProvider } from './RazorpayActionProvider';

export function getProvider() {
  const provider = process.env.RECOVERX_PROVIDER || 'simulation';
  
  if (provider === 'razorpay') {
    return new RazorpayActionProvider(); // Will throw RazorpayAuthenticationError if env vars are missing
  }
  
  return new SimulationActionProvider();
}
