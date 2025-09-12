'use client';

import React, { useState, useEffect } from 'react';
import { useBettingContract } from '../hooks/useBettingContract';
import { useAccount } from 'wagmi';
import USDCBalanceChecker from './USDCBalanceChecker';
import PaymasterStatus from './PaymasterStatus';

interface BettingInterfaceProps {
  question?: string;
  optionA?: string;
  optionB?: string;
}

export default function BettingInterface({ 
  question = "Will these two celebrities have a relationship?",
  optionA = "Yes",
  optionB = "No"
}: BettingInterfaceProps) {
  const { address } = useAccount();
  const {
    currentRound,
    userBalance,
    allowance,
    loading,
    error,
    placeBet,
    claimWinnings,
    approveUSDC,
    getUserBet,
    calculatePayout,
    clearError,
    isConnected
  } = useBettingContract();
  
  const [betAmount, setBetAmount] = useState('');
  const [selectedOption, setSelectedOption] = useState<1 | 2>(1);
  const [userBet, setUserBet] = useState<any>(null);
  const [potentialPayout, setPotentialPayout] = useState('0');
  const [timeLeft, setTimeLeft] = useState('');
  
  // Fetch user bet data
  useEffect(() => {
    let isMounted = true;
    
    if (currentRound && address) {
      getUserBet(currentRound.round).then(setBet => {
        if (setBet && isMounted) {
          setUserBet(setBet);
        }
      });
    }
    
    return () => {
      isMounted = false;
    };
  }, [currentRound, address, getUserBet]);
  
  // Calculate potential payout
  useEffect(() => {
    if (betAmount && selectedOption && currentRound) {
      const amount = parseFloat(betAmount);
      const poolA = parseFloat(currentRound.poolA);
      const poolB = parseFloat(currentRound.poolB);
      const totalPool = poolA + poolB;
      
      if (totalPool > 0) {
        const winningPool = selectedOption === 1 ? poolA : poolB;
        const payout = (amount * totalPool) / (winningPool + amount);
        setPotentialPayout(payout.toFixed(2));
      } else {
        setPotentialPayout(betAmount);
      }
    } else {
      setPotentialPayout('0');
    }
  }, [betAmount, selectedOption, currentRound]);
  
  // Update countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentRound && currentRound.active) {
      const updateTimer = () => {
        const now = Date.now();
        const endTime = currentRound.deadline * 1000;
        const remaining = Math.max(0, endTime - now);
        
        if (remaining > 0) {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft('Round ended');
          if (interval) clearInterval(interval);
        }
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setTimeLeft('Round inactive');
    }
    
    return () => {
       if (interval) {
         clearInterval(interval);
       }
     };
   }, [currentRound]);
  
  const handlePlaceBet = async () => {
    if (!selectedOption || !betAmount || !currentRound) return;
    
    try {
      const betAmountNum = parseFloat(betAmount);
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
        await approveUSDC(betAmount);
        
        // Wait a moment for approval to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log(`Placing bet: ${betAmount} USDC on option ${selectedOption}`);
      await placeBet(selectedOption, betAmount);
      setBetAmount('');
      
      alert('Bet placed successfully!');
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
  
  const handleClaimWinnings = async () => {
    if (!currentRound) return;
    
    try {
      await claimWinnings(currentRound.round);
    } catch (err) {
      console.error('Claim failed:', err);
    }
  };
  
  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Betting Interface</h2>
        <p className="text-gray-600">Please connect your wallet to start betting.</p>
      </div>
    );
  }
  
  if (!currentRound) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Loading...</h2>
        <p className="text-gray-600">Fetching betting round information...</p>
      </div>
    );
  }
  
  const totalPool = parseFloat(currentRound.poolA) + parseFloat(currentRound.poolB);
  const poolAPercent = totalPool > 0 ? (parseFloat(currentRound.poolA) / totalPool * 100).toFixed(1) : '0';
  const poolBPercent = totalPool > 0 ? (parseFloat(currentRound.poolB) / totalPool * 100).toFixed(1) : '0';
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Paymaster Status */}
      <PaymasterStatus />
      
      {/* USDC Balance Checker */}
      <USDCBalanceChecker />
      
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Round #{currentRound.round}</h2>
        <p className="text-gray-600 mb-2">{question}</p>
        <div className="text-sm text-gray-500">
          <p>Time left: <span className="font-medium">{timeLeft}</span></p>
          <p>Your balance: <span className="font-medium">{parseFloat(userBalance).toFixed(2)} USDC</span></p>
        </div>
      </div>
      
      {/* Pool Information */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Current Pools</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <span className="font-medium text-green-800">{optionA}</span>
            <div className="text-right">
              <p className="font-bold text-green-800">{parseFloat(currentRound.poolA).toFixed(2)} USDC</p>
              <p className="text-sm text-green-600">{poolAPercent}%</p>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
            <span className="font-medium text-red-800">{optionB}</span>
            <div className="text-right">
              <p className="font-bold text-red-800">{parseFloat(currentRound.poolB).toFixed(2)} USDC</p>
              <p className="text-sm text-red-600">{poolBPercent}%</p>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">
          Total Pool: {totalPool.toFixed(2)} USDC (10% house fee)
        </p>
      </div>
      
      {/* User's Current Bets */}
      {userBet && (parseFloat(userBet.amountA) > 0 || parseFloat(userBet.amountB) > 0) && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Your Bets</h3>
          {parseFloat(userBet.amountA) > 0 && (
            <p className="text-sm text-blue-700">{optionA}: {parseFloat(userBet.amountA).toFixed(2)} USDC</p>
          )}
          {parseFloat(userBet.amountB) > 0 && (
            <p className="text-sm text-blue-700">{optionB}: {parseFloat(userBet.amountB).toFixed(2)} USDC</p>
          )}
        </div>
      )}
      
      {/* Betting Interface */}
      {currentRound.active && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Place Your Bet</h3>
          
          {/* Option Selection */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setSelectedOption(1)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                selectedOption === 1
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              {optionA}
            </button>
            <button
              onClick={() => setSelectedOption(2)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                selectedOption === 2
                  ? 'border-red-500 bg-red-50 text-red-800'
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              {optionB}
            </button>
          </div>
          
          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bet Amount (USDC)
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter amount (min: 1, max: 1000)"
              min="1"
              max="1000"
              step="0.01"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Potential Payout */}
          {betAmount && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Potential payout: <span className="font-medium">{parseFloat(potentialPayout).toFixed(2)} USDC</span>
              </p>
            </div>
          )}
          
          {/* Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={loading || !betAmount || parseFloat(betAmount) < 1 || parseFloat(betAmount) > 1000 || parseFloat(betAmount) > parseFloat(userBalance)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 
             parseFloat(betAmount || '0') > parseFloat(userBalance) ? 'Insufficient Balance' :
             'Place Bet'}
          </button>
          
          {/* Insufficient Balance Warning */}
          {betAmount && parseFloat(betAmount) > parseFloat(userBalance) && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">
                ⚠️ Insufficient USDC balance. You need {parseFloat(betAmount).toFixed(2)} USDC but only have {parseFloat(userBalance).toFixed(2)} USDC.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Claim Winnings */}
      {userBet && !userBet.hasClaimed && !currentRound.active && (
        <div className="mb-4">
          <button
            onClick={handleClaimWinnings}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Claim Winnings'}
          </button>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
          <button
            onClick={clearError}
            className="text-red-600 text-xs underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Gas fees sponsored • 10% house fee • USDC only
        </p>
      </div>
    </div>
  );
}