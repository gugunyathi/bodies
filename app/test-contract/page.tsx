'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';

export default function TestContractPage() {
  const [contractExists, setContractExists] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();
  
  const BETTING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BETTING_CONTRACT || '';
  
  useEffect(() => {
    async function testContract() {
      if (!publicClient || !BETTING_CONTRACT_ADDRESS) {
        setError('No public client or contract address');
        return;
      }
      
      try {
        console.log('Testing contract at:', BETTING_CONTRACT_ADDRESS);
        
        // Check if contract exists by getting bytecode
        const bytecode = await publicClient.getBytecode({
          address: BETTING_CONTRACT_ADDRESS as `0x${string}`
        });
        
        console.log('Contract bytecode:', bytecode);
        
        if (bytecode && bytecode !== '0x') {
          setContractExists(true);
          
          // Try to call the contract
          try {
            const result = await publicClient.readContract({
              address: BETTING_CONTRACT_ADDRESS as `0x${string}`,
              abi: [{
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
              }],
              functionName: 'getCurrentRoundInfo'
            });
            
            console.log('Contract call result:', result);
          } catch (callError) {
            console.error('Contract call error:', callError);
            setError(`Contract call failed: ${callError}`);
          }
        } else {
          setContractExists(false);
          setError('Contract does not exist at this address');
        }
      } catch (err) {
        console.error('Contract test error:', err);
        setError(`Error testing contract: ${err}`);
      }
    }
    
    testContract();
  }, [publicClient, BETTING_CONTRACT_ADDRESS]);
  
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Contract Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Contract Status</h2>
          
          <div className="space-y-2">
            <p><strong>Contract Address:</strong> {BETTING_CONTRACT_ADDRESS}</p>
            <p><strong>Contract Exists:</strong> {contractExists === null ? 'Testing...' : contractExists ? 'Yes' : 'No'}</p>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}