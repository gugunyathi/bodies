"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./DemoComponents";
import { RatingSystem, type RatingType } from "./RatingSystem";
import { FloatingSeanCombs } from "./FloatingSeanCombs";
import { FloatingFamousPeople } from "./FloatingFamousPeople";
import { handleProfileClick, navigateToProfile, navigateToAddProfile } from '../../lib/profile-navigation';
import { SimpleBodycountScore } from './SimpleBodycountScore';
import { BettingModal } from './BettingModal';
import { useBettingContract } from '../hooks/useBettingContract';
import { QuestionCard } from './QuestionCard';
import { FREAKY_QUESTIONS, type FreakyQuestion } from '../../lib/freaky-questions';

type Evidence = {
  id: string;
  type: 'image' | 'video' | 'link' | 'text';
  url: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  uploadedAt: string;
};

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

type RelationshipConnection = {
  name: string;
  image?: string;
};

type SwipeCardProps = {
  profile?: Profile;
  nft?: NFTCard;
  onSwipe: (direction: 'left' | 'right', profileId: string) => void;
  onRate?: (profileId: string, rating: 'dated' | 'hookup' | 'transactional', evidence?: Evidence[]) => void;
  onBuyNFT?: (nftId: string) => void;
  isActive: boolean;
  zIndex?: number;
  relationships?: RelationshipConnection[];
  style?: React.CSSProperties;
  'data-profile-id'?: string;
  isWalletConnected?: boolean;
  isNFTLoading?: boolean;
  walletType?: string;
  walletDisplayName?: string;
  isCorrectNetwork?: boolean;
  connectionError?: string | null;
  isConnecting?: boolean;
  profiles?: Profile[];
  onShowBettingModal?: () => void;
};

// Function to determine fame level for sorting (1-10 scale)
const getFamousLevel = (name: string): number => {
  const fameLevels: Record<string, number> = {
    'Jennifer Lopez': 10,
    'Ben Affleck': 9,
    'Marc Anthony': 8,
    'Alex Rodriguez': 8,
    'Bruce Willis': 9,
    'Jude Law': 8,
    'Justin Timberlake': 9,
    'Benji Madden': 6,
    'Michael B. Jordan': 8,
    'Future': 7,
    'Drake': 9,
    'Al B. Sure!': 6,
    'Alex Fine': 5,
    'Jai Wiggins': 3,
    'Southside': 5,
    'JoJo Brim': 3,
    'Pauly D': 6,
    'Rhys Ifans': 6,
    'Tom Sturridge': 6,
    'Matt Dillon': 7,
    'Tyler Lepley': 5,
    'Justin Combs': 4,
    'Elon Musk': 10,
    'Justine Wilson': 6,
    'Talulah Riley': 7,
    'Grimes': 8,
    'Shivon Zilis': 6,
    'Ashley St. Clair': 5,
    'Natasha Bassett': 6,
    'Jennifer Gwynne': 4,
    'Amber Heard': 8,
    'Cara Delevingne': 8,
    'Rihanna': 10,
    'Matthew Rice': 4,
    'Chelsea Manning': 7,
    'Austin Butler': 7,
    'Johnny Depp': 9,
    'James Franco': 7,
    'Ashley Benson': 6,
    'St. Vincent': 6,
    'A$AP Rocky': 8,
    'Chris Brown': 8,
    // Add more as needed
  };
  return fameLevels[name] || 5; // Default to 5 if not found
};

