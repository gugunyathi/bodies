"use client";

import { useState, useEffect } from 'react';
import { EvidenceUpload, EvidenceDisplay } from './EvidenceUpload';
import { apiClient } from '../../lib/api-client';
import { Evidence } from '../../lib/models';

export type RatingType = 'dated' | 'hookup' | 'transactional';

interface RelationshipConnection {
  name: string;
  image?: string;
}

interface RatingSystemProps {
  profileId: string;
  onRate: (profileId: string, rating: RatingType, evidence?: Evidence[]) => void;
  disabled?: boolean;
  profileName?: string;
  relationships?: RelationshipConnection[];
  currentRelationshipIndex?: number;
  onRelationshipRated?: (relationshipName: string, rating: RatingType) => void;
}

interface RatingButtonProps {
  emoji: string;
  label: string;
  type: RatingType;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

const RatingButton: React.FC<RatingButtonProps> = ({ 
  emoji, 
  label, 
  type, 
  onClick, 
  disabled = false,
  isActive = false 
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [showRipple, setShowRipple] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    
    setIsPressed(true);
    setShowRipple(true);
    
    // Haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    setTimeout(() => {
      onClick();
      setIsPressed(false);
    }, 150);
    
    setTimeout(() => {
      setShowRipple(false);
    }, 600);
  };

  const getButtonStyles = () => {
    const baseStyles = "rating-button relative flex flex-col items-center justify-center min-w-[70px] h-[70px] transition-all duration-300";
    
    if (disabled) {
      return `${baseStyles} opacity-50 cursor-not-allowed`;
    }
    
    const typeStyles = {
      dated: "hover:bg-gradient-to-br hover:from-red-400/20 hover:to-pink-500/20 hover:border-red-300/50",
      hookup: "hover:bg-gradient-to-br hover:from-orange-400/20 hover:to-red-500/20 hover:border-orange-300/50",
      transactional: "hover:bg-gradient-to-br hover:from-green-400/20 hover:to-emerald-500/20 hover:border-green-300/50"
    };
    
    const activeStyles = isActive ? "bg-gradient-to-br from-white/30 to-white/10 border-white/50 scale-110" : "";
    const pressedStyles = isPressed ? "scale-95" : "hover:scale-110";
    
    return `${baseStyles} ${typeStyles[type]} ${activeStyles} ${pressedStyles} cursor-pointer`;
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={getButtonStyles()}
      aria-label={`Rate as ${label}`}
    >
      {/* Ripple effect */}
      {showRipple && (
        <div className="absolute inset-0 rounded-full">
          <div className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-white/20 animate-ping" style={{ animationDelay: '0.1s' }} />
        </div>
      )}
      
      {/* Emoji */}
      <span className={`text-2xl mb-1 transition-transform duration-200 ${isPressed ? 'scale-125' : ''}`}>
        {emoji}
      </span>
      
      {/* Label */}
      <span className="text-xs font-medium text-gray-700 text-center leading-tight">
        {label}
      </span>
      
      {/* Active indicator */}
      {isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full animate-pulse" />
      )}
    </button>
  );
};

