"use client";

import { useState, useEffect } from "react";
import { SwipeCard } from "./SwipeCard";

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

type SwipeStackProps = {
  cards?: CardData[];
  profiles?: Profile[];
  onSwipe: (direction: 'left' | 'right', profileId: string) => void;
  onRate?: (profileId: string, rating: 'dated' | 'hookup' | 'transactional', evidence?: Evidence[]) => void;
  onBuyNFT?: (nftId: string) => void;
  isWalletConnected?: boolean;
  isNFTLoading?: boolean;
  walletType?: string;
  walletDisplayName?: string;
  isCorrectNetwork?: boolean;
  connectionError?: string | null;
  isConnecting?: boolean;
};

export function SwipeStack({
  cards,
  profiles,
  onSwipe,
  onRate,
  onBuyNFT,
  isWalletConnected = false,
  isNFTLoading = false,
  walletType,
  walletDisplayName,
  isCorrectNetwork = true,
  connectionError,
  isConnecting = false
}: SwipeStackProps) {
  // Use profiles if provided, otherwise use cards
  const cardData = profiles || cards || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [removedCards, setRemovedCards] = useState<Set<string>>(new Set());

  // Load state from localStorage on mount
  useEffect(() => {
    const savedIndex = localStorage.getItem('swipestack_current_index');
    const savedRemoved = localStorage.getItem('swipestack_removed_profiles');
    
    if (savedIndex) {
      setCurrentIndex(parseInt(savedIndex, 10));
    }
    
    if (savedRemoved) {
      try {
        const removedArray = JSON.parse(savedRemoved);
        setRemovedCards(new Set(removedArray));
      } catch (e) {
        console.error('Error parsing removed profiles from localStorage:', e);
      }
    }
  }, [cardData.length]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('swipestack_current_index', currentIndex.toString());
  }, [currentIndex]);

  useEffect(() => {
    localStorage.setItem('swipestack_removed_profiles', JSON.stringify(Array.from(removedCards)));
  }, [removedCards]);

  const handleSwipe = (direction: 'left' | 'right', profileId: string) => {
    // Add to removed cards
    setRemovedCards(prev => new Set([...prev, profileId]));
    
    // Move to next card
    setCurrentIndex(prev => prev + 1);
    
    // Call parent handler
    onSwipe(direction, profileId);
  };

  // Filter out removed cards and get available cards
  const availableCards = cardData.filter(card => !removedCards.has(card.id));
  
  // Get cards to display (current + next few for stacking effect)
  const cardsToShow = availableCards.slice(currentIndex, currentIndex + 3);

  if (cardsToShow.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-center">
          <p className="text-xl mb-2">No more cards!</p>
          <p className="text-sm">Check back later for new profiles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] max-w-sm mx-auto">
      {cardsToShow.map((card, index) => {
        const isNFT = 'type' in card && card.type === 'nft';
        const isActive = index === 0;
        const zIndex = cardsToShow.length - index;
        
        // Calculate offset for stacking effect
        const offset = index * 4;
        const scale = 1 - (index * 0.02);
        
        return (
          <div
            key={card.id}
            className="absolute inset-0"
            style={{
              transform: `translateY(${offset}px) scale(${scale})`,
              zIndex,
            }}
          >
            <SwipeCard
              profile={isNFT ? undefined : (card as Profile)}
              nft={isNFT ? (card as NFTCard) : undefined}
              onSwipe={handleSwipe}
              onRate={onRate}
              onBuyNFT={onBuyNFT}
              isActive={isActive}
              zIndex={zIndex}
              isWalletConnected={isWalletConnected}
              isNFTLoading={isNFTLoading}
              walletType={walletType}
              walletDisplayName={walletDisplayName}
              isCorrectNetwork={isCorrectNetwork}
              connectionError={connectionError}
              isConnecting={isConnecting}
              profiles={cardData as Profile[]}
              data-profile-id={card.id}
            />
          </div>
        );
      })}
      
      {/* Progress indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
        {currentIndex + 1} / {availableCards.length}
      </div>
    </div>
  );
}

export default SwipeStack;