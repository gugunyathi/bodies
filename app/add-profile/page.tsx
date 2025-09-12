'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '../../lib/api-client';
import { searchProfilesByName, namesMatch } from '../../lib/name-utils';

type Profile = {
  id: string;
  name: string;
  age: number;
  bio: string;
  location?: string;
  images: string[];
  socialHandles: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  bodycount: {
    dated: number;
    hookup: number;
    transactional: number;
    total: number;
  };
};

function AddProfileForm() {
  const searchParams = useSearchParams();
  const prefilledName = searchParams.get('name') || '';
  
  const [formData, setFormData] = useState({
    name: prefilledName,
    age: '',
    bio: '',
    location: '',
    socialHandles: {
      instagram: '',
      twitter: '',
      tiktok: ''
    }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState(prefilledName);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load all profiles when component mounts
  useEffect(() => {
    const loadAllProfiles = async () => {
      try {
        const response = await apiClient.getProfiles(undefined, 50, 0);
        if (response.success && (response as any).profiles) {
          const profiles = (response as any).profiles as Profile[];
          setAllProfiles(profiles);
        }
      } catch (error) {
        console.error('Error loading all profiles:', error);
      }
    };
    
    loadAllProfiles();
  }, []);

  // Search for existing profiles when component mounts or when name changes
  useEffect(() => {
    if (prefilledName) {
      searchExistingProfiles(prefilledName);
    }
  }, [prefilledName]);

  // Filter profiles for dropdown based on search query
  useEffect(() => {
    if (searchQuery.trim() && allProfiles.length > 0) {
      const filtered = searchProfilesByName(allProfiles, searchQuery);
      setFilteredProfiles(filtered.slice(0, 10)); // Limit to 10 results
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredProfiles([]);
      setShowDropdown(false);
    }
  }, [searchQuery, allProfiles]);

  const searchExistingProfiles = async (query: string) => {
    console.log('🔍 Starting search for:', query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // First try API search with fuzzy matching
      console.log('📡 Calling API search for:', query);
      const apiResponse = await apiClient.searchProfileByName(query);
      console.log('📡 API Response:', apiResponse);
      let matchedProfiles: Profile[] = [];
      
      if (apiResponse.success && (apiResponse as any).profiles) {
        matchedProfiles = (apiResponse as any).profiles as Profile[];
        console.log('✅ Found profiles via API:', matchedProfiles.map(p => p.name));
      }
      
      // If API didn't find matches, fall back to client-side fuzzy search
      if (matchedProfiles.length === 0) {
        console.log('🔄 No API matches, trying client-side fuzzy search');
        const response = await apiClient.getProfiles(undefined, 50, 0); // Get more profiles for better matching
        if (response.success && (response as any).profiles) {
          const profiles = (response as any).profiles as Profile[];
          console.log('📋 All profiles for fuzzy search:', profiles.map(p => p.name));
          matchedProfiles = searchProfilesByName(profiles, query);
          console.log('🎯 Fuzzy search results:', matchedProfiles.map(p => p.name));
        }
      }
      
      // Limit results to top 5 matches
      const limitedResults = matchedProfiles.slice(0, 5);
      setSearchResults(limitedResults);
      setShowMergeOptions(limitedResults.length > 0);
      
      console.log('🏁 Final search results for "' + query + '":', limitedResults.map(p => p.name));
    } catch (err) {
      console.error('❌ Error searching profiles:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    setFormData(prev => ({ ...prev, name: value }));
    
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchExistingProfiles(value);
    }, 300);
  };

  const handleDropdownSelect = (profile: Profile) => {
    setSearchQuery(profile.name);
    setFormData(prev => ({ ...prev, name: profile.name }));
    setShowDropdown(false);
    // Navigate to the selected profile for merging
    window.location.href = `/profile/${profile.id}`;
  };

  const handleDropdownClose = () => {
    setShowDropdown(false);
  };

  const handleMergeWithProfile = (profile: Profile) => {
    // Navigate to the existing profile instead of creating a new one
    window.location.href = `/profile/${profile.id}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      handleSearchQueryChange(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSocialHandleChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialHandles: {
        ...prev.socialHandles,
        [platform]: value
      }
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isValidType) {
        setError(`${file.name} is not a valid image file`);
        return false;
      }
      if (!isValidSize) {
        setError(`${file.name} is too large. Maximum size is 10MB`);
        return false;
      }
      return true;
    });
    
    // Limit to 5 images maximum
    const limitedFiles = validFiles.slice(0, 5);
    if (validFiles.length > 5) {
      setError('Maximum 5 images allowed');
    }
    
    setSelectedImages(limitedFiles);
    
    // Create preview URLs
    const previewUrls = limitedFiles.map(file => URL.createObjectURL(file));
    
    // Clean up old preview URLs
    imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setImagePreviewUrls(previewUrls);
    
    // Clear any previous errors if files are valid
    if (limitedFiles.length > 0) {
      setError(null);
    }
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviewUrls = imagePreviewUrls.filter((_, i) => i !== index);
    
    // Clean up the removed preview URL
    URL.revokeObjectURL(imagePreviewUrls[index]);
    
    setSelectedImages(newImages);
    setImagePreviewUrls(newPreviewUrls);
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];
    
    setIsUploadingImages(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const image of selectedImages) {
        const response = await apiClient.uploadEvidence(image, {
          uploaderId: 'profile-creator',
          type: 'image',
          folder: 'profiles',
          description: `Profile image for ${formData.name}`
        });
        
        if (response.success && response.data?.url) {
          uploadedUrls.push(response.data.url);
        } else {
          throw new Error(`Failed to upload image: ${response.error}`);
        }
      }
    } finally {
      setIsUploadingImages(false);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.age) {
      setError('Name and age are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload images first if any are selected
      const imageUrls = await uploadImages();
      
      // Create a system user ID for this profile
      const userId = `system-${Date.now()}-${formData.name.toLowerCase().replace(/\s+/g, '-')}`;
      
      const profileData = {
        userId,
        name: formData.name,
        age: parseInt(formData.age),
        bio: formData.bio,
        location: formData.location,
        socialHandles: Object.fromEntries(
          Object.entries(formData.socialHandles).filter(([_, value]) => value.trim() !== '')
        ),
        images: imageUrls
      };

      const response = await apiClient.createProfile(profileData);
      
      if (response.success) {
        setSuccess(true);
        // Redirect to the new profile after a short delay
        setTimeout(() => {
          const profileResponse = response as { success: boolean; profile: { id: string } };
          window.location.href = `/profile/${profileResponse.profile.id}`;
        }, 2000);
      } else {
        setError('Failed to create profile. Please try again.');
      }
    } catch (err) {
      console.error('Error creating profile:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while creating the profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Profile Created Successfully!</h1>
          <p className="text-gray-600 mb-6">Redirecting to the new profile...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
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
          <h1 className="text-2xl font-bold text-gray-800">Add Profile</h1>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6">
            {prefilledName && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Adding profile for:</strong> {prefilledName}
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  We'll search for existing profiles to avoid duplicates.
                </p>
              </div>
            )}

            {/* Search Results for Merging */}
            {showMergeOptions && searchResults.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <div className="text-yellow-800 text-sm font-medium">
                    🔍 Found {searchResults.length} existing profile{searchResults.length > 1 ? 's' : ''} with similar name{searchResults.length > 1 ? 's' : ''}
                  </div>
                </div>
                <p className="text-yellow-700 text-xs mb-3">
                  Consider merging with an existing profile instead of creating a duplicate:
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                          {profile.images && profile.images.length > 0 ? (
                            <img 
                              src={profile.images[0]} 
                              alt={profile.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-bold text-sm">
                              {profile.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{profile.name}</div>
                          <div className="text-xs text-gray-600">
                            Age {profile.age} • Score: {profile.bodycount?.total || 0}
                          </div>
                          {profile.location && (
                            <div className="text-xs text-gray-500">{profile.location}</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleMergeWithProfile(profile)}
                        className="px-3 py-1 bg-yellow-500 text-white text-xs rounded-lg hover:bg-yellow-600 transition-colors"
                      >
                        View Profile
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <p className="text-yellow-700 text-xs">
                    💡 <strong>Tip:</strong> If none of these match, continue creating a new profile below.
                  </p>
                </div>
              </div>
            )}

            {isSearching && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500"></div>
                  <span className="text-gray-600 text-sm">Searching for existing profiles...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name with Search */}
              <div className="relative">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name * {isSearching && <span className="text-xs text-gray-500">(searching...)</span>}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onFocus={() => searchQuery && setShowDropdown(filteredProfiles.length > 0)}
                  onBlur={() => setTimeout(handleDropdownClose, 200)} // Delay to allow click on dropdown items
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="Enter full name (we'll search for existing profiles)"
                />
                
                {/* Dropdown for profile matches */}
                {showDropdown && filteredProfiles.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 bg-gray-50 border-b border-gray-200">
                      <p className="text-xs text-gray-600 font-medium">
                        📋 Found {filteredProfiles.length} matching profile{filteredProfiles.length > 1 ? 's' : ''} - Click to merge:
                      </p>
                    </div>
                    {filteredProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        onClick={() => handleDropdownSelect(profile)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                      >
                        <div className="flex-shrink-0">
                          {profile.images && profile.images.length > 0 ? (
                            <img
                              src={profile.images[0]}
                              alt={profile.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 text-xs font-medium">
                                {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{profile.name}</p>
                          <p className="text-xs text-gray-500">
                            Age {profile.age} • {profile.location || 'Location not specified'}
                          </p>
                          {profile.bio && (
                            <p className="text-xs text-gray-400 truncate mt-1">{profile.bio}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <span className="text-xs text-pink-600 font-medium">Merge →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchResults.length === 0 && searchQuery && !isSearching && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ No existing profiles found with this name. Safe to create new profile.
                  </p>
                )}
              </div>

              {/* Age */}
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  required
                  min="18"
                  max="100"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="Enter age"
                />
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none"
                  placeholder="Tell us about this person..."
                />
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="City, State/Country"
                />
              </div>

              {/* Profile Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Profile Images {selectedImages.length > 0 && <span className="text-xs text-gray-500">({selectedImages.length}/5)</span>}
                </label>
                
                {/* Image Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pink-400 transition-colors">
                  <input
                    type="file"
                    id="images"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <label htmlFor="images" className="cursor-pointer">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium text-pink-600">Click to upload images</span> or drag and drop
                      </div>
                      <div className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 10MB each (max 5 images)
                      </div>
                    </div>
                  </label>
                </div>
                
                {/* Image Previews */}
                {imagePreviewUrls.length > 0 && (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 First image will be used as the main profile picture
                    </p>
                  </div>
                )}
              </div>

              {/* Social Handles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Social Media Handles
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-20 text-sm text-gray-600">Instagram:</div>
                    <input
                      type="text"
                      value={formData.socialHandles.instagram}
                      onChange={(e) => handleSocialHandleChange('instagram', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                      placeholder="username"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-20 text-sm text-gray-600">Twitter:</div>
                    <input
                      type="text"
                      value={formData.socialHandles.twitter}
                      onChange={(e) => handleSocialHandleChange('twitter', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                      placeholder="username"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-20 text-sm text-gray-600">TikTok:</div>
                    <input
                      type="text"
                      value={formData.socialHandles.tiktok}
                      onChange={(e) => handleSocialHandleChange('tiktok', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                {showMergeOptions && searchResults.length > 0 && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-orange-800 text-sm font-medium mb-1">
                      ⚠️ Similar profiles found above
                    </p>
                    <p className="text-orange-700 text-xs">
                      Please check if any of the existing profiles match before creating a new one to avoid duplicates.
                    </p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImages}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting || isUploadingImages ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>
                        {isUploadingImages ? 'Uploading Images...' : 'Creating Profile...'}
                      </span>
                    </div>
                  ) : (
                    showMergeOptions && searchResults.length > 0 
                      ? 'Create New Profile Anyway' 
                      : 'Create Profile'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                * Required fields. This profile will be publicly visible.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-lg">Loading...</div></div>}>
      <AddProfileForm />
    </Suspense>
  );
}