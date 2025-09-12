// API Client for frontend-backend communication

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private walletAddress: string | null = null;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  }

  setWalletAddress(address: string) {
    this.walletAddress = address;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}/api${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };

      if (this.walletAddress) {
        headers['X-Wallet-Address'] = this.walletAddress;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Debug logging for profiles endpoint
      if (url.includes('/profiles')) {
        console.log('API Client: Response from /profiles:', JSON.stringify(data, null, 2));
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Authentication
  async connectWallet(walletAddress: string) {
    const response = await this.request('/auth/connect', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    });

    if (response.success) {
      this.setWalletAddress(walletAddress);
    }

    return response;
  }

  // Profiles
  async getProfiles(userId?: string, limit = 10, skip = 0) {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    params.append('limit', limit.toString());
    params.append('skip', skip.toString());

    return this.request(`/profiles?${params.toString()}`);
  }

  async searchProfileByName(name: string) {
    const params = new URLSearchParams();
    params.append('name', name);
    params.append('limit', '1');

    return this.request(`/profiles?${params.toString()}`);
  }

  async createProfile(profileData: {
    userId: string;
    name: string;
    age: number;
    bio?: string;
    images?: string[];
    socialHandles?: Record<string, string>;
    location?: string;
  }) {
    return this.request('/profiles', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async deleteProfile(profileId: string) {
    const params = new URLSearchParams();
    params.append('id', profileId);
    
    return this.request(`/profiles?${params.toString()}`, {
      method: 'DELETE',
    });
  }

  // Ratings
  async submitRating(ratingData: {
    raterId: string;
    profileId: string;
    ratingType: 'dated' | 'hookup' | 'transactional';
    isAnonymous?: boolean;
    evidence?: Array<{
      type: 'image' | 'video' | 'link' | 'text';
      url?: string;
      filename?: string;
      fileSize?: number;
      mimeType?: string;
      description?: string;
      textContent?: string;
      textTitle?: string;
    }>;
  }) {
    return this.request('/ratings', {
      method: 'POST',
      body: JSON.stringify(ratingData),
    });
  }

  async getRatings(profileId?: string, userId?: string, limit = 50) {
    const params = new URLSearchParams();
    if (profileId) params.append('profileId', profileId);
    if (userId) params.append('userId', userId);
    params.append('limit', limit.toString());

    return this.request(`/ratings?${params.toString()}`);
  }

  // Statistics
  async getStats(type: 'leaderboard' | 'profile' | 'overview', profileId?: string, limit = 10) {
    const params = new URLSearchParams();
    params.append('type', type);
    if (profileId) params.append('profileId', profileId);
    params.append('limit', limit.toString());

    return this.request(`/stats?${params.toString()}`);
  }

  async getLeaderboard(limit = 10) {
    return this.getStats('leaderboard', undefined, limit);
  }

  async getProfileStats(profileId: string) {
    return this.getStats('profile', profileId);
  }

  async getOverviewStats() {
    return this.getStats('overview');
  }

  // User Privacy Settings
  async getUserSettings(walletAddress: string) {
    const params = new URLSearchParams();
    params.append('walletAddress', walletAddress);
    return this.request(`/user/settings?${params.toString()}`);
  }

  async updateUserSettings(walletAddress: string, privacySettings: {
    anonymousRatings?: boolean;
    hideFromSearch?: boolean;
    privateProfile?: boolean;
    allowEvidenceUploads?: boolean;
    showRealName?: boolean;
    allowDirectMessages?: boolean;
    shareLocation?: boolean;
    publicBodycount?: boolean;
  }) {
    return this.request('/user/settings', {
      method: 'PUT',
      body: JSON.stringify({ walletAddress, privacySettings }),
    });
  }

  async updateUserSettingsPartial(walletAddress: string, privacySettings: Partial<{
    anonymousRatings: boolean;
    hideFromSearch: boolean;
    privateProfile: boolean;
    allowEvidenceUploads: boolean;
    showRealName: boolean;
    allowDirectMessages: boolean;
    shareLocation: boolean;
    publicBodycount: boolean;
  }>) {
    return this.request('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ walletAddress, privacySettings }),
    });
  }

  // Evidence/File Upload with Cloudinary integration
  async uploadEvidence(
    file: File, 
    metadata: {
      ratingId?: string;
      uploaderId: string;
      type: 'image' | 'video' | 'document';
      description?: string;
      folder?: 'evidence' | 'profiles';
    }
  ) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(metadata));

      const url = `${this.baseUrl}/api/upload`;
      const headers: Record<string, string> = {};

      if (this.walletAddress) {
        headers['X-Wallet-Address'] = this.walletAddress;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Upload failed with status ${response.status}`,
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('File upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  // Evidence methods
  async getEvidenceById(evidenceId: string) {
    return this.request(`/evidence?id=${evidenceId}`);
  }

  async getEvidenceByRatingId(ratingId: string, limit = 50) {
    const params = new URLSearchParams();
    params.append('ratingId', ratingId);
    params.append('limit', limit.toString());

    return this.request(`/evidence?${params.toString()}`);
  }

  async createEvidence(evidenceData: {
    ratingId: string;
    uploaderId: string;
    type: 'image' | 'video' | 'link' | 'text';
    url?: string;
    filename?: string;
    fileSize?: number;
    mimeType?: string;
    description?: string;
    textContent?: string;
    textTitle?: string;
  }) {
    return this.request('/evidence', {
      method: 'POST',
      body: JSON.stringify(evidenceData),
    });
  }

  async deleteEvidence(evidenceId: string, uploaderId?: string) {
    const params = new URLSearchParams();
    params.append('id', evidenceId);
    if (uploaderId) params.append('uploaderId', uploaderId);

    return this.request(`/evidence?${params.toString()}`, {
      method: 'DELETE',
    });
  }

  // Evidence Verification
  async verifyEvidence(evidenceId: string, adminId: string, isVerified: boolean, adminNotes?: string) {
    return this.request('/evidence/verify', {
      method: 'POST',
      body: JSON.stringify({
        evidenceId,
        adminId,
        isVerified,
        adminNotes,
      }),
    });
  }

  async autoVerifyEvidence(evidenceId: string) {
    return this.request(`/evidence/verify?evidenceId=${evidenceId}`, {
      method: 'GET',
    });
  }

  async bulkVerifyEvidence(evidenceIds: string[], adminId: string, isVerified: boolean, adminNotes?: string) {
    return this.request('/evidence/verify', {
      method: 'PUT',
      body: JSON.stringify({
        evidenceIds,
        adminId,
        isVerified,
        adminNotes,
      }),
    });
  }

  // Evidence Moderation
  async getEvidenceForModeration(status: 'pending' | 'flagged' | 'all' = 'pending', adminId: string, page = 1, limit = 20) {
    const params = new URLSearchParams();
    params.append('status', status);
    params.append('adminId', adminId);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return this.request(`/evidence/moderate?${params.toString()}`, {
      method: 'GET',
    });
  }

  async moderateEvidence(evidenceId: string, adminId: string, action: 'approve' | 'reject' | 'flag' | 'unflag', reason: string, notes?: string) {
    return this.request('/evidence/moderate', {
      method: 'POST',
      body: JSON.stringify({
        evidenceId,
        adminId,
        action,
        reason,
        notes,
      }),
    });
  }

  async bulkModerateEvidence(evidenceIds: string[], adminId: string, action: 'approve' | 'reject' | 'flag' | 'unflag', reason: string, notes?: string) {
    return this.request('/evidence/moderate', {
      method: 'PUT',
      body: JSON.stringify({
        evidenceIds,
        adminId,
        action,
        reason,
        notes,
      }),
    });
  }

  // Evidence search methods
  async searchEvidence(params: {
    q?: string;
    type?: 'image' | 'video' | 'link' | 'text';
    status?: 'verified' | 'pending' | 'flagged' | 'rejected';
    uploaderId?: string;
    ratingId?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/evidence/search?${searchParams.toString()}`);
  }

  async bulkSearchEvidence(searchRequest: {
    filters?: {
      searchQuery?: string;
      types?: ('image' | 'video' | 'link' | 'text')[];
      statuses?: ('verified' | 'pending' | 'flagged' | 'rejected')[];
      uploaderIds?: string[];
      ratingIds?: string[];
      dateRange?: {
        from?: string;
        to?: string;
      };
      fileSizeRange?: {
        min?: number;
        max?: number;
      };
    };
    sort?: {
      field: 'createdAt' | 'fileSize' | 'isVerified';
      direction: 'asc' | 'desc';
    };
    pagination?: {
      page: number;
      limit: number;
    };
  }) {
    return this.request('/evidence/search', {
      method: 'POST',
      body: JSON.stringify(searchRequest),
    });
  }

  // Evidence analytics methods
  async getEvidenceAnalytics(params?: {
    dateFrom?: string;
    dateTo?: string;
    uploaderId?: string;
    ratingId?: string;
  }) {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request(`/evidence/analytics?${searchParams.toString()}`);
  }

  async trackEvidenceEvent(eventData: {
    eventType: 'view' | 'download' | 'share' | 'flag' | 'verify' | 'reject';
    evidenceId: string;
    userId?: string;
    metadata?: Record<string, any>;
  }) {
    return this.request('/evidence/analytics', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  // Evidence backup methods
  async getBackupStatus(params?: {
    evidenceId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request(`/evidence/backup?${searchParams.toString()}`);
  }

  async createBackup(backupData: {
    evidenceIds?: string[];
    backupAll?: boolean;
    priority?: 'low' | 'normal' | 'high';
    retentionDays?: number;
  }) {
    return this.request('/evidence/backup', {
      method: 'POST',
      body: JSON.stringify(backupData),
    });
  }

  async updateBackupStatus(updateData: {
    evidenceId: string;
    backupLocationIndex: number;
    status?: string;
    url?: string;
    lastVerified?: string;
  }) {
    return this.request('/evidence/backup', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteBackup(evidenceId: string, deleteFiles = false) {
    const searchParams = new URLSearchParams({
      evidenceId,
      deleteFiles: deleteFiles.toString()
    });

    return this.request(`/evidence/backup?${searchParams.toString()}`, {
      method: 'DELETE',
    });
  }

  // Evidence recovery methods
  async getRecoveryStatus(params?: {
    evidenceId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request(`/evidence/recovery?${searchParams.toString()}`);
  }

  async initiateRecovery(recoveryData: {
    evidenceId?: string;
    evidenceIds?: string[];
    backupSource?: 'aws-s3' | 'google-cloud' | 'azure-blob' | 'local';
    restoreToOriginal?: boolean;
    newUrl?: string;
    verifyIntegrity?: boolean;
  }) {
    return this.request('/evidence/recovery', {
      method: 'POST',
      body: JSON.stringify(recoveryData),
    });
  }

  async updateRecoveryStatus(updateData: {
    recoveryId: string;
    status?: string;
    progress?: number;
    error?: string;
    newUrl?: string;
  }) {
    return this.request('/evidence/recovery', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async cancelRecovery(recoveryId: string) {
    const searchParams = new URLSearchParams({ recoveryId });

    return this.request(`/evidence/recovery?${searchParams.toString()}`, {
      method: 'DELETE',
    });
  }

  async getModerationHistory(evidenceId?: string, adminId?: string, page = 1, limit = 20) {
    const params = new URLSearchParams();
    if (evidenceId) params.append('evidenceId', evidenceId);
    if (adminId) params.append('adminId', adminId);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return this.request(`/evidence/moderate?${params.toString()}`, {
      method: 'DELETE', // Using DELETE to get history (unconventional but follows the API design)
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types for use in components
export type { ApiResponse };

// Utility hooks for React components
export const useApiClient = () => {
  return apiClient;
};

// Error handling utility
export const handleApiError = (response: ApiResponse, defaultMessage = 'An error occurred') => {
  if (!response.success) {
    console.error('API Error:', response.error);
    return response.error || defaultMessage;
  }
  return null;
};