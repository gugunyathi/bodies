// Data persistence service for migrating from local state to database
import { apiClient, ApiResponse } from './api-client';
import { Profile, Rating, Evidence } from './models';

// Simple ID generator for client-side compatibility
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

interface LocalStorageData {
  profiles: Profile[];
  ratings: Record<string, Rating[]>;
  userSettings: Record<string, unknown>;
  privacySettings: Record<string, unknown>;
}

class DataPersistenceService {
  private readonly STORAGE_KEYS = {
    PROFILES: 'bodies_profiles',
    RATINGS: 'bodies_ratings',
    USER_SETTINGS: 'bodies_user_settings',
    PRIVACY_SETTINGS: 'bodies_privacy_settings',
    MIGRATION_STATUS: 'bodies_migration_status',
    WALLET_ADDRESS: 'bodies_wallet_address'
  };

  private isClient = typeof window !== 'undefined';

  // Local Storage Operations
  private getFromStorage<T>(key: string, defaultValue: T): T {
    if (!this.isClient) return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return defaultValue;
    }
  }

  private setToStorage<T>(key: string, value: T): void {
    if (!this.isClient) return;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
    }
  }

  private removeFromStorage(key: string): void {
    if (!this.isClient) return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
    }
  }

  // Migration Status
  getMigrationStatus(): { completed: boolean; lastMigration?: string } {
    return this.getFromStorage(this.STORAGE_KEYS.MIGRATION_STATUS, { completed: false });
  }

  setMigrationStatus(completed: boolean): void {
    this.setToStorage(this.STORAGE_KEYS.MIGRATION_STATUS, {
      completed,
      lastMigration: new Date().toISOString()
    });
  }

  // Wallet Address Management
  getStoredWalletAddress(): string | null {
    return this.getFromStorage(this.STORAGE_KEYS.WALLET_ADDRESS, null);
  }

  setStoredWalletAddress(address: string): void {
    this.setToStorage(this.STORAGE_KEYS.WALLET_ADDRESS, address);
    apiClient.setWalletAddress(address);
  }

  clearStoredWalletAddress(): void {
    this.removeFromStorage(this.STORAGE_KEYS.WALLET_ADDRESS);
  }

  // Local Data Retrieval
  getLocalProfiles(): Profile[] {
    return this.getFromStorage(this.STORAGE_KEYS.PROFILES, []);
  }

  getLocalRatings(): Record<string, Rating[]> {
    return this.getFromStorage(this.STORAGE_KEYS.RATINGS, {});
  }

  getLocalUserSettings(): Record<string, unknown> {
    return this.getFromStorage(this.STORAGE_KEYS.USER_SETTINGS, {});
  }

  getLocalPrivacySettings(): Record<string, unknown> {
    return this.getFromStorage(this.STORAGE_KEYS.PRIVACY_SETTINGS, {
      anonymousRatings: false,
      profileVisibility: true,
      allowCommunication: true,
      showBodycount: true
    });
  }

  // Data Migration
  async migrateLocalDataToDatabase(walletAddress: string): Promise<ApiResponse> {
    try {
      // Connect wallet first
      const connectResponse = await apiClient.connectWallet(walletAddress);
      if (!connectResponse.success) {
        return connectResponse;
      }

      const userId = (connectResponse.data as { user?: { _id?: string } })?.user?._id;
      if (!userId) {
        return { success: false, error: 'Failed to get user ID after connection' };
      }

      // Migrate profiles
      const localProfiles = this.getLocalProfiles();
      const profileMigrationResults = [];

      for (const profile of localProfiles) {
        const profileData = {
          userId,
          name: profile.name,
          age: profile.age,
          bio: profile.bio,
          images: profile.images,
          socialHandles: profile.socialHandles,
          location: profile.location
        };

        const result = await apiClient.createProfile(profileData);
        profileMigrationResults.push(result);
      }

      // Migrate ratings
      const localRatings = this.getLocalRatings();
      const ratingMigrationResults = [];

      for (const [profileId, ratings] of Object.entries(localRatings)) {
        for (const rating of ratings) {
          const ratingData = {
            raterId: userId,
            profileId: profileId,
            ratingType: rating.ratingType,
            isAnonymous: rating.isAnonymous || false,
            evidence: (rating as Rating & { evidence?: Evidence[] }).evidence || []
          };

          const result = await apiClient.submitRating(ratingData);
          ratingMigrationResults.push(result);
        }
      }

      // Mark migration as completed
      this.setMigrationStatus(true);
      this.setStoredWalletAddress(walletAddress);

      return {
        success: true,
        data: {
          profilesMigrated: profileMigrationResults.filter(r => r.success).length,
          ratingsMigrated: ratingMigrationResults.filter(r => r.success).length,
          totalProfiles: localProfiles.length,
          totalRatings: Object.values(localRatings).flat().length
        }
      };
    } catch (error) {
      console.error('Migration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed'
      };
    }
  }

  // Hybrid Data Access (local + remote)
  async getProfiles(forceRemote = false): Promise<Profile[]> {
    console.log('🔥 CLIENT: DataPersistence.getProfiles() method called');
    
    // Always try to fetch from remote first to get all system profiles
    console.log('🔥 CLIENT: Fetching profiles from API...');
    try {
      const response = await apiClient.getProfiles(undefined, 50, 0); // Fetch up to 50 profiles
      console.log('🔥 CLIENT: API response received:', response);
       console.log('🔥 CLIENT: Response type:', typeof response);
       console.log('🔥 CLIENT: Response keys:', Object.keys(response));
       console.log('🔥 CLIENT: Response.success:', response.success);
       console.log('🔥 CLIENT: Response.data:', response.data);
      
      if (response.success && response.data) {
        console.log('🔥 CLIENT: Processing response data...');
        const apiData = response.data as any;
        console.log('🔥 CLIENT: API data:', apiData);
        console.log('🔥 CLIENT: API data type:', typeof apiData);
        console.log('🔥 CLIENT: API data keys:', Object.keys(apiData || {}));
        
        // The API client wraps the response: { success: true, data: { success: true, profiles: [...] } }
        // So apiData is the inner response object that contains profiles directly
        if (apiData && apiData.profiles && Array.isArray(apiData.profiles)) {
          const remoteProfiles = apiData.profiles;
          console.log('🔥 CLIENT: Found remote profiles:', remoteProfiles.length, remoteProfiles.map((p: any) => p.name));
          return remoteProfiles;
        } else {
          console.log('🔥 CLIENT: API data structure invalid:');
          console.log('🔥 CLIENT: - apiData exists:', !!apiData);
          console.log('🔥 CLIENT: - apiData.profiles exists:', !!(apiData && apiData.profiles));
          console.log('🔥 CLIENT: - apiData.profiles is array:', !!(apiData && apiData.profiles && Array.isArray(apiData.profiles)));
          console.log('🔥 CLIENT: - Full API data:', JSON.stringify(apiData, null, 2));
          
          // Fallback: try to access profiles directly from response.data if it's the profiles array
          if (Array.isArray(apiData)) {
            console.log('🔥 CLIENT: API data is array, using directly as profiles');
            return apiData;
          }
        }
      } else {
        console.log('🔥 CLIENT: Response not successful or no data:', { success: response.success, hasData: !!response.data });
      }
    } catch (apiError) {
      console.error('🔥 CLIENT: API call failed:', apiError);
    }

    // Fallback to local data if remote fetch fails
    console.log('🔥 CLIENT: Remote fetch failed, falling back to local profiles');
    return this.getLocalProfiles();
  }

  async getRatings(profileId?: string, forceRemote = false): Promise<Rating[]> {
    const migrationStatus = this.getMigrationStatus();
    const walletAddress = this.getStoredWalletAddress();

    if (!migrationStatus.completed || !walletAddress || !forceRemote) {
      // Return local data
      const localRatings = this.getLocalRatings();
      if (profileId) {
        return localRatings[profileId] || [];
      }
      return Object.values(localRatings).flat();
    }

    // Fetch from remote
    const response = await apiClient.getRatings(profileId);
    if (response.success && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }

    // Fallback to local data
    const localRatings = this.getLocalRatings();
    if (profileId) {
      return localRatings[profileId] || [];
    }
    return Object.values(localRatings).flat();
  }

  // Save data (local or remote based on migration status)
  async saveProfile(profile: Omit<Profile, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse> {
    const migrationStatus = this.getMigrationStatus();
    const walletAddress = this.getStoredWalletAddress();

    if (migrationStatus.completed && walletAddress) {
      // Save to remote
      const { userId, ...profileData } = profile;
      return await apiClient.createProfile({
        userId: userId?.toString() || '', // Convert ObjectId to string
        ...profileData
      });
    }

    // Save to local storage
    const localProfiles = this.getLocalProfiles();
    const newProfile: Profile = {
      ...profile,
      _id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isVerified: false
    };
    
    localProfiles.push(newProfile);
    this.setToStorage(this.STORAGE_KEYS.PROFILES, localProfiles);

    return { success: true, data: { profile: newProfile } };
  }

  async saveRating(rating: {
    profileId: string;
    type: 'dated' | 'hookup' | 'transactional';
    isAnonymous?: boolean;
    evidence?: Evidence[];
  }): Promise<ApiResponse> {
    const migrationStatus = this.getMigrationStatus();
    const walletAddress = this.getStoredWalletAddress();

    if (migrationStatus.completed && walletAddress) {
      // Save to remote
      return await apiClient.submitRating({
        raterId: '', // Will be set by API based on wallet address
        ...rating,
        ratingType: rating.type
      });
    }

    // Save to local storage
    const localRatings = this.getLocalRatings();
    const newRating: Rating = {
      _id: generateId(),
      raterId: generateId(), // Should be actual user ObjectId
      profileId: rating.profileId,
      ratingType: rating.type,
      isAnonymous: rating.isAnonymous || false,
      createdAt: new Date(),
      evidenceIds: (rating.evidence || []).map(() => generateId())
    };

    if (!localRatings[rating.profileId]) {
      localRatings[rating.profileId] = [];
    }
    localRatings[rating.profileId].push(newRating);
    this.setToStorage(this.STORAGE_KEYS.RATINGS, localRatings);

    return { success: true, data: { rating: newRating } };
  }

  // Clear local data after successful migration
  clearLocalData(): void {
    this.removeFromStorage(this.STORAGE_KEYS.PROFILES);
    this.removeFromStorage(this.STORAGE_KEYS.RATINGS);
    this.removeFromStorage(this.STORAGE_KEYS.USER_SETTINGS);
  }

  // Privacy settings (always local for now)
  getPrivacySettings(): Record<string, unknown> {
    return this.getLocalPrivacySettings();
  }

  setPrivacySettings(settings: Record<string, unknown>): void {
    this.setToStorage(this.STORAGE_KEYS.PRIVACY_SETTINGS, settings);
  }
}

// Export singleton instance
export const dataPersistence = new DataPersistenceService();

// Export types
export type { LocalStorageData };