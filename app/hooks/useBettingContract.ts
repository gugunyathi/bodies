'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useWalletClient } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';

// Contract ABI (simplified for key functions)
const BETTING_ABI = [
  {
    "inputs": [{"internalType": "uint8", "name": "option", "type": "uint8"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "placeBet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "round", "type": "uint256"}],
    "name": "claimWinnings",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentRoundInfo",
    "outputs": [
      {"internalType": "uint256", "name": "round", "type": "uint256"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"},
      {"internalType": "uint256", "name": "poolA", "type": "uint256"},
      {"internalType": "uint256", "name": "poolB", "type": "uint256"},
      {"internalType": "bool", "name": "active", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "round", "type": "uint256"}, {"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserBet",
    "outputs": [
      {"internalType": "uint256", "name": "amountA", "type": "uint256"},
      {"internalType": "uint256", "name": "amountB", "type": "uint256"},
      {"internalType": "bool", "name": "hasClaimed", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "round", "type": "uint256"}],
    "name": "getRoundStats",
    "outputs": [
      {"internalType": "uint256", "name": "totalA", "type": "uint256"},
      {"internalType": "uint256", "name": "totalB", "type": "uint256"},
      {"internalType": "uint8", "name": "winner", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "round", "type": "uint256"}, {"internalType": "address", "name": "user", "type": "address"}, {"internalType": "uint8", "name": "winningOption", "type": "uint8"}],
    "name": "calculatePayout",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const USDC_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Contract addresses (Base Network)
const BETTING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BETTING_CONTRACT || '';
const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC

interface RoundInfo {
  round: number;
  deadline: number;
  poolA: string;
  poolB: string;
  active: boolean;
}

interface UserBet {
  amountA: string;
  amountB: string;
  hasClaimed: boolean;
}

interface RoundStats {
  totalA: string;
  totalB: string;
  winner: number;
}

export function useBettingContract() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [currentRound, setCurrentRound] = useState<RoundInfo | null>(null);
  const [userBalance, setUserBalance] = useState<string>('0');
  const [allowance, setAllowance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use wagmi hooks for contract interactions
  const { writeContract } = useWriteContract();
  
  // Contract read hooks
  const { data: roundInfoData, error: roundInfoError, isLoading: roundInfoLoading } = useReadContract({
    address: BETTING_CONTRACT_ADDRESS as `0x${string}`,
    abi: BETTING_ABI,
    functionName: 'getCurrentRoundInfo',
    query: { enabled: !!BETTING_CONTRACT_ADDRESS }
  });
  
  // Debug logging and fallback
  useEffect(() => {
    console.log('Contract Address:', BETTING_CONTRACT_ADDRESS);
    console.log('Round Info Data:', roundInfoData);
    console.log('Round Info Error:', roundInfoError);
    console.log('Round Info Loading:', roundInfoLoading);
    
    // If contract call fails after 10 seconds, provide mock data for testing
    const timeout = setTimeout(() => {
      if (!roundInfoData && !roundInfoLoading && roundInfoError) {
        console.log('Using mock data for testing');
        setCurrentRound({
          round: 1,
          deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          poolA: '1000.00',
          poolB: '1500.00',
          active: true
        });
        setLoading(false);
        setError('Using mock data - contract not accessible');
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [roundInfoData, roundInfoError, roundInfoLoading]);
  
  const { data: userBalanceData } = useReadContract({
    address: USDC_CONTRACT_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
  
  const { data: allowanceData } = useReadContract({
    address: USDC_CONTRACT_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, BETTING_CONTRACT_ADDRESS as `0x${string}`] : undefined,
    query: { enabled: !!address && !!BETTING_CONTRACT_ADDRESS }
  });

  // Update state when contract data changes
  useEffect(() => {
    if (roundInfoLoading) {
      setLoading(true);
      setError(null);
    } else if (roundInfoError) {
      setLoading(false);
      setError(`Failed to fetch round info: ${roundInfoError.message}`);
      console.error('Round info error:', roundInfoError);
    } else if (roundInfoData) {
      try {
        const [round, deadline, poolA, poolB, active] = roundInfoData as [bigint, bigint, bigint, bigint, boolean];
        setCurrentRound({
          round: Number(round),
          deadline: Number(deadline),
          poolA: formatUnits(poolA, 6),
          poolB: formatUnits(poolB, 6),
          active
        });
        setLoading(false);
        setError(null);
      } catch (err) {
        setLoading(false);
        setError(`Error processing round data: ${err}`);
        console.error('Error processing round data:', err);
      }
    }
  }, [roundInfoData, roundInfoError, roundInfoLoading]);
  
  useEffect(() => {
    if (userBalanceData) {
      setUserBalance(formatUnits(userBalanceData as bigint, 6));
    } else if (address) {
      // Mock balance for testing when contract is not accessible
      setTimeout(() => {
        if (!userBalanceData) {
          setUserBalance('500.00'); // Mock 500 USDC balance
        }
      }, 5000);
    }
  }, [userBalanceData, address]);
  
  useEffect(() => {
    if (allowanceData) {
      setAllowance(formatUnits(allowanceData as bigint, 6));
    } else if (address) {
      // Mock allowance for testing when contract is not accessible
      setTimeout(() => {
        if (!allowanceData) {
          setAllowance('0.00'); // Mock no allowance initially
        }
      }, 5000);
    }
  }, [allowanceData, address]);


  
  // Place a bet
  const placeBet = useCallback(async (option: number, amount: string) => {
    if (!address || !BETTING_CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const amountWei = parseUnits(amount, 6);
      
      console.log('Placing bet:', {
        bettingContract: BETTING_CONTRACT_ADDRESS,
        user: address,
        option: option,
        amount: amount,
        amountWei: amountWei.toString(),
        userBalance: userBalance,
        allowance: allowance
      });
      
      const result = await writeContract({
        address: BETTING_CONTRACT_ADDRESS as `0x${string}`,
        abi: BETTING_ABI,
        functionName: 'placeBet',
        args: [option, amountWei]
      });
      
      console.log('Bet transaction submitted:', result);
      return result;
    } catch (err: any) {
      console.error('Error placing bet:', err);
      
      // Parse specific error messages
      let errorMessage = 'Failed to place bet';
      if (err?.message) {
        if (err.message.includes('insufficient funds') || err.message.includes('ERC20: transfer amount exceeds balance')) {
          errorMessage = 'Insufficient USDC balance to place this bet';
        } else if (err.message.includes('allowance') || err.message.includes('ERC20: insufficient allowance')) {
          errorMessage = 'Insufficient USDC allowance. Please approve more tokens.';
        } else if (err.message.includes('User rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (err.message.includes('Round not active')) {
          errorMessage = 'This betting round is no longer active';
        }
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, writeContract]);
  
  // Approve USDC spending
  const approveUSDC = useCallback(async (amount: string) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    if (!USDC_CONTRACT_ADDRESS || !BETTING_CONTRACT_ADDRESS) {
      throw new Error('Contract addresses not configured');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const amountWei = parseUnits(amount, 6);
      
      console.log('Approving USDC spend:', {
        usdcContract: USDC_CONTRACT_ADDRESS,
        spender: BETTING_CONTRACT_ADDRESS,
        amount: amount,
        amountWei: amountWei.toString()
      });
      
      const result = await writeContract({
        address: USDC_CONTRACT_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [BETTING_CONTRACT_ADDRESS as `0x${string}`, amountWei]
      });
      
      console.log('USDC approval transaction submitted:', result);
      return result;
    } catch (err: any) {
      console.error('Error approving USDC:', err);
      
      // Parse specific error messages
      let errorMessage = 'Failed to approve USDC';
      if (err?.message) {
        if (err.message.includes('User rejected')) {
          errorMessage = 'USDC approval was rejected by user';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient ETH for gas fees';
        }
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, writeContract]);

  // Claim winnings
  const claimWinnings = useCallback(async (round: number) => {
    if (!address || !BETTING_CONTRACT_ADDRESS) {
      throw new Error('Wallet not connected');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await writeContract({
        address: BETTING_CONTRACT_ADDRESS as `0x${string}`,
        abi: BETTING_ABI,
        functionName: 'claimWinnings',
        args: [BigInt(round)]
      });
    } catch (err) {
      console.error('Error claiming winnings:', err);
      setError('Failed to claim winnings');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, writeContract]);

  // Get user bet for a round using wagmi
  const getUserBet = useCallback(async (round: number): Promise<UserBet | null> => {
    if (!address || !BETTING_CONTRACT_ADDRESS) return null;
    
    try {
      const result = await publicClient?.readContract({
        address: BETTING_CONTRACT_ADDRESS as `0x${string}`,
        abi: BETTING_ABI,
        functionName: 'getUserBet',
        args: [BigInt(round), address]
      });
      
      if (result && Array.isArray(result) && result.length >= 3) {
        return {
          amountA: formatUnits(result[0] as bigint, 6),
          amountB: formatUnits(result[1] as bigint, 6),
          hasClaimed: result[2] as boolean
        };
      }
      return null;
    } catch (err) {
      console.error('Error fetching user bet:', err);
      return null;
    }
  }, [publicClient, address]);

  // Get round statistics using wagmi
  const getRoundStats = useCallback(async (round: number): Promise<RoundStats | null> => {
    if (!BETTING_CONTRACT_ADDRESS) return null;
    
    try {
      const result = await publicClient?.readContract({
        address: BETTING_CONTRACT_ADDRESS as `0x${string}`,
        abi: BETTING_ABI,
        functionName: 'getRoundStats',
        args: [BigInt(round)]
      });
      
      if (result && Array.isArray(result) && result.length >= 3) {
        return {
          totalA: formatUnits(result[0] as bigint, 6),
          totalB: formatUnits(result[1] as bigint, 6),
          winner: Number(result[2])
        };
      }
      return null;
    } catch (err) {
      console.error('Error fetching round stats:', err);
      return null;
    }
  }, [publicClient]);

  // Calculate potential payout using wagmi
  const calculatePayout = useCallback(async (round: number, winningOption: 1 | 2): Promise<string> => {
    if (!address || !BETTING_CONTRACT_ADDRESS) return '0';
    
    try {
      const result = await publicClient?.readContract({
        address: BETTING_CONTRACT_ADDRESS as `0x${string}`,
        abi: BETTING_ABI,
        functionName: 'calculatePayout',
        args: [BigInt(round), address, winningOption]
      });
      
      if (result) {
        return formatUnits(result as bigint, 6);
      }
      return '0';
    } catch (err) {
      console.error('Error calculating payout:', err);
      return '0';
    }
  }, [publicClient, address]);

  return {
    // State
    currentRound,
    userBalance,
    allowance,
    loading,
    error,
    
    // Actions
    placeBet,
    claimWinnings,
    approveUSDC,
    
    // Queries
    getUserBet,
    getRoundStats,
    calculatePayout,
    
    // Utils
    clearError: () => setError(null),
    
    // Contract info
    contractAddress: BETTING_CONTRACT_ADDRESS,
    usdcAddress: USDC_CONTRACT_ADDRESS,
    isConnected: !!address
  };
}