'use client';

import { useReadContract } from 'wagmi';
import { formatEther, formatUnits } from 'viem';

const PAYMASTER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAYMASTER_CONTRACT || '0xEf181B6a45391EA6dDa7355e61156c3e9F4559a8';

const PAYMASTER_ABI = [
  {
    "inputs": [],
    "name": "getPaymasterInfo",
    "outputs": [
      {"internalType": "bool", "name": "active", "type": "bool"},
      {"internalType": "uint256", "name": "maxGas", "type": "uint256"},
      {"internalType": "uint256", "name": "minBalance", "type": "uint256"},
      {"internalType": "uint256", "name": "ethBalance", "type": "uint256"},
      {"internalType": "address", "name": "bettingAddr", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paymasterActive",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export default function PaymasterStatus() {
  const { data: paymasterInfo, error, isLoading } = useReadContract({
    address: PAYMASTER_CONTRACT_ADDRESS as `0x${string}`,
    abi: PAYMASTER_ABI,
    functionName: 'getPaymasterInfo'
  });
  
  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-blue-800">Checking paymaster status...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-red-800 mb-2">⚠️ Paymaster Error</h3>
        <p className="text-red-700 text-sm">Cannot connect to paymaster contract</p>
        <p className="text-xs text-red-600 mt-1">Error: {error.message}</p>
      </div>
    );
  }
  
  if (!paymasterInfo) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <p className="text-gray-800">No paymaster data available</p>
      </div>
    );
  }
  
  const [active, maxGas, minBalance, ethBalance, bettingAddr] = paymasterInfo;
  const ethBalanceFormatted = formatEther(ethBalance as bigint);
  const minBalanceFormatted = formatUnits(minBalance as bigint, 6);
  const isWellFunded = parseFloat(ethBalanceFormatted) > 0.01; // At least 0.01 ETH
  
  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      active && isWellFunded
        ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
    }`}>
      <span className="mr-1">
        {active && isWellFunded ? '✅' : '⚠️'}
      </span>
      <span>
        {active && isWellFunded ? 'No Gas Fees' : 'Gas Required'}
      </span>
    </div>
  );
}