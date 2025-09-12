import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/mongodb';
import { Rating, Evidence, BodycountStats, COLLECTIONS } from '../../../lib/models';

// POST /api/ratings - Submit a new rating
export async function POST(request: NextRequest) {
  try {
    const ratingData = await request.json();
    const { raterId, profileId, ratingType, isAnonymous, evidence } = ratingData;

    if (!raterId || !profileId || !ratingType) {
      return NextResponse.json(
        { error: 'Missing required fields: raterId, profileId, ratingType' },
        { status: 400 }
      );
    }

    if (!['dated', 'hookup', 'transactional'].includes(ratingType)) {
      return NextResponse.json(
        { error: 'Invalid rating type' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const ratingsCollection = db.collection<Rating>(COLLECTIONS.RATINGS);
    const evidenceCollection = db.collection<Evidence>(COLLECTIONS.EVIDENCE);
    const statsCollection = db.collection<BodycountStats>(COLLECTIONS.BODYCOUNT_STATS);

    // Check if user already rated this profile
    const existingRating = await ratingsCollection.findOne({
      raterId: raterId,
      profileId: profileId
    });

    if (existingRating) {
      return NextResponse.json(
        { error: 'You have already rated this profile' },
        { status: 409 }
      );
    }

    // Create the rating
    const newRating: Omit<Rating, '_id'> = {
      raterId: raterId,
      profileId: profileId,
      ratingType: ratingType as 'dated' | 'hookup' | 'transactional',
      isAnonymous: isAnonymous || false,
      createdAt: new Date(),
      evidenceIds: []
    };

    const ratingResult = await ratingsCollection.insertOne(newRating);
    const ratingId = ratingResult.insertedId;

    // Handle evidence uploads if provided
    const evidenceIds: string[] = [];
    if (evidence && evidence.length > 0) {
      for (const evidenceItem of evidence) {
        const newEvidence: Omit<Evidence, '_id'> = {
          ratingId,
          uploaderId: raterId,
          type: evidenceItem.type,
          url: evidenceItem.url,
          filename: evidenceItem.filename,
          fileSize: evidenceItem.fileSize,
          mimeType: evidenceItem.mimeType,
          description: evidenceItem.description,
          isVerified: false,
          createdAt: new Date()
        };

        const evidenceResult = await evidenceCollection.insertOne(newEvidence);
        evidenceIds.push(evidenceResult.insertedId);
      }

      // Update rating with evidence IDs
      await ratingsCollection.updateOne(
        { _id: ratingId },
        { $set: { evidenceIds } }
      );
    }

    // Update bodycount statistics
    await updateBodycountStats(profileId, statsCollection, ratingsCollection);

    return NextResponse.json({
      success: true,
      rating: {
        id: ratingId,
        ratingType,
        isAnonymous,
        evidenceCount: evidenceIds.length,
        createdAt: newRating.createdAt
      }
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/ratings - Get ratings for a profile or user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!profileId && !userId) {
      return NextResponse.json(
        { error: 'Either profileId or userId is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const ratingsCollection = db.collection<Rating>(COLLECTIONS.RATINGS);

    const query: Record<string, unknown> = {};
    if (profileId) {
      query.profileId = profileId;
    }
    if (userId) {
      query.raterId = userId;
    }

    const ratings = await ratingsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      ratings: ratings.map(rating => ({
        id: rating._id,
        profileId: rating.profileId,
        ratingType: rating.ratingType,
        isAnonymous: rating.isAnonymous,
        evidenceCount: rating.evidenceIds.length,
        createdAt: rating.createdAt
      }))
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to update bodycount statistics
async function updateBodycountStats(
  profileId: string,
  statsCollection: import('mongodb').Collection<BodycountStats>,
  ratingsCollection: import('mongodb').Collection<Rating>
) {
  // Aggregate ratings for this profile
  const stats = await ratingsCollection.aggregate([
    { $match: { profileId: profileId } },
    {
      $group: {
        _id: '$profileId',
        totalRatings: { $sum: 1 },
        datedCount: {
          $sum: { $cond: [{ $eq: ['$ratingType', 'dated'] }, 1, 0] }
        },
        hookupCount: {
          $sum: { $cond: [{ $eq: ['$ratingType', 'hookup'] }, 1, 0] }
        },
        transactionalCount: {
          $sum: { $cond: [{ $eq: ['$ratingType', 'transactional'] }, 1, 0] }
        }
      }
    }
  ]).toArray();

  if (stats.length > 0) {
    const stat = stats[0];
    const bodycount = stat.datedCount + stat.hookupCount + stat.transactionalCount;
    
    await statsCollection.replaceOne(
      { profileId: profileId },
      {
        profileId: profileId,
        totalRatings: stat.totalRatings,
        datedCount: stat.datedCount,
        hookupCount: stat.hookupCount,
        transactionalCount: stat.transactionalCount,
        averageRating: bodycount / stat.totalRatings,
        lastUpdated: new Date()
      },
      { upsert: true }
    );
  }
}