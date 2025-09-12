// User model for wallet-connected users
export interface User {
  _id?: string;
  walletAddress: string;
  createdAt: Date;
  updatedAt: Date;
  privacySettings: {
    anonymousRatings: boolean;
    hideFromSearch: boolean;
    privateProfile: boolean;
    allowEvidenceUploads: boolean;
    showRealName: boolean;
    allowDirectMessages: boolean;
    shareLocation: boolean;
    publicBodycount: boolean;
  };
  isActive: boolean;
}

// Profile model for user profiles that can be rated
export interface Profile {
  _id?: string;
  userId: string; // Reference to User
  name: string;
  age: number;
  bio: string;
  images: string[];
  socialHandles: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    snapchat?: string;
  };
  location?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Rating model for relationship ratings
export interface Rating {
  _id?: string;
  raterId: string; // User who gave the rating
  profileId: string; // Profile being rated
  ratingType: 'dated' | 'hookup' | 'transactional';
  isAnonymous: boolean;
  createdAt: Date;
  evidenceIds: string[]; // References to Evidence documents
}

// Evidence model for uploaded evidence
export interface Evidence {
  _id?: string;
  ratingId: string; // Reference to Rating
  uploaderId: string; // User who uploaded
  type: 'image' | 'video' | 'link' | 'text';
  url?: string; // Optional for text evidence
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  // Text evidence fields
  textContent?: string;
  textTitle?: string;
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string; // Admin wallet address or 'system'
  adminNotes?: string;
  isFlagged?: boolean;
  flaggedAt?: Date;
  flaggedBy?: string;
  flagReason?: string;
  isRejected?: boolean;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  unflaggedAt?: Date;
  unflaggedBy?: string;
  lastModeratedBy?: string;
  lastModeratedAt?: Date;
  moderationFlags?: string[];
  moderationConfidence?: number;
  
  // Analytics fields
  viewCount?: number;
  lastViewedAt?: Date;
  downloadCount?: number;
  shareCount?: number;
  
  createdAt: Date;
  updatedAt?: Date;
}

// Bodycount statistics (computed/cached data)
export interface BodycountStats {
  _id?: string;
  profileId: string;
  totalRatings: number;
  datedCount: number;
  hookupCount: number;
  transactionalCount: number;
  averageRating: number;
  lastUpdated: Date;
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  PROFILES: 'profiles',
  RATINGS: 'ratings',
  EVIDENCE: 'evidence',
  BODYCOUNT_STATS: 'bodycount_stats'
} as const;

// Database indexes for performance
export const DATABASE_INDEXES = {
  users: [
    { walletAddress: 1 }, // Unique index
    { createdAt: -1 }
  ],
  profiles: [
    { userId: 1 },
    { isActive: 1, createdAt: -1 },
    { location: 1 }
  ],
  ratings: [
    { profileId: 1, createdAt: -1 },
    { raterId: 1, createdAt: -1 },
    { ratingType: 1 }
  ],
  evidence: [
    { ratingId: 1 },
    { uploaderId: 1 },
    { isVerified: 1 },
    { isFlagged: 1 },
    { isRejected: 1 },
    { createdAt: -1 },
    { verifiedAt: -1 },
    { lastModeratedAt: -1 }
  ],
  bodycount_stats: [
    { profileId: 1 }, // Unique index
    { totalRatings: -1 }
  ]
};