export const RatingSystem: React.FC<RatingSystemProps> = ({ 
  profileId, 
  onRate, 
  disabled = false,
  profileName = 'User',
  relationships = [],
  currentRelationshipIndex = -1,
  onRelationshipRated
}) => {
  const [selectedRating, setSelectedRating] = useState<RatingType | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isRating, setIsRating] = useState(false);
  
  const isRatingRelationship = currentRelationshipIndex >= 0 && currentRelationshipIndex < relationships.length;
  const currentRelationship = isRatingRelationship ? relationships[currentRelationshipIndex] : null;
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);

  const ratings = [
    { type: 'dated' as RatingType, emoji: '❤️', label: 'Dated' },
    { type: 'hookup' as RatingType, emoji: '🔥', label: 'Hookup' },
    { type: 'transactional' as RatingType, emoji: '💵', label: 'Transactional' }
  ];

  const handleRatingClick = async (rating: RatingType) => {
    if (disabled || isRating) return;
    
    setIsRating(true);
    setSelectedRating(rating);
    setShowConfirmation(true);
    
    // Auto-confirm after a short delay for smooth UX
    setTimeout(() => {
      if (isRatingRelationship && currentRelationship && onRelationshipRated) {
        onRelationshipRated(currentRelationship.name, rating);
      } else {
        onRate(profileId, rating, evidence);
      }
      setShowConfirmation(false);
      setIsRating(false);
    }, 800);
  };

  const handleEvidenceAdd = async (newEvidence: Evidence) => {
    // Auto-verify the evidence using content moderation
    if (newEvidence._id) {
      try {
        const verificationResult = await apiClient.autoVerifyEvidence(newEvidence._id);
        if (verificationResult.success) {
          console.log('Evidence auto-verification completed:', verificationResult.data);
        }
      } catch (error) {
        console.error('Failed to auto-verify evidence:', error);
      }
    }
    
    setEvidence(prev => [...prev, newEvidence]);
    setShowEvidenceUpload(false);
  };

  const handleEvidenceRemove = (evidenceId: string) => {
    setEvidence(prev => prev.filter(e => e._id !== evidenceId));
  };

  const resetRating = () => {
    setSelectedRating(null);
    setShowConfirmation(false);
    setIsRating(false);
    setEvidence([]);
    setShowEvidenceUpload(false);
  };

  useEffect(() => {
    // Reset state when profileId changes
    resetRating();
  }, [profileId]);

  return (
    <div className="relative">
      {/* Rating Buttons */}
      <div className="flex justify-center space-x-4 mb-4">
        {ratings.map(({ type, emoji, label }) => (
          <RatingButton
            key={type}
            emoji={emoji}
            label={label}
            type={type}
            onClick={() => handleRatingClick(type)}
            disabled={disabled || isRating}
            isActive={selectedRating === type}
          />
        ))}
      </div>
      
      {/* Evidence Button - Always Available */}
      <div className="flex justify-center mb-4">
        <button
          onClick={() => setShowEvidenceUpload(true)}
          disabled={disabled}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg flex items-center space-x-2"
        >
          <span>📎</span>
          <span>Add Evidence</span>
        </button>
      </div>
      
      {/* Evidence Section - Always Visible */}
      {!showConfirmation && (
        <div className="space-y-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">Evidence (Optional)</div>
            <div className="text-xs text-gray-500">
              {evidence.length} item{evidence.length !== 1 ? 's' : ''} added
            </div>
          </div>
          
          {evidence.length > 0 ? (
            <EvidenceDisplay evidence={evidence} onRemove={handleEvidenceRemove} />
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
              <div className="text-2xl mb-1">📝</div>
              <div>No evidence added</div>
              <div className="text-xs mt-1">Add photos, videos, or links to support your rating</div>
            </div>
          )}
        </div>
      )}
      
      {/* Confirmation Message */}
      {showConfirmation && selectedRating && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl px-6 py-4 shadow-2xl border border-white/30 bounce-in">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">
                {ratings.find(r => r.type === selectedRating)?.emoji}
              </span>
              <div>
                <p className="font-bold text-gray-900">
                  Rated as {ratings.find(r => r.type === selectedRating)?.label}!
                </p>
                <p className="text-sm text-gray-600">
                  {isRatingRelationship && currentRelationship
                    ? `Rating relationship with ${currentRelationship.name}...`
                    : 'Adding to their bodycount...'
                  }
                </p>
              </div>
              <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      {!showConfirmation && (
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">
            {isRatingRelationship && currentRelationship 
              ? `Rate relationship with ${currentRelationship.name}`
              : 'Tap an emoji to rate this relationship'
            }
          </p>
          <div className="flex justify-center space-x-4 text-xs text-gray-400">
            <span>❤️ = Serious relationship</span>
            <span>🔥 = Casual hookup</span>
            <span>💵 = Transactional</span>
          </div>
        </div>
      )}
      
      {/* Evidence Upload Modal */}
      {showEvidenceUpload && (
        <EvidenceUpload
          onEvidenceAdd={handleEvidenceAdd}
          onClose={() => setShowEvidenceUpload(false)}
          profileName={profileName}
          ratingType={selectedRating || 'dated'}
        />
      )}
    </div>
  );
};

export default RatingSystem;