// Enhanced wallet connection hook with wallet type detection

import { useAccount, useConnect, useDisconnect, useSwitchChain, useAccountEffect } from 'wagmi';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useEffect, useState, useMemo } from 'react';
import { base } from 'wagmi/chains';

export type WalletType = 
  | 'coinbase_wallet' 
  | 'metamask' 
  | 'farcaster_wallet'
  | 'base_account'
  | 'unknown';

export interface WalletConnectionState {
  isConnected: boolean;
  address: string | undefined;
  walletType: WalletType;
  chainId: number | undefined;
  isCorrectNetwork: boolean;
  connectionError: string | null;
  isConnecting: boolean;
}

export function useWalletConnection(): WalletConnectionState & {
  connectWallet: () => void;
  disconnectWallet: () => void;
  switchToBaseNetwork: () => void;
  getWalletDisplayName: () => string;
  isSwitchingNetwork: boolean;
  currentChain: any;
  supportedConnectors: readonly any[];
} {
  const { address, isConnected, connector, chain } = useAccount();
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { isFrameReady: isMiniKitInstalled } = useMiniKit();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [previousAddress, setPreviousAddress] = useState<string | undefined>(address);

  // Detect wallet type based on connector
  const walletType: WalletType = useMemo(() => {
    if (!connector) return 'unknown';
    
    const connectorId = connector.id.toLowerCase();
    const connectorName = connector.name.toLowerCase();
    
    // Check for Coinbase Wallet (includes Base Account)
    if (connectorId.includes('coinbase') || connectorName.includes('coinbase')) {
      // Check if it's specifically a Base Account
      if (connectorName.includes('base') || connectorId.includes('base')) {
        return 'base_account';
      }
      return 'coinbase_wallet';
    }
    
    // Check for MetaMask
    if (connectorId.includes('metamask') || connectorName.includes('metamask')) {
      return 'metamask';
    }
    
    // Check for Farcaster Wallet (in MiniKit context)
    if (isMiniKitInstalled && (connectorId.includes('farcaster') || connectorName.includes('farcaster'))) {
      return 'farcaster_wallet';
    }
    
    return 'unknown';
  }, [connector, isMiniKitInstalled]);

  // Check if connected to correct network (Base)
  const isCorrectNetwork = useMemo(() => {
    return chain?.id === base.id;
  }, [chain]);

  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      setConnectionError(connectError.message || 'Failed to connect wallet');
    } else {
      setConnectionError(null);
    }
  }, [connectError]);

  // Clear connection error when successfully connected
  useEffect(() => {
    if (isConnected && address) {
      setConnectionError(null);
    }
  }, [isConnected, address]);

  // Detect account changes
  useEffect(() => {
    if (address && previousAddress && address !== previousAddress) {
      console.log('Wallet account changed:', { from: previousAddress, to: address });
      // Clear any previous errors when account changes
      setConnectionError(null);
    }
    setPreviousAddress(address);
  }, [address, previousAddress]);

  // Connect wallet function
  const connectWallet = () => {
    try {
      setConnectionError(null);
      
      // Try to connect with available connectors
      const availableConnector = connectors.find(c => c.ready) || connectors[0];
      if (availableConnector) {
        connect({ connector: availableConnector });
      } else {
        setConnectionError('No wallet connectors available');
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    try {
      disconnect();
      setConnectionError(null);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to disconnect wallet');
    }
  };

  // Enhanced network switching function
  const switchToBaseNetwork = async () => {
    try {
      setConnectionError(null);
      await switchChain({ chainId: base.id });
    } catch (error: any) {
      console.error('Failed to switch to Base network:', error);
      setConnectionError(error.message || 'Failed to switch to Base network');
    }
  };

  // Get display name for wallet type
  const getWalletDisplayName = (): string => {
    switch (walletType) {
      case 'base_account':
        return 'Base Account';
      case 'coinbase_wallet':
        return 'Coinbase Wallet';
      case 'metamask':
        return 'MetaMask';
      case 'farcaster_wallet':
        return 'Farcaster Wallet';
      default:
        return connector?.name || 'Unknown Wallet';
    }
  };

  return {
    isConnected,
    address,
    walletType,
    chainId: chain?.id,
    isCorrectNetwork,
    connectionError,
    isConnecting: isConnecting || isSwitching,
    connectWallet,
    disconnectWallet,
    switchToBaseNetwork,
    getWalletDisplayName,
    isSwitchingNetwork: isSwitching,
    currentChain: chain,
    supportedConnectors: connectors
  }
}

export default useWalletConnection;