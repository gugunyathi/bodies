"use client";

import { useState, useEffect } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { apiClient } from '../../lib/api-client';
import { ConnectWallet, Wallet, WalletDropdown } from '@coinbase/onchainkit/wallet';
import { Identity, Avatar, Name, Address, EthBalance } from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';

interface TestProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  images: string[];
}

interface RatingSubmission {
  raterId: string;
  profileId: string;
  ratingType: 'dated' | 'hookup' | 'transactional';
  isAnonymous: boolean;
  evidence?: {
    type: 'image' | 'video' | 'document';
    url: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    description: string;
  }[];
}

interface BodycountStats {
  profileId: string;
  totalRatings: number;
  datedCount: number;
  hookupCount: number;
  transactionalCount: number;
  averageRating: number;
  lastUpdated: string;
}

export default function TestRatingPage() {
  const { userId, walletAddress, isConnected, isAuthenticated } = useCurrentUser();
  const [testProfiles, setTestProfiles] = useState<TestProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [ratingType, setRatingType] = useState<'dated' | 'hookup' | 'transactional'>('dated');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [statsResult, setStatsResult] = useState<BodycountStats | null>(null);
  const [error, setError] = useState<string>('');

  // Load test profiles on component mount
  useEffect(() => {
    const loadTestProfiles = async () => {
      try {
        const response = await apiClient.getProfiles();
        if (response.success && (response as any).profiles && (response as any).profiles.length > 0) {
          setTestProfiles((response as any).profiles.slice(0, 5)); // Get first 5 profiles for testing
        } else {
          // Use mock profiles when API returns empty or no profiles
          console.log('No profiles found in database, using mock profiles for testing');
          // No mock profiles - use only real database profiles
          setTestProfiles([]);
        }
      } catch (err) {
        console.error('Failed to load test profiles:', err);
        // No fallback mock profiles - use only real database profiles
        setTestProfiles([]);
      }
    };

    loadTestProfiles();
  }, []);

  const handleSubmitRating = async () => {
    if (!selectedProfile) {
      setError('Please select a profile to rate');
      return;
    }

    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSubmissionResult(null);
    setStatsResult(null);

    try {
      const ratingData: RatingSubmission = {
        raterId: `${userId || 'anonymous'}_direct_${Date.now()}`,
        profileId: selectedProfile,
        ratingType,
        isAnonymous
      };

      console.log('Submitting rating:', ratingData);
      
      // Submit rating via API
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ratingData)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setSubmissionResult(result);
        console.log('Rating submitted successfully:', result);
        
        // Fetch updated stats for the profile
        await fetchProfileStats(selectedProfile);
      } else {
        throw new Error(result.error || 'Failed to submit rating');
      }
    } catch (err) {
      console.error('Rating submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchProfileStats = async (profileId: string) => {
    try {
      const response = await fetch(`/api/stats?type=profile&profileId=${profileId}`);
      const result = await response.json();
      
      if (response.ok && result.success) {
        setStatsResult(result.stats);
        console.log('Profile stats:', result.stats);
      } else {
        console.error('Failed to fetch stats:', result.error);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  const testApiClientRating = async () => {
    if (!selectedProfile) {
      setError('Please select a profile to rate');
      return;
    }

    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSubmissionResult(null);
    setStatsResult(null);

    try {
      console.log('Testing apiClient.submitRating...');
      
      const result = await apiClient.submitRating({
        raterId: `${userId || 'anonymous'}_client_${Date.now()}`,
        profileId: selectedProfile,
        ratingType,
        isAnonymous
      });
      
      if (result.success) {
        setSubmissionResult(result);
        console.log('Rating submitted via apiClient:', result);
        
        // Fetch updated stats
        await fetchProfileStats(selectedProfile);
      } else {
        throw new Error('API client rating submission failed');
      }
    } catch (err) {
      console.error('API client rating error:', err);
      setError(err instanceof Error ? err.message : 'API client rating failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            🎯 Rating System Test
          </h1>
          
          {/* Wallet Connection */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Wallet Connection</h2>
            <div className="flex flex-col space-y-4">
              <Wallet>
                <ConnectWallet className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all">
                  <Avatar className="h-6 w-6" />
                  <Name />
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                </WalletDropdown>
              </Wallet>
            </div>
          </div>

          {/* Authentication Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
            <div className="space-y-2 text-sm">
              <div>Wallet Connected: <span className={isConnected ? 'text-green-600' : 'text-red-600'}>{isConnected ? '✅' : '❌'}</span></div>
              <div>Authenticated: <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>{isAuthenticated ? '✅' : '❌'}</span></div>
              <div>User ID: <span className="font-mono text-xs">{userId || 'Not available'}</span></div>
              <div>Wallet Address: <span className="font-mono text-xs">{walletAddress || 'Not connected'}</span></div>
            </div>
          </div>

          {/* Profile Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Profile to Rate
            </label>
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="">Choose a profile...</option>
              {testProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} (Age: {profile.age})
                </option>
              ))}
            </select>
          </div>

          {/* Rating Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['dated', 'hookup', 'transactional'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setRatingType(type)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    ratingType === type
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-1">
                    {type === 'dated' && '❤️'}
                    {type === 'hookup' && '🔥'}
                    {type === 'transactional' && '💵'}
                  </div>
                  <div className="text-sm font-medium capitalize">{type}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Anonymous Option */}
          <div className="mb-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              />
              <span className="text-sm font-medium text-gray-700">Submit anonymously</span>
            </label>
          </div>

          {/* Test Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleSubmitRating}
              disabled={isSubmitting || !selectedProfile || !isAuthenticated}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-600 hover:to-purple-700 transition-all"
            >
              {isSubmitting ? 'Submitting...' : '🎯 Test Direct API Call'}
            </button>
            
            <button
              onClick={testApiClientRating}
              disabled={isSubmitting || !selectedProfile || !isAuthenticated}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-indigo-700 transition-all"
            >
              {isSubmitting ? 'Submitting...' : '🔧 Test API Client Method'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-medium">❌ Error</div>
              <div className="text-red-600 text-sm mt-1">{error}</div>
            </div>
          )}

          {/* Submission Result */}
          {submissionResult && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-800 font-medium mb-2">✅ Rating Submitted Successfully</div>
              <pre className="text-xs text-green-700 bg-green-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(submissionResult, null, 2)}
              </pre>
            </div>
          )}

          {/* Stats Result */}
          {statsResult && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-blue-800 font-medium mb-2">📊 Updated Profile Statistics</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Total Ratings: {statsResult.totalRatings}</div>
                  <div>Dated: {statsResult.datedCount}</div>
                  <div>Hookup: {statsResult.hookupCount}</div>
                  <div>Transactional: {statsResult.transactionalCount}</div>
                </div>
                <div>
                  <div className="font-medium">Average Rating: {statsResult.averageRating.toFixed(2)}</div>
                  <div className="text-xs text-gray-600">Last Updated: {new Date(statsResult.lastUpdated).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold mb-4">🧪 Test Instructions</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div>1. <strong>Connect your wallet</strong> using the main app if not already connected</div>
            <div>2. <strong>Select a profile</strong> from the dropdown to rate</div>
            <div>3. <strong>Choose a rating type</strong> (dated, hookup, or transactional)</div>
            <div>4. <strong>Test both methods:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• Direct API call to /api/ratings</li>
                <li>• API client method (apiClient.submitRating)</li>
              </ul>
            </div>
            <div>5. <strong>Verify results:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• Check that rating is submitted successfully</li>
                <li>• Verify that bodycount statistics are updated</li>
                <li>• Confirm database persistence</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}