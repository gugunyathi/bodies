import { apiClient } from './api-client';

export interface ProfileNavigationResult {
  type: 'profile' | 'add-profile';
  profileId?: string;
  profileName: string;
}

export async function handleProfileClick(relationshipName: string): Promise<ProfileNavigationResult> {
  try {
    // Search for existing profile by name
    const response = await apiClient.searchProfileByName(relationshipName);
    
    if (response.success && (response as any).profiles && (response as any).profiles.length > 0) {
      // Profile exists, navigate to profile view
      return {
        type: 'profile',
        profileId: (response as any).profiles[0].id,
        profileName: relationshipName
      };
    } else {
      // Profile doesn't exist, navigate to add profile
      return {
        type: 'add-profile',
        profileName: relationshipName
      };
    }
  } catch (error) {
    console.error('Error searching for profile:', error);
    // On error, default to add profile
    return {
      type: 'add-profile',
      profileName: relationshipName
    };
  }
}

export function navigateToProfile(profileId: string) {
  // Navigate to profile view page
  window.location.href = `/profile/${profileId}`;
}

export function navigateToAddProfile(profileName?: string) {
  // Navigate to add profile page with pre-filled name
  const params = profileName ? `?name=${encodeURIComponent(profileName)}` : '';
  window.location.href = `/add-profile${params}`;
}