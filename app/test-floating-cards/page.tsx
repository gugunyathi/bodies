'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// useOpenUrl replaced with window.open
import { WalletButton } from '../components/WalletButton';
import { Button } from "../components/DemoComponents";
import { Icon } from "../components/DemoComponents";
import { PrivacySettings, PrivacyStatus, AnonymousToggle } from "../components/PrivacySettings";

// Mock profile data for testing
const mockProfiles = [
  {
    id: '1',
    name: 'Rihanna',
    age: 36,
    bio: 'Barbadian singer, actress, and businesswoman',
    images: ['/Rihanna.png'],
    bodycount: 8,
    fameLevel: 'A-List'
  },
  {
    id: '2', 
    name: 'Tom Brady',
    age: 46,
    bio: 'Former NFL quarterback and seven-time Super Bowl champion',
    images: ['/Tom Brady.png'],
    bodycount: 12,
    fameLevel: 'A-List'
  },
  {
    id: '3',
    name: 'Jennifer Lopez',
    age: 54,
    bio: 'Singer, actress, and businesswoman known as J.Lo',
    images: ['/Jennifer Lopez.png'],
    bodycount: 5,
    fameLevel: 'A-List'
  },
  {
    id: '4',
    name: 'Kim Kardashian',
    age: 43,
    bio: 'Reality TV star, entrepreneur, and social media influencer',
    images: ['/Kim Kardashian.png'],
    bodycount: 15,
    fameLevel: 'A-List'
  },
  {
    id: '5',
    name: 'Drake',
    age: 37,
    bio: 'Canadian rapper, singer, and songwriter',
    images: ['/Drake.png'],
    bodycount: 22,
    fameLevel: 'A-List'
  }
];

interface FloatingCardProps {
  profile: typeof mockProfiles[0];
  isActive: boolean;
  zIndex: number;
  onSwipe: (direction: 'left' | 'right', id: string) => void;
  stackOffset: number;
}

