'use client';

import { useState, useEffect } from 'react';
import { SwipeCard } from '../components/SwipeCard';
import { Profile as DBProfile } from '../../lib/models';

// SwipeCard expects this Profile type
type SwipeCardProfile = {
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

export default function TestSwipePage() {
  const [profiles, setProfiles] = useState<SwipeCardProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        console.log('🔍 Fetching profiles for test page...');
        const response = await fetch('/api/profiles');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log('✅ Test page received response:', responseData);
        
        // Extract profiles array from API response
        const profiles = responseData.profiles || responseData;
        console.log('✅ Profiles array:', profiles.length);
        
        // Transform DB profiles to SwipeCard format
        const transformedProfiles: SwipeCardProfile[] = profiles.map((profile: any) => ({
          id: profile._id || profile.userId, // Use _id or fallback to userId
          name: profile.name,
          age: profile.age,
          bio: profile.bio,
          images: profile.images,
          socialHandles: {
            instagram: profile.socialHandles.instagram,
            tiktok: profile.socialHandles.tiktok,
            twitter: profile.socialHandles.twitter,
          },
          bodycount: {
            dated: Math.floor(Math.random() * 10), // Mock data for testing
            hookup: Math.floor(Math.random() * 15),
            transactional: Math.floor(Math.random() * 5),
            total: 0, // Will be calculated
          },
        }));
        
        // Calculate total bodycount
        transformedProfiles.forEach(profile => {
          profile.bodycount.total = profile.bodycount.dated + profile.bodycount.hookup + profile.bodycount.transactional;
        });
        
        setProfiles(transformedProfiles);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching profiles:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const handleSwipe = (profileId: string, direction: 'left' | 'right') => {
    console.log(`🔄 Swiped ${direction} on profile:`, profileId);
    // Remove the swiped profile from the list
    setProfiles(prev => {
      const filtered = prev.filter(p => p.id !== profileId);
      console.log(`📊 Profiles remaining after swipe: ${filtered.length}`);
      return filtered;
    });
  };

  const handleRate = (profileId: string, rating: 'dated' | 'hookup' | 'transactional') => {
    console.log(`⭐ Rated profile ${profileId} with rating: ${rating}`);
    // Remove the rated profile from the list
    setProfiles(prev => {
      const filtered = prev.filter(p => p.id !== profileId);
      console.log(`📊 Profiles remaining after rating: ${filtered.length}`);
      return filtered;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Profiles</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Test Swipe Page</h1>
          <p className="text-gray-600">Profiles loaded: {profiles.length}</p>
          <a 
            href="/" 
            className="inline-block mt-2 text-pink-500 hover:text-pink-600 underline"
          >
            ← Back to Main App
          </a>
        </div>

        {/* Progress Counter */}
        {profiles.length > 0 && (
          <div className="text-center mb-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium text-gray-700 inline-block">
              {profiles.length} profiles remaining
            </div>
          </div>
        )}

        {/* Swipe Cards */}
        <div className="relative">
          {profiles.length === 0 ? (
            <div className="text-center bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">All Done! 🎉</h2>
              <p className="text-gray-600 mb-4">You've swiped through all profiles.</p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600"
              >
                Reload Profiles
              </button>
            </div>
          ) : (
            <div className="relative h-[600px]">
              {profiles.slice(0, Math.min(5, profiles.length)).map((profile, index) => (
                <div
                  key={`${profile.id}-${index}`}
                  className="absolute inset-0"
                  style={{ zIndex: Math.min(5, profiles.length) - index }}
                >
                  <SwipeCard
                    profile={profile}
                    onSwipe={(direction, profileId) => handleSwipe(profileId, direction)}
                    onRate={(profileId, rating) => {
                      console.log(`⭐ Rated profile ${profileId} with rating:`, rating);
                      handleRate(profileId, rating);
                    }}
                    isActive={index === 0}
                    zIndex={Math.min(5, profiles.length) - index}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-lg p-4 text-sm">
          <h3 className="font-bold text-gray-800 mb-2">Debug Info:</h3>
          <ul className="text-gray-600 space-y-1">
            <li>• Total profiles: {profiles.length}</li>
            <li>• Current profile: {profiles[0]?.name || 'None'}</li>
            <li>• Check console for swipe logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}