export function SwipeCard({ profile, nft, onSwipe, onRate, onBuyNFT, isActive, zIndex = 1, relationships = [], style, 'data-profile-id': dataProfileId, isWalletConnected = false, isNFTLoading = false, walletType, walletDisplayName, isCorrectNetwork = true, connectionError, isConnecting = false, profiles = [], onShowBettingModal }: SwipeCardProps) {
  const cardData = profile || nft;
  const isNFT = nft !== undefined;
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showRatingSystem, setShowRatingSystem] = useState(false);
  const [currentRelationshipIndex, setCurrentRelationshipIndex] = useState(-1);
  const [relationshipRatings, setRelationshipRatings] = useState<{[key: string]: RatingType}>({});
  const [isSequentialRating, setIsSequentialRating] = useState(false);
  // Removed unused showBettingModal state - using showBettingModal2 in SwipeStack
  const { placeBet, loading: bettingLoading, error: bettingError, clearError } = useBettingContract();
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isActive) return;
    setIsDragging(true);
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isActive) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startPos.current.x;
    const deltaY = touch.clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!isDragging || !isActive) return;
    setIsDragging(false);
    
    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      const direction = dragOffset.x > 0 ? 'right' : 'left';
      onSwipe(direction, cardData!.id);
    }
    
    setDragOffset({ x: 0, y: 0 });
  };

  const handleMouseStart = (e: React.MouseEvent) => {
    if (!isActive) return;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isActive) return;
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleMouseEnd = () => {
    if (!isDragging || !isActive) return;
    setIsDragging(false);
    
    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      const direction = dragOffset.x > 0 ? 'right' : 'left';
      onSwipe(direction, cardData!.id);
    }
    
    setDragOffset({ x: 0, y: 0 });
  };

  const nextImage = () => {
    if (isNFT) return; // NFTs have single image
    setCurrentImageIndex((prev) => 
      prev === (profile!.images?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    if (isNFT) return; // NFTs have single image
    setCurrentImageIndex((prev) => 
      prev === 0 ? (profile!.images?.length || 1) - 1 : prev - 1
    );
  };

  const rotation = dragOffset.x * 0.1;
  const opacity = 1 - Math.abs(dragOffset.x) / 300;

  const handleRateClick = () => {
    if (relationships.length > 0) {
      // Start sequential relationship rating
      setIsSequentialRating(true);
      setCurrentRelationshipIndex(0);
      setRelationshipRatings({});
    }
    setShowRatingSystem(!showRatingSystem);
  };

  const handleRelationshipRated = (relationshipName: string, rating: RatingType) => {
    // Store the rating for this relationship
    setRelationshipRatings(prev => ({
      ...prev,
      [relationshipName]: rating
    }));
    
    // Move to next relationship or complete the process
    if (currentRelationshipIndex < relationships.length - 1) {
      setCurrentRelationshipIndex(prev => prev + 1);
    } else {
      // All relationships rated, close rating system (skip personal rating)
      setShowRatingSystem(false);
      setIsSequentialRating(false);
      setCurrentRelationshipIndex(-1);
      setRelationshipRatings({});
      console.log('All relationship ratings:', relationshipRatings);
    }
  };

  const handleRatingComplete = (profileId: string, rating: 'dated' | 'hookup' | 'transactional') => {
    // If we have relationship ratings, include them in the rating data
    const ratingData = {
      profileId,
      mainRating: rating,
      relationshipRatings: Object.keys(relationshipRatings).length > 0 ? relationshipRatings : undefined,
      timestamp: new Date().toISOString()
    };
    
    console.log('Complete rating data:', ratingData);
    
    // Call the original onRate function with the main rating
    onRate?.(profileId, rating);
    
    // Here you could also send the relationship ratings to an API
    // Example: await submitRelationshipRatings(ratingData);
    
    setShowRatingSystem(false);
    // Reset sequential rating state
    setIsSequentialRating(false);
    setCurrentRelationshipIndex(-1);
    setRelationshipRatings({});
  };

  const handleRelationshipClick = async (relationshipName: string) => {
    try {
      const result = await handleProfileClick(relationshipName);
      
      if (result.type === 'profile' && result.profileId) {
        navigateToProfile(result.profileId);
      } else {
        navigateToAddProfile(result.profileName);
      }
    } catch (error) {
      console.error('Error handling relationship click:', error);
      // Fallback to add profile page
      navigateToAddProfile(relationshipName);
    }
  };

  return (
    <>

      
      <div
        ref={cardRef}
        data-profile-id={dataProfileId || cardData!.id}
        className={`absolute inset-0 bg-white rounded-2xl shadow-2xl overflow-hidden cursor-grab transition-transform duration-200 ${
          isDragging ? 'cursor-grabbing scale-105' : ''
        } ${isNFT ? 'border-4 border-gradient-to-r from-yellow-400 to-orange-500' : ''}`}
        style={{
          transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`,
          opacity: opacity,
          zIndex: zIndex,
          ...style
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseEnd}
        onMouseLeave={handleMouseEnd}
      >
      {/* Image Section */}
      <div className={`relative h-2/3 ${
        isNFT 
          ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600' 
          : 'bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600'
      }`}>
        {isNFT ? (
          <>
            <img
              src={nft!.image}
              alt={nft!.name}
              className="w-full h-full object-cover"
            />
            {/* NFT Badge */}
            <div className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              🎴 WILD CARD NFT
            </div>
            {/* Price Badge */}
            <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-1 rounded-full text-sm font-bold">
              Ξ {nft!.price} ETH
            </div>
            {/* Available Count */}
            <div className="absolute bottom-4 left-4 bg-white/90 text-black px-2 py-1 rounded-full text-xs font-medium">
              {nft!.available} left
            </div>
            {/* Floating Buy Button */}
            <div className="absolute bottom-4 right-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isWalletConnected) {
                    alert('Please connect your wallet to purchase NFTs');
                    return;
                  }
                  if (!isCorrectNetwork) {
                    alert('Please switch to Base network to purchase NFTs');
                    return;
                  }
                  onBuyNFT?.(nft!.id);
                }}
                disabled={isNFTLoading || isConnecting || (isWalletConnected && !isCorrectNetwork)}
                className={`${
                  isWalletConnected && isCorrectNetwork
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    : isWalletConnected && !isCorrectNetwork
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-gray-400 hover:bg-gray-500'
                } text-white font-bold py-3 px-6 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-2 ${
                  isNFTLoading || isConnecting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isNFTLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>PROCESSING...</span>
                  </>
                ) : isConnecting ? (
                  <>
                    <span className="animate-spin">🔄</span>
                    <span>CONNECTING...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {isWalletConnected && isCorrectNetwork
                        ? '💳'
                        : isWalletConnected && !isCorrectNetwork
                        ? '⚠️'
                        : '🔒'}
                    </span>
                    <span>
                      {isWalletConnected && isCorrectNetwork
                        ? 'BUY NOW'
                        : isWalletConnected && !isCorrectNetwork
                        ? 'WRONG NETWORK'
                        : 'CONNECT WALLET'}
                    </span>
                  </>
                )}
              </button>
              {connectionError && (
                <div className="absolute top-full right-0 mt-1 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 max-w-xs z-20">
                  {connectionError}
                </div>
              )}
              {walletDisplayName && isWalletConnected && (
                <div className="absolute bottom-full right-0 mb-1 p-1 bg-black/80 text-white text-xs rounded">
                  {walletDisplayName}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {profile!.images && profile!.images.length > 0 ? (
              <>
                <img
                  src={profile!.images?.[currentImageIndex]}
                  alt={profile!.name}
                  className="w-full h-full object-cover"
                />
                {profile!.images && profile!.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white rounded-full w-8 h-8 flex items-center justify-center"
                    >
                      ‹
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 text-white rounded-full w-8 h-8 flex items-center justify-center"
                    >
                      ›
                    </button>
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-1">
                      {profile!.images?.map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                    {/* Floating BET Button */}
                    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-40">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('BET button clicked for profile:', profile!.name);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-1"
                      >
                        <span>🎯</span>
                        <span>BET</span>
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold relative">
                {profile!.name.charAt(0)}
                {/* Floating BET Button for profiles without images */}
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-40">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('BET button clicked for profile:', profile!.name);
                    }}
                    className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-1"
                  >
                    <span>🎯</span>
                    <span>BET</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Simple Bodycount Score - Only for profiles */}
        {!isNFT && (
          <div className="absolute top-4 right-4 z-30">
            <SimpleBodycountScore 
              confirmedCount={relationships.filter(rel => rel.name !== 'Unknown').length}
              rumoredCount={0} // For now, treating all relationships as confirmed
              profileName={profile!.name}
            />
          </div>
        )}
        
        {/* Floating Famous Person Circle */}
        <div className="absolute top-24 right-4 z-30">
          {/* Show Sean Combs circle only for profiles connected to him */}
          {relationships.some(rel => rel.name === 'Sean "Diddy" Combs') ? (
            <FloatingSeanCombs />
          ) : (
            /* Show most famous connections for other profiles */
            <FloatingFamousPeople 
              profileName={profile?.name || ''}
              relationships={relationships.map(rel => ({
                name: rel.name,
                image: rel.image || '/default-avatar.png',
                relationship: 'Connection',
                famousLevel: getFamousLevel(rel.name)
              }))}
            />
          )}
        </div>
        
        {/* Floating Relationship Circles */}
        {relationships.length > 0 && (
          <div className="absolute top-28 right-4 flex flex-col items-end space-y-1 z-20 max-h-[calc(66.67%-8rem)]">
            {(() => {
              // Calculate dynamic size based on available space and number of relationships
              const availableHeight = window.innerHeight * 0.4; // Approximate available space
              const maxRelationships = Math.min(relationships.length, 8); // Limit to prevent overcrowding
              const baseSize = Math.max(24, Math.min(40, (availableHeight - (maxRelationships * 4)) / maxRelationships)); // Dynamic size between 24px and 40px
              const iconSize = `${baseSize}px`;
              const fontSize = `${Math.max(8, baseSize * 0.3)}px`;
              
              return relationships.slice(0, maxRelationships).map((relationship, index) => (
                <div
                  key={index}
                  className="relative group cursor-pointer"
                  style={{
                    animation: `float ${2 + index * 0.5}s ease-in-out infinite`,
                    animationDelay: `${index * 0.2}s`
                  }}
                  onClick={() => handleRelationshipClick(relationship.name)}
                >
                  <div 
                    className="rounded-full overflow-hidden border-2 border-pink-400 shadow-lg bg-gradient-to-br from-pink-400 to-purple-500 hover:scale-110 transition-transform"
                    style={{
                      width: iconSize,
                      height: iconSize
                    }}
                  >
                    {relationship.image ? (
                      <img
                        src={relationship.image}
                        alt={relationship.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Hide the image and show fallback when image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-full h-full flex items-center justify-center text-white font-bold"
                      style={{ 
                        fontSize,
                        display: relationship.image ? 'none' : 'flex'
                      }}
                    >
                      {relationship.name.charAt(0)}
                    </div>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {relationship.name}
                  </div>
                </div>
              ));
            })()
            }
            {relationships.length > 8 && (
              <div className="text-xs text-gray-500 font-medium mt-1">
                +{relationships.length - 8} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="h-1/3 p-4 bg-white">
        {isNFT ? (
          /* NFT Info Section */
          <>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <span className="mr-2">🎴</span>
                  {nft!.name}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Exclusive Wild Card NFT • Limited Edition
                </p>
              </div>
            </div>

            {/* NFT Details */}
            <div className="flex space-x-2 mb-3">
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                🏆 Collectible
              </span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                ⚡ Gasless
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                🔗 Base Network
              </span>
            </div>

            {/* Buy Button */}
            <div className="flex justify-center relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isWalletConnected) {
                    alert('Please connect your wallet to purchase NFTs');
                    return;
                  }
                  if (!isCorrectNetwork) {
                    alert('Please switch to Base network to purchase NFTs');
                    return;
                  }
                  onBuyNFT?.(nft!.id);
                }}
                disabled={isNFTLoading || isConnecting || (isWalletConnected && !isCorrectNetwork)}
                className={`${
                  isWalletConnected && isCorrectNetwork
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    : isWalletConnected && !isCorrectNetwork
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-gray-400 hover:bg-gray-500'
                } text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg flex items-center space-x-2 ${
                  isNFTLoading || isConnecting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isNFTLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Processing Transaction...</span>
                  </>
                ) : isConnecting ? (
                  <>
                    <span className="animate-spin">🔄</span>
                    <span>Connecting Wallet...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {isWalletConnected && isCorrectNetwork
                        ? '💳'
                        : isWalletConnected && !isCorrectNetwork
                        ? '⚠️'
                        : '🔒'}
                    </span>
                    <span>
                      {isWalletConnected && isCorrectNetwork
                        ? 'Purchase NFT'
                        : isWalletConnected && !isCorrectNetwork
                        ? 'Wrong Network'
                        : 'Connect Wallet'}
                    </span>
                    {isWalletConnected && isCorrectNetwork && (
                      <span className="text-sm opacity-90">Ξ {nft!.price}</span>
                    )}
                  </>
                )}
              </button>
              {connectionError && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 max-w-xs z-20">
                  {connectionError}
                </div>
              )}
              {walletDisplayName && isWalletConnected && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-1 bg-black/80 text-white text-xs rounded whitespace-nowrap">
                  Connected: {walletDisplayName}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Profile Info Section */
          <>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile!.name}, {profile!.age}
                </h2>
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                  {profile!.bio}
                </p>
              </div>
            </div>

            {/* Social Handles */}
            <div className="flex space-x-2 mb-3">
              {profile!.socialHandles?.instagram && (
                <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded-full">
                  @{profile!.socialHandles?.instagram}
                </span>
              )}
              {profile!.socialHandles?.tiktok && (
                <span className="text-xs bg-black text-white px-2 py-1 rounded-full">
                  @{profile!.socialHandles?.tiktok}
                </span>
              )}
              {profile!.socialHandles?.twitter && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  @{profile!.socialHandles?.twitter}
                </span>
              )}
            </div>

            {/* Rate Button and BET Button */}
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleRateClick}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-2 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
              >
                {showRatingSystem ? '✨ Rating...' : '⭐ Rate This Person'}
              </button>
              <button
                onClick={onShowBettingModal}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-semibold transition-colors inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                BET
              </button>
            </div>
          </>
        )}
      </div>

      {/* Swipe Indicators */}
      {dragOffset.x > 50 && (
        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
          <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold text-xl transform rotate-12">
            LIKE
          </div>
        </div>
      )}
      
      {/* Rating System Overlay - Only for profiles */}
      {!isNFT && showRatingSystem && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 mx-4 shadow-2xl border border-white/30 max-w-sm w-full">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {isSequentialRating && currentRelationshipIndex >= 0 && relationships[currentRelationshipIndex]
                  ? `Rate ${relationships[currentRelationshipIndex].name}`
                  : `Rate ${profile!.name}`
                }
              </h3>
              <p className="text-sm text-gray-600">
                {isSequentialRating && currentRelationshipIndex >= 0 && relationships[currentRelationshipIndex]
                  ? `How would you categorize the relationship with ${profile!.name}?`
                  : 'How would you categorize your relationship?'
                }
              </p>
            </div>
            
            <RatingSystem
              profileId={profile!.id}
              onRate={handleRatingComplete}
              disabled={false}
              profileName={profile!.name}
              relationships={relationships}
              currentRelationshipIndex={isSequentialRating ? currentRelationshipIndex : -1}
              onRelationshipRated={handleRelationshipRated}
            />
            
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowRatingSystem(false)}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {dragOffset.x < -50 && (
        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
          <div className="bg-red-500 text-white px-6 py-3 rounded-full font-bold text-xl transform -rotate-12">
            PASS
          </div>
        </div>
      )}
      </div>
      
      {/* Old betting modal removed - using the new implementation in SwipeStack */}
    </>
  );
}

type QuestionCardData = {
  id: string;
  type: 'question';
  question: FreakyQuestion;
};

type SwipeStackProps = {
  cards: (CardData | QuestionCardData)[];
  onSwipe: (direction: 'left' | 'right', profileId: string) => void;
  onRate?: (profileId: string, rating: 'dated' | 'hookup' | 'transactional', evidence?: Evidence[]) => void;
  onBuyNFT?: (nftId: string) => void;
  onQuestionAnswer?: (questionId: string, answer: boolean) => void;
  isWalletConnected?: boolean;
  isNFTLoading?: boolean;
  walletType?: string;
  walletDisplayName?: string;
  isCorrectNetwork?: boolean;
  connectionError?: string | null;
  isConnecting?: boolean;
};

export function SwipeStack({ cards: rawCards, onSwipe, onRate, onBuyNFT, onQuestionAnswer, isWalletConnected = false, isNFTLoading = false, walletType, walletDisplayName, isCorrectNetwork = true, connectionError, isConnecting = false }: SwipeStackProps) {
  // localStorage keys for persistence
  const STORAGE_KEY_INDEX = 'swipestack_current_index';
  const STORAGE_KEY_REMOVED = 'swipestack_removed_profiles';

  // Inject question cards every 4 profile/NFT cards
  const cards = (() => {
    const INTERVAL = 4;
    const result: (CardData | QuestionCardData)[] = [];
    let questionIdx = 0;
    rawCards.forEach((card, i) => {
      result.push(card);
      if ((i + 1) % INTERVAL === 0 && questionIdx < FREAKY_QUESTIONS.length) {
        result.push({
          id: `question-${FREAKY_QUESTIONS[questionIdx].id}`,
          type: 'question' as const,
          question: FREAKY_QUESTIONS[questionIdx],
        });
        questionIdx++;
      }
    });
    return result;
  })();
  
  // Initialize state from localStorage or defaults
  const getInitialIndex = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_INDEX);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  };
  
  const getInitialRemovedProfiles = (): Set<string> => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_REMOVED);
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    }
    return new Set<string>();
  };
  
  const [currentIndex, setCurrentIndex] = useState(getInitialIndex);
  const [removedProfiles, setRemovedProfiles] = useState<Set<string>>(getInitialRemovedProfiles);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showBettingModal2, setShowBettingModal2] = useState(false);
  const { placeBet, loading: bettingLoading, error: bettingError, clearError } = useBettingContract();
  
  // Save state to localStorage whenever it changes
  const saveToLocalStorage = (index: number, removed: Set<string>) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_INDEX, index.toString());
      localStorage.setItem(STORAGE_KEY_REMOVED, JSON.stringify(Array.from(removed)));
    }
  };

  // Profile-specific relationship mapping based on factual, alleged, and rumored connections
  const getProfileRelationships = (profileName: string): RelationshipConnection[] => {
    const relationshipMap: Record<string, RelationshipConnection[]> = {
      'Sean "Diddy" Combs': [
        { name: 'Kim Porter', image: '/Kim Porter.png' },
        { name: 'Cassie Ventura', image: '/Cassie Ventura.png' },
        { name: 'Jennifer Lopez', image: '/Jennifer Lopez.png' },
        { name: 'Aubrey O\'Day', image: '/Aubrey O\'Day.png' },
        { name: 'Yung Miami', image: '/Yung Miami.png' },
        { name: 'Sarah Chapman', image: '/Sarah Chapman.png' },
        { name: 'Misa Hylton', image: '/Misa Hylton.png' }
      ],
      'Cassie Ventura': [
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' },
        { name: 'Alex Fine', image: '/alex-fine.png' }
      ],
      'Jennifer Lopez': [
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' },
        { name: 'Ben Affleck' },
        { name: 'Marc Anthony' },
        { name: 'Alex Rodriguez' }
      ],
      'Kim Porter': [
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' },
        { name: 'Al B. Sure!', image: '/al-b-sure.png' }
      ],
      'Yung Miami': [
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' },
        { name: 'Jai Wiggins', image: '/jai-wiggins.png' },
        { name: 'Southside', image: '/southside.png' }
      ],
      'Sarah Chapman': [
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' }
      ],
      'Misa Hylton': [
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' },
        { name: 'JoJo Brim', image: '/jojo-brim.png' }
      ],
      'Aubrey O\'Day': [
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' },
        { name: 'Pauly D', image: '/pauly-d.png' }
      ],
      'Sienna Miller': [
        { name: 'Jude Law', image: '/jude-law.png' },
        { name: 'Rhys Ifans', image: '/rhys-ifans.png' },
        { name: 'Tom Sturridge', image: '/tom-sturridge.png' },
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' }
      ],
      'Emma Heming': [
        { name: 'Bruce Willis', image: '/Bruce Willis.png' }
      ],
      'Cameron Diaz': [
        { name: 'Justin Timberlake', image: '/justin-timberlake.png' },
        { name: 'Benji Madden', image: '/benji-madden.png' },
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' },
        { name: 'Matt Dillon', image: '/matt-dillon.png' }
      ],
      'Lori Harvey': [
        { name: 'Michael B. Jordan', image: '/michael-b-jordan.png' },
        { name: 'Future', image: '/future.png' },
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' },
        { name: 'Justin Combs', image: '/justin-combs.png' }
      ],
      'Miracle Watts': [
        { name: 'Tyler Lepley', image: '/tyler-lepley.png' },
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' }
      ],
      'Joie Chavis': [
        { name: 'Future', image: '/future.png' },
        { name: 'Bow Wow', image: '/bow-wow.png' },
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' }
      ],
      'Gina Huynh': [
        { name: 'Sean "Diddy" Combs', image: '/Sean Combs.png' }
      ],
      'Elon Musk': [
        { name: 'Justine Wilson', image: '/Justine Wilson.png' },
        { name: 'Talulah Riley', image: '/Talulah Riley.png' },
        { name: 'Grimes', image: '/Grimes.png' },
        { name: 'Shivon Zilis', image: '/Shivon Zilis.png' },
        { name: 'Ashley St. Clair', image: '/Ashley St. Clair.png' },
        { name: 'Natasha Bassett', image: '/Natasha Bassett.png' },
        { name: 'Jennifer Gwynne', image: '/Jennifer Gwynne.png' },
        { name: 'Amber Heard', image: '/Amber Heard.png' },
        { name: 'Cameron Diaz', image: '/Cameron Diaz.png' },
        { name: 'Cara Delevingne', image: '/Cara Delevingne.png' },
        { name: 'Rihanna', image: '/Rihanna.png' }
      ],
      'Justine Wilson': [
        { name: 'Elon Musk', image: '/Elon Musk.png' }
      ],
      'Talulah Riley': [
        { name: 'Elon Musk', image: '/Elon Musk.png' },
        { name: 'Matthew Rice', image: '/matthew-rice.png' }
      ],
      'Grimes': [
        { name: 'Elon Musk', image: '/Elon Musk.png' },
        { name: 'Chelsea Manning', image: '/chelsea-manning.png' }
      ],
      'Shivon Zilis': [
        { name: 'Elon Musk', image: '/Elon Musk.png' }
      ],
      'Ashley St. Clair': [
        { name: 'Elon Musk', image: '/Elon Musk.png' }
      ],
      'Natasha Bassett': [
        { name: 'Elon Musk', image: '/Elon Musk.png' },
        { name: 'Austin Butler', image: '/austin-butler.png' }
      ],
      'Jennifer Gwynne': [
        { name: 'Elon Musk', image: '/Elon Musk.png' }
      ],
      'Amber Heard': [
        { name: 'Elon Musk', image: '/Elon Musk.png' },
        { name: 'Johnny Depp' },
        { name: 'James Franco' }
      ],
      'Cara Delevingne': [
        { name: 'Elon Musk', image: '/Elon Musk.png' },
        { name: 'Ashley Benson' },
        { name: 'St. Vincent' }
      ],
      'Rihanna': [
        { name: 'Elon Musk', image: '/Elon Musk.png' },
        { name: 'A$AP Rocky' },
        { name: 'Chris Brown' },
        { name: 'Drake', image: '/Drake.png' }
      ],
      'Kim Kardashian': [
        { name: 'Damon Thomas', image: '/Damon Thomas.png' },
        { name: 'Ray J', image: '/Ray J.png' },
        { name: 'Nick Cannon', image: '/Nick Cannon.png' },
        { name: 'Reggie Bush', image: '/Reggie Bush.png' },
        { name: 'Miles Austin', image: '/Miles Austin.png' },
        { name: 'Kris Humphries', image: '/Kris Humphries.png' },
        { name: 'Kanye West', image: '/Kanye West.png' },
        { name: 'Pete Davidson', image: '/Pete Davidson.png' },
        { name: 'Odell Beckham Jr.', image: '/Odell Beckham Jr.png' },
        { name: 'The Game', image: '/The Game.png' },
        { name: 'Nick Lachey', image: '/Nick Lachey.png' },
        { name: 'Gabriel Aubry', image: '/Gabriel Aubry.png' },
        { name: 'Michael Copon', image: '/Michael Copon.png' },
        { name: 'Cristiano Ronaldo', image: '/Cristiano Ronaldo.png' },
        { name: 'Drake', image: '/Drake.png' },
        { name: 'Meek Mill', image: '/Meek Mill.png' },
        { name: 'Van Jones', image: '/Van Jones.png' },
        { name: 'Tom Brady', image: '/Tom Brady.png' }
      ],
      'Damon Thomas': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' }
      ],
      'Ray J': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' }
      ],
      'Nick Cannon': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' },
        { name: 'Mariah Carey', image: '/Mariah Carey.png' }
      ],
      'Reggie Bush': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' }
      ],
      'Miles Austin': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' }
      ],
      'Kris Humphries': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' }
      ],
      'Kanye West': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' },
        { name: 'Amber Rose', image: '/Amber Rose.png' },
        { name: 'Bianca Censori', image: '/Bianca Censori.png' }
      ],
      'Pete Davidson': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' },
        { name: 'Ariana Grande', image: '/Ariana Grande.png' }
      ],
      'Odell Beckham Jr.': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' }
      ],
      'The Game': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' }
      ],
      'Nick Lachey': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' },
        { name: 'Jessica Simpson', image: '/Jessica Simpson.png' }
      ],
      'Gabriel Aubry': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' },
        { name: 'Halle Berry', image: '/Halle Berry.png' }
      ],
      'Michael Copon': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' }
      ],
      'Cristiano Ronaldo': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' },
        { name: 'Georgina Rodriguez', image: '/Georgina Rodriguez.png' }
      ],
      'Drake': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' },
        { name: 'Rihanna', image: '/Rihanna.png' }
      ],
      'Meek Mill': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' },
        { name: 'Nicki Minaj', image: '/Nicki Minaj.png' }
      ],
      'Van Jones': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' }
      ],
      'Tom Brady': [
        { name: 'Kim Kardashian', image: '/Kim Kardashian.png' },
        { name: 'Gisele Bundchen', image: '/Gisele Bundchen.png' }
      ]
    };
    
    return relationshipMap[profileName] || [];
  };

  console.log(`SwipeStack received ${cards.length} cards:`, cards.map(c => {
    // Add type checking to prevent 'in' operator errors
    if (typeof c === 'object' && c !== null) {
      if ('type' in c && c.type === 'question') return `Q: ${(c as QuestionCardData).question.id}`;
      return 'name' in c ? (c as Profile).name : `NFT-${(c as NFTCard).id}`;
    }
    return 'Invalid card type';
  }));
  console.log('SwipeStack cards prop:', cards);
  console.log('SwipeStack removedProfiles:', Array.from(removedProfiles));

  const visibleCards = cards.filter(card => {
    // Add type checking to prevent errors
    if (typeof card === 'object' && card !== null && 'id' in card) {
      return !removedProfiles.has(card.id);
    }
    return false;
  });
  console.log(`SwipeStack visibleCards after filtering: ${visibleCards.length}`, visibleCards.map(c => {
    // Add type checking to prevent 'in' operator errors
    if (typeof c === 'object' && c !== null) {
      if ('type' in c && c.type === 'question') return `Q: ${(c as QuestionCardData).question.id}`;
      return 'name' in c ? c.name : `NFT-${(c as NFTCard).id}`;
    }
    return 'Invalid card type';
  }));
  const currentCard = visibleCards[currentIndex];
  // Only use keyboard nav for non-question cards
  const currentCardIsQuestion = currentCard && 'type' in currentCard && currentCard.type === 'question';
  
  // Get up to 5 cards for display (current + 4 background)
  const displayCards = visibleCards.slice(currentIndex, currentIndex + 5);

  // Keyboard controls for laptop users
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isAnimating || !currentCard || currentCardIsQuestion) return;
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleSwipe('left', currentCard.id);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleSwipe('right', currentCard.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCard, isAnimating]);

  const handleSwipe = (direction: 'left' | 'right', cardId: string) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    onSwipe(direction, cardId);
    
    // Remove the card from the stack to show the next one
    setRemovedProfiles(prev => {
      const newRemoved = new Set([...prev, cardId]);
      // Save to localStorage
      saveToLocalStorage(currentIndex, newRemoved);
      return newRemoved;
    });
    
    // Don't increment currentIndex - the filtering will automatically show the next card
    setTimeout(() => {
      setIsAnimating(false);
    }, 400);
  };

  const handleRate = (profileId: string, rating: 'dated' | 'hookup' | 'transactional', evidence?: Evidence[]) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    onRate?.(profileId, rating, evidence);
    
    // Show a brief success animation
    const card = document.querySelector(`[data-profile-id="${profileId}"]`);
    if (card) {
      card.classList.add('pulse-glow');
      setTimeout(() => {
        card.classList.remove('pulse-glow');
      }, 500);
    }
    
    // Mark profile as rated - filtering will automatically show the next profile
    setRemovedProfiles(prev => {
      const newRemoved = new Set([...prev, profileId]);
      // Save to localStorage
      saveToLocalStorage(currentIndex, newRemoved);
      return newRemoved;
    });
    
    // Don't increment currentIndex - the filtering will automatically show the next profile
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  if (visibleCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center bounce-in">
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h3 className="text-2xl font-bold gradient-text mb-2">All caught up!</h3>
        <p className="text-gray-600 mb-4">No more cards to swipe through.</p>
        <div className="space-y-3">
          <Button 
            onClick={() => {
              setCurrentIndex(0);
              setRemovedProfiles(new Set());
              // Clear localStorage when starting over
              if (typeof window !== 'undefined') {
                localStorage.removeItem(STORAGE_KEY_INDEX);
                localStorage.removeItem(STORAGE_KEY_REMOVED);
              }
            }}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            🔄 Start Over
          </Button>
          <p className="text-xs text-gray-500">
            Or add more profiles to keep swiping!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] w-full max-w-sm mx-auto swipe-stack-container">
      {/* Render up to 5 cards simultaneously */}
      {displayCards.map((card, index) => {
        const isActive = index === 0; // Only the first card (current) is active
        const zIndex = displayCards.length - index; // Higher z-index for cards closer to front
        
        // No scaling or opacity effects for maximum performance
        const transform = 'scale(1.0)';
        const opacity = 1.0;
        
        const cardIsNFT = 'type' in card && card.type === 'nft';
        const cardIsQuestion = 'type' in card && card.type === 'question';
        
        if (cardIsQuestion) {
          return (
            <QuestionCard
              key={card.id}
              question={(card as QuestionCardData).question}
              onAnswer={(questionId, answer) => {
                // Dismiss question card
                setRemovedProfiles(prev => {
                  const newRemoved = new Set([...prev, card.id]);
                  saveToLocalStorage(currentIndex, newRemoved);
                  return newRemoved;
                });
                onQuestionAnswer?.(questionId, answer);
              }}
              isActive={isActive}
              zIndex={zIndex}
            />
          );
        }

        return (
          <SwipeCard
            key={card.id}
            profile={cardIsNFT ? undefined : card as Profile}
            nft={cardIsNFT ? card as NFTCard : undefined}
            onSwipe={handleSwipe}
            onRate={handleRate}
            onBuyNFT={onBuyNFT}
            isActive={isActive}
            zIndex={zIndex}
            relationships={cardIsNFT ? [] : getProfileRelationships((card as Profile).name)}
            style={{ transform, opacity }}
            data-profile-id={isActive ? card.id : undefined}
            isWalletConnected={isWalletConnected}
            isNFTLoading={isNFTLoading}
            walletType={walletType}
            walletDisplayName={walletDisplayName}
            isCorrectNetwork={isCorrectNetwork}
            connectionError={connectionError}
            isConnecting={isConnecting}
            onShowBettingModal={isActive && !cardIsNFT ? () => setShowBettingModal2(true) : undefined}
          />
        );
      })}
      
      {/* Stack indicator - show up to 3 dots with visual hierarchy */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-1 max-w-xs overflow-hidden">
        {displayCards.slice(0, Math.min(3, displayCards.length)).map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full ${
              index === 0 
                ? 'bg-gradient-to-r from-pink-500 to-purple-600' 
                : 'bg-gray-400'
            }`}
          />
        ))}
        {visibleCards.length > 3 && (
          <div className="text-xs text-gray-500 ml-2 flex items-center">
            +{visibleCards.length - 3}
          </div>
        )}
      </div>
      
      {/* Progress indicator - floating on top left */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white font-medium">
          <span>{currentIndex + 1}/{visibleCards.length}</span>
          <div className="text-[10px] opacity-75 mt-0.5">
            {Math.min(displayCards.length, 5)} cards loaded
          </div>
        </div>
      </div>
      
      {/* Betting Modal */}
      {showBettingModal2 && visibleCards.length > 0 && (() => {
        const currentCard = visibleCards[currentIndex];
        const cardIsNFT = 'type' in currentCard && currentCard.type === 'nft';
        const cardIsQuestion = 'type' in currentCard && currentCard.type === 'question';
        const currentProfile = (cardIsNFT || cardIsQuestion) ? null : currentCard as Profile;
        
        // Get random profile for betting (excluding current profile, NFTs, and question cards)
        const availableProfiles = visibleCards.filter((card, index) => {
          const isNFT = 'type' in card && card.type === 'nft';
          const isQuestion = 'type' in card && card.type === 'question';
          return !isNFT && !isQuestion && index !== currentIndex;
        }) as Profile[];
        
        const randomProfile = availableProfiles.length > 0 
          ? availableProfiles[Math.floor(Math.random() * availableProfiles.length)]
          : currentProfile; // Fallback to current profile if no other profiles available
        
        return !cardIsNFT && !cardIsQuestion && currentProfile && randomProfile ? (
          <BettingModal
            isOpen={showBettingModal2}
            onClose={() => setShowBettingModal2(false)}
            profileA={currentProfile}
            profileB={randomProfile}
            prizePool={960}
            loading={bettingLoading}
            error={bettingError}
            onPlaceBet={async (prediction, amount) => {
              try {
                clearError();
                // Map prediction to betting options (1 for Option A, 2 for Option B)
                // For now, we'll use a simple mapping - this can be customized based on your betting logic
                const bettingOption = prediction === 'dated' || prediction === 'hookup' ? 1 : 2;
                
                await placeBet(bettingOption, amount.toString());
                console.log('Bet placed successfully:', prediction, amount);
                setShowBettingModal2(false);
              } catch (error) {
                console.error('Error placing bet:', error);
                // Keep modal open to show error
              }
            }}
          />
        ) : null;
      })()}
    </div>
  );
}