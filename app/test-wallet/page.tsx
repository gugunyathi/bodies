"use client";

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { apiClient } from '../../lib/api-client';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { WalletButton } from '../components/WalletButton';

export default function WalletTestPage() {
  const { address, isConnected } = useAccount();
  const { userId, walletAddress, isAuthenticated } = useCurrentUser();
  const [connectionStatus, setConnectionStatus] = useState<string>('Not connected');
  const [apiTestResult, setApiTestResult] = useState<string>('');
  const [transactionTest, setTransactionTest] = useState<string>('');

  // Test wallet connection status
  useEffect(() => {
    if (isConnected && address) {
      setConnectionStatus(`Connected: ${address}`);
    } else {
      setConnectionStatus('Not connected');
    }
  }, [isConnected, address]);

  // Test API connection when wallet connects
  const testApiConnection = async () => {
    if (!walletAddress) {
      setApiTestResult('No wallet address available');
      return;
    }

    try {
      setApiTestResult('Testing API connection...');
      const response = await apiClient.connectWallet(walletAddress);
      
      if (response.success) {
        setApiTestResult(`API Connection Success: ${JSON.stringify(response.data)}`);
      } else {
        setApiTestResult(`API Connection Failed: ${response.error}`);
      }
    } catch (error) {
      setApiTestResult(`API Connection Error: ${error}`);
    }
  };

  // Test transaction (sending 0 ETH to self)
  const { sendTransaction, data: txHash, isPending: isTxPending, error: txError } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleSendTestTransaction = () => {
    if (!address) return;
    sendTransaction(
      { to: address, value: BigInt(0) },
      {
        onSuccess: (hash) => setTransactionTest(`Transaction Success: ${hash}`),
        onError: (err) => setTransactionTest(`Transaction Error: ${err.message}`),
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Wallet Integration Test</h1>
        
        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <p className="text-gray-700">
            Wallet Connected: <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? 'Yes' : 'No'}
            </span>
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
          
          <div className="mb-4">
            <WalletButton />
          </div>

          <div className="space-y-2 text-sm">
            <p><strong>Connection Status:</strong> {connectionStatus}</p>
            <p><strong>Is Connected:</strong> {isConnected ? 'Yes' : 'No'}</p>
            <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
            <p><strong>User ID:</strong> {userId || 'None'}</p>
            <p><strong>Wallet Address:</strong> {walletAddress || 'None'}</p>
          </div>
        </div>

        {/* API Connection Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Connection Test</h2>
          
          <button
            onClick={testApiConnection}
            disabled={!walletAddress}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg mb-4"
          >
            Test API Connection
          </button>
          
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-sm font-mono">{apiTestResult || 'Click button to test API connection'}</p>
          </div>
        </div>

        {/* Transaction Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Transaction Test</h2>
          
          {address ? (
            <div className="space-y-4">
              <button
                onClick={handleSendTestTransaction}
                disabled={isTxPending || isConfirming}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
              >
                {isTxPending ? 'Waiting for approval…' : isConfirming ? 'Confirming…' : 'Send Test Transaction'}
              </button>
              {txSuccess && <p className="text-green-600 text-sm">✅ Confirmed: {txHash}</p>}
              {txError && <p className="text-red-600 text-sm">❌ {txError.message}</p>}
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm font-mono">{transactionTest || 'Click button to test transaction'}</p>
              </div>
            </div>
          ) : (
            <p className="text-yellow-600">Connect wallet to test transactions</p>
          )}
        </div>

        {/* Navigation */}
        <div className="text-center">
          <a
            href="/"
            className="inline-block bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
          >
            Back to Main App
          </a>
        </div>
      </div>
    </div>
  );
}