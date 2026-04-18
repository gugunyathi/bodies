'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import { SignIn } from './SignIn';

interface WalletButtonProps {
  /** Whether SIWE has been verified for this session */
  siweVerified?: boolean;
  /** Called when the user completes SIWE sign-in */
  onSignedIn?: (address: string) => void;
  /** Extra error string from outer context (e.g. NFT purchase errors) */
  connectionError?: string | null;
  /** When true, renders inline (no fixed positioning) — use inside a header */
  inline?: boolean;
}

export function WalletButton({ siweVerified, onSignedIn, connectionError, inline }: WalletButtonProps) {
  const { address, isConnected, isConnecting, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const isCorrectNetwork = !chain || chain.id === base.id;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Close dropdown on disconnect
  useEffect(() => {
    if (!isConnected) setOpen(false);
  }, [isConnected]);

  function handleIconClick() {
    if (!isConnected) {
      const connector = connectors.find(c => c.id !== 'injected' || (c as any).ready !== false) ?? connectors[0];
      if (connector) connect({ connector });
    } else {
      setOpen(prev => !prev);
    }
  }

  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
  const balanceStr = balance
    ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
    : '';

  if (!mounted) return null;

  return (
    <div ref={dropdownRef} className={inline ? 'relative z-40' : 'fixed top-3 right-3 z-40'}>
      {/* Wallet icon trigger */}
      <button
        onClick={handleIconClick}
        className="transition-all duration-200 hover:scale-110 active:scale-95"
        aria-label={isConnected ? 'Wallet options' : 'Connect wallet'}
      >
        {isConnecting ? (
          <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg
            className={`w-6 h-6 drop-shadow-md ${isConnected ? 'text-emerald-400' : 'text-blue-400'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" />
            <circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        )}
      </button>

      {/* Dropdown */}
      {open && isConnected && (
        <div className="absolute right-0 top-10 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          {/* Identity section */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              {/* Gradient avatar derived from address */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 select-none">
                {address ? address.slice(2, 4).toUpperCase() : '??'}
              </div>
              <div className="flex flex-col min-w-0">
                {/* Tap address to copy */}
                <button
                  onClick={() => address && navigator.clipboard?.writeText(address)}
                  className="font-semibold text-sm text-gray-900 truncate hover:text-blue-600 transition-colors text-left"
                  title="Tap to copy full address"
                >
                  {shortAddress}
                </button>
                {balanceStr && (
                  <span className="text-xs text-gray-500">{balanceStr}</span>
                )}
              </div>
            </div>

            {/* Wrong network warning */}
            {!isCorrectNetwork && (
              <button
                onClick={() => switchChain({ chainId: base.id })}
                className="w-full mt-1 px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
              >
                ⚠️ Switch to Base
              </button>
            )}

            {/* SIWE sign-in */}
            {!siweVerified && onSignedIn && (
              <div className="mt-2">
                <SignIn onSignedIn={onSignedIn} />
              </div>
            )}
          </div>

          {/* Disconnect */}
          <button
            onClick={() => { disconnect(); setOpen(false); }}
            className="w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* External connection errors */}
      {connectionError && (
        <div className="absolute top-full right-0 mt-1 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 w-48 z-20">
          {connectionError}
        </div>
      )}
    </div>
  );
}
