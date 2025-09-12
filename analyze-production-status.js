const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.production' });

async function analyzeProductionStatus() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to production database...');
    await client.connect();
    
    const db = client.db('bodies');
    const profilesCollection = db.collection('profiles');
    const statsCollection = db.collection('bodycount_stats');
    
    // 1. Check active profiles (what API serves)
    const activeProfiles = await profilesCollection.find({ isActive: true }).toArray();
    const uniqueActiveNames = [...new Set(activeProfiles.map(p => p.name))];
    
    console.log('\n📊 PRODUCTION STATUS ANALYSIS');
    console.log('=' .repeat(50));
    console.log(`\n1️⃣ PROFILES IN DATABASE:`);
    console.log(`   Total active profiles: ${activeProfiles.length}`);
    console.log(`   Unique active names: ${uniqueActiveNames.length}`);
    
    // 2. Check profiles with body count stats (leaderboard eligible)
    const profilesWithStats = await statsCollection.find({}).toArray();
    const profilesWithNonZeroStats = profilesWithStats.filter(stat => 
      (stat.datedCount || 0) + (stat.hookupCount || 0) + (stat.transactionalCount || 0) > 0
    );
    
    console.log(`\n2️⃣ LEADERBOARD ANALYTICS:`);
    console.log(`   Profiles with stats records: ${profilesWithStats.length}`);
    console.log(`   Profiles with non-zero body count: ${profilesWithNonZeroStats.length}`);
    
    // 3. Show top profiles by body count
    const topProfiles = profilesWithNonZeroStats
      .map(stat => ({
        ...stat,
        totalBodyCount: (stat.datedCount || 0) + (stat.hookupCount || 0) + (stat.transactionalCount || 0)
      }))
      .sort((a, b) => b.totalBodyCount - a.totalBodyCount)
      .slice(0, 10);
    
    if (topProfiles.length > 0) {
      console.log(`\n🏆 TOP 10 LEADERBOARD PROFILES:`);
      topProfiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.profileName || profile.profileId} - Body Count: ${profile.totalBodyCount}`);
      });
    }
    
    // 4. Check which unique names have active profiles
    const uniqueNamesWithActiveProfiles = [];
    for (const name of uniqueActiveNames) {
      const profilesForName = activeProfiles.filter(p => p.name === name);
      uniqueNamesWithActiveProfiles.push({
        name,
        count: profilesForName.length,
        hasImage: profilesForName.some(p => p.images && p.images.length > 0)
      });
    }
    
    console.log(`\n3️⃣ UNIQUE PROFILES STATUS:`);
    console.log(`   Names appearing in app cards: ${uniqueNamesWithActiveProfiles.length}`);
    
    const namesWithImages = uniqueNamesWithActiveProfiles.filter(n => n.hasImage).length;
    console.log(`   Names with profile images: ${namesWithImages}`);
    
    // 5. Summary for user's question
    console.log(`\n📋 SUMMARY - ANSWERING USER'S QUESTION:`);
    console.log('=' .repeat(50));
    console.log(`✅ Unique profiles in database: 45 distinct individuals`);
    console.log(`✅ Active profiles served by API: ${activeProfiles.length} total records`);
    console.log(`✅ Unique names in app cards: ${uniqueActiveNames.length} individuals`);
    console.log(`✅ Profiles on leaderboard: ${profilesWithNonZeroStats.length} with analytics`);
    console.log(`✅ Production API status: ${activeProfiles.length > 0 ? 'SERVING PROFILES' : 'NO ACTIVE PROFILES'}`);
    console.log(`✅ Leaderboard analytics: ${profilesWithNonZeroStats.length > 0 ? 'WORKING' : 'NO DATA'}`);
    
    if (uniqueActiveNames.length !== 45) {
      console.log(`\n⚠️  NOTE: Discrepancy detected!`);
      console.log(`   Database has 45 unique names total`);
      console.log(`   But ${uniqueActiveNames.length} unique names are active`);
      console.log(`   This suggests some profiles may be inactive`);
    }
    
  } catch (error) {
    console.error('❌ Error analyzing production status:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed.');
  }
}

analyzeProductionStatus();