"use client";

import { useState, useEffect } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { apiClient } from '../../lib/api-client';
import { WalletButton } from '../components/WalletButton';
import { useAccount } from 'wagmi';

interface BodycountStats {
  profileId: string;
  profileName: string;
  totalRatings: number;
  datedCount: number;
  hookupCount: number;
  transactionalCount: number;
  bodycount: number;
  averageRating: number;
  lastUpdated: string;
}

interface LeaderboardEntry {
  profileId: string;
  profileName: string;
  profileImage?: string;
  isVerified: boolean;
  totalRatings: number;
  datedCount: number;
  hookupCount: number;
  transactionalCount: number;
  bodycount: number;
  averageRating: number;
  lastUpdated: string;
}

interface OverviewStats {
  totalProfiles: number;
  totalRatings: number;
  totalBodycount: number;
  breakdown: {
    dated: number;
    hookups: number;
    transactional: number;
  };
  averageBodycount: number;
  recentActivity: number;
}

export default function StatsTestPage() {
  const { userId, walletAddress, isAuthenticated } = useCurrentUser();
  const { isConnected } = useAccount();
  const [selectedView, setSelectedView] = useState<'overview' | 'leaderboard' | 'profile'>('overview');
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [profileStats, setProfileStats] = useState<BodycountStats | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [availableProfiles, setAvailableProfiles] = useState<{ _id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load available profiles on component mount
  useEffect(() => {
    loadAvailableProfiles();
  }, []);

  const loadAvailableProfiles = async () => {
    try {
      const response = await apiClient.getProfiles();
      if (response.success && (response as any).data) {
        const profiles = Array.isArray((response as any).data) ? (response as any).data : (response as any).data.profiles || [];
        setAvailableProfiles(profiles.map((p: any) => ({ _id: p._id || '', name: p.name })));
        if (profiles.length > 0) {
          setSelectedProfileId(profiles[0]._id || '');
        }
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  // Load overview statistics
  const loadOverviewStats = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/stats?type=overview');
      const data = await response.json();
      
      if (data.success) {
        setOverviewStats(data.overview);
      } else {
        setError(data.error || 'Failed to load overview stats');
      }
    } catch (error) {
      setError('Error loading overview stats: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load leaderboard
  const loadLeaderboard = async (limit = 10) => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch(`/api/stats?type=leaderboard&limit=${limit}`);
      const data = await response.json();
      
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      } else {
        setError(data.error || 'Failed to load leaderboard');
      }
    } catch (error) {
      setError('Error loading leaderboard: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load profile statistics
  const loadProfileStats = async (profileId: string) => {
    if (!profileId) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch(`/api/stats?type=profile&profileId=${profileId}`);
      const data = await response.json();
      
      if (data.success) {
        setProfileStats(data.profileStats);
      } else {
        setError(data.error || 'Failed to load profile stats');
      }
    } catch (error) {
      setError('Error loading profile stats: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle view change
  const handleViewChange = (view: 'overview' | 'leaderboard' | 'profile') => {
    setSelectedView(view);
    setError('');
    
    if (view === 'overview') {
      loadOverviewStats();
    } else if (view === 'leaderboard') {
      loadLeaderboard();
    } else if (view === 'profile' && selectedProfileId) {
      loadProfileStats(selectedProfileId);
    }
  };

  // Handle profile selection change
  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
    if (selectedView === 'profile') {
      loadProfileStats(profileId);
    }
  };

  // Get score tier and color
  const getScoreTier = (score: number) => {
    if (score >= 50) return { tier: 'Legendary', color: 'text-purple-600', bgColor: 'bg-purple-100' };
    if (score >= 30) return { tier: 'Elite', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (score >= 20) return { tier: 'Popular', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (score >= 10) return { tier: 'Active', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    if (score >= 5) return { tier: 'Getting Started', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    return { tier: 'New', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">📊 Bodycount Statistics Test</h1>
        
        {/* Wallet Connection Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
          <div className="flex items-center gap-4">
            <WalletButton />
            {isConnected
              ? <p className="text-green-600">✅ Wallet Connected: {walletAddress}</p>
              : <p className="text-red-600">❌ No wallet connected</p>
            }
          </div>
        </div>

        {/* View Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Statistics Views</h2>
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => handleViewChange('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedView === 'overview'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📈 Overview
            </button>
            <button
              onClick={() => handleViewChange('leaderboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedView === 'leaderboard'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={() => handleViewChange('profile')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedView === 'profile'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              👤 Profile Stats
            </button>
          </div>
          
          {selectedView === 'profile' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Profile:
              </label>
              <select
                value={selectedProfileId}
                onChange={(e) => handleProfileChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a profile...</option>
                {availableProfiles.map((profile) => (
                  <option key={profile._id} value={profile._id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading statistics...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">❌ Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Overview Stats */}
        {selectedView === 'overview' && overviewStats && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📈 Platform Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">{overviewStats.totalProfiles}</div>
                <div className="text-sm text-gray-600">Total Profiles</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">{overviewStats.totalRatings}</div>
                <div className="text-sm text-gray-600">Total Ratings</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-600">{overviewStats.totalBodycount}</div>
                <div className="text-sm text-gray-600">Total Bodycount</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Breakdown by Type</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-red-600">❤️ Dated:</span>
                    <span className="font-medium">{overviewStats.breakdown.dated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-600">🔥 Hookups:</span>
                    <span className="font-medium">{overviewStats.breakdown.hookups}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">💵 Transactional:</span>
                    <span className="font-medium">{overviewStats.breakdown.transactional}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Platform Metrics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Bodycount:</span>
                    <span className="font-medium">{overviewStats.averageBodycount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recent Activity (24h):</span>
                    <span className="font-medium">{overviewStats.recentActivity}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {selectedView === 'leaderboard' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🏆 Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No leaderboard data available</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => {
                  const tierInfo = getScoreTier(entry.bodycount);
                  return (
                    <div key={entry.profileId} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      {/* Rank */}
                      <div className="flex-shrink-0 w-8 text-center">
                        {index < 3 ? (
                          <div className="text-2xl">
                            {index === 0 && '🥇'}
                            {index === 1 && '🥈'}
                            {index === 2 && '🥉'}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      
                      {/* Profile Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-800">{entry.profileName}</span>
                          {entry.isVerified && <span className="text-blue-500">✓</span>}
                        </div>
                        <div className={`text-sm ${tierInfo.color}`}>{tierInfo.tier}</div>
                      </div>
                      
                      {/* Stats */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">{entry.bodycount}</div>
                        <div className="text-xs text-gray-500">{entry.totalRatings} ratings</div>
                      </div>
                      
                      {/* Breakdown */}
                      <div className="text-right text-sm">
                        <div className="text-red-600">❤️ {entry.datedCount}</div>
                        <div className="text-orange-600">🔥 {entry.hookupCount}</div>
                        <div className="text-green-600">💵 {entry.transactionalCount}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Profile Stats */}
        {selectedView === 'profile' && profileStats && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">👤 Profile Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{profileStats.bodycount}</div>
                  <div className="text-sm text-gray-600">Total Bodycount</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-red-600">❤️ Dated:</span>
                      <span className="font-medium">{profileStats.datedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-600">🔥 Hookups:</span>
                      <span className="font-medium">{profileStats.hookupCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">💵 Transactional:</span>
                      <span className="font-medium">{profileStats.transactionalCount}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">{profileStats.totalRatings}</div>
                  <div className="text-sm text-gray-600">Total Ratings</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profile Name:</span>
                      <span className="font-medium">{profileStats.profileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Rating:</span>
                      <span className="font-medium">{profileStats.averageRating.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="font-medium text-xs">{new Date(profileStats.lastUpdated).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Test Instructions</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div><strong>Overview:</strong> Test platform-wide statistics including total profiles, ratings, and bodycount breakdown</div>
            <div><strong>Leaderboard:</strong> Test ranking functionality showing top profiles by bodycount</div>
            <div><strong>Profile Stats:</strong> Test individual profile statistics including detailed breakdowns</div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <strong>Note:</strong> Statistics are automatically updated when ratings are submitted through the rating system.
              Use the test-rating page to create sample data if needed.
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="inline-block bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg mr-4"
          >
            Back to Main App
          </a>
          <a
            href="/test-rating"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Test Rating System
          </a>
        </div>
      </div>
    </div>
  );
}