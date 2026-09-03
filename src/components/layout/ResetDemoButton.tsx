'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';
import { resetDemoData } from '@/app/actions/demo';

export function ResetDemoButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const handleReset = () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000); // reset confirmation state after 3s
      return;
    }

    startTransition(async () => {
      await resetDemoData();
      setConfirming(false);
      router.push('/');
      router.refresh();
    });
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className={`text-xs ${confirming ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700' : 'text-slate-500 hover:text-slate-700'}`}
      onClick={handleReset}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      ) : (
        <RotateCcw className="h-3 w-3 mr-1" />
      )}
      {confirming ? 'Confirm Reset' : 'Reset Demo'}
    </Button>
  );
}
