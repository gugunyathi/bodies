"use client";

import { useState, useEffect } from 'react';
import { useBettingContract } from "../hooks/useBettingContract";
import { useAccount } from "wagmi";

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
  createdAt: string;
  isVerified?: boolean;
};

interface BodycountScoreProps {
  profiles: Profile[];
  currentProfileId?: string;
}

interface ScoreBreakdown {
  dated: { count: number; percentage: number; color: string; emoji: string };
  hookup: { count: number; percentage: number; color: string; emoji: string };
  transactional: { count: number; percentage: number; color: string; emoji: string };
  total: number;
}

interface LeaderboardEntry {
  profile: Profile;
  rank: number;
  scoreBreakdown: ScoreBreakdown;
}

export const BodycountScore = ({ profiles, currentProfileId }: BodycountScoreProps) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'leaderboard' | 'breakdown' | 'bets'>('overview');
  const [animatedScores, setAnimatedScores] = useState<{ [key: string]: number }>({});
  const { address } = useAccount();
  const { currentRound, getUserBet, getRoundStats, loading: bettingLoading } = useBettingContract();

  // Calculate score breakdown for a profile
  const calculateScoreBreakdown = (profile: Profile): ScoreBreakdown => {
    const { dated, hookup, transactional, total } = profile.bodycount;
    
    return {
      dated: {
        count: dated,
        percentage: total > 0 ? Math.round((dated / total) * 100) : 0,
        color: 'from-red-400 to-pink-500',
        emoji: '❤️'
      },
      hookup: {
        count: hookup,
        percentage: total > 0 ? Math.round((hookup / total) * 100) : 0,
        color: 'from-orange-400 to-red-500',
        emoji: '🔥'
      },
      transactional: {
        count: transactional,
        percentage: total > 0 ? Math.round((transactional / total) * 100) : 0,
        color: 'from-green-400 to-emerald-500',
        emoji: '💵'
      },
      total
    };
  };

  // Generate leaderboard
  const generateLeaderboard = (): LeaderboardEntry[] => {
    return profiles
      .map(profile => ({
        profile,
        rank: 0,
        scoreBreakdown: calculateScoreBreakdown(profile)
      }))
      .sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  };

  // Animate score counters
  useEffect(() => {
    const leaderboard = generateLeaderboard();
    const newAnimatedScores: { [key: string]: number } = {};
    
    leaderboard.forEach(entry => {
      newAnimatedScores[entry.profile.id] = 0;
    });
    
    setAnimatedScores(newAnimatedScores);
    
    // Animate to actual values
    const timer = setTimeout(() => {
      const finalScores: { [key: string]: number } = {};
      leaderboard.forEach(entry => {
        finalScores[entry.profile.id] = entry.scoreBreakdown.total;
      });
      setAnimatedScores(finalScores);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [profiles]);

  const leaderboard = generateLeaderboard();
  const currentProfile = currentProfileId ? profiles.find(p => p.id === currentProfileId) : null;
  const currentScoreBreakdown = currentProfile ? calculateScoreBreakdown(currentProfile) : null;

  // Get score tier and color
  const getScoreTier = (score: number) => {
    if (score >= 50) return { tier: 'Legendary', color: 'from-purple-500 to-pink-500', glow: 'shadow-purple-500/50' };
    if (score >= 30) return { tier: 'Elite', color: 'from-blue-500 to-purple-500', glow: 'shadow-blue-500/50' };
    if (score >= 20) return { tier: 'Popular', color: 'from-green-500 to-blue-500', glow: 'shadow-green-500/50' };
    if (score >= 10) return { tier: 'Active', color: 'from-yellow-500 to-green-500', glow: 'shadow-yellow-500/50' };
    if (score >= 5) return { tier: 'Getting Started', color: 'from-orange-500 to-yellow-500', glow: 'shadow-orange-500/50' };
    return { tier: 'New', color: 'from-gray-400 to-gray-500', glow: 'shadow-gray-500/50' };
  };

  const OverviewView = () => {
    const totalProfiles = profiles.length;
    const totalConnections = profiles.reduce((sum, p) => sum + p.bodycount.total, 0);
    const avgScore = totalProfiles > 0 ? Math.round(totalConnections / totalProfiles) : 0;
    const topProfile = leaderboard[0];
    
    // Celebrity relationship insights
    const totalDated = profiles.reduce((sum, p) => sum + p.bodycount.dated, 0);
    const totalHookups = profiles.reduce((sum, p) => sum + p.bodycount.hookup, 0);
    const totalTransactional = profiles.reduce((sum, p) => sum + p.bodycount.transactional, 0);
    
    const mostConnectedCelebs = leaderboard.slice(0, 3);
    const activeCelebs = profiles.filter(p => p.bodycount.total > 0).length;
    const verifiedCelebs = profiles.filter(p => p.isVerified).length;

    return (
      <div className="space-y-6">
        {/* Celebrity Network Stats */}
        <div className="glass-card p-6">
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-gray-800 mb-2">🌟 Celebrity Network</div>
            <div className="text-sm text-gray-600">Real celebrity relationship data</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold gradient-text">{totalProfiles}</div>
              <div className="text-xs text-gray-600">Total Celebrities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold gradient-text">{activeCelebs}</div>
              <div className="text-xs text-gray-600">With Connections</div>
            </div>
          </div>
        </div>

        {/* Relationship Breakdown */}
        <div className="glass-card p-6">
          <div className="text-lg font-bold text-gray-800 mb-4 text-center">💕 Relationship Types</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">❤️</span>
                <span className="text-sm font-medium">Serious Relationships</span>
              </div>
              <div className="text-lg font-bold text-red-500">{totalDated}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🔥</span>
                <span className="text-sm font-medium">Casual Hookups</span>
              </div>
              <div className="text-lg font-bold text-orange-500">{totalHookups}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">💵</span>
                <span className="text-sm font-medium">Business Arrangements</span>
              </div>
              <div className="text-lg font-bold text-green-500">{totalTransactional}</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <div className="text-2xl font-bold gradient-text">{totalConnections}</div>
            <div className="text-sm text-gray-600">Total Connections</div>
          </div>
        </div>

        {/* Top 3 Most Connected */}
        <div className="glass-card p-6">
          <div className="text-lg font-bold text-gray-800 mb-4 text-center">🏆 Most Connected Celebrities</div>
          <div className="space-y-3">
            {mostConnectedCelebs.map((entry, index) => (
              <div key={entry.profile.id} className="flex items-center space-x-3">
                <div className="text-lg">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                </div>
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow">
                  <img 
                    src={entry.profile.images?.[0]} 
                    alt={entry.profile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{entry.profile.name}</div>
                  <div className="text-xs text-gray-500">
                    {entry.scoreBreakdown.dated.count}❤️ {entry.scoreBreakdown.hookup.count}🔥 {entry.scoreBreakdown.transactional.count}💵
                  </div>
                </div>
                <div className="text-lg font-bold gradient-text">{entry.scoreBreakdown.total}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Network Insights */}
        <div className="glass-card p-6">
          <div className="text-lg font-bold text-gray-800 mb-4 text-center">📊 Network Insights</div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold gradient-text">{avgScore}</div>
              <div className="text-xs text-gray-600">Avg Connections</div>
            </div>
            <div>
              <div className="text-2xl font-bold gradient-text">{Math.round((totalDated / totalConnections) * 100) || 0}%</div>
              <div className="text-xs text-gray-600">Serious Relationships</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LeaderboardView = () => (
    <div className="space-y-3">
      {leaderboard.slice(0, 10).map((entry, index) => {
        const tierInfo = getScoreTier(entry.scoreBreakdown.total);
        const animatedScore = animatedScores[entry.profile.id] || 0;
        
        return (
          <div 
            key={entry.profile.id} 
            className={`glass-card p-4 transition-all duration-500 hover:scale-105 ${
              entry.profile.id === currentProfileId ? 'ring-2 ring-pink-400 ring-opacity-50' : ''
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center space-x-4">
              {/* Rank */}
              <div className="flex-shrink-0">
                {entry.rank <= 3 ? (
                  <div className="text-2xl">
                    {entry.rank === 1 && '🥇'}
                    {entry.rank === 2 && '🥈'}
                    {entry.rank === 3 && '🥉'}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                    {entry.rank}
                  </div>
                )}
              </div>
              
              {/* Profile Image */}
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
                <img 
                  src={entry.profile.images?.[0]} 
                  alt={entry.profile.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-gray-800">{entry.profile.name}</span>
                  {entry.profile.isVerified && <span className="text-blue-500">✓</span>}
                </div>
                <div className="text-sm text-gray-600">{tierInfo.tier}</div>
              </div>
              
              {/* Score */}
              <div className="text-right">
                <div className={`text-2xl font-bold bg-gradient-to-r ${tierInfo.color} bg-clip-text text-transparent`}>
                  {Math.round(animatedScore)}
                </div>
                <div className="text-xs text-gray-500">connections</div>
              </div>
            </div>
            
            {/* Score Breakdown Bar */}
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full flex">
                <div 
                  className={`bg-gradient-to-r ${entry.scoreBreakdown.dated.color} transition-all duration-1000`}
                  style={{ width: `${entry.scoreBreakdown.dated.percentage}%` }}
                />
                <div 
                  className={`bg-gradient-to-r ${entry.scoreBreakdown.hookup.color} transition-all duration-1000`}
                  style={{ width: `${entry.scoreBreakdown.hookup.percentage}%` }}
                />
                <div 
                  className={`bg-gradient-to-r ${entry.scoreBreakdown.transactional.color} transition-all duration-1000`}
                  style={{ width: `${entry.scoreBreakdown.transactional.percentage}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const BreakdownView = () => {
    if (!currentScoreBreakdown) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-xl font-bold text-gray-700 mb-2">No Profile Selected</div>
          <div className="text-gray-500">Select a profile to view detailed breakdown</div>
        </div>
      );
    }

    const tierInfo = getScoreTier(currentScoreBreakdown.total);
    const currentRank = leaderboard.findIndex(entry => entry.profile.id === currentProfile!.id) + 1;
    const totalCelebs = profiles.length;
    const percentile = Math.round(((totalCelebs - currentRank + 1) / totalCelebs) * 100);

    return (
      <div className="space-y-6">
        {/* Current Profile Score */}
        <div className="glass-card p-6 text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden border-4 border-gradient-to-r from-pink-400 to-purple-500">
            <img 
              src={currentProfile!.images?.[0]} 
              alt={currentProfile!.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="font-bold text-2xl mb-2">{currentProfile!.name}</div>
          <div className={`text-5xl font-bold bg-gradient-to-r ${tierInfo.color} bg-clip-text text-transparent mb-2`}>
            {currentScoreBreakdown.total}
          </div>
          <div className="text-lg font-medium text-gray-600 mb-2">{tierInfo.tier}</div>
          <div className="text-sm text-gray-500">Rank #{currentRank} • Top {percentile}%</div>
        </div>

        {/* Celebrity Insights */}
        <div className="glass-card p-6">
          <div className="text-lg font-bold text-gray-800 mb-4 text-center">🌟 Celebrity Profile</div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold gradient-text">{currentProfile!.age}</div>
              <div className="text-xs text-gray-600">Years Old</div>
            </div>
            <div>
              <div className="text-2xl font-bold gradient-text">{currentProfile!.isVerified ? '✓' : '○'}</div>
              <div className="text-xs text-gray-600">{currentProfile!.isVerified ? 'Verified' : 'Unverified'}</div>
            </div>
          </div>
          {currentProfile!.bio && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-700 text-center italic">"{currentProfile!.bio}"</div>
            </div>
          )}
        </div>

        {/* Relationship Pattern Analysis */}
        <div className="glass-card p-6">
          <div className="text-lg font-bold text-gray-800 mb-4 text-center">💕 Relationship Pattern</div>
          <div className="space-y-3">
            {currentScoreBreakdown.dated.count > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">❤️</span>
                  <span className="text-sm font-medium">Serious Relationships</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-600">{currentScoreBreakdown.dated.count}</div>
                  <div className="text-xs text-gray-500">{currentScoreBreakdown.dated.percentage}% of connections</div>
                </div>
              </div>
            )}
            {currentScoreBreakdown.hookup.count > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🔥</span>
                  <span className="text-sm font-medium">Casual Encounters</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-600">{currentScoreBreakdown.hookup.count}</div>
                  <div className="text-xs text-gray-500">{currentScoreBreakdown.hookup.percentage}% of connections</div>
                </div>
              </div>
            )}
            {currentScoreBreakdown.transactional.count > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">💵</span>
                  <span className="text-sm font-medium">Business Arrangements</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">{currentScoreBreakdown.transactional.count}</div>
                  <div className="text-xs text-gray-500">{currentScoreBreakdown.transactional.percentage}% of connections</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connection Comparison */}
        <div className="glass-card p-6">
          <div className="text-lg font-bold text-gray-800 mb-4 text-center">📊 Network Comparison</div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">vs. Network Average</span>
              <span className={`font-bold ${
                currentScoreBreakdown.total > (profiles.reduce((sum, p) => sum + p.bodycount.total, 0) / profiles.length)
                  ? 'text-green-600' : 'text-red-600'
              }`}>
                {currentScoreBreakdown.total > (profiles.reduce((sum, p) => sum + p.bodycount.total, 0) / profiles.length) ? '+' : ''}
                {Math.round(currentScoreBreakdown.total - (profiles.reduce((sum, p) => sum + p.bodycount.total, 0) / profiles.length))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Network Percentile</span>
              <span className="font-bold text-purple-600">{percentile}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Celebrity Tier</span>
              <span className={`font-bold bg-gradient-to-r ${tierInfo.color} bg-clip-text text-transparent`}>
                {tierInfo.tier}
              </span>
            </div>
          </div>
        </div>

        {/* Social Media */}
        {currentProfile!.socialHandles && Object.keys(currentProfile!.socialHandles).length > 0 && (
          <div className="glass-card p-6">
            <div className="text-lg font-bold text-gray-800 mb-4 text-center">📱 Social Media</div>
            <div className="space-y-2">
              {currentProfile!.socialHandles.instagram && (
                <div className="flex items-center justify-between p-2 bg-pink-50 rounded">
                  <span className="text-sm font-medium">📷 Instagram</span>
                  <span className="text-sm text-gray-600">{currentProfile!.socialHandles.instagram}</span>
                </div>
              )}
              {currentProfile!.socialHandles.tiktok && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">🎵 TikTok</span>
                  <span className="text-sm text-gray-600">{currentProfile!.socialHandles.tiktok}</span>
                </div>
              )}
              {currentProfile!.socialHandles.twitter && (
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm font-medium">🐦 Twitter</span>
                  <span className="text-sm text-gray-600">{currentProfile!.socialHandles.twitter}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const BetsView = () => {
    const [userBet, setUserBet] = useState<any>(null);
    const [roundStats, setRoundStats] = useState<any>(null);
    const [pastBets, setPastBets] = useState<any[]>([]);
    const [showPastBets, setShowPastBets] = useState(false);
    const [userStats, setUserStats] = useState({ totalBets: 0, totalWagered: 0, winRate: 0 });

    useEffect(() => {
      const fetchBettingData = async () => {
        if (currentRound && address) {
          try {
            const bet = await getUserBet(currentRound.round);
            const stats = await getRoundStats(currentRound.round);
            setUserBet(bet);
            setRoundStats(stats);
            
            // Fetch past betting rounds (mock data for now)
            const mockPastBets = [
              {
                round: currentRound.round - 1,
                amount: '25.00',
                option: 'A',
                result: 'won',
                payout: '45.50',
                date: new Date(Date.now() - 86400000).toLocaleDateString()
              },
              {
                round: currentRound.round - 2,
                amount: '15.00',
                option: 'B',
                result: 'lost',
                payout: '0.00',
                date: new Date(Date.now() - 172800000).toLocaleDateString()
              }
            ];
            setPastBets(mockPastBets);
            
            // Calculate user stats
            const totalBets = mockPastBets.length;
            const totalWagered = mockPastBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
            const wins = mockPastBets.filter(bet => bet.result === 'won').length;
            const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;
            
            setUserStats({ totalBets, totalWagered, winRate });
          } catch (error) {
            console.error('Error fetching betting data:', error);
          }
        }
      };

      fetchBettingData();
    }, [currentRound, address, getUserBet, getRoundStats]);

    return (
      <div className="space-y-6">
        {/* Current Round Info */}
        <div className="glass-card p-6 text-center">
          <div className="text-2xl font-bold text-gray-800 mb-2">🎯 Active Round</div>
          {currentRound ? (
            <>
              <div className="text-4xl font-bold gradient-text mb-2">
                #{currentRound.round}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                {currentRound.active ? 'Betting Open' : 'Round Closed'}
              </div>
              {currentRound.deadline && (
                <div className="text-xs text-gray-500">
                  Ends: {new Date(currentRound.deadline * 1000).toLocaleDateString()}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-4xl font-bold text-gray-400 mb-2">-</div>
              <div className="text-sm text-gray-600">No active round</div>
            </>
          )}
        </div>

        {/* Round Statistics */}
        {currentRound && (
          <div className="glass-card p-6">
            <div className="text-lg font-bold text-gray-800 mb-4 text-center">📊 Round Pool</div>
            {bettingLoading ? (
              <div className="text-center py-4">
                <div className="text-2xl mb-2">⏳</div>
                <div className="text-sm text-gray-600">Loading pool data...</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    ${parseFloat(currentRound.poolA || '0').toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-600">Option A Pool</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    ${parseFloat(currentRound.poolB || '0').toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-600">Option B Pool</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User's Current Bet */}
        <div className="glass-card p-6">
          <div className="text-lg font-bold text-gray-800 mb-4 text-center">💰 Your Active Bet</div>
          {!address ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-2">🔗</div>
              <div className="text-sm text-gray-600">Connect wallet to view your bets</div>
            </div>
          ) : userBet && (parseFloat(userBet.amountA) > 0 || parseFloat(userBet.amountB) > 0) ? (
            <div className="space-y-3">
              {parseFloat(userBet.amountA) > 0 && (
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🅰️</span>
                    <span className="text-sm font-medium">Option A</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">${userBet.amountA}</div>
                    <div className="text-xs text-gray-500">USDC</div>
                  </div>
                </div>
              )}
              {parseFloat(userBet.amountB) > 0 && (
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🅱️</span>
                    <span className="text-sm font-medium">Option B</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">${userBet.amountB}</div>
                    <div className="text-xs text-gray-500">USDC</div>
                  </div>
                </div>
              )}
              {userBet.hasClaimed ? (
                <div className="text-center text-sm text-green-600 font-medium">✅ Winnings Claimed</div>
              ) : (
                <div className="text-center text-sm text-orange-600 font-medium">⏳ Awaiting Results</div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-2xl mb-2">📝</div>
              <div className="text-sm text-gray-600">No active bets this round</div>
              <div className="text-xs text-gray-500 mt-1">Visit the main page to place bets</div>
            </div>
          )}
        </div>

        {/* Betting Guide */}
        <div className="glass-card p-6">
          <div className="text-lg font-bold text-gray-800 mb-4 text-center">🎲 How Betting Works</div>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <span className="text-pink-500 font-bold">1.</span>
              <span>Daily betting rounds feature celebrity matchups</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-pink-500 font-bold">2.</span>
              <span>Bet USDC on relationship predictions</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-pink-500 font-bold">3.</span>
              <span>Winners share 90% of the total pool</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-pink-500 font-bold">4.</span>
              <span>Claim winnings after round settlement</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
         <div className="glass-card p-6">
           <div className="text-lg font-bold text-gray-800 mb-4 text-center">📈 Your Stats</div>
           <div className="grid grid-cols-3 gap-4 text-center">
             <div>
               <div className="text-xl font-bold gradient-text">{userStats.totalBets}</div>
               <div className="text-xs text-gray-600">Total Bets</div>
             </div>
             <div>
               <div className="text-xl font-bold gradient-text">${userStats.totalWagered.toFixed(2)}</div>
               <div className="text-xs text-gray-600">Total Wagered</div>
             </div>
             <div>
               <div className="text-xl font-bold gradient-text">{userStats.winRate}%</div>
               <div className="text-xs text-gray-600">Win Rate</div>
             </div>
           </div>
         </div>

         {/* Past Bets Section */}
         {address && (
           <div className="glass-card p-6">
             <div className="flex justify-between items-center mb-4">
               <div className="text-lg font-bold text-gray-800">📜 Betting History</div>
               <button
                 onClick={() => setShowPastBets(!showPastBets)}
                 className="text-sm text-pink-600 hover:text-pink-700 font-medium"
               >
                 {showPastBets ? 'Hide' : 'Show'} History
               </button>
             </div>
             
             {showPastBets && (
               <div className="space-y-3">
                 {pastBets.length > 0 ? (
                   pastBets.map((bet, index) => (
                     <div key={index} className="border border-gray-200 rounded-lg p-3">
                       <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center space-x-2">
                           <span className="text-sm font-medium">Round #{bet.round}</span>
                           <span className={`text-xs px-2 py-1 rounded-full ${
                             bet.result === 'won' 
                               ? 'bg-green-100 text-green-700' 
                               : 'bg-red-100 text-red-700'
                           }`}>
                             {bet.result === 'won' ? '✅ Won' : '❌ Lost'}
                           </span>
                         </div>
                         <span className="text-xs text-gray-500">{bet.date}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-2 text-sm">
                         <div>
                           <div className="text-xs text-gray-500">Bet Amount</div>
                           <div className="font-medium">${bet.amount}</div>
                         </div>
                         <div>
                           <div className="text-xs text-gray-500">Option</div>
                           <div className="font-medium">{bet.option}</div>
                         </div>
                         <div>
                           <div className="text-xs text-gray-500">Payout</div>
                           <div className={`font-medium ${
                             bet.result === 'won' ? 'text-green-600' : 'text-red-600'
                           }`}>
                             ${bet.payout}
                           </div>
                         </div>
                       </div>
                     </div>
                   ))
                 ) : (
                   <div className="text-center py-4">
                     <div className="text-2xl mb-2">📋</div>
                     <div className="text-sm text-gray-600">No betting history yet</div>
                     <div className="text-xs text-gray-500 mt-1">Your past bets will appear here</div>
                   </div>
                 )}
               </div>
             )}
           </div>
         )}
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 p-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold gradient-text text-center mb-4">📊 Bodycount Scores</h1>
        
        {/* View Selector */}
        <div className="grid grid-cols-4 bg-gray-100 rounded-2xl p-1">
          <button
            onClick={() => setSelectedView('overview')}
            className={`py-2 px-2 rounded-xl text-xs font-medium transition-all duration-300 ${
              selectedView === 'overview'
                ? 'bg-white text-pink-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedView('leaderboard')}
            className={`py-2 px-2 rounded-xl text-xs font-medium transition-all duration-300 ${
              selectedView === 'leaderboard'
                ? 'bg-white text-pink-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setSelectedView('breakdown')}
            className={`py-2 px-2 rounded-xl text-xs font-medium transition-all duration-300 ${
              selectedView === 'breakdown'
                ? 'bg-white text-pink-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Breakdown
          </button>
          <button
            onClick={() => setSelectedView('bets')}
            className={`py-2 px-2 rounded-xl text-xs font-medium transition-all duration-300 ${
              selectedView === 'bets'
                ? 'bg-white text-pink-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Bets
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {selectedView === 'overview' && <OverviewView />}
        {selectedView === 'leaderboard' && <LeaderboardView />}
        {selectedView === 'breakdown' && <BreakdownView />}
        {selectedView === 'bets' && <BetsView />}
      </div>
    </div>
  );
};