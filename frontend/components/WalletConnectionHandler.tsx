'use client';

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';

export function WalletConnectionHandler() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const hasRedirected = useRef(false);
  const prevConnected = useRef(isConnected);

  useEffect(() => {
    // Only redirect when wallet connection changes from false to true (initial connection)
    // Add a small delay to ensure wallet state is fully initialized
    if (!prevConnected.current && isConnected && !hasRedirected.current) {
      hasRedirected.current = true;
      // Small delay to ensure wallet state is properly set
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    }

    // Update the previous connection state
    prevConnected.current = isConnected;
  }, [isConnected, router]);

  return null; // This component doesn't render anything
}