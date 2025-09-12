"use client";

import { useState, useEffect } from "react";
import { Button } from "./DemoComponents";
import { useBettingContract } from '../hooks/useBettingContract';
import { useAccount } from 'wagmi';
import USDCBalanceChecker from './USDCBalanceChecker';
import PaymasterStatus from './PaymasterStatus';

type Profile = {
  id: string;
  name: string;
  age: number;
  bio: string;
  images: string[];
  socialHandles: {
    instagram?: string;
    tiktok?: string;
    twitter?: string;
  };
  bodycount: {
    dated: number;
    hookup: number;
    transactional: number;
    total: number;
  };
};

type BettingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profileA: Profile | null;
  profileB: Profile | null;
  prizePool?: number;
  onPlaceBet?: (prediction: 'dated' | 'hookup' | 'transactional' | 'none', amount: number) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
};

export function BettingModal({ 
  isOpen, 
  onClose, 
  profileA, 
  profileB, 
  prizePool = 960, 
  onPlaceBet,
  loading: externalLoading = false,
  error: externalError = null
}: BettingModalProps) {
  const { address } = useAccount();
  const {
    currentRound,
    userBalance,
    allowance,
    loading,
    error,
    placeBet,
    approveUSDC,
    clearError,
    isConnected
  } = useBettingContract();
  
  const [selectedPrediction, setSelectedPrediction] = useState<'dated' | 'hookup' | 'transactional' | 'none' | null>(null);
  const [betAmount, setBetAmount] = useState<number>(1);

  if (!isOpen) return null;
  
  // Don't render if profiles are not available
  if (!profileA || !profileB) return null;

  const handlePlaceBet = async () => {
    if (!selectedPrediction || !currentRound || !isConnected) return;
    
    try {
      const betAmountNum = parseFloat(betAmount.toString());
      const balanceNum = parseFloat(userBalance);
      const allowanceNum = parseFloat(allowance);
      
      // Validate user has sufficient balance
      if (betAmountNum > balanceNum) {
        alert(`Insufficient USDC balance. You have ${balanceNum} USDC but trying to bet ${betAmountNum} USDC.`);
        return;
      }
      
      // Validate bet amount is within limits
      if (betAmountNum < 1) {
        alert('Minimum bet amount is 1 USDC.');
        return;
      }
      
      if (betAmountNum > 1000) {
        alert('Maximum bet amount is 1000 USDC.');
        return;
      }
      
      clearError();
      
      // Check if approval is needed
      if (betAmountNum > allowanceNum) {
        console.log(`Approving ${betAmount} USDC for betting contract...`);
        await approveUSDC(betAmount.toString());
        
        // Wait a moment for approval to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Map prediction to option (1 or 2 for the betting contract)
      const option = selectedPrediction === 'dated' || selectedPrediction === 'hookup' ? 1 : 2;
      
      console.log(`Placing bet: ${betAmount} USDC on option ${option} (${selectedPrediction})`);
      await placeBet(option, betAmount.toString());
      
      // Call external onPlaceBet if provided for additional handling
      if (onPlaceBet) {
        await onPlaceBet(selectedPrediction, betAmount);
      }
      
      alert('Bet placed successfully!');
      onClose(); // Close modal on success
    } catch (err: any) {
      console.error('Bet failed:', err);
      
      let errorMessage = 'Failed to place bet';
      if (err?.message) {
        if (err.message.includes('insufficient funds') || err.message.includes('ERC20: transfer amount exceeds balance')) {
          errorMessage = 'Insufficient USDC balance to place this bet';
        } else if (err.message.includes('allowance') || err.message.includes('ERC20: insufficient allowance')) {
          errorMessage = 'Insufficient USDC allowance. Please try again after approval.';
        } else if (err.message.includes('User rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (err.message.includes('Round not active')) {
          errorMessage = 'This betting round is no longer active';
        }
      }
      
      alert(errorMessage);
    }
  };

  const getPredictionEmoji = (type: string) => {
    switch (type) {
      case 'dated': return '❤️';
      case 'hookup': return '🔥';
      case 'transactional': return '💰';
      case 'none': return '🚫';
      default: return '';
    }
  };

  const getPredictionLabel = (type: string) => {
    switch (type) {
      case 'dated': return 'Dated';
      case 'hookup': return 'Hookup';
      case 'transactional': return 'Transactional';
      case 'none': return 'None';
      default: return '';
    }
  };

  // Don't render if not connected
  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 rounded-3xl p-6 max-w-md w-full mx-4 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold">×</button>
          <div className="text-center text-white">
            <h2 className="text-xl font-bold mb-4">Wallet Required</h2>
            <p>Please connect your wallet to place bets.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 rounded-3xl p-4 max-w-sm w-full mx-4 relative max-h-[90vh] overflow-y-auto">
        {/* Header with Close Button and Status */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <PaymasterStatus />
            <USDCBalanceChecker />
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* BET Button Header */}
        <div className="flex justify-center mb-4">
          <div className="bg-green-500 text-white px-6 py-1.5 rounded-full font-bold text-base">
            BET
          </div>
        </div>

        {/* Profiles Section */}
        <div className="flex justify-between items-center mb-4">
          {/* Profile A */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <img 
                src={profileA?.images?.[0] || '/placeholder.png'} 
                alt={profileA?.name || 'Profile A'}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
              />
              {/* Bodycount Badge */}
              <div className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {profileA?.bodycount?.total || 0}
              </div>
            </div>
            <div className="text-white text-center mt-1">
              <div className="font-semibold text-sm">{profileA?.name || 'Profile A'}</div>
              <div className="text-xs text-white/70">{profileA?.age || 'N/A'}</div>
            </div>
          </div>

          {/* VS */}
          <div className="text-white font-bold text-lg mx-3">VS</div>

          {/* Profile B */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <img 
                src={profileB?.images?.[0] || '/placeholder.png'} 
                alt={profileB?.name || 'Profile B'}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
              />
              {/* Bodycount Badge */}
              <div className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {profileB?.bodycount?.total || 0}
              </div>
            </div>
            <div className="text-white text-center mt-1">
              <div className="font-semibold text-sm">{profileB?.name || 'Profile B'}</div>
              <div className="text-xs text-white/70">{profileB?.age || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Prize Pool and Bet Amount */}
        <div className="flex justify-between items-center mb-4 text-white">
          <div className="text-center">
            <div className="text-xs text-white/70">PRIZE POOL:</div>
            <div className="font-bold text-sm">{currentRound ? (parseFloat(currentRound.poolA) + parseFloat(currentRound.poolB)).toFixed(2) : prizePool} USDC</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-white/70">PLACE BET:</div>
            <div className="flex items-center">
              <input 
                type="number" 
                min="1" 
                max="1000" 
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className={`bg-white/20 text-white text-center w-16 py-1 rounded border focus:outline-none text-sm ${
                  betAmount > parseFloat(userBalance) ? 'border-red-500' : 'border-white/30 focus:border-white'
                }`}
              />
              <span className="ml-1 font-bold text-sm">USDC</span>
            </div>
            {betAmount > parseFloat(userBalance) && (
              <div className="text-xs text-red-300 mt-0.5">Insufficient balance</div>
            )}
          </div>
        </div>

        {/* Betting Options */}
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {['dated', 'hookup', 'transactional', 'none'].map((option) => (
            <button
              key={option}
              onClick={() => setSelectedPrediction(option as any)}
              className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                selectedPrediction === option
                  ? 'border-white bg-white/20 text-white'
                  : 'border-white/30 text-white/70 hover:border-white/50'
              }`}
            >
              <div className="text-xl mb-0.5">{getPredictionEmoji(option)}</div>
              <div className="text-xs font-semibold">{getPredictionLabel(option)}</div>
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div className="text-center text-white/80 text-xs mb-3">
          Select Up To 3 Emojis To Guess Their Relationship & Win
        </div>

        {/* Error Message */}
        {(error || externalError) && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
            <p className="text-red-200 text-sm text-center">{error || externalError}</p>
          </div>
        )}

        {/* Balance Warning */}
        {betAmount && betAmount > parseFloat(userBalance) && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-3 mb-4">
            <p className="text-yellow-200 text-sm text-center">
              ⚠️ Insufficient USDC balance. You need {betAmount} USDC but only have {parseFloat(userBalance).toFixed(2)} USDC.
            </p>
          </div>
        )}

        {/* Place Bet Button */}
        <div className="flex justify-center">
          <Button
            onClick={handlePlaceBet}
            disabled={!selectedPrediction || loading || externalLoading || betAmount < 1 || betAmount > 1000 || betAmount > parseFloat(userBalance)}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
              selectedPrediction && !loading && !externalLoading && betAmount >= 1 && betAmount <= 1000 && betAmount <= parseFloat(userBalance)
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            {(loading || externalLoading) ? 'Processing...' : 
             betAmount > parseFloat(userBalance) ? 'Insufficient Balance' :
             'Place Bet'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BettingModal;