function FloatingCard({ profile, isActive, zIndex, onSwipe, stackOffset }: FloatingCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isActive) return;
    e.preventDefault(); // Prevent page scrolling
    setIsDragging(true);
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isActive) return;
    e.preventDefault(); // Prevent page scrolling
    const touch = e.touches[0];
    const deltaX = touch.clientX - startPos.current.x;
    const deltaY = touch.clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging || !isActive) return;
    e.preventDefault();
    setIsDragging(false);
    
    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      const direction = dragOffset.x > 0 ? 'right' : 'left';
      onSwipe(direction, profile.id);
    }
    
    setDragOffset({ x: 0, y: 0 });
  };

  const handleMouseStart = (e: React.MouseEvent) => {
    if (!isActive) return;
    e.preventDefault();
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !isActive) return;
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  }, [isDragging, isActive]);

  const handleMouseEnd = useCallback(() => {
    if (!isDragging || !isActive) return;
    setIsDragging(false);
    
    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      const direction = dragOffset.x > 0 ? 'right' : 'left';
      onSwipe(direction, profile.id);
    }
    
    setDragOffset({ x: 0, y: 0 });
  }, [isDragging, isActive, dragOffset.x, onSwipe, profile.id]);

  // Add global mouse event listeners for proper dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseEnd]);

  const rotation = dragOffset.x * 0.1;
  const opacity = 1 - Math.abs(dragOffset.x) / 300;
  const scale = 1 - (stackOffset * 0.02);

  return (
    <>
      {/* Fixed positioned card - completely detached from page layout */}
      <div
        ref={cardRef}
        className={`fixed bg-white rounded-2xl shadow-2xl overflow-hidden cursor-grab transition-transform duration-200 ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
        style={{
          width: '360px',
          height: '560px',
          left: '50%',
          top: '100px', // Position below header with proper gap
          marginLeft: '-180px', // Half of width
          transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y + stackOffset * 4}px) rotate(${rotation}deg) scale(${scale})`,
          opacity: opacity,
          zIndex: zIndex,
          touchAction: 'none', // Prevent default touch behaviors
          userSelect: 'none', // Prevent text selection
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseStart}
      >
        {/* Image Section */}
        <div className="relative h-2/3 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600">
          {profile.images && profile.images.length > 0 ? (
            <img
              src={profile.images[currentImageIndex]}
              alt={profile.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to gradient background if image fails
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
              {profile.name.charAt(0)}
            </div>
          )}
          
          {/* Image indicators */}
          {profile.images && profile.images.length > 1 && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {profile.images.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="h-1/3 p-4 bg-white">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {profile.name}, {profile.age}
              </h2>
              <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                {profile.bio}
              </p>
            </div>
          </div>

          <div className="flex justify-center space-x-3 mt-4">
            <button 
              onClick={() => console.log(`Rating ${profile.name}`)}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-2 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              ⭐ Rate
            </button>
            <button 
              onClick={() => console.log(`Betting on ${profile.name}`)}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-semibold transition-colors"
            >
              BET
            </button>
          </div>
        </div>

        {/* Swipe Arrow Indicators - Only show when not dragging */}
        {!isDragging && isActive && (
          <>
            {/* Left Arrow */}
            <div className="absolute left-4 bottom-40 pointer-events-none">
              <div className="text-gray-400 text-4xl font-bold drop-shadow-lg animate-pulse">
                {'<'}
              </div>
            </div>
            
            {/* Right Arrow */}
            <div className="absolute right-4 bottom-40 pointer-events-none">
              <div className="text-gray-400 text-4xl font-bold drop-shadow-lg animate-pulse">
                {'>'}
              </div>
            </div>
          </>
        )}

        {/* Swipe Feedback Indicators */}
        {dragOffset.x > 50 && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center pointer-events-none">
            <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold text-xl transform rotate-12">
              LIKE
            </div>
          </div>
        )}
        
        {dragOffset.x < -50 && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center pointer-events-none">
            <div className="bg-red-500 text-white px-6 py-3 rounded-full font-bold text-xl transform -rotate-12">
              PASS
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function TestFloatingCards() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [removedCards, setRemovedCards] = useState<Set<string>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Main app state and hooks
  const openUrl = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
  const [frameAdded, setFrameAdded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTestInfo, setShowTestInfo] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"swipe" | "add" | "scores" | "privacy">("swipe");
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
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

  const availableCards = mockProfiles.filter(profile => !removedCards.has(profile.id));
  const cardsToShow = availableCards.slice(currentIndex, currentIndex + 3);

  const handleSwipe = (direction: 'left' | 'right', cardId: string) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    console.log(`Swiped ${direction} on card ${cardId}`);
    
    // Remove the card from the stack
    setRemovedCards(prev => new Set([...prev, cardId]));
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 400);
  };

  const resetCards = () => {
    setCurrentIndex(0);
    setRemovedCards(new Set());
  };
  
  // Save frame button removed (no longer using Farcaster MiniKit)
  const saveFrameButton = null;

  // Prevent body scroll when cards are being interacted with
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <>
      {/* Background page with original app dimensions and styling */}
      <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
        <div className="w-full max-w-md mx-auto px-4 py-3 swipe-container-stable">
          {/* Header */}
          <header className="flex items-center justify-between p-3 sm:p-4 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
            {/* Left: Bodies Logo and Wallet Connect */}
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                Bodies
              </h1>
              <WalletButton />
            </div>

            {/* Right: Hamburger Menu and Profile */}
            <div className="flex items-center space-x-2">
              {/* Profile Icon */}
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">👤</span>
                  </div>
                </button>
                

              </div>
              
              {/* Hamburger Menu */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Menu"
              >
                <div className="w-5 h-5 flex flex-col justify-center space-y-1">
                  <div className={`h-0.5 bg-gray-600 transition-all duration-300 ${showMobileMenu ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                  <div className={`h-0.5 bg-gray-600 transition-all duration-300 ${showMobileMenu ? 'opacity-0' : ''}`}></div>
                  <div className={`h-0.5 bg-gray-600 transition-all duration-300 ${showMobileMenu ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                </div>
              </button>
            </div>
          </header>

           {/* Mobile Menu Overlay */}
            <div 
              className={`fixed inset-0 bg-black/50 transition-opacity duration-300 pointer-events-none ${
                showMobileMenu ? 'opacity-50 pointer-events-auto' : 'opacity-0'
              }`}
              style={{ zIndex: 99997 }}
              onClick={() => setShowMobileMenu(false)}
            />
            
            {/* Profile Menu Overlay */}
             <div 
               className={`fixed inset-0 bg-black/50 transition-opacity duration-300 pointer-events-none ${
                 showProfileMenu ? 'opacity-50 pointer-events-auto' : 'opacity-0'
               }`}
               style={{ zIndex: 99997 }}
               onClick={() => setShowProfileMenu(false)}
             />

           {/* Mobile Menu Sidebar */}
           <div 
             className={`fixed top-0 left-0 h-full w-72 max-w-[90vw] bg-white shadow-2xl transform transition-all duration-300 ease-in-out ${
               showMobileMenu ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
             }`}
             style={{ zIndex: 99998 }}
           >
             <div className="p-6">
               {/* Menu Header */}
               <div className="flex items-center justify-between mb-8">
                 <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                 <button
                   onClick={() => setShowMobileMenu(false)}
                   className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>

               {/* Navigation Tabs */}
               <div className="mb-8">
                 <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Navigation</h3>
                 <div className="space-y-2">
                   <button
                     onClick={() => {
                       router.push('/');
                       setShowMobileMenu(false);
                     }}
                     className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-all ${
                       activeTab === "swipe"
                         ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                         : "text-gray-700 hover:bg-gray-100"
                     }`}
                   >
                     <span className="mr-3">🔥</span>
                     Swipe
                   </button>
                   <button
                     onClick={() => {
                       router.push('/add-profile');
                       setShowMobileMenu(false);
                     }}
                     className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-all ${
                       activeTab === "add"
                         ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                         : "text-gray-700 hover:bg-gray-100"
                     }`}
                   >
                     <span className="mr-3">➕</span>
                     Add Profile
                   </button>
                   <button
                     onClick={() => {
                       router.push('/test-privacy');
                       setShowMobileMenu(false);
                     }}
                     className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-all ${
                       activeTab === "privacy"
                         ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                         : "text-gray-700 hover:bg-gray-100"
                     }`}
                   >
                     <span className="mr-3">🔒</span>
                     Privacy Mode
                   </button>
                 </div>
               </div>

               {/* Actions */}
               <div className="mb-8">
                 <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Actions</h3>
                 <div className="space-y-2">
                   <button
                     onClick={() => {
                       setShowTestInfo(true);
                       setShowMobileMenu(false);
                     }}
                     className="w-full flex items-center px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-100 transition-colors"
                   >
                     <span className="mr-3">ℹ️</span>
                     Test Info
                   </button>
                   <button
                     onClick={() => {
                       resetCards();
                       setShowMobileMenu(false);
                     }}
                     className="w-full flex items-center px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-100 transition-colors"
                   >
                     <span className="mr-3">🔄</span>
                     Reset Cards
                   </button>
                   <button
                     onClick={() => {
                       localStorage.clear();
                       window.location.reload();
                     }}
                     className="w-full flex items-center px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
                   >
                     <span className="mr-3">🗑️</span>
                     Clear All Data
                   </button>
                 </div>
               </div>

               {/* Tagline */}
               <div className="text-center text-xs text-gray-500 border-t pt-4">
                 Rate relationships - Track scores - Keep it real
               </div>
             </div>
           </div>

          {/* Clean background - no text behind cards */}
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center text-gray-400">
              <p className="text-sm">Swipe the cards above</p>
            </div>
          </div>
          
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
      </div>

           {/* Profile Menu Sidebar */}
           <div 
             className={`fixed top-0 h-full w-72 max-w-[90vw] bg-white shadow-2xl transform transition-all duration-300 ease-in-out ${
               showProfileMenu ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
             } ${
               showProfileMenu ? 'pointer-events-auto' : 'pointer-events-none'
             }`}
             style={{ 
               zIndex: showProfileMenu ? 99998 : -1,
               left: '50%',
               marginLeft: '-144px' // Center align with app frame (288px/2 = 144px)
             }}
           >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Profile Menu</h2>
              <button 
                onClick={() => setShowProfileMenu(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Menu Items */}
            <div className="p-4 space-y-2">
              <button 
                onClick={() => {
                  router.push('/leaderboard');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span className="mr-3 text-lg">📊</span>
                <span>My Scores</span>
              </button>
              
              <button 
                onClick={() => {
                  router.push('/test-privacy');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span className="mr-3 text-lg">🔒</span>
                <span>Privacy Settings</span>
              </button>
              
              {/* Anonymous Mode Toggle */}
              <div className="px-4 py-3 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="mr-3 text-lg">👤</span>
                    <span className="text-gray-700">Anonymous Mode</span>
                  </div>
                  <AnonymousToggle
                    enabled={privacySettings.anonymousRatings}
                    onToggle={() => setPrivacySettings(prev => ({ ...prev, anonymousRatings: !prev.anonymousRatings }))}
                  />
                </div>
              </div>
              
              <hr className="my-4" />
              
              <button 
                onClick={() => {
                  console.log('Opening Profile Settings');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span className="mr-3 text-lg">👤</span>
                <span>Profile Settings</span>
              </button>
              
              <button 
                onClick={() => {
                  console.log('Opening Account Settings');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span className="mr-3 text-lg">⚙️</span>
                <span>Account Settings</span>
              </button>
              
              <hr className="my-4" />
              
              <button 
                onClick={() => {
                  console.log('Signing out user');
                  setShowProfileMenu(false);
                  // Add actual sign out logic here
                }}
                className="w-full flex items-center px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="mr-3 text-lg">🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>

      {/* Privacy Settings Modal */}
      {showPrivacySettings && (
        <PrivacySettings
          onClose={() => setShowPrivacySettings(false)}
          onSettingsChange={(newSettings) => {
            setPrivacySettings(newSettings);
          }}
          currentSettings={privacySettings}
        />
      )}

      {/* Test Info Modal */}
      {showTestInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto mx-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Test Information</h2>
                <button
                  onClick={() => setShowTestInfo(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Test Explanation */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Test Explanation</h3>
                <div className="space-y-3 text-gray-700">
                  <p className="leading-relaxed">
                    This test demonstrates a <strong>floating card stack</strong> that is completely 
                    detached from the background page layout.
                  </p>
                  <p className="leading-relaxed">
                    <strong>Key improvements:</strong>
                  </p>
                  <ul className="space-y-1 ml-4">
                    <li>• Cards use <code className="bg-gray-100 px-1 rounded">position: fixed</code> instead of absolute</li>
                    <li>• No interference from page elements or "save frame" button</li>
                    <li>• Background page remains completely stable during swipes</li>
                    <li>• Smooth touch handling optimized for mobile</li>
                  </ul>
                </div>
              </div>

              {/* Instructions */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Instructions</h3>
                <div className="space-y-2 text-gray-700">
                  <p>1. <strong>Swipe cards</strong> left (pass) or right (like)</p>
                  <p>2. <strong>Notice</strong> how the background page never moves</p>
                  <p>3. <strong>Compare</strong> with the original implementation</p>
                  <p>4. <strong>Test</strong> on both desktop and mobile</p>
                </div>
              </div>

              {/* Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Current Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cards remaining:</span>
                    <span className="font-medium text-blue-600">{availableCards.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cards swiped:</span>
                    <span className="font-medium text-green-600">{removedCards.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current card:</span>
                    <span className="font-medium text-purple-600">{availableCards[0]?.name || 'None'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Card Stack - completely isolated */}
      {availableCards.length > 0 ? (
        cardsToShow.map((card: any, index: number) => (
          <FloatingCard
            key={card.id}
            profile={card}
            isActive={index === 0 && !showMobileMenu && !showProfileMenu}
            zIndex={1000 - index}
            onSwipe={handleSwipe}
            stackOffset={index}
          />
        ))
      ) : (
        <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-1000">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">All Done!</h3>
            <p className="text-gray-600 mb-4">No more cards to swipe</p>
            <button
              onClick={resetCards}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              🔄 Start Over
            </button>
          </div>
        </div>
      )}
    </>
  );
}