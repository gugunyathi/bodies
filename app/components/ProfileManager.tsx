"use client";

import { useState, useCallback, useEffect, useRef } from 'react';

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
  evidence: {
    [ratingId: string]: Evidence[];
  };
  createdAt: string;
  isVerified: boolean;
};

interface ProfileManagerProps {
  onProfilesUpdate: (profiles: Profile[]) => void;
}

interface AddProfileFormData {
  name: string;
  age: string;
  bio: string;
  image: string;
  instagram: string;
  tiktok: string;
  twitter: string;
}

// Enhanced sample profiles data - now empty to use only real database profiles
const sampleProfiles: Profile[] = [];

export const ProfileManager = ({ onProfilesUpdate }: ProfileManagerProps) => {
  const [profiles, setProfiles] = useState<Profile[]>(sampleProfiles);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<AddProfileFormData>({
    name: '',
    age: '',
    bio: '',
    image: '',
    instagram: '',
    tiktok: '',
    twitter: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<AddProfileFormData>>({});

  // ProfileManager no longer initializes profiles - they are loaded by the main page component

  const validateForm = (): boolean => {
    const errors: Partial<AddProfileFormData> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    const age = parseInt(formData.age);
    if (!formData.age || isNaN(age)) {
      errors.age = 'Age is required';
    } else if (age < 18 || age > 100) {
      errors.age = 'Age must be between 18 and 100';
    }
    
    if (!formData.bio.trim()) {
      errors.bio = 'Bio is required';
    } else if (formData.bio.trim().length < 10) {
      errors.bio = 'Bio must be at least 10 characters';
    } else if (formData.bio.trim().length > 200) {
      errors.bio = 'Bio must be less than 200 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addProfile = async (newProfileData: Omit<Profile, 'id' | 'bodycount' | 'createdAt' | 'isVerified'>) => {
    setIsSubmitting(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const profile: Profile = {
      ...newProfileData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bodycount: {
        dated: 0,
        hookup: 0,
        transactional: 0,
        total: 0
      },
      evidence: {},
      createdAt: new Date().toISOString(),
      isVerified: false
    };
    
    const updatedProfiles = [...profiles, profile];
    setProfiles(updatedProfiles);
    onProfilesUpdate(updatedProfiles);
    setShowAddForm(false);
    setFormData({
      name: '',
      age: '',
      bio: '',
      image: '',
      instagram: '',
      tiktok: '',
      twitter: ''
    });
    setIsSubmitting(false);
  };

  const handleRating = (profileId: string, rating: 'dated' | 'hookup' | 'transactional') => {
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
    onProfilesUpdate(updatedProfiles);
  };

  const handleInputChange = (field: keyof AddProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const imageUrl = formData.image.trim() || 
      `https://images.unsplash.com/photo-${Math.random() > 0.5 ? '1472099645785-5658abf4ff4e' : '1494790108755-2616b612b786'}?w=400&h=600&fit=crop&crop=face`;
    
    await addProfile({
      name: formData.name.trim(),
      age: parseInt(formData.age),
      bio: formData.bio.trim(),
      images: [imageUrl],
      socialHandles: {
        instagram: formData.instagram.trim() || undefined,
        tiktok: formData.tiktok.trim() || undefined,
        twitter: formData.twitter.trim() || undefined
      },
      evidence: {} // Add missing evidence property
    });
  };

  const AddProfileForm = () => {
    const [hasAnimated, setHasAnimated] = useState(false);
    
    useEffect(() => {
      // Set animation flag after component mounts
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, 600); // Match animation duration
      
      return () => clearTimeout(timer);
    }, []);
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div 
          className={`bg-white/95 backdrop-blur-md rounded-3xl p-6 w-full max-w-md shadow-2xl border border-white/30 ${!hasAnimated ? 'bounce-in' : ''}`}
        >
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold gradient-text mb-2">Add New Profile</h3>
          <p className="text-gray-600 text-sm">Create a profile for someone you know</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Full Name *"
              className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 bg-white/80 backdrop-blur-sm ${
                formErrors.name 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-pink-400'
              } focus:outline-none focus:ring-2 focus:ring-pink-200`}
            />
            {formErrors.name && (
              <p className="text-red-500 text-xs mt-1 ml-2">{formErrors.name}</p>
            )}
          </div>
          
          {/* Age Field */}
          <div>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              placeholder="Age *"
              min="18"
              max="100"
              className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 bg-white/80 backdrop-blur-sm ${
                formErrors.age 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-pink-400'
              } focus:outline-none focus:ring-2 focus:ring-pink-200`}
            />
            {formErrors.age && (
              <p className="text-red-500 text-xs mt-1 ml-2">{formErrors.age}</p>
            )}
          </div>
          
          {/* Bio Field */}
          <div>
            <textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Bio - Tell us about them! *"
              rows={3}
              maxLength={200}
              className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 bg-white/80 backdrop-blur-sm resize-none ${
                formErrors.bio 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-pink-400'
              } focus:outline-none focus:ring-2 focus:ring-pink-200`}
            />
            <div className="flex justify-between items-center mt-1">
              {formErrors.bio && (
                <p className="text-red-500 text-xs ml-2">{formErrors.bio}</p>
              )}
              <p className="text-gray-400 text-xs ml-auto mr-2">
                {formData.bio.length}/200
              </p>
            </div>
          </div>
          
          {/* Image URL Field */}
          <div>
            <input
              value={formData.image}
              onChange={(e) => handleInputChange('image', e.target.value)}
              placeholder="Profile Image URL (optional)"
              className="w-full p-4 rounded-2xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-300 bg-white/80 backdrop-blur-sm"
            />
            <p className="text-gray-400 text-xs mt-1 ml-2">
              Leave empty for a random profile picture
            </p>
          </div>
          
          {/* Social Handles */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 ml-2">Social Media (optional)</p>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-pink-500">📷</span>
              <input
                value={formData.instagram}
                onChange={(e) => handleInputChange('instagram', e.target.value)}
                placeholder="Instagram handle"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-300 bg-white/80 backdrop-blur-sm"
              />
            </div>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black">🎵</span>
              <input
                value={formData.tiktok}
                onChange={(e) => handleInputChange('tiktok', e.target.value)}
                placeholder="TikTok handle"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-300 bg-white/80 backdrop-blur-sm"
              />
            </div>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500">🐦</span>
              <input
                value={formData.twitter}
                onChange={(e) => handleInputChange('twitter', e.target.value)}
                placeholder="Twitter handle"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-300 bg-white/80 backdrop-blur-sm"
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3 mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Adding...</span>
                </div>
              ) : (
                '✨ Add Profile'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setFormData({
                  name: '',
                  age: '',
                  bio: '',
                  image: '',
                  instagram: '',
                  tiktok: '',
                  twitter: ''
                });
                setFormErrors({});
              }}
              disabled={isSubmitting}
              className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none"
            >
              Cancel
            </button>
          </div>
        </form>
        </div>
      </div>
    );
  };

  return {
    profiles,
    addProfile,
    handleRating,
    showAddForm: () => setShowAddForm(true),
    addProfileForm: showAddForm ? <AddProfileForm /> : null
  };
};