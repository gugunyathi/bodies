import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/mongodb';
import { Profile, User, COLLECTIONS } from '../../../lib/models';
import { ObjectId } from 'mongodb';
import { createSearchRegex, getNameVariations, searchProfilesByName } from '../../../lib/name-utils';

// GET /api/profiles - Get swipeable profiles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const name = searchParams.get('name');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    console.log('API: GET /api/profiles called with params:', { userId, name, limit, skip });

    const db = await getDatabase();
    const profilesCollection = db.collection<Profile>(COLLECTIONS.PROFILES);

    // Build query to exclude user's own profiles and inactive profiles
    const query: Record<string, unknown> = {
      isActive: true
    };

    if (userId) {
      query.userId = { $ne: userId };
    }

    let profiles;
    
    if (name) {
      // Use fuzzy matching for name searches
      console.log('API: Using fuzzy search for name:', name);
      
      // First get all active profiles (without name filter)
      const allProfiles = await profilesCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      // Apply fuzzy matching client-side
      const matchedProfiles = searchProfilesByName(allProfiles, name);
      
      // Apply pagination to matched results
      profiles = matchedProfiles.slice(skip, skip + limit);
      
      console.log('API: Fuzzy search found', matchedProfiles.length, 'matches, returning', profiles.length, 'after pagination');
    } else {
      // Regular query without name search
      profiles = await profilesCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
    }

    console.log('API: Found profiles from DB:', profiles.length, profiles.map(p => p.name));

    // Fetch bodycount stats for all profiles
    const statsCollection = db.collection(COLLECTIONS.BODYCOUNT_STATS);
    const profileIds = profiles.map(p => p._id.toString());
    const profileObjectIds = profiles.map(p => p._id);
    const statsMap = new Map();
    
    if (profileIds.length > 0) {
      // Search for both string and ObjectId versions of profileId
      const stats = await statsCollection.find({
        $or: [
          { profileId: { $in: profileIds } },
          { profileId: { $in: profileObjectIds } }
        ]
      }).toArray();
      
      stats.forEach(stat => {
        const key = stat.profileId.toString();
        statsMap.set(key, {
          dated: stat.datedCount || 0,
          hookup: stat.hookupCount || 0,
          transactional: stat.transactionalCount || 0,
          total: (stat.datedCount || 0) + (stat.hookupCount || 0) + (stat.transactionalCount || 0)
        });
      });
    }

    const response = {
      success: true,
      profiles: profiles.map(profile => {
        const profileStats = statsMap.get(profile._id.toString()) || {
          dated: 0,
          hookup: 0,
          transactional: 0,
          total: 0
        };
        
        return {
          id: profile._id,
          name: profile.name,
          age: profile.age,
          bio: profile.bio,
          images: profile.images,
          socialHandles: profile.socialHandles,
          location: profile.location,
          isVerified: profile.isVerified,
          createdAt: profile.createdAt,
          bodycount: profileStats
        };
      })
    };

    console.log('API: Returning response with profiles:', response.profiles.length);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Get profiles error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/profiles - Create new profile
export async function POST(request: NextRequest) {
  try {
    const profileData = await request.json();
    const { userId, name, age, bio, images, socialHandles, location } = profileData;

    if (!userId || !name || !age) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, name, age' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const profilesCollection = db.collection<Profile>(COLLECTIONS.PROFILES);
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // For system profiles, create user if it doesn't exist
    let user = await usersCollection.findOne({ _id: userId });
    if (!user && userId.startsWith('system-')) {
      // Create system user
      const newUser: Omit<User, '_id'> = {
        walletAddress: `system-${Date.now()}`, // Placeholder wallet address for system users
        createdAt: new Date(),
        updatedAt: new Date(),
        privacySettings: {
          anonymousRatings: false,
          hideFromSearch: false,
          privateProfile: false,
          allowEvidenceUploads: true,
          showRealName: true,
          allowDirectMessages: false,
          shareLocation: false,
          publicBodycount: true
        },
        isActive: true
      };
      
      // Insert with custom _id for system users
      await usersCollection.insertOne({ ...newUser, _id: userId } as any);
      user = { ...newUser, _id: userId };
    } else if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const newProfile: Omit<Profile, '_id'> = {
      userId: userId,
      name,
      age: parseInt(age),
      bio: bio || '',
      images: images || [],
      socialHandles: socialHandles || {},
      location: location || '',
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    const result = await profilesCollection.insertOne(newProfile);
    const profile = { ...newProfile, _id: result.insertedId };

    return NextResponse.json({
      success: true,
      profile: {
        id: profile._id,
        name: profile.name,
        age: profile.age,
        bio: profile.bio,
        images: profile.images,
        socialHandles: profile.socialHandles,
        location: profile.location,
        isVerified: profile.isVerified,
        createdAt: profile.createdAt
      }
    });
  } catch (error) {
    console.error('Create profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/profiles - Delete profile by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('id');

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(profileId)) {
      return NextResponse.json(
        { error: 'Invalid profile ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const profilesCollection = db.collection<Profile>(COLLECTIONS.PROFILES);

    // Check if profile exists
    const profile = await profilesCollection.findOne({ _id: new ObjectId(profileId) } as any);
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Delete the profile
    const result = await profilesCollection.deleteOne({ _id: new ObjectId(profileId) } as any);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Profile '${profile.name}' deleted successfully`
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}