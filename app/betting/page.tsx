'use client';

import React, { useState, useEffect } from 'react';
import BettingInterface from '../components/BettingInterface';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { coinbaseWallet, injected } from 'wagmi/connectors';
import type { Connector } from 'wagmi';

export default function BettingPage() {
  const { isConnected, address, isConnecting } = useAccount();
  const { connect, connectors, error, isError } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = (connector: Connector) => {
    try {
      connect({ connector });
    } catch (err) {
      console.error('Connection error:', err);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-white">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Celebrity Betting
          </h1>
          <p className="text-gray-300 text-lg">
            Place your bets on celebrity relationships and win USDC!
          </p>
        </div>

        {/* Wallet Connection Status */}
        <div className="text-center mb-6">
          {isConnected ? (
            <div className="space-y-2">
              <div className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg">
                <div className="w-2 h-2 bg-green-300 rounded-full mr-2 animate-pulse"></div>
                Wallet Connected
              </div>
              <div className="text-gray-300 text-sm">
                {address && `${address.slice(0, 6)}...${address.slice(-4)}`}
              </div>
              <button
                onClick={() => disconnect()}
                className="block mx-auto mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg">
                <div className="w-2 h-2 bg-red-300 rounded-full mr-2"></div>
                Wallet Not Connected
              </div>
              
              {isConnecting && (
                <p className="text-blue-300">Connecting...</p>
              )}
              
              {isError && error && (
                <p className="text-red-300 text-sm">Error: {error.message}</p>
              )}
              
              <div className="space-y-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => handleConnect(connector)}
                    disabled={isConnecting}
                    className="block mx-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors font-medium mr-2"
                  >
                    Connect {connector.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Betting Interface */}
        <div className="flex justify-center">
          <BettingInterface 
            question="Will Kim Kardashian and Pete Davidson get back together?"
            optionA="Yes, they will reunite"
            optionB="No, they won't get back together"
          />
        </div>

        {/* Instructions */}
        <div className="max-w-2xl mx-auto mt-12 bg-black/20 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">How to Test Betting:</h2>
          <div className="space-y-3 text-gray-300">
            <p>• Connect your wallet using the wallet connection button</p>
            <p>• Make sure you have USDC on Base network</p>
            <p>• Select an option (Yes or No)</p>
            <p>• Enter a bet amount between 1-1000 USDC</p>
            <p>• Click "Place Bet" to test the functionality</p>
            <p>• Check console for any errors or transaction details</p>
          </div>
        </div>

        {/* Test Scenarios */}
        <div className="max-w-2xl mx-auto mt-8 bg-black/20 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Test Scenarios:</h2>
          <div className="space-y-2 text-gray-300 text-sm">
            <p><strong>Insufficient Balance:</strong> Try betting more USDC than you have</p>
            <p><strong>Insufficient Allowance:</strong> First bet will trigger USDC approval</p>
            <p><strong>Invalid Amount:</strong> Try betting less than 1 or more than 1000 USDC</p>
            <p><strong>No Wallet:</strong> Disconnect wallet to see connection prompt</p>
          </div>
        </div>
      </div>
    </div>
  );
}