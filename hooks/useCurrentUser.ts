// Hook to get current user information from wallet connection

import { useAccount } from 'wagmi';
import { useMemo } from 'react';

export function useCurrentUser() {
  const { address, isConnected } = useAccount();

  const userId = useMemo(() => {
    // Use wallet address as user ID when connected
    return address || null;
  }, [address]);

  return {
    userId,
    walletAddress: address,
    isConnected,
    isAuthenticated: isConnected && !!address
  };
}

export default useCurrentUser;