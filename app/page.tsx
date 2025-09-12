"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import { sdk } from "@farcaster/frame-sdk";
import { sdk as miniappSdk } from "@farcaster/miniapp-sdk";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Button } from "./components/DemoComponents";
import { Icon } from "./components/DemoComponents";
import { SwipeStack } from './components/SwipeCard';
import { ProfileManager } from './components/ProfileManager';
import { BodycountScore } from "./components/BodycountScore";
import { SimpleBodycountScore } from "./components/SimpleBodycountScore";
import { PrivacySettings, PrivacyStatus, AnonymousToggle } from "./components/PrivacySettings";
import { useNFTPurchase } from './hooks/useNFTPurchase';
import { dataPersistence } from '../lib/data-persistence';
import { apiClient } from '../lib/api-client';
import { Profile as DbProfile, Evidence as DbEvidence } from '../lib/models';

type Evidence = {
  id: string;
  type: 'image' | 'video' | 'link' | 'text';
  url: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  uploadedAt: string;
};

type SwipeAction = {
  profileId: string;
  direction: 'left' | 'right';
  timestamp: string;
};

type Profile = {
  id: string;
  type?: 'profile';
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
    [ratingId: string]: Evidence[];
  };
  createdAt: string;
  isVerified: boolean;
  userId?: string;
  isActive?: boolean;
};

type NFTCard = {
  id: string;
  type: 'nft';
  name: string;
  image: string;
  price: string;
  priceWei: string;
  available: number;
  contractAddress: string;
  metadata: string;
};

type CardData = Profile | NFTCard;

// Priority ordering function for VIP profiles and gender alternating
function applyPriorityOrdering(profiles: Profile[]): Profile[] {
  // VIP profiles that should appear first
  const vipNames = ['Kim Kardashian', 'Elon Musk', 'Rihanna', 'Cristiano Ronaldo', 'Kanye West'];
  
  // Separate profiles into categories
  const vipProfiles: Profile[] = [];
  const maleProfiles: Profile[] = [];
  const femaleProfiles: Profile[] = [];
  const unknownGenderProfiles: Profile[] = [];
  
  // Categorize profiles
  profiles.forEach(profile => {
    if (vipNames.includes(profile.name)) {
      vipProfiles.push(profile);
    } else {
      // Simple gender detection based on common patterns
      // This is a basic implementation - you might want to add a gender field to your Profile type
      const maleNames = ['Drake', 'Kanye', 'Pete Davidson', 'Ray J', 'Reggie Bush', 'Nick Cannon', 'Nick Lachey', 'Odell Beckham Jr.', 'Tom Brady', 'Van Jones', 'The Game', 'Meek Mill', 'Michael Copon', 'Miles Austin', 'Damon Thomas', 'Gabriel Aubry', 'Kris Humphries', 'Sean Combs'];
      const femaleNames = ['Rihanna', 'Kim Kardashian', 'Jennifer Lopez', 'Amber Heard', 'Ashley St. Clair', 'Aubrey O\'Day', 'Cameron Diaz', 'Cara Delevingne', 'Cassie Ventura', 'Emma Heming', 'Gina Huynh', 'Grimes', 'Jennifer Gwynne', 'Joie Chavis', 'Justine Wilson', 'Kim Porter', 'Lori Harvey', 'Miracle Watts', 'Misa Hylton', 'Natasha Bassett', 'Sarah Chapman', 'Shivon Zilis', 'Sienna Miller', 'Talulah Riley', 'Yung Miami'];
      
      if (maleNames.some(name => profile.name.includes(name) || name.includes(profile.name))) {
        maleProfiles.push(profile);
      } else if (femaleNames.some(name => profile.name.includes(name) || name.includes(profile.name))) {
        femaleProfiles.push(profile);
      } else {
        unknownGenderProfiles.push(profile);
      }
    }
  });
  
  // Sort VIP profiles in the specified order
  const sortedVipProfiles = vipNames
    .map(name => vipProfiles.find(profile => profile.name === name))
    .filter(profile => profile !== undefined) as Profile[];
  
  // Create alternating pattern for remaining profiles
  const alternatingProfiles: Profile[] = [];
  const maxLength = Math.max(maleProfiles.length, femaleProfiles.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (i < maleProfiles.length) {
      alternatingProfiles.push(maleProfiles[i]);
    }
    if (i < femaleProfiles.length) {
      alternatingProfiles.push(femaleProfiles[i]);
    }
  }
  
  // Combine all profiles: VIP first, then alternating, then unknown gender
  const finalOrder = [...sortedVipProfiles, ...alternatingProfiles, ...unknownGenderProfiles];
  
  console.log('🎯 PRIORITY: Applied priority ordering - VIP:', sortedVipProfiles.length, 'Alternating:', alternatingProfiles.length, 'Unknown:', unknownGenderProfiles.length);
  
  return finalOrder;
}

