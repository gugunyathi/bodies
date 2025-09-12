'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import { useNFTPurchase } from '../../hooks/useNFTPurchase';

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

export default function ProfilePage() {
  const params = useParams();
  const profileId = params.id as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // NFT Purchase functionality
  const {
    collection: collectionData,
    isLoading: isNFTLoading,
    purchaseNFT,
    isConnected: isWalletConnected,
    address: walletAddress,
    walletDisplayName,
    isCorrectNetwork,
    connectionError,
    connectWallet,
    switchToBaseNetwork,
    transactionHash,
    isConfirmed,
    writeError
  } = useNFTPurchase();

  // Handle NFT Purchase
  const handleNFTPurchase = async (tokenId: string) => {
    try {
      await purchaseNFT(tokenId);
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // We need to get all profiles and find the one with matching ID
        // since we don't have a direct get-by-id endpoint
        const response = await apiClient.getProfiles(undefined, 100, 0);
        
        if (response.success && (response as any).profiles) {
          const foundProfile = (response as any).profiles.find((p: Profile) => p.id === profileId);
          if (foundProfile) {
            setProfile(foundProfile);
          } else {
            setError('Profile not found');
          }
        } else {
          setError('Failed to load profile');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (profileId) {
      fetchProfile();
    }
  }, [profileId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The profile you\'re looking for doesn\'t exist.'}</p>
          <a
            href="/"
            className="inline-block bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <a
            href="/"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </a>
          <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>

        {/* Profile Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden">
            {/* Profile Image */}
            <div className="relative h-80 bg-gradient-to-br from-pink-400 to-purple-600">
              {profile.images && profile.images.length > 0 ? (
                <img
                  src={profile.images[0]}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to gradient background if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-6xl font-bold text-white opacity-80">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
              
              {/* Verification Badge */}
              {profile.isVerified && (
                <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Verified</span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{profile.name}</h2>
                <p className="text-lg text-gray-600 mb-1">{profile.age} years old</p>
                {profile.location && (
                  <p className="text-gray-500 flex items-center justify-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{profile.location}</span>
                  </p>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">About</h3>
                  <p className="text-gray-600 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Social Handles */}
              {profile.socialHandles && Object.keys(profile.socialHandles).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Social Media</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(profile.socialHandles).map(([platform, handle]) => (
                      <div key={platform} className="bg-gray-100 px-3 py-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 capitalize">{platform}:</span>
                        <span className="text-sm text-gray-600 ml-1">@{handle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NFT Purchase Section - Only for The Game */}
              {profile.name === 'The Game' && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center justify-center">
                      <span className="mr-2">🎴</span>
                      The Game - Kardashian Collector NFT
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Exclusive Wild Card NFT • Limited Edition
                    </p>
                    
                    {collectionData && (
                      <div className="flex justify-center space-x-4 mb-4">
                        <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                          <div className="text-xs text-gray-500">Price</div>
                          <div className="font-bold text-purple-600">Ξ {collectionData.price} ETH</div>
                        </div>
                        <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
                          <div className="text-xs text-gray-500">Available</div>
                          <div className="font-bold text-green-600">{collectionData.available} left</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    {!isWalletConnected ? (
                      <button
                        onClick={connectWallet}
                        disabled={isNFTLoading}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isNFTLoading ? 'Connecting...' : 'Connect Wallet to Purchase NFT'}
                      </button>
                    ) : !isCorrectNetwork ? (
                      <button
                        onClick={switchToBaseNetwork}
                        disabled={isNFTLoading}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Switch to Base Network
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleNFTPurchase('the-game-nft')}
                          disabled={isNFTLoading || !collectionData || collectionData.available <= 0}
                          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {isNFTLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <span>🛒</span>
                              <span>Buy Now - Ξ {collectionData?.price || '0.001'} ETH</span>
                            </>
                          )}
                        </button>
                        
                        <div className="text-xs text-center text-gray-500">
                          Connected: {walletDisplayName} • {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                        </div>
                      </div>
                    )}
                    
                    {connectionError && (
                      <div className="text-xs text-red-600 text-center bg-red-50 p-2 rounded">
                        {connectionError}
                      </div>
                    )}
                    
                    {transactionHash && (
                      <div className="text-xs text-green-600 text-center bg-green-50 p-2 rounded">
                        Transaction: {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                        {isConfirmed && <span className="ml-2">✅ Confirmed</span>}
                      </div>
                    )}
                    
                    {writeError && (
                      <div className="text-xs text-red-600 text-center bg-red-50 p-2 rounded">
                        Error: {writeError.message}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Profile Stats */}
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 text-center">
                  Profile created {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}