'use client';

import { useState, useCallback } from 'react';
import { createSiweMessage, generateSiweNonce } from 'viem/siwe';
import { useAccount, usePublicClient, useSignMessage } from 'wagmi';

interface SignInProps {
  onSignedIn?: (address: string) => void;
  className?: string;
}

export function SignIn({ onSignedIn, className }: SignInProps) {
  const { address, chainId, isConnected } = useAccount();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();

  const handleSignIn = useCallback(async () => {
    if (!isConnected || !address || !chainId || !publicClient) {
      setError('Connect your wallet before signing in');
      return;
    }

    setIsSigningIn(true);
    setError(null);

    try {
      const nonce = generateSiweNonce();

      const message = createSiweMessage({
        address,
        chainId,
        domain: window.location.host,
        nonce,
        uri: window.location.origin,
        version: '1',
      });

      const signature = await signMessageAsync({ message });

      const valid = await publicClient.verifySiweMessage({ message, signature });
      if (!valid) throw new Error('SIWE verification failed');

      onSignedIn?.(address);
    } catch (err: unknown) {
      // User rejected the signature request — don't show an error
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes('rejected') && !message.toLowerCase().includes('denied')) {
        setError(message);
      }
    } finally {
      setIsSigningIn(false);
    }
  }, [address, chainId, isConnected, publicClient, signMessageAsync, onSignedIn]);

  if (!isConnected) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isSigningIn}
        className={
          className ??
          'px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 disabled:opacity-50 transition-opacity'
        }
      >
        {isSigningIn ? 'Signing in…' : 'Sign in with Ethereum'}
      </button>
      {error && (
        <p className="text-xs text-red-500 max-w-[160px] text-center">{error}</p>
      )}
    </div>
  );
}