export default function App() {
  console.log('🎯 COMPONENT: App component rendering started');
  
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<"swipe" | "add" | "scores" | "privacy">("swipe");
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [scores, setScores] = useState<{ [key: string]: number }>({});
  const [swipeHistory, setSwipeHistory] = useState<SwipeAction[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileRatings, setProfileRatings] = useState<Array<{
    id: string;
    profileId: string;
    ratingType: string;
    isAnonymous: boolean;
    evidenceCount: number;
    createdAt: string;
  }>>([]);
  const [profileStats, setProfileStats] = useState<{
    profileId: string;
    profileName: string;
    totalRatings: number;
    datedCount: number;
    hookupCount: number;
    transactionalCount: number;
    bodycount: number;
    averageRating: number;
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // NFT state and hooks
  const {
    collection: collectionData,
    isLoading: isNFTLoading,
    purchaseNFT,
    purchaseNFTSponsored,
    isConnected: isWalletConnected,
    address: walletAddress,
    walletType,
    walletDisplayName,
    isCorrectNetwork,
    connectionError,
    isConnecting,
    connectWallet,
    switchToBaseNetwork,
    transactionHash,
    isConfirmed,
    writeError
  } = useNFTPurchase();
  console.log('🎯 PAGE: useNFTPurchase hook result - collectionData:', collectionData, 'isLoading:', isNFTLoading);
  const [mixedCards, setMixedCards] = useState<CardData[]>([]);
  const [migrationStatus, setMigrationStatus] = useState({ completed: false });
  const [privacySettings, setPrivacySettings] = useState({
    anonymousRatings: false,
    hideFromSearch: false,
    privateProfile: false,
    allowEvidenceUploads: true,
    showRealName: true,
    allowDirectMessages: true,
    shareLocation: false,
    publicBodycount: true
  });
  
  console.log('App component rendering, profiles loaded:', profiles.length);
  
  // Client-side mounted state
  const [isMounted, setIsMounted] = useState(false);
  
  // Mount effect - must be at the top
  React.useEffect(() => {
    console.log('🔥 MOUNT: Setting isMounted to true');
    setIsMounted(true);
  }, []);
  
  // Direct API fetch for profiles - must be at the top
  React.useEffect(() => {
    if (!isMounted) return;
    
    console.log('🔥 DIRECT: useEffect triggered - profiles.length:', profiles.length);
    // Also log to server terminal via fetch
    fetch('/api/debug-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '🔥 CLIENT: useEffect triggered, profiles.length: ' + profiles.length })
    }).catch(() => {});
    
    if (profiles.length === 0) {
      const fetchProfiles = async () => {
        console.log('🔥 DIRECT: Starting direct API fetch...');
        // Log to server terminal
        fetch('/api/debug-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '🔥 CLIENT: Starting direct API fetch...' })
        }).catch(() => {});
        
        try {
          const response = await fetch('/api/profiles?limit=100&skip=0');
          console.log('🔥 DIRECT: API response status:', response.status, response.ok);
          
          if (response.ok) {
            const data = await response.json();
            console.log('🔥 DIRECT: API response data:', data);
            
            if (data.profiles && Array.isArray(data.profiles)) {
              console.log('🔥 DIRECT: Setting profiles:', data.profiles.length);
              
              // Convert to local profile format
              const formattedProfiles: Profile[] = data.profiles.map((dbProfile: any, index: number) => {
                let createdAtString: string;
                if (dbProfile.createdAt) {
                  if (typeof dbProfile.createdAt === 'string') {
                    createdAtString = dbProfile.createdAt;
                  } else if (dbProfile.createdAt instanceof Date) {
                    createdAtString = dbProfile.createdAt.toISOString();
                  } else {
                    createdAtString = new Date(dbProfile.createdAt).toISOString();
                  }
                } else {
                  createdAtString = new Date().toISOString();
                }

                return {
                  id: dbProfile._id?.toString() || `${Date.now()}-${index}`,
                  name: dbProfile.name,
                  age: dbProfile.age,
                  bio: dbProfile.bio,
                  images: dbProfile.images,
                  socialHandles: dbProfile.socialHandles,
                  createdAt: createdAtString,
                  isVerified: dbProfile.isVerified,
                  userId: dbProfile.userId?.toString(),
                  isActive: dbProfile.isActive,
                  bodycount: {
                    dated: dbProfile.bodycount?.dated || 0,
                    hookup: dbProfile.bodycount?.hookup || 0,
                    transactional: dbProfile.bodycount?.transactional || 0,
                    total: dbProfile.bodycount?.total || 0
                  },
                  evidence: {}
                };
              });
              
              console.log('🔥 DIRECT: About to call setProfiles with:', formattedProfiles.length, 'profiles');
              // Log to server terminal
              fetch('/api/debug-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: '🔥 CLIENT: About to call setProfiles with ' + formattedProfiles.length + ' profiles' })
              }).catch(() => {});
              
              // Apply priority ordering: VIP profiles first, then alternating gender pattern
              const priorityOrderedProfiles = applyPriorityOrdering(formattedProfiles);
              
              setProfiles(priorityOrderedProfiles);
              console.log('🔥 DIRECT: setProfiles called successfully');
              
              // Log to server terminal after setProfiles
              fetch('/api/debug-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: '🔥 CLIENT: setProfiles called successfully' })
              }).catch(() => {});
              
              if (formattedProfiles.length > 0) {
                setCurrentProfileId(formattedProfiles[0].id);
                console.log('🔥 DIRECT: Set current profile ID to:', formattedProfiles[0].id);
              }
            } else {
              console.log('🔥 DIRECT: Invalid data structure, data.profiles:', data.profiles);
            }
          } else {
            console.error('🔥 DIRECT: Failed to fetch profiles:', response.status);
          }
        } catch (error) {
          console.error('🔥 DIRECT: Error fetching profiles:', error);
        }
      };
      
      fetchProfiles();
    } else {
      console.log('🔥 DIRECT: Skipping fetch - profiles.length:', profiles.length);
    }
  }, [isMounted]); // Only run once when component mounts

  // Debug useEffect to track profiles state changes
  useEffect(() => {
    console.log('🔥 STATE: profiles state changed, length:', profiles.length);
    // Log to server terminal
    fetch('/api/debug-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '🔥 CLIENT: profiles state changed, length: ' + profiles.length })
    }).catch(() => {});
  }, [profiles]);
  
  // Mix NFT cards with profiles (1 NFT every 5-7 profiles)
  const mixCardsWithNFTs = useCallback((profiles: Profile[], nftData: any) => {
    if (!nftData || !nftData.available || nftData.available === 0) {
      return profiles;
    }
    
    const nftCard: NFTCard = {
      id: `nft-${Date.now()}`,
      type: 'nft',
      name: nftData.name || 'The Game - Kardashian Collector',
      image: nftData.image || '/The Game - Kardashian Collector.png', // Use correct NFT artwork
      price: nftData.price || '0.01 ETH',
      priceWei: nftData.priceWei || '10000000000000000', // 0.01 ETH in wei
      available: nftData.available,
      contractAddress: nftData.contractAddress || '0x609cF5C3B0003bcEF4F512B3c2Fa489c8D0EF200',
      metadata: nftData.metadata || 'Exclusive Wild Card NFT from The Game'
    };
    
    const mixed: CardData[] = [];
    const insertInterval = Math.floor(Math.random() * 3) + 5; // Random between 5-7
    
    profiles.forEach((profile, index) => {
      mixed.push(profile);
      // Insert NFT card every 5-7 profiles
      if ((index + 1) % insertInterval === 0 && mixed.filter(card => 'type' in card).length === 0) {
        mixed.push(nftCard);
      }
    });
    
    return mixed;
  }, []);
  
  // Mix profiles with NFT cards when data changes
  useEffect(() => {
    if (profiles.length > 0) {
      const mixed = mixCardsWithNFTs(profiles, collectionData);
      setMixedCards(mixed);
      console.log('🎯 NFT: Mixed cards created, length:', mixed.length);
    }
  }, [profiles, collectionData, mixCardsWithNFTs]);

  // Call sdk.actions.ready() after app is fully loaded
  useEffect(() => {
    const initializeApp = async () => {
      if (isMounted && profiles.length > 0) {
        try {
          console.log('🚀 SDK: Calling sdk.actions.ready() to hide splash screen');
          await miniappSdk.actions.ready();
          console.log('🚀 SDK: sdk.actions.ready() called successfully');
          
          // Log to server terminal
          fetch('/api/debug-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '🚀 CLIENT: sdk.actions.ready() called successfully' })
          }).catch(() => {});
        } catch (error) {
          console.error('🚀 SDK: Error calling sdk.actions.ready():', error);
          
          // Log error to server terminal
          fetch('/api/debug-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '🚀 CLIENT: Error calling sdk.actions.ready(): ' + error })
          }).catch(() => {});
        }
      }
    };

    initializeApp();
  }, [isMounted, profiles.length]);

  // Duplicate state declarations removed - all states are declared at the top

  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();
  // const handleCreateProfile = async (profileData: Omit<Profile, 'id' | 'createdAt' | 'isVerified' | 'bodycount' | 'evidence'>) => {
  //   try {
  //     setIsLoading(true);
  //     
  //     // Convert to database profile format
  //     const dbProfileData: Omit<DbProfile, 'createdAt' | '_id' | 'updatedAt'> = {
  //       userId: 'temp-user-id', // Temporary - should be actual user ID
  //       name: profileData.name,
  //       age: profileData.age,
  //       bio: profileData.bio,
  //       images: profileData.images,
  //       socialHandles: profileData.socialHandles,
  //       isVerified: false,
  //       isActive: true
  //     };
  //     
  //     // Save profile using data persistence service
  //     const profileResult = await dataPersistence.saveProfile(dbProfileData);
  //     
  //     if (profileResult.success && profileResult.data) {
  //       // Convert database profile to local profile format
  //       const dbProfile = profileResult.data as DbProfile & { _id?: string };
  //       const localProfile: Profile = {
  //         id: dbProfile._id?.toString() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  //         name: dbProfile.name,
  //         age: dbProfile.age,
  //         bio: dbProfile.bio,
  //         images: dbProfile.images,
  //         socialHandles: dbProfile.socialHandles,
  //         createdAt: dbProfile.createdAt?.toISOString() || new Date().toISOString(),
  //         isVerified: dbProfile.isVerified || false,
  //         userId: dbProfile.userId?.toString(),
  //         isActive: dbProfile.isActive || true,
  //         bodycount: {
  //           dated: 0,
  //           hookup: 0,
  //           transactional: 0,
  //           total: 0
  //         },
  //         evidence: {}
  //       };
  //       
  //       setProfiles(prev => [...prev, localProfile]);
  //       console.log('Profile created successfully');
  //     } else {
  //       console.error('Failed to create profile:', profileResult.error);
  //       // Fallback to local creation
  //       const newProfile: Profile = {
  //         ...profileData,
  //         id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  //         createdAt: new Date().toISOString(),
  //         isVerified: false,
  //         bodycount: {
  //           dated: 0,
  //           hookup: 0,
  //           transactional: 0,
  //           total: 0
  //         },
  //         evidence: {}
  //       };
  //       
  //       setProfiles(prev => [...prev, newProfile]);
  //     }
  //   } catch (error) {
  //     console.error('Error creating profile:', error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleProfilesUpdate = useCallback((updatedProfiles: Profile[]) => {
    setProfiles(updatedProfiles);
  }, []);
  
  // Handle NFT purchase with enhanced wallet validation
  const handleNFTPurchase = useCallback(async (nftId: string) => {
    try {
      console.log('🎯 NFT: Purchasing NFT:', nftId);
      console.log('🎯 NFT: Wallet status:', {
        isConnected: isWalletConnected,
        address: walletAddress,
        walletType,
        walletDisplayName,
        isCorrectNetwork,
        connectionError
      });
      
      // Enhanced wallet connection checks
      if (!isWalletConnected || !walletAddress) {
        const message = connectionError 
          ? `Wallet connection failed: ${connectionError}. Please try connecting again.`
          : 'Please connect your wallet to purchase NFTs.';
        alert(message);
        return;
      }

      // Check network
      if (!isCorrectNetwork) {
        const switchMessage = `You're connected to the wrong network. Please switch to Base network to purchase NFTs.\n\nConnected wallet: ${walletDisplayName}`;
        if (confirm(switchMessage + '\n\nWould you like to switch networks automatically?')) {
          try {
            await switchToBaseNetwork();
            // Wait a moment for network switch to complete
            setTimeout(() => handleNFTPurchase(nftId), 1000);
            return;
          } catch (error) {
            alert('Failed to switch networks. Please switch to Base network manually in your wallet.');
            return;
          }
        } else {
          return;
        }
      }

      // Show loading state with wallet info
      console.log(`🎯 NFT: Initiating wallet transaction with ${walletDisplayName}...`);
      
      const result = await purchaseNFT(nftId);
      
      if (result.success) {
        console.log('🎯 NFT: Purchase initiated successfully');
        if (result.transactionHash) {
          console.log('🎯 NFT: Transaction hash:', result.transactionHash);
          alert(`Transaction submitted successfully!\n\nWallet: ${walletDisplayName}\nTransaction Hash: ${result.transactionHash}\n\nPlease wait for confirmation...`);
        }
      } else {
        console.error('🎯 NFT: Purchase failed:', result.error);
        alert(`Purchase failed: ${result.error}\n\nWallet: ${walletDisplayName}`);
      }
    } catch (error) {
      console.error('🎯 NFT: Purchase error:', error);
      alert(`Purchase failed. Please try again.\n\nWallet: ${walletDisplayName || 'Unknown'}\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [purchaseNFT, isWalletConnected, walletAddress, walletType, walletDisplayName, isCorrectNetwork, connectionError, switchToBaseNetwork]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && transactionHash) {
      console.log('🎯 NFT: Transaction confirmed! Hash:', transactionHash);
      alert('NFT purchased successfully! Check your wallet.');
      
      // Remove the NFT card from the stack after successful purchase
      setMixedCards(prev => {
        const updatedCards = prev.filter(card => {
          if (card.type === 'nft') {
            // Remove the NFT card that was just purchased
            return false;
          }
          return true;
        });
        console.log('🎯 NFT: Removed NFT card from stack');
        return updatedCards;
      });
    }
  }, [isConfirmed, transactionHash]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError) {
      console.error('🎯 NFT: Transaction error:', writeError);
      alert(`Transaction failed: ${writeError.message}`);
    }
  }, [writeError]);

  const [showAddProfileForm, setShowAddProfileForm] = useState(false);
  const [profileManagerProfiles, setProfileManagerProfiles] = useState<Profile[]>([]);

  console.log('🚀 PAGE: About to declare useEffect for initializeData');
  
  const loadProfileDetails = async (profile: Profile) => {
    setSelectedProfile(profile);
    setIsLoadingDetails(true);
    try {
      const [ratingsResponse, statsResponse] = await Promise.all([
        apiClient.getRatings(profile.id),
        apiClient.getProfileStats(profile.id)
      ]);
      
      if (ratingsResponse.success) {
        setProfileRatings((ratingsResponse as { success: boolean; ratings?: Array<{
          id: string;
          profileId: string;
          ratingType: string;
          isAnonymous: boolean;
          evidenceCount: number;
          createdAt: string;
        }> }).ratings || []);
      }
      
      if (statsResponse.success) {
        setProfileStats((statsResponse as { success: boolean; profileStats?: {
          profileId: string;
          profileName: string;
          totalRatings: number;
          datedCount: number;
          hookupCount: number;
          transactionalCount: number;
          bodycount: number;
          averageRating: number;
        } }).profileStats || null);
      }
    } catch (error) {
      console.error('Error loading profile details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setSelectedProfile(null);
    setProfileRatings([]);
    setProfileStats(null);
  };

  const getRatingEmoji = (ratingType: string) => {
    switch (ratingType) {
      case 'dated': return 'HEART';
      case 'hookup': return 'FIRE';
      case 'transactional': return 'MONEY';
      default: return 'UNKNOWN';
    }
  };

  const getRatingLabel = (ratingType: string) => {
    switch (ratingType) {
      case 'dated': return 'Dated';
      case 'hookup': return 'Hookup';
      case 'transactional': return 'Transactional';
      default: return 'Unknown';
    }
  };

  React.useEffect(() => {
    // Call Farcaster Frame SDK ready method
    sdk.actions.ready();
    
    // Also call MiniKit setFrameReady for OnchainKit compatibility
    setFrameReady();
    
    // Also set a timeout as fallback
    const timeout = setTimeout(() => {
      sdk.actions.ready();
      setFrameReady();
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, []);

  // Monitor frame ready state changes
  React.useEffect(() => {
    // Frame ready state changed
  }, [isFrameReady]);


  
  // Data loading is now handled by useEffect hooks at the top
  
  // Load privacy settings on mount
  React.useEffect(() => {
    console.log('🚀 PAGE: Loading privacy settings...');
    try {
      // Load privacy settings (always local)
      const loadedPrivacySettings = dataPersistence.getPrivacySettings() as Record<string, unknown>;
      console.log('🚀 PAGE: Loaded privacy settings:', loadedPrivacySettings);
      setPrivacySettings({
        anonymousRatings: Boolean(loadedPrivacySettings.anonymousRatings),
        hideFromSearch: Boolean(loadedPrivacySettings.hideFromSearch),
        privateProfile: Boolean(loadedPrivacySettings.privateProfile),
        allowEvidenceUploads: loadedPrivacySettings.allowEvidenceUploads !== false,
        showRealName: loadedPrivacySettings.showRealName !== false,
        allowDirectMessages: loadedPrivacySettings.allowDirectMessages !== false,
        shareLocation: Boolean(loadedPrivacySettings.shareLocation),
        publicBodycount: loadedPrivacySettings.publicBodycount !== false
      });
      
      // Check migration status
      const migrationStatus = dataPersistence.getMigrationStatus();
      console.log('🚀 PAGE: Migration status:', migrationStatus);
      setMigrationStatus(migrationStatus);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);
 
   const handleSwipe = (direction: 'left' | 'right', profileId: string) => {
    console.log(`Swiped ${direction} on profile ${profileId}`);
    setCurrentProfileId(profileId);
    // Here you could add logic to save swipe data to blockchain or database
  };

  const handleRate = async (profileId: string, rating: 'dated' | 'hookup' | 'transactional', evidence?: Evidence[]) => {
    try {
      setIsLoading(true);
      
      // Convert evidence to database format
      const dbEvidence: DbEvidence[] = (evidence || []).map((ev, index) => ({
        _id: `evidence-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        ratingId: `rating-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`, // Will be updated after rating is created
        uploaderId: 'temp-user-id', // Should be actual user ID
        type: ev.type,
        url: ev.url,
        filename: ev.description || '',
        description: ev.description,
        isVerified: false,
        createdAt: new Date()
      }));
      
      // Save rating using data persistence service
      const ratingResult = await dataPersistence.saveRating({
        profileId,
        type: rating,
        isAnonymous: privacySettings.anonymousRatings,
        evidence: dbEvidence
      });
      
      if (ratingResult.success) {
        // Update local state
        // Handle rating directly in the main component
    const updatedProfiles = profiles.map(profile => {
      if (profile.id === profileId) {
        const newBodycount = {
          ...profile.bodycount,
          [rating]: profile.bodycount[rating] + 1
        };
        newBodycount.total = newBodycount.dated + newBodycount.hookup + newBodycount.transactional;
        
        return {
          ...profile,
          bodycount: newBodycount
        };
      }
      return profile;
    });
    
    setProfiles(updatedProfiles);
        console.log(`Rated profile ${profileId} as ${rating}`);
        setCurrentProfileId(profileId);
        
        // Update profile with evidence if provided
        if (evidence && evidence.length > 0) {
          setProfiles(prev => prev.map(profile => {
            if (profile.id === profileId) {
              const ratingId = `${profileId}-${rating}-${Date.now()}`;
              return {
                ...profile,
                evidence: {
                  ...profile.evidence,
                  [ratingId]: evidence
                }
              };
            }
            return profile;
          }));
        }
        
        console.log('Rating saved successfully');
      } else {
        console.error('Failed to save rating:', ratingResult.error);
        // Still update local state as fallback
        // Handle rating directly in the main component
        const updatedProfiles = profiles.map(profile => {
          if (profile.id === profileId) {
            const newBodycount = {
              ...profile.bodycount,
              [rating]: profile.bodycount[rating] + 1
            };
            newBodycount.total = newBodycount.dated + newBodycount.hookup + newBodycount.transactional;
            
            return {
              ...profile,
              bodycount: newBodycount
            };
          }
          return profile;
        });
        
        setProfiles(updatedProfiles);
        setCurrentProfileId(profileId);
      }
    } catch (error) {
      console.error('Error saving rating:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="plus" size="sm" />}
        >
          Save Frame
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      <div className="w-full max-w-md mx-auto px-4 py-3 swipe-container-stable">
        <header className="flex justify-between items-center mb-2 h-11">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Wallet className="z-10">
                <ConnectWallet>
                  <div className="flex items-center space-x-2">
                    {isConnecting ? (
                      <span className="animate-spin text-xs">⏳</span>
                    ) : (
                      <span className="text-xs">🔗</span>
                    )}
                    <span className="text-sm font-medium">
                      {isConnecting ? 'Connecting...' : (isWalletConnected ? 'Connected' : 'Connect')}
                    </span>
                  </div>
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <div className="flex items-center space-x-2 mb-2">
                      <Avatar />
                      <div className="flex flex-col">
                        <Name />
                        <div className="text-xs text-gray-500">
                          {walletDisplayName}
                          {!isCorrectNetwork && (
                            <span className="text-red-500 ml-1">⚠️ Wrong Network</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Address />
                    <EthBalance />
                    {!isCorrectNetwork && (
                      <button
                        onClick={switchToBaseNetwork}
                        className="w-full mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                      >
                        Switch to Base Network
                      </button>
                    )}
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
              {connectionError && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 max-w-xs z-20">
                  {connectionError}
                </div>
              )}
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Bodies
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <AnonymousToggle
              enabled={privacySettings.anonymousRatings}
              onToggle={() => setPrivacySettings(prev => ({ ...prev, anonymousRatings: !prev.anonymousRatings }))}
            />
            <PrivacyStatus
              settings={privacySettings}
              onClick={() => setShowPrivacySettings(true)}
            />
            {migrationStatus.completed && (
              <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                <span>☁️</span>
                <span>Synced</span>
              </div>
            )}
            {saveFrameButton}
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex bg-white/80 backdrop-blur-md rounded-2xl p-1 mb-4 shadow-lg">
          <button
            onClick={() => setActiveTab("swipe")}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "swipe"
                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🔥 Swipe
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "add"
                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ➕ Add
          </button>
          <button
            onClick={() => setActiveTab("scores")}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "scores"
                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📊 Scores
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === "privacy"
                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🔒 Privacy
          </button>
        </div>

        {/* Tagline moved up */}
        <div className="text-center mb-3">
          <p className="text-gray-600 text-sm">
            Rate relationships - Track scores - Keep it real
          </p>
        </div>

        <main className="flex-1">
          {activeTab === "swipe" && (
            <div className="space-y-4">
              

              {(() => {
                console.log('🎯 RENDER: About to render SwipeStack, mixedCards.length:', mixedCards.length);
                console.log('🎯 RENDER: Mixed Cards:', mixedCards.map(c => {
                  const cardId = 'id' in c ? c.id : (c as any).id;
                  const cardName = 'name' in c ? c.name : `NFT-${cardId}`;
                  return { id: cardId, name: cardName };
                }));
                return mixedCards.length > 0 ? (
                  <SwipeStack
                  cards={mixedCards}
                  onSwipe={handleSwipe}
                  onRate={handleRate}
                  onBuyNFT={handleNFTPurchase}
                  isWalletConnected={isWalletConnected}
                  isNFTLoading={isNFTLoading}
                  walletType={walletType}
                  walletDisplayName={walletDisplayName}
                  isCorrectNetwork={isCorrectNetwork}
                  connectionError={connectionError}
                  isConnecting={isConnecting}
                />
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading cards...</div>
                  </div>
                );
              })()}
              
              <div className="text-center mt-6">
                <p className="text-xs text-gray-500">
                  Swipe left to pass - Swipe right to like - Tap emojis to rate
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Laptop users: Use left/right arrow keys to swipe
                </p>
              </div>
            </div>
          )}
          
          {activeTab === "add" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Add Someone New
                </h2>
                <p className="text-gray-600 text-sm">
                  Know someone who should be rated? Add them to the platform.
                </p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg">
                <Button
                  onClick={() => setShowAddProfileForm(true)}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? '⏳ Adding...' : '➕ Add New Profile'}
                </Button>
              </div>
              
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg">
                <h3 className="font-bold text-gray-900 mb-3">Recent Profiles</h3>
                <div className="space-y-2">
                  {profiles.slice(0, 5).map((profile) => (
                    <div 
                      key={profile.id} 
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors"
                      onClick={() => loadProfileDetails(profile)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-2">{profile.name}, {profile.age}</p>
                        <SimpleBodycountScore 
                          confirmedCount={profile.bodycount.dated + profile.bodycount.hookup}
                          rumoredCount={profile.bodycount.transactional}
                          profileName={profile.name}
                          className="transform scale-75 origin-left"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "scores" && (
            <BodycountScore
              profiles={profiles}
              currentProfileId={currentProfileId}
            />
          )}
          
          {activeTab === "privacy" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Privacy Center
                </h2>
                <p className="text-gray-600 text-sm">
                  Control your privacy and manage how others see you
                </p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg">
                <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowPrivacySettings(true)}
                    className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium hover:from-purple-600 hover:to-indigo-700 transition-all"
                  >
                    🛠️ Privacy Settings
                  </button>
                  <button
                    onClick={() => setPrivacySettings(prev => ({ ...prev, privateProfile: !prev.privateProfile }))}
                    className={`w-full p-3 rounded-xl font-medium transition-all ${
                      privacySettings.privateProfile
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {privacySettings.privateProfile ? '🔒 Private Profile' : '🔓 Public Profile'}
                  </button>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg">
                <h3 className="font-bold text-gray-900 mb-4">Privacy Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-xl bg-white/50">
                    <div className="text-2xl mb-1">{privacySettings.anonymousRatings ? '🎭' : '👤'}</div>
                    <div className="text-xs font-medium text-gray-600">Ratings</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/50">
                    <div className="text-2xl mb-1">{privacySettings.privateProfile ? '🔒' : '🔓'}</div>
                    <div className="text-xs font-medium text-gray-600">Profile</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/50">
                    <div className="text-2xl mb-1">{privacySettings.hideFromSearch ? '🙈' : '👁️'}</div>
                    <div className="text-xs font-medium text-gray-600">Search</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/50">
                    <div className="text-2xl mb-1">{privacySettings.shareLocation ? '📍' : '🚫'}</div>
                    <div className="text-xs font-medium text-gray-600">Location</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="mt-4 pt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 text-xs"
            onClick={() => openUrl("https://base.org/builders/minikit")}
          >
            Built on Base with MiniKit
          </Button>
        </footer>
      </div>
      
      {showAddProfileForm && (() => {
        const profileManager = ProfileManager({ 
          onProfilesUpdate: (updatedProfiles) => {
            setProfiles(updatedProfiles);
            setShowAddProfileForm(false);
          }
        });
        return profileManager.addProfileForm;
      })()}
      
      {/* Privacy Settings Modal */}
      {showPrivacySettings && (
        <PrivacySettings
          onClose={() => setShowPrivacySettings(false)}
          onSettingsChange={(newSettings) => {
            setPrivacySettings(newSettings);
            dataPersistence.setPrivacySettings(newSettings as unknown as Record<string, unknown>);
          }}
          currentSettings={privacySettings}
        />
      )}
      
      {/* Profile Details Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedProfile.name}, {selectedProfile.age}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {selectedProfile.images && selectedProfile.images.length > 0 && (
                <div className="mb-4">
                  <img
                    src={selectedProfile.images[0]}
                    alt={selectedProfile.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              
              <div className="mb-4">
                <p className="text-gray-700">{selectedProfile.bio}</p>
              </div>
              
              {profileStats && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-3">Rating Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl mb-1">❤️</div>
                      <div className="text-lg font-bold text-red-600">{profileStats.datedCount || 0}</div>
                      <div className="text-xs text-gray-600">Dated</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl mb-1">🔥</div>
                      <div className="text-lg font-bold text-orange-600">{profileStats.hookupCount || 0}</div>
                      <div className="text-xs text-gray-600">Hookup</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl mb-1">💵</div>
                      <div className="text-lg font-bold text-green-600">{profileStats.transactionalCount || 0}</div>
                      <div className="text-xs text-gray-600">Transactional</div>
                    </div>
                  </div>
                  <div className="text-center mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">Total Score: {profileStats.totalRatings || 0}</div>
                  </div>
                </div>
              )}
              
              {isLoadingDetails ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading rating history...</p>
                </div>
              ) : (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Rating History</h3>
                  {profileRatings.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {profileRatings.map((rating, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{getRatingEmoji(rating.ratingType)}</span>
                            <div>
                              <p className="font-medium text-gray-900">{getRatingLabel(rating.ratingType)}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(rating.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {rating.isAnonymous ? (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                              Anonymous
                            </span>
                          ) : (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                              Verified
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No ratings yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      

    </div>
  );
}
