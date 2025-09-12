import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/user/settings - Get user privacy settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const user = await db.collection('users').findOne({ walletAddress });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        privacySettings: user.privacySettings || {
          anonymousRatings: false,
          hideFromSearch: false,
          privateProfile: false,
          allowEvidenceUploads: true,
          showRealName: true,
          allowDirectMessages: true,
          shareLocation: false,
          publicBodycount: true
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/user/settings - Update user privacy settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, privacySettings } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!privacySettings || typeof privacySettings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Privacy settings are required' },
        { status: 400 }
      );
    }

    // Validate privacy settings structure
    const validSettings = {
      anonymousRatings: Boolean(privacySettings.anonymousRatings),
      hideFromSearch: Boolean(privacySettings.hideFromSearch),
      privateProfile: Boolean(privacySettings.privateProfile),
      allowEvidenceUploads: privacySettings.allowEvidenceUploads !== false,
      showRealName: privacySettings.showRealName !== false,
      allowDirectMessages: privacySettings.allowDirectMessages !== false,
      shareLocation: Boolean(privacySettings.shareLocation),
      publicBodycount: privacySettings.publicBodycount !== false
    };

    const db = await getDatabase();
    
    // Update user privacy settings
    const result = await db.collection('users').updateOne(
      { walletAddress },
      {
        $set: {
          privacySettings: validSettings,
          updatedAt: new Date()
        }
      },
      { upsert: false }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        privacySettings: validSettings,
        message: 'Privacy settings updated successfully'
      }
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/user/settings - Partially update user privacy settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, privacySettings } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!privacySettings || typeof privacySettings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Privacy settings are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Get current user settings
    const user = await db.collection('users').findOne({ walletAddress });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Merge with existing settings
    const currentSettings = user.privacySettings || {
      anonymousRatings: false,
      hideFromSearch: false,
      privateProfile: false,
      allowEvidenceUploads: true,
      showRealName: true,
      allowDirectMessages: true,
      shareLocation: false,
      publicBodycount: true
    };

    const updatedSettings = {
      ...currentSettings,
      ...privacySettings
    };

    // Validate and normalize the settings
    const validSettings = {
      anonymousRatings: Boolean(updatedSettings.anonymousRatings),
      hideFromSearch: Boolean(updatedSettings.hideFromSearch),
      privateProfile: Boolean(updatedSettings.privateProfile),
      allowEvidenceUploads: updatedSettings.allowEvidenceUploads !== false,
      showRealName: updatedSettings.showRealName !== false,
      allowDirectMessages: updatedSettings.allowDirectMessages !== false,
      shareLocation: Boolean(updatedSettings.shareLocation),
      publicBodycount: updatedSettings.publicBodycount !== false
    };

    // Update user privacy settings
    const result = await db.collection('users').updateOne(
      { walletAddress },
      {
        $set: {
          privacySettings: validSettings,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        privacySettings: validSettings,
        message: 'Privacy settings updated successfully'
      }
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}