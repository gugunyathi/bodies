"use client";

import { useState, useEffect } from "react";
import { SwipeStack } from "../components/SwipeCard";
import { dataPersistence } from '../../lib/data-persistence';

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
  evidence: {
    [ratingId: string]: any[];
  };
  createdAt: string;
  isVerified: boolean;
  userId?: string;
  isActive?: boolean;
};

export default function TestCards() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const loadedProfiles = await dataPersistence.getProfiles();
        const localProfiles: Profile[] = loadedProfiles.map((dbProfile: any) => {
          return {
            id: dbProfile._id?.toString() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: dbProfile.name,
            age: dbProfile.age,
            bio: dbProfile.bio,
            images: dbProfile.images,
            socialHandles: dbProfile.socialHandles,
            createdAt: dbProfile.createdAt?.toISOString?.() || new Date().toISOString(),
            isVerified: dbProfile.isVerified,
            userId: dbProfile.userId?.toString(),
            isActive: dbProfile.isActive,
            bodycount: {
              dated: 0,
              hookup: 0,
              transactional: 0,
              total: 0
            },
            evidence: {}
          };
        });
        
        console.log(`✅ TEST: Loaded ${localProfiles.length} profiles`);
        console.log('📋 Profile names:', localProfiles.map(p => p.name));
        setProfiles(localProfiles);
      } catch (error) {
        console.error('❌ Error loading profiles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const handleSwipe = (direction: 'left' | 'right', profileId: string) => {
    console.log(`🔄 Swiped ${direction} on profile: ${profileId}`);
    const currentProfile = profiles.find(p => p.id === profileId);
    if (currentProfile) {
      console.log(`👤 Current profile: ${currentProfile.name}`);
    }
  };

  const handleRate = (profileId: string, rating: 'dated' | 'hookup' | 'transactional') => {
    console.log(`⭐ Rated profile ${profileId} as: ${rating}`);
    const currentProfile = profiles.find(p => p.id === profileId);
    if (currentProfile) {
      console.log(`👤 Rated profile: ${currentProfile.name}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Profile Cards Test
          </h1>
          <p className="text-gray-600 text-sm mb-4">
            Testing {profiles.length} profiles as separate cards
          </p>
          <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">Debug Info:</h3>
            <p className="text-sm text-gray-600">Total Profiles: {profiles.length}</p>
            <p className="text-sm text-gray-600">Check console for detailed logs</p>
          </div>
        </div>
        
        {profiles.length > 0 ? (
          <SwipeStack
            cards={profiles}
            onSwipe={handleSwipe}
            onRate={handleRate}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No profiles found</p>
          </div>
        )}
        
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Open browser console (F12) to see detailed logs
          </p>
        </div>
      </div>
    </div>
  );
}