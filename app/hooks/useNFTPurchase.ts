'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { base } from 'wagmi/chains';
import { useWalletConnection } from './useWalletConnection';

const CONTRACT_ADDRESS = '0x609cF5C3B0003bcEF4F512B3c2Fa489c8D0EF200';
const CONTRACT_ABI = [
  'function publicMint(string memory tokenURI) public payable',
  'function PRICE() public view returns (uint256)',
  'function totalSupply() public view returns (uint256)',
  'function MAX_SUPPLY() public view returns (uint256)'
];

export interface NFTCollection {
  name: string;
  contractAddress: string;
  totalSupply: number;
  maxSupply: number;
  available: number;
  price: string;
  priceWei: string;
  image: string;
  metadata: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionHash?: string;
  tokenId?: number;
  error?: string;
}

export function useNFTPurchase() {
  const [isLoading, setIsLoading] = useState(false);
  const [collection, setCollection] = useState<NFTCollection | null>(null);
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });
  const walletConnection = useWalletConnection();

  // Auto-fetch collection data on mount
  useEffect(() => {
    console.log('🎯 useNFTPurchase: Auto-fetching collection data on mount');
    console.log('🎯 useNFTPurchase: Current address:', address);
    console.log('🎯 useNFTPurchase: isConnected:', isConnected);
    fetchCollection();
  }, []);

  // Fetch collection info
  const fetchCollection = async (): Promise<NFTCollection | null> => {
    try {
      console.log('🎯 useNFTPurchase: Fetching collection from /api/nft with address:', address || 'no address');
      const response = await fetch(`/api/nft?userAddress=${address || ''}`);
      const data = await response.json();
      console.log('🎯 useNFTPurchase: API response:', data);
      
      if (data.success) {
        console.log('🎯 useNFTPurchase: Setting collection data:', data.collection);
        setCollection(data.collection);
        return data.collection;
      }
      console.log('🎯 useNFTPurchase: API returned success=false');
      return null;
    } catch (error) {
      console.error('🎯 useNFTPurchase: Failed to fetch collection:', error);
      return null;
    }
  };

  // Purchase NFT with wallet transaction
  const purchaseNFT = async (nftId: string): Promise<PurchaseResult> => {
    // Enhanced wallet connection validation
    if (!walletConnection.isConnected || !walletConnection.address) {
      return {
        success: false,
        error: `Please connect your wallet to purchase NFTs. ${walletConnection.connectionError || ''}`
      };
    }

    // Check if on correct network
    if (!walletConnection.isCorrectNetwork) {
      return {
        success: false,
        error: `Please switch to Base network to purchase NFTs. Currently connected to: ${walletConnection.chainId}`
      };
    }

    // Check for connection errors
    if (walletConnection.connectionError) {
      return {
        success: false,
        error: `Wallet connection error: ${walletConnection.connectionError}`
      };
    }

    setIsLoading(true);

    try {
      // Get current collection data to check price and availability
      const currentCollection = collection || await fetchCollection();
      if (!currentCollection) {
        return {
          success: false,
          error: 'Unable to fetch collection data'
        };
      }

      if (currentCollection.available <= 0) {
        return {
          success: false,
          error: 'No NFTs available for purchase'
        };
      }

      // Use direct wallet transaction with proper price
      const tokenURI = currentCollection.metadata;
      const priceInEth = parseEther(currentCollection.price);

      console.log('🎯 Purchasing NFT with wallet:', {
        address,
        tokenURI,
        price: currentCollection.price,
        priceWei: priceInEth.toString()
      });

      // Write to contract with user's wallet
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'publicMint',
        args: [tokenURI],
        value: priceInEth,
        chain: base,
      });

      return {
        success: true,
        transactionHash: hash
      };
    } catch (error) {
      console.error('NFT Purchase Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Platform-sponsored purchase (backup method)
  const purchaseNFTSponsored = async (nftId: string): Promise<PurchaseResult> => {
    if (!isConnected || !address) {
      return {
        success: false,
        error: 'Wallet not connected'
      };
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          paymentVerified: true,
          nftId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh collection data
        await fetchCollection();
        
        return {
          success: true,
          transactionHash: result.transaction.hash,
          tokenId: result.nft.tokenId
        };
      } else {
        return {
          success: false,
          error: result.error || 'Purchase failed'
        };
      }
    } catch (error) {
      console.error('NFT Purchase Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Direct contract interaction (for future paymaster integration)
  const purchaseNFTDirect = async (tokenURI: string): Promise<PurchaseResult> => {
    if (!isConnected || !address) {
      return {
        success: false,
        error: 'Wallet not connected'
      };
    }

    try {
      setIsLoading(true);

      // Write to contract with paymaster (gasless)
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'publicMint',
        args: [tokenURI],
        value: parseEther('0'), // Free with paymaster
        chain: base,
      });

      // Wait for transaction confirmation
      if (hash && isConfirmed) {
        await fetchCollection();
        return {
          success: true,
          transactionHash: hash
        };
      }

      if (writeError) {
        return {
          success: false,
          error: writeError.message
        };
      }

      return {
        success: false,
        error: 'Transaction failed'
      };
    } catch (error) {
      console.error('Direct NFT Purchase Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      console.log('🎯 Transaction confirmed:', hash);
      // Refresh collection data after successful transaction
      fetchCollection();
    }
  }, [isConfirmed, hash]);

  return {
    collection,
    isLoading: isLoading || isConfirming,
    isConnected: walletConnection.isConnected,
    address: walletConnection.address,
    walletType: walletConnection.walletType,
    walletDisplayName: walletConnection.getWalletDisplayName(),
    isCorrectNetwork: walletConnection.isCorrectNetwork,
    connectionError: walletConnection.connectionError,
    isConnecting: walletConnection.isConnecting,
    fetchCollection,
    purchaseNFT,
    purchaseNFTSponsored,
    purchaseNFTDirect,
    connectWallet: walletConnection.connectWallet,
    disconnectWallet: walletConnection.disconnectWallet,
    switchToBaseNetwork: walletConnection.switchToBaseNetwork,
    transactionHash: hash,
    isConfirmed,
    writeError
  };
}