import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';
import { User, COLLECTIONS } from '../../../../lib/models';

// POST /api/auth/connect - Connect wallet and create/get user
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Check if user already exists
    let user = await usersCollection.findOne({ walletAddress });

    if (!user) {
      // Create new user with default privacy settings
      const newUser: Omit<User, '_id'> = {
        walletAddress,
        createdAt: new Date(),
        updatedAt: new Date(),
        privacySettings: {
          anonymousRatings: false,
          hideFromSearch: false,
          privateProfile: false,
          allowEvidenceUploads: true,
          showRealName: true,
          allowDirectMessages: true,
          shareLocation: false,
          publicBodycount: true
        },
        isActive: true
      };

      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else {
      // Update last activity
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { updatedAt: new Date() } }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        privacySettings: user.privacySettings,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Auth connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}