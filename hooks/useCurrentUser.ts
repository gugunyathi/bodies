// Hook to get current user information from wallet connection + SIWE auth state

import { useAccount } from 'wagmi';
import { useMemo, useState, useCallback } from 'react';

export function useCurrentUser() {
  const { address, isConnected } = useAccount();
  const [siweVerified, setSiweVerified] = useState(false);

  // Reset SIWE state when wallet changes / disconnects
  const prevAddress = useMemo(() => address, [address]);
  if (prevAddress !== address) {
    setSiweVerified(false);
  }

  const userId = useMemo(() => {
    // Use wallet address as user ID when connected
    return address || null;
  }, [address]);

  const onSignedIn = useCallback((verifiedAddress: string) => {
    if (verifiedAddress === address) {
      setSiweVerified(true);
    }
  }, [address]);

  return {
    userId,
    walletAddress: address,
    isConnected,
    // true once wallet is connected (identity guard)
    isAuthenticated: isConnected && !!address,
    // true only after the wallet owner has signed the SIWE message
    isSiweVerified: siweVerified,
    onSignedIn,
  };
}

export default useCurrentUser;