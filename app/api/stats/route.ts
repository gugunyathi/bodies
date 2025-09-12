import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/mongodb';
import { BodycountStats, Profile, COLLECTIONS } from '../../../lib/models';

// GET /api/stats - Get bodycount statistics and leaderboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const type = searchParams.get('type') || 'leaderboard'; // 'leaderboard', 'profile', 'overview'
    const limit = parseInt(searchParams.get('limit') || '10');

    const db = await getDatabase();
    const statsCollection = db.collection<BodycountStats>(COLLECTIONS.BODYCOUNT_STATS);
    const profilesCollection = db.collection<Profile>(COLLECTIONS.PROFILES);

    if (type === 'profile' && profileId) {
      // Get stats for a specific profile
      const stats = await statsCollection.findOne({ profileId: profileId });
      const profile = await profilesCollection.findOne({ _id: profileId });

      if (!profile) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        profileStats: {
          profileId: profile._id,
          profileName: profile.name,
          totalRatings: stats?.totalRatings || 0,
          datedCount: stats?.datedCount || 0,
          hookupCount: stats?.hookupCount || 0,
          transactionalCount: stats?.transactionalCount || 0,
          bodycount: (stats?.datedCount || 0) + (stats?.hookupCount || 0) + (stats?.transactionalCount || 0),
          averageRating: stats?.averageRating || 0,
          lastUpdated: stats?.lastUpdated || profile.createdAt
        }
      });
    }

    if (type === 'leaderboard') {
      // Get leaderboard with top profiles
      const leaderboard = await statsCollection.aggregate([
        {
          $lookup: {
            from: COLLECTIONS.PROFILES,
            localField: 'profileId',
            foreignField: '_id',
            as: 'profile'
          }
        },
        { $unwind: '$profile' },
        { $match: { 'profile.isActive': true } },
        {
          $addFields: {
            bodycount: { $add: ['$datedCount', '$hookupCount', '$transactionalCount'] }
          }
        },
        { $sort: { bodycount: -1, totalRatings: -1 } },
        { $limit: limit },
        {
          $project: {
            profileId: '$profileId',
            profileName: '$profile.name',
            profileImage: { $arrayElemAt: ['$profile.images', 0] },
            isVerified: '$profile.isVerified',
            totalRatings: 1,
            datedCount: 1,
            hookupCount: 1,
            transactionalCount: 1,
            bodycount: 1,
            averageRating: 1,
            lastUpdated: 1
          }
        }
      ]).toArray();

      return NextResponse.json({
        success: true,
        leaderboard
      });
    }

    if (type === 'overview') {
      // Get overall platform statistics
      const overallStats = await statsCollection.aggregate([
        {
          $group: {
            _id: null,
            totalProfiles: { $sum: 1 },
            totalRatings: { $sum: '$totalRatings' },
            totalDated: { $sum: '$datedCount' },
            totalHookups: { $sum: '$hookupCount' },
            totalTransactional: { $sum: '$transactionalCount' },
            averageBodycount: { $avg: { $add: ['$datedCount', '$hookupCount', '$transactionalCount'] } }
          }
        }
      ]).toArray();

      const stats = overallStats[0] || {
        totalProfiles: 0,
        totalRatings: 0,
        totalDated: 0,
        totalHookups: 0,
        totalTransactional: 0,
        averageBodycount: 0
      };

      // Get recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentActivity = await statsCollection.countDocuments({
        lastUpdated: { $gte: yesterday }
      });

      return NextResponse.json({
        success: true,
        overview: {
          totalProfiles: stats.totalProfiles,
          totalRatings: stats.totalRatings,
          totalBodycount: stats.totalDated + stats.totalHookups + stats.totalTransactional,
          breakdown: {
            dated: stats.totalDated,
            hookups: stats.totalHookups,
            transactional: stats.totalTransactional
          },
          averageBodycount: Math.round(stats.averageBodycount * 100) / 100,
          recentActivity
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid type parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}