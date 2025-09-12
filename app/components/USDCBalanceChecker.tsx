'use client';

import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';

const USDC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDC_CONTRACT || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const USDC_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export default function USDCBalanceChecker() {
  const { address, isConnected } = useAccount();
  
  const { data: balanceData, error, isLoading } = useReadContract({
    address: USDC_CONTRACT_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected
    }
  });
  
  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <p className="text-yellow-800">Connect your wallet to check USDC balance</p>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-blue-800">Checking USDC balance...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-red-800">Error checking USDC balance: {error.message}</p>
      </div>
    );
  }
  
  const balance = balanceData ? formatUnits(balanceData as bigint, 6) : '0';
  const balanceNum = parseFloat(balance);
  
  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      balanceNum >= 1 
        ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
        : 'bg-red-500/20 text-red-300 border border-red-500/30'
    }`}>
      <span className="mr-1">
        {balanceNum >= 1 ? '💰' : '⚠️'}
      </span>
      <span>
        {parseFloat(balance).toFixed(1)} USDC
      </span>
    </div>
  );
}