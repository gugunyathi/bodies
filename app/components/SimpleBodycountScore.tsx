"use client";

import React from 'react';

interface SimpleBodycountScoreProps {
  confirmedCount: number;
  rumoredCount: number;
  profileName?: string;
  className?: string;
}

export const SimpleBodycountScore: React.FC<SimpleBodycountScoreProps> = ({
  confirmedCount,
  rumoredCount,
  profileName,
  className = ''
}) => {
  const totalScore = confirmedCount + rumoredCount;
  
  // Get score tier and styling
  const getScoreTier = (score: number) => {
    if (score >= 20) return { 
      tier: 'LEGENDARY', 
      color: 'from-purple-500 to-pink-500', 
      bgColor: 'bg-gradient-to-r from-purple-100 to-pink-100',
      textColor: 'text-purple-700',
      emoji: '👑'
    };
    if (score >= 15) return { 
      tier: 'ELITE', 
      color: 'from-blue-500 to-purple-500', 
      bgColor: 'bg-gradient-to-r from-blue-100 to-purple-100',
      textColor: 'text-blue-700',
      emoji: '🔥'
    };
    if (score >= 10) return { 
      tier: 'POPULAR', 
      color: 'from-green-500 to-blue-500', 
      bgColor: 'bg-gradient-to-r from-green-100 to-blue-100',
      textColor: 'text-green-700',
      emoji: '⭐'
    };
    if (score >= 5) return { 
      tier: 'ACTIVE', 
      color: 'from-yellow-500 to-green-500', 
      bgColor: 'bg-gradient-to-r from-yellow-100 to-green-100',
      textColor: 'text-yellow-700',
      emoji: '📈'
    };
    if (score >= 1) return { 
      tier: 'STARTER', 
      color: 'from-orange-500 to-yellow-500', 
      bgColor: 'bg-gradient-to-r from-orange-100 to-yellow-100',
      textColor: 'text-orange-700',
      emoji: '🌟'
    };
    return { 
      tier: 'NEW', 
      color: 'from-gray-400 to-gray-500', 
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-600',
      emoji: '👤'
    };
  };

  const tierInfo = getScoreTier(totalScore);

  return (
    <div className={`bg-black/80 text-white rounded-lg p-2 text-xs font-medium backdrop-blur-sm ${className}`}>
      <div className="text-center space-y-0.5">
        <div>BodyCount: {totalScore}</div>
        <div>Confirmed: {confirmedCount}</div>
        <div>Rumored: {rumoredCount}</div>
      </div>
    </div>
  );
};

export default SimpleBodycountScore;