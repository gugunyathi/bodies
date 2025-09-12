"use client";

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';

interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  images: string[];
  socialHandles: Record<string, string>;
  location: string;
  isVerified: boolean;
  createdAt: string;
}

interface Rating {
  id: string;
  profileId: string;
  ratingType: 'dated' | 'hookup' | 'transactional';
  isAnonymous: boolean;
  evidenceCount: number;
  createdAt: string;
}

interface ProfileStats {
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

export default function ViewProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileRatings, setProfileRatings] = useState<Rating[]>([]);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await apiClient.getProfiles();
      console.log('Profiles API response:', response);
      
      if (response.success && (response as any).profiles) {
        const profilesData = (response as any).profiles || [];
        setProfiles(profilesData);
      } else {
        setError(response.error || 'Failed to load profiles');
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfileDetails = async (profile: Profile) => {
    try {
      setIsLoadingDetails(true);
      setSelectedProfile(profile);
      
      // Load ratings for this profile
      const ratingsResponse = await apiClient.getRatings(profile.id);
      if (ratingsResponse.success && (ratingsResponse as any).ratings) {
        setProfileRatings((ratingsResponse as any).ratings || []);
      }
      
      // Load profile stats
      const statsResponse = await apiClient.getProfileStats(profile.id);
      if (statsResponse.success && (statsResponse as any).profileStats) {
        setProfileStats((statsResponse as any).profileStats || null);
      }
    } catch (err) {
      console.error('Error loading profile details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setSelectedProfile(null);
    setProfileRatings([]);
    setProfileStats(null);
  };

  const getRatingEmoji = (type: string) => {
    switch (type) {
      case 'dated': return '❤️';
      case 'hookup': return '🔥';
      case 'transactional': return '💵';
      default: return '❓';
    }
  };

  const getRatingLabel = (type: string) => {
    switch (type) {
      case 'dated': return 'Dated';
      case 'hookup': return 'Hookup';
      case 'transactional': return 'Transactional';
      default: return 'Unknown';
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
            View All Profiles
          </h1>
          <p className="text-gray-600 mb-6">
            This page displays all profiles currently in the database
          </p>
          
          <button
            onClick={loadProfiles}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            {isLoading ? 'Loading...' : 'Refresh Profiles'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Found {profiles.length} Profile{profiles.length !== 1 ? 's' : ''}
          </h2>
          
          {profiles.length === 0 && !isLoading && (
            <p className="text-gray-500 text-center py-8">
              No profiles found in the database.
            </p>
          )}
          
          <div className="grid gap-6">
            {profiles.map((profile) => (
              <div 
                key={profile.id} 
                className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-all duration-200"
                onClick={() => loadProfileDetails(profile)}
              >
                <div className="flex items-start gap-4">
                  {profile.images && profile.images[0] && (
                    <img
                      src={profile.images[0]}
                      alt={profile.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {profile.name}
                      </h3>
                      <span className="text-gray-600">({profile.age})</span>
                      {profile.isVerified && (
                        <span className="text-blue-500">✓</span>
                      )}
                    </div>
                    
                    <p className="text-gray-700 mb-2">{profile.bio}</p>
                    
                    {profile.location && (
                      <p className="text-gray-600 text-sm mb-2">
                        📍 {profile.location}
                      </p>
                    )}
                    
                    {profile.socialHandles && Object.keys(profile.socialHandles).length > 0 && (
                      <div className="flex gap-2 mb-2">
                        {Object.entries(profile.socialHandles).map(([platform, handle]) => (
                          <span key={platform} className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {platform}: {handle}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-gray-500 text-xs">
                      Created: {new Date(profile.createdAt).toLocaleString()}
                    </p>
                    
                    <p className="text-gray-500 text-xs">
                      ID: {profile.id}
                    </p>
                    
                    <div className="mt-2 text-blue-600 text-sm font-medium">
                      👆 Click to view relationship history
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-center mt-6">
          <a
            href="/test-profiles"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Test Profiles
          </a>
        </div>
      </div>

      {/* Relationship History Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {selectedProfile.images && selectedProfile.images[0] && (
                  <img
                    src={selectedProfile.images[0]}
                    alt={selectedProfile.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedProfile.name}'s Relationship History
                  </h2>
                  <p className="text-gray-600">{selectedProfile.age} years old</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading relationship history...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Summary */}
                {profileStats && (
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{profileStats.totalRatings}</div>
                        <div className="text-sm text-gray-600">Total Ratings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{profileStats.datedCount}</div>
                        <div className="text-sm text-gray-600">❤️ Dated</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{profileStats.hookupCount}</div>
                        <div className="text-sm text-gray-600">🔥 Hookups</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{profileStats.transactionalCount}</div>
                        <div className="text-sm text-gray-600">💵 Transactional</div>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        {profileStats.bodycount}
                      </div>
                      <div className="text-sm text-gray-600">Total Bodycount</div>
                    </div>
                  </div>
                )}

                {/* Individual Ratings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Individual Ratings ({profileRatings.length})
                  </h3>
                  
                  {profileRatings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No ratings found for this profile.</p>
                      <p className="text-sm mt-2">Be the first to rate {selectedProfile.name}!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {profileRatings.map((rating) => (
                        <div key={rating.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getRatingEmoji(rating.ratingType)}</span>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {getRatingLabel(rating.ratingType)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {rating.isAnonymous ? 'Anonymous' : 'Public'} rating
                                  {rating.evidenceCount > 0 && (
                                    <span className="ml-2">• {rating.evidenceCount} evidence</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(rating.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}