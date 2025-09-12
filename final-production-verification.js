const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.production' });

async function finalProductionVerification() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to production database...');
    await client.connect();
    
    const db = client.db('bodies');
    const profilesCollection = db.collection('profiles');
    const ratingsCollection = db.collection('ratings');
    const statsCollection = db.collection('bodycount_stats');
    
    console.log('\n🎯 FINAL PRODUCTION VERIFICATION REPORT');
    console.log('=' .repeat(60));
    
    // 1. Get all unique active profiles
    const activeProfiles = await profilesCollection.find({ isActive: true }).toArray();
    const uniqueActiveNames = [...new Set(activeProfiles.map(p => p.name))];
    
    console.log(`\n1️⃣ PROFILES STATUS:`);
    console.log(`   ✅ Total active profiles: ${activeProfiles.length}`);
    console.log(`   ✅ Unique active names: ${uniqueActiveNames.length}`);
    console.log(`   ✅ Target achieved: ${uniqueActiveNames.length >= 45 ? 'YES' : 'NO'}`);
    
    // 2. Check relationships
    const allRatings = await ratingsCollection.find({}).toArray();
    const uniqueRaterIds = [...new Set(allRatings.map(r => r.raterId))];
    const uniqueRatedIds = [...new Set(allRatings.map(r => r.ratedId))];
    
    console.log(`\n2️⃣ RELATIONSHIPS STATUS:`);
    console.log(`   ✅ Total relationships: ${allRatings.length}`);
    console.log(`   ✅ Profiles giving ratings: ${uniqueRaterIds.length}`);
    console.log(`   ✅ Profiles receiving ratings: ${uniqueRatedIds.length}`);
    
    // 3. Check analytics/stats
    const allStats = await statsCollection.find({}).toArray();
    const statsWithBodycount = allStats.filter(s => 
      (s.datedCount || 0) + (s.hookupCount || 0) + (s.transactionalCount || 0) > 0
    );
    
    console.log(`\n3️⃣ ANALYTICS STATUS:`);
    console.log(`   ✅ Profiles with stats records: ${allStats.length}`);
    console.log(`   ✅ Profiles with body count > 0: ${statsWithBodycount.length}`);
    
    // 4. Check specific high-profile celebrities
    const celebrities = ['Kim Kardashian', 'Elon Musk', 'Sean "Diddy" Combs', 'Jennifer Lopez', 'Drake'];
    console.log(`\n4️⃣ KEY CELEBRITY STATUS:`);
    
    for (const celeb of celebrities) {
      const profile = activeProfiles.find(p => p.name === celeb);
      if (profile) {
        const ratingsGiven = await ratingsCollection.find({ raterId: profile._id.toString() }).toArray();
        const ratingsReceived = await ratingsCollection.find({ ratedId: profile._id.toString() }).toArray();
        const stats = await statsCollection.findOne({ profileId: profile._id.toString() });
        const bodycount = stats ? (stats.datedCount || 0) + (stats.hookupCount || 0) + (stats.transactionalCount || 0) : 0;
        
        console.log(`   ${celeb}:`);
        console.log(`     - Profile exists: ✅`);
        console.log(`     - Relationships given: ${ratingsGiven.length}`);
        console.log(`     - Relationships received: ${ratingsReceived.length}`);
        console.log(`     - Body count: ${bodycount}`);
        console.log(`     - Has stats: ${stats ? '✅' : '❌'}`);
      } else {
        console.log(`   ${celeb}: ❌ Profile not found`);
      }
    }
    
    // 5. API Simulation Test
    console.log(`\n5️⃣ API SIMULATION TEST:`);
    const apiQuery = { isActive: true };
    const apiProfiles = await profilesCollection
      .find(apiQuery)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    
    console.log(`   ✅ API would return: ${apiProfiles.length} profiles`);
    console.log(`   ✅ Unique names in API response: ${[...new Set(apiProfiles.map(p => p.name))].length}`);
    
    // 6. Leaderboard Simulation
    const leaderboardData = await statsCollection.aggregate([
      {
        $lookup: {
          from: 'profiles',
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
      { $limit: 20 }
    ]).toArray();
    
    console.log(`\n6️⃣ LEADERBOARD STATUS:`);
    console.log(`   ✅ Profiles on leaderboard: ${leaderboardData.length}`);
    if (leaderboardData.length > 0) {
      console.log(`   ✅ Top profile: ${leaderboardData[0].profile.name} (${leaderboardData[0].bodycount} body count)`);
      const kimOnLeaderboard = leaderboardData.find(p => p.profile.name === 'Kim Kardashian');
      console.log(`   ${kimOnLeaderboard ? '✅' : '❌'} Kim Kardashian on leaderboard: ${kimOnLeaderboard ? 'YES' : 'NO'}`);
    }
    
    // 7. Final Summary
    console.log(`\n📋 FINAL VERIFICATION SUMMARY:`);
    console.log('=' .repeat(40));
    
    const checks = {
      'Has 45+ unique profiles': uniqueActiveNames.length >= 45,
      'Has relationships data': allRatings.length > 0,
      'Has analytics data': statsWithBodycount.length > 0,
      'API returns 100+ profiles': apiProfiles.length >= 100,
      'Leaderboard has data': leaderboardData.length > 0
    };
    
    let allPassed = true;
    for (const [check, passed] of Object.entries(checks)) {
      console.log(`   ${passed ? '✅' : '❌'} ${check}: ${passed ? 'PASS' : 'FAIL'}`);
      if (!passed) allPassed = false;
    }
    
    console.log(`\n🎯 OVERALL STATUS: ${allPassed ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️  SOME ISSUES DETECTED'}`);
    
    if (allPassed) {
      console.log(`\n🚀 PRODUCTION READY:`);
      console.log(`   - Database contains ${uniqueActiveNames.length} unique profiles`);
      console.log(`   - ${allRatings.length} relationships tracked`);
      console.log(`   - ${statsWithBodycount.length} profiles with analytics`);
      console.log(`   - API serving ${apiProfiles.length} profiles`);
      console.log(`   - Leaderboard showing ${leaderboardData.length} ranked profiles`);
    }
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed.');
  }
}

finalProductionVerification();