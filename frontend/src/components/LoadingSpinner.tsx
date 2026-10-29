import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = 'Streaming data series...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 card">
      <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
      <p className="text-xs font-mono text-slate-400 tracking-wide">{message}</p>
    </div>
  );
}
