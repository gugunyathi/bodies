# Bodies App - Step-by-Step Build Guide

This comprehensive guide walks you through building the Bodies app from scratch, covering all aspects from initial setup to deployment.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Database Architecture](#database-architecture)
4. [API Development](#api-development)
5. [Frontend Components](#frontend-components)
6. [Main Application Logic](#main-application-logic)
7. [Styling and UX](#styling-and-ux)
8. [Data Management](#data-management)
9. [Testing and Quality Assurance](#testing-and-quality-assurance)
10. [Security Implementation](#security-implementation)
11. [Deployment](#deployment)
12. [Maintenance and Monitoring](#maintenance-and-monitoring)

## Prerequisites

### Required Software
- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **MongoDB** (local or cloud instance)
- **Git** for version control
- **VS Code** or preferred IDE

### Required Accounts
- **Vercel** account for deployment
- **MongoDB Atlas** account (for cloud database)
- **Cloudinary** account (for image storage)
- **WorldCoin** developer account (for authentication)

### Development Environment
```bash
# Check Node.js version
node --version  # Should be v18+

# Check npm version
npm --version

# Install global dependencies
npm install -g typescript
npm install -g @vercel/cli
```

## Project Setup

### Step 1: Initialize Next.js Project
```bash
# Create new Next.js project with TypeScript
npx create-next-app@latest bodies --typescript --tailwind --eslint --app
cd bodies

# Install additional dependencies
npm install mongoose mongodb
npm install @types/node
npm install cloudinary
npm install @worldcoin/minikit-js
npm install @coinbase/onchainkit
```

### Step 2: Project Structure Setup
```bash
# Create essential directories
mkdir lib
mkdir lib/models
mkdir app/api
mkdir app/components
mkdir hooks
mkdir public/images
mkdir scripts
```

### Step 3: Environment Configuration
Create `.env.local` file:
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bodies

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# WorldCoin
WORLDCOIN_APP_ID=your_app_id
WORLDCOIN_ACTION=your_action_id

# Next.js
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
```

## Database Architecture

### Step 4: MongoDB Connection
Create `lib/mongodb.ts`:
```typescript
import { MongoClient, Db } from 'mongodb';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
```

### Step 5: Data Models
Create `lib/models.ts`:
```typescript
import mongoose, { Schema, Document } from 'mongoose';

// Profile Interface
export interface IProfile extends Document {
  name: string;
  images: string[];
  bodycount: number;
  fameLevel: 'A-list' | 'B-list' | 'C-list' | 'Rising' | 'Influencer';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Rating Interface
export interface IRating extends Document {
  profileId: mongoose.Types.ObjectId;
  userId?: string;
  type: 'dated' | 'hookup' | 'transactional';
  evidence?: IEvidence[];
  createdAt: Date;
}

// Evidence Interface
export interface IEvidence extends Document {
  type: 'image' | 'document' | 'link';
  url: string;
  description?: string;
  uploadedBy: string;
  createdAt: Date;
}

// Schemas
const ProfileSchema = new Schema<IProfile>({
  name: { type: String, required: true, unique: true },
  images: [{ type: String }],
  bodycount: { type: Number, default: 0 },
  fameLevel: { 
    type: String, 
    enum: ['A-list', 'B-list', 'C-list', 'Rising', 'Influencer'],
    default: 'C-list'
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const RatingSchema = new Schema<IRating>({
  profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
  userId: { type: String },
  type: { 
    type: String, 
    enum: ['dated', 'hookup', 'transactional'],
    required: true 
  },
  evidence: [{ type: Schema.Types.ObjectId, ref: 'Evidence' }]
}, { timestamps: true });

const EvidenceSchema = new Schema<IEvidence>({
  type: { 
    type: String, 
    enum: ['image', 'document', 'link'],
    required: true 
  },
  url: { type: String, required: true },
  description: { type: String },
  uploadedBy: { type: String, required: true }
}, { timestamps: true });

// Export Models
export const Profile = mongoose.models.Profile || mongoose.model<IProfile>('Profile', ProfileSchema);
export const Rating = mongoose.models.Rating || mongoose.model<IRating>('Rating', RatingSchema);
export const Evidence = mongoose.models.Evidence || mongoose.model<IEvidence>('Evidence', EvidenceSchema);
```

## API Development

### Step 6: Profiles API
Create `app/api/profiles/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Profile } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const name = searchParams.get('name');
    const userId = searchParams.get('userId');

    let query: any = { isActive: true };
    
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    const profiles = await Profile.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ bodycount: -1, name: 1 });

    return NextResponse.json({ profiles, count: profiles.length });
  } catch (error) {
    console.error('Profiles API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { name, images, fameLevel } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const existingProfile = await Profile.findOne({ name });
    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile already exists' },
        { status: 409 }
      );
    }

    const profile = new Profile({
      name,
      images: images || [],
      fameLevel: fameLevel || 'C-list',
      bodycount: 0,
      isActive: true
    });

    await profile.save();

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error('Profile Creation Error:', error);
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }
}
```

### Step 7: Ratings API
Create `app/api/ratings/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Rating, Profile } from '@/lib/models';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const userId = searchParams.get('userId');

    let query: any = {};
    
    if (profileId) {
      query.profileId = new mongoose.Types.ObjectId(profileId);
    }
    
    if (userId) {
      query.userId = userId;
    }

    const ratings = await Rating.find(query)
      .populate('profileId', 'name images')
      .sort({ createdAt: -1 });

    return NextResponse.json({ ratings });
  } catch (error) {
    console.error('Ratings Fetch Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { profileId, userId, type, evidence } = body;

    if (!profileId || !type) {
      return NextResponse.json(
        { error: 'ProfileId and type are required' },
        { status: 400 }
      );
    }

    const rating = new Rating({
      profileId: new mongoose.Types.ObjectId(profileId),
      userId,
      type,
      evidence: evidence || []
    });

    await rating.save();

    // Update profile bodycount
    await updateBodycountStats(profileId);

    return NextResponse.json({ rating }, { status: 201 });
  } catch (error) {
    console.error('Rating Creation Error:', error);
    return NextResponse.json(
      { error: 'Failed to create rating' },
      { status: 500 }
    );
  }
}

async function updateBodycountStats(profileId: string) {
  const ratingsCount = await Rating.countDocuments({ 
    profileId: new mongoose.Types.ObjectId(profileId) 
  });
  
  await Profile.findByIdAndUpdate(profileId, { 
    bodycount: ratingsCount 
  });
}
```

### Step 8: Statistics API
Create `app/api/stats/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Profile, Rating } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const profileId = searchParams.get('profileId');

    switch (type) {
      case 'leaderboard':
        return await getLeaderboard();
      case 'profile':
        if (!profileId) {
          return NextResponse.json(
            { error: 'ProfileId required for profile stats' },
            { status: 400 }
          );
        }
        return await getProfileStats(profileId);
      case 'overview':
      default:
        return await getOverviewStats();
    }
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

async function getLeaderboard() {
  const profiles = await Profile.find({ isActive: true })
    .sort({ bodycount: -1 })
    .limit(50)
    .select('name images bodycount fameLevel');

  return NextResponse.json({ leaderboard: profiles });
}

async function getProfileStats(profileId: string) {
  const profile = await Profile.findById(profileId);
  if (!profile) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404 }
    );
  }

  const ratingsBreakdown = await Rating.aggregate([
    { $match: { profileId: profile._id } },
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);

  return NextResponse.json({
    profile: {
      name: profile.name,
      bodycount: profile.bodycount,
      fameLevel: profile.fameLevel
    },
    breakdown: ratingsBreakdown
  });
}

async function getOverviewStats() {
  const totalProfiles = await Profile.countDocuments({ isActive: true });
  const totalRatings = await Rating.countDocuments();
  
  const recentActivity = await Rating.find()
    .populate('profileId', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

  return NextResponse.json({
    totalProfiles,
    totalRatings,
    recentActivity
  });
}
```

## Frontend Components

### Step 9: Swipe Card Component
Create `app/components/SwipeCard.tsx`:
```typescript
'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';

interface Profile {
  _id: string;
  name: string;
  images: string[];
  bodycount: number;
  fameLevel: string;
}

interface SwipeCardProps {
  profile: Profile;
  onSwipe: (direction: 'left' | 'right') => void;
  onRate: (type: 'dated' | 'hookup' | 'transactional') => void;
}

export default function SwipeCard({ profile, onSwipe, onRate }: SwipeCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setDragOffset({
        x: e.clientX - startX,
        y: e.clientY - startY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      if (Math.abs(dragOffset.x) > 100) {
        onSwipe(dragOffset.x > 0 ? 'right' : 'left');
      }
      
      setDragOffset({ x: 0, y: 0 });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev < profile.images.length - 1 ? prev + 1 : 0
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev > 0 ? prev - 1 : profile.images.length - 1
    );
  };

  return (
    <div
      ref={cardRef}
      className={`relative w-80 h-96 bg-white rounded-xl shadow-lg cursor-grab ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
      style={{
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Image Display */}
      <div className="relative h-64 overflow-hidden rounded-t-xl">
        {profile.images.length > 0 && (
          <Image
            src={profile.images[currentImageIndex]}
            alt={profile.name}
            fill
            className="object-cover"
          />
        )}
        
        {/* Image Navigation */}
        {profile.images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full"
            >
              ←
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full"
            >
              →
            </button>
          </>
        )}
        
        {/* Image Indicators */}
        {profile.images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {profile.images.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-800">{profile.name}</h3>
        <p className="text-sm text-gray-600">{profile.fameLevel}</p>
        <p className="text-sm text-gray-600">Bodycount: {profile.bodycount}</p>
      </div>

      {/* Rating Buttons */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between">
        <button
          onClick={() => onRate('dated')}
          className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm hover:bg-pink-600"
        >
          Dated
        </button>
        <button
          onClick={() => onRate('hookup')}
          className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm hover:bg-orange-600"
        >
          Hookup
        </button>
        <button
          onClick={() => onRate('transactional')}
          className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm hover:bg-purple-600"
        >
          Transactional
        </button>
      </div>
    </div>
  );
}
```

### Step 10: Leaderboard Component
Create `app/components/BodycountScore.tsx`:
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface LeaderboardEntry {
  _id: string;
  name: string;
  images: string[];
  bodycount: number;
  fameLevel: string;
}

interface BodycountScoreProps {
  limit?: number;
  showRanking?: boolean;
}

export default function BodycountScore({ limit = 20, showRanking = true }: BodycountScoreProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stats?type=leaderboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const data = await response.json();
      setLeaderboard(data.leaderboard.slice(0, limit));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        Error loading leaderboard: {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        🏆 Bodycount Leaderboard
      </h2>
      
      <div className="space-y-3">
        {leaderboard.map((profile, index) => (
          <div
            key={profile._id}
            className={`flex items-center p-3 rounded-lg transition-colors ${
              index < 3 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50' : 'bg-gray-50'
            } hover:bg-gray-100`}
          >
            {/* Ranking */}
            {showRanking && (
              <div className="flex-shrink-0 w-8 text-center">
                {index === 0 && <span className="text-2xl">🥇</span>}
                {index === 1 && <span className="text-2xl">🥈</span>}
                {index === 2 && <span className="text-2xl">🥉</span>}
                {index > 2 && (
                  <span className="text-lg font-bold text-gray-600">
                    {index + 1}
                  </span>
                )}
              </div>
            )}

            {/* Profile Image */}
            <div className="flex-shrink-0 w-12 h-12 ml-3 relative">
              {profile.images.length > 0 ? (
                <Image
                  src={profile.images[0]}
                  alt={profile.name}
                  fill
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-xs">No Image</span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-grow ml-4">
              <h3 className="font-semibold text-gray-800">{profile.name}</h3>
              <p className="text-sm text-gray-600">{profile.fameLevel}</p>
            </div>

            {/* Bodycount Score */}
            <div className="flex-shrink-0 text-right">
              <div className="text-lg font-bold text-blue-600">
                {profile.bodycount}
              </div>
              <div className="text-xs text-gray-500">connections</div>
            </div>
          </div>
        ))}
      </div>

      {leaderboard.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No profiles found in leaderboard
        </div>
      )}
    </div>
  );
}
```

### Step 11: Privacy Settings Component
Create `app/components/PrivacySettings.tsx`:
```typescript
'use client';

import React, { useState, useEffect } from 'react';

interface PrivacySettings {
  privateProfile: boolean;
  hideFromSearch: boolean;
  anonymousRatings: boolean;
  publicBodycount: boolean;
  allowEvidence: boolean;
}

interface PrivacySettingsProps {
  userId?: string;
  onSettingsChange?: (settings: PrivacySettings) => void;
}

export default function PrivacySettings({ userId, onSettingsChange }: PrivacySettingsProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    privateProfile: false,
    hideFromSearch: false,
    anonymousRatings: true,
    publicBodycount: true,
    allowEvidence: true
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadUserSettings();
    }
  }, [userId]);

  const loadUserSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user/settings?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof PrivacySettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }

    if (userId) {
      try {
        const response = await fetch('/api/user/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            settings: newSettings
          })
        });

        if (response.ok) {
          setMessage('Settings updated successfully');
          setTimeout(() => setMessage(null), 3000);
        } else {
          throw new Error('Failed to update settings');
        }
      } catch (error) {
        setMessage('Failed to update settings');
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  const ToggleSwitch = ({ 
    label, 
    description, 
    checked, 
    onChange 
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex-grow">
        <h3 className="font-medium text-gray-800">{label}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
        disabled={loading}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        🔒 Privacy Settings
      </h2>
      
      {message && (
        <div className={`p-3 rounded-lg mb-4 ${
          message.includes('successfully') 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        <ToggleSwitch
          label="Private Profile"
          description="Hide your profile from public discovery"
          checked={settings.privateProfile}
          onChange={(checked) => updateSetting('privateProfile', checked)}
        />
        
        <ToggleSwitch
          label="Hide from Search"
          description="Don't appear in search results"
          checked={settings.hideFromSearch}
          onChange={(checked) => updateSetting('hideFromSearch', checked)}
        />
        
        <ToggleSwitch
          label="Anonymous Ratings"
          description="Submit ratings without revealing your identity"
          checked={settings.anonymousRatings}
          onChange={(checked) => updateSetting('anonymousRatings', checked)}
        />
        
        <ToggleSwitch
          label="Public Bodycount"
          description="Allow others to see your bodycount statistics"
          checked={settings.publicBodycount}
          onChange={(checked) => updateSetting('publicBodycount', checked)}
        />
        
        <ToggleSwitch
          label="Allow Evidence"
          description="Allow others to upload evidence for your ratings"
          checked={settings.allowEvidence}
          onChange={(checked) => updateSetting('allowEvidence', checked)}
        />
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Privacy Notice</h4>
        <p className="text-sm text-blue-700">
          Your privacy is important to us. These settings control how your data is shared 
          and displayed within the app. You can change these settings at any time.
        </p>
      </div>
    </div>
  );
}
```

## Main Application Logic

### Step 12: Main Page Component
Create `app/page.tsx`:
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import SwipeCard from './components/SwipeCard';
import BodycountScore from './components/BodycountScore';
import PrivacySettings from './components/PrivacySettings';

interface Profile {
  _id: string;
  name: string;
  images: string[];
  bodycount: number;
  fameLevel: string;
}

type ActiveTab = 'swipe' | 'add' | 'scores' | 'privacy';

export default function Home() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>('swipe');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
    // Initialize user ID (would come from authentication)
    setUserId('user_' + Math.random().toString(36).substr(2, 9));
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profiles?limit=50');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profiles');
      }
      
      const data = await response.json();
      setProfiles(data.profiles);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    console.log(`Swiped ${direction} on ${profiles[currentProfileIndex]?.name}`);
    nextProfile();
  };

  const handleRate = async (type: 'dated' | 'hookup' | 'transactional') => {
    const currentProfile = profiles[currentProfileIndex];
    if (!currentProfile) return;

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profileId: currentProfile._id,
          userId,
          type
        })
      });

      if (response.ok) {
        console.log(`Rated ${currentProfile.name} as ${type}`);
        nextProfile();
      } else {
        console.error('Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  const nextProfile = () => {
    if (currentProfileIndex < profiles.length - 1) {
      setCurrentProfileIndex(currentProfileIndex + 1);
    } else {
      // Fetch more profiles or reset
      setCurrentProfileIndex(0);
    }
  };

  const TabButton = ({ tab, label, icon }: { tab: ActiveTab; label: string; icon: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 py-3 px-4 text-center font-medium rounded-lg transition-colors ${
        activeTab === tab
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <span className="text-lg mr-2">{icon}</span>
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Bodies App
        </h1>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white p-4 shadow-sm">
        <div className="flex space-x-2 max-w-md mx-auto">
          <TabButton tab="swipe" label="Swipe" icon="💫" />
          <TabButton tab="add" label="Add" icon="➕" />
          <TabButton tab="scores" label="Scores" icon="🏆" />
          <TabButton tab="privacy" label="Privacy" icon="🔒" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'swipe' && (
          <div className="flex justify-center">
            {profiles.length > 0 && currentProfileIndex < profiles.length ? (
              <SwipeCard
                profile={profiles[currentProfileIndex]}
                onSwipe={handleSwipe}
                onRate={handleRate}
              />
            ) : (
              <div className="text-center text-gray-500 py-16">
                <h2 className="text-xl font-semibold mb-4">No more profiles!</h2>
                <p>Check back later for new profiles to swipe.</p>
                <button
                  onClick={() => setCurrentProfileIndex(0)}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Start Over
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Profile</h2>
            <p className="text-gray-600 mb-4">
              Profile addition feature coming soon! This will allow users to submit 
              new celebrity profiles for community review.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800 text-sm">
                💡 Tip: All new profiles go through a moderation process to ensure quality and accuracy.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'scores' && (
          <div className="max-w-2xl mx-auto">
            <BodycountScore limit={50} showRanking={true} />
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="max-w-md mx-auto">
            <PrivacySettings userId={userId} />
          </div>
        )}
      </main>
    </div>
  );
}
```

## Styling and UX

### Step 13: Global Styles
Update `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
  
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .card-shadow {
    @apply shadow-lg hover:shadow-xl transition-shadow duration-300;
  }
  
  .btn-primary {
    @apply bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200;
  }
  
  .btn-secondary {
    @apply bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200;
  }
  
  .input-field {
    @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  }
}

@layer utilities {
  .text-gradient {
    @apply bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.5s ease-in-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .swipe-card {
    @apply transform transition-transform duration-300 ease-out;
  }
  
  .swipe-card:hover {
    @apply scale-105;
  }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-400 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500;
}

/* Loading animations */
.loading-spinner {
  @apply animate-spin rounded-full border-2 border-gray-300 border-t-blue-600;
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .swipe-card {
    @apply w-full max-w-sm;
  }
  
  .container {
    @apply px-2;
  }
}
```

### Step 14: Tailwind Configuration
Update `tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
```

## Data Management

### Step 15: API Client
Create `lib/api-client.ts`:
```typescript
interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      return {
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data.error || 'Unknown error',
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  // Profiles
  async getProfiles(params?: {
    limit?: number;
    skip?: number;
    name?: string;
    userId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.name) searchParams.set('name', params.name);
    if (params?.userId) searchParams.set('userId', params.userId);

    return this.request(`/profiles?${searchParams.toString()}`);
  }

  async createProfile(profile: {
    name: string;
    images?: string[];
    fameLevel?: string;
  }) {
    return this.request('/profiles', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  }

  // Ratings
  async getRatings(params?: {
    profileId?: string;
    userId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.profileId) searchParams.set('profileId', params.profileId);
    if (params?.userId) searchParams.set('userId', params.userId);

    return this.request(`/ratings?${searchParams.toString()}`);
  }

  async createRating(rating: {
    profileId: string;
    userId?: string;
    type: 'dated' | 'hookup' | 'transactional';
    evidence?: any[];
  }) {
    return this.request('/ratings', {
      method: 'POST',
      body: JSON.stringify(rating),
    });
  }

  // Statistics
  async getLeaderboard() {
    return this.request('/stats?type=leaderboard');
  }

  async getProfileStats(profileId: string) {
    return this.request(`/stats?type=profile&profileId=${profileId}`);
  }

  async getOverviewStats() {
    return this.request('/stats?type=overview');
  }

  // User Settings
  async getUserSettings(userId: string) {
    return this.request(`/user/settings?userId=${userId}`);
  }

  async updateUserSettings(userId: string, settings: any) {
    return this.request('/user/settings', {
      method: 'POST',
      body: JSON.stringify({ userId, settings }),
    });
  }
}

export const apiClient = new ApiClient();
export default ApiClient;
```

### Step 16: Data Persistence Utilities
Create `lib/data-persistence.ts`:
```typescript
// Local storage utilities for client-side data persistence

export class LocalStorageManager {
  private prefix: string;

  constructor(prefix: string = 'bodies_app_') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  set<T>(key: string, value: T): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(this.getKey(key), serializedValue);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (item === null) {
        return defaultValue || null;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue || null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.getKey(key));
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Specific methods for app data
  saveSwipeState(profileIndex: number, swipedProfiles: string[]): void {
    this.set('swipe_state', {
      currentIndex: profileIndex,
      swipedProfiles,
      timestamp: Date.now()
    });
  }

  getSwipeState(): { currentIndex: number; swipedProfiles: string[]; timestamp: number } | null {
    return this.get('swipe_state');
  }

  saveUserPreferences(preferences: any): void {
    this.set('user_preferences', preferences);
  }

  getUserPreferences(): any {
    return this.get('user_preferences', {
      theme: 'light',
      notifications: true,
      autoplay: false
    });
  }

  saveCachedProfiles(profiles: any[], timestamp: number = Date.now()): void {
    this.set('cached_profiles', {
      profiles,
      timestamp
    });
  }

  getCachedProfiles(maxAge: number = 5 * 60 * 1000): any[] | null {
    const cached = this.get<{ profiles: any[]; timestamp: number }>('cached_profiles');
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > maxAge;
    if (isExpired) {
      this.remove('cached_profiles');
      return null;
    }
    
    return cached.profiles;
  }
}

export const storage = new LocalStorageManager();

// Session storage for temporary data
export class SessionStorageManager {
  private prefix: string;

  constructor(prefix: string = 'bodies_session_') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  set<T>(key: string, value: T): void {
    try {
      const serializedValue = JSON.stringify(value);
      sessionStorage.setItem(this.getKey(key), serializedValue);
    } catch (error) {
      console.error('Error saving to sessionStorage:', error);
    }
  }

  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = sessionStorage.getItem(this.getKey(key));
      if (item === null) {
        return defaultValue || null;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error('Error reading from sessionStorage:', error);
      return defaultValue || null;
    }
  }

  remove(key: string): void {
    sessionStorage.removeItem(this.getKey(key));
  }

  clear(): void {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

export const sessionStore = new SessionStorageManager();
```

## Testing and Quality Assurance

### Step 17: Package.json Scripts
Update `package.json`:
```json
{
  "name": "bodies",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "db:seed": "node scripts/seed-database.js",
    "db:backup": "node scripts/backup-database.js",
    "db:restore": "node scripts/restore-database.js",
    "analyze": "ANALYZE=true npm run build",
    "clean": "rm -rf .next out"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18",
    "react-dom": "^18",
    "typescript": "^5",
    "mongoose": "^8.0.0",
    "mongodb": "^6.0.0",
    "cloudinary": "^1.41.0",
    "@worldcoin/minikit-js": "^0.1.0",
    "@coinbase/onchainkit": "^0.1.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.0.0",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^13.0.0",
    "@testing-library/jest-dom": "^6.0.0"
  }
}
```

### Step 18: ESLint Configuration
Create `.eslintrc.json`:
```json
{
  "extends": [
    "next/core-web-vitals",
    "next/typescript"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "no-console": "warn",
    "eqeqeq": "error",
    "curly": "error"
  },
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  }
}
```

## Security Implementation

### Step 19: Security Utilities
Create `lib/security.ts`:
```typescript
import crypto from 'crypto';

// Input validation and sanitization
export class SecurityUtils {
  // Sanitize user input
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>"'&]/g, (match) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match];
      });
  }

  // Validate email format
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate profile name
  static isValidProfileName(name: string): boolean {
    if (!name || name.length < 2 || name.length > 100) {
      return false;
    }
    // Allow letters, spaces, hyphens, apostrophes, and periods
    const nameRegex = /^[a-zA-Z\s\-'.]+$/;
    return nameRegex.test(name);
  }

  // Generate secure random token
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash password with salt
  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  // Verify password
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  // Rate limiting helper
  static createRateLimiter(maxRequests: number, windowMs: number) {
    const requests = new Map<string, number[]>();
    
    return (identifier: string): boolean => {
      const now = Date.now();
      const userRequests = requests.get(identifier) || [];
      
      // Remove old requests outside the window
      const validRequests = userRequests.filter(time => now - time < windowMs);
      
      if (validRequests.length >= maxRequests) {
        return false; // Rate limit exceeded
      }
      
      validRequests.push(now);
      requests.set(identifier, validRequests);
      return true;
    };
  }
}

// Middleware for request validation
export function validateRequest(requiredFields: string[]) {
  return (req: any, res: any, next: any) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    next();
  };
}
```

## Deployment

### Step 20: Vercel Configuration
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "MONGODB_URI": "@mongodb-uri",
    "CLOUDINARY_CLOUD_NAME": "@cloudinary-cloud-name",
    "CLOUDINARY_API_KEY": "@cloudinary-api-key",
    "CLOUDINARY_API_SECRET": "@cloudinary-api-secret",
    "WORLDCOIN_APP_ID": "@worldcoin-app-id",
    "NEXTAUTH_SECRET": "@nextauth-secret"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### Step 21: Deployment Commands
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add MONGODB_URI
vercel env add CLOUDINARY_CLOUD_NAME
vercel env add CLOUDINARY_API_KEY
vercel env add CLOUDINARY_API_SECRET
vercel env add WORLDCOIN_APP_ID
vercel env add NEXTAUTH_SECRET
```

### Step 22: Production Checklist
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] API endpoints working
- [ ] Image uploads functional
- [ ] Authentication working
- [ ] Error handling implemented
- [ ] Performance optimized
- [ ] Security measures in place
- [ ] Monitoring configured
- [ ] Backup strategy implemented

## Maintenance and Monitoring

### Step 23: Database Scripts
Create `scripts/seed-database.js`:
```javascript
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const sampleProfiles = [
  {
    name: "Sample Celebrity 1",
    images: ["/sample1.jpg"],
    bodycount: 5,
    fameLevel: "A-list",
    isActive: true
  },
  {
    name: "Sample Celebrity 2",
    images: ["/sample2.jpg"],
    bodycount: 3,
    fameLevel: "B-list",
    isActive: true
  }
];

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Clear existing data
    await db.collection('profiles').deleteMany({});
    await db.collection('ratings').deleteMany({});
    
    // Insert sample profiles
    await db.collection('profiles').insertMany(sampleProfiles);
    
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.close();
  }
}

seedDatabase();
```

### Step 24: Monitoring Setup
Create `lib/monitoring.ts`:
```typescript
export class MonitoringService {
  static logError(error: Error, context?: any) {
    console.error('Application Error:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry, LogRocket, or other monitoring service
    }
  }
  
  static logPerformance(operation: string, duration: number, metadata?: any) {
    console.log('Performance Metric:', {
      operation,
      duration,
      metadata,
      timestamp: new Date().toISOString()
    });
  }
  
  static logUserAction(action: string, userId?: string, metadata?: any) {
    console.log('User Action:', {
      action,
      userId,
      metadata,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Development Best Practices

### Code Quality
1. **TypeScript**: Use strict typing throughout
2. **ESLint**: Follow consistent code style
3. **Error Handling**: Implement comprehensive error boundaries
4. **Testing**: Write unit and integration tests
5. **Documentation**: Keep code well-documented

### Performance Optimization
1. **Image Optimization**: Use Next.js Image component
2. **Code Splitting**: Implement dynamic imports
3. **Caching**: Use appropriate caching strategies
4. **Database Indexing**: Optimize database queries
5. **Bundle Analysis**: Monitor bundle size

### Security Measures
1. **Input Validation**: Sanitize all user inputs
2. **Rate Limiting**: Implement API rate limiting
3. **Authentication**: Secure user authentication
4. **HTTPS**: Use HTTPS in production
5. **Environment Variables**: Secure sensitive data

## Troubleshooting Common Issues

### Database Connection Issues
```bash
# Test MongoDB connection
node -e "require('./lib/mongodb').connectToDatabase().then(() => console.log('Connected')).catch(console.error)"
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Type checking
npm run type-check
```

### Deployment Issues
```bash
# Check Vercel logs
vercel logs

# Redeploy
vercel --prod --force
```

## Final Steps

1. **Test Everything**: Run through all features manually
2. **Performance Check**: Test loading times and responsiveness
3. **Security Audit**: Review security implementations
4. **Documentation**: Update README and documentation
5. **Monitoring**: Set up error tracking and analytics
6. **Backup**: Implement regular database backups
7. **Launch**: Deploy to production and monitor

---

**Congratulations!** You've successfully built the Bodies app. This guide covered all essential aspects from setup to deployment. Remember to keep your dependencies updated and monitor your application's performance in production.

For ongoing maintenance:
- Regularly update dependencies
- Monitor error logs
- Backup your database
- Review and update security measures
- Gather user feedback for improvements

*Happy coding!* 🚀