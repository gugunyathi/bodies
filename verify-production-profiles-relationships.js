const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.production' });

async function verifyProductionProfilesAndRelationships() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to production database...');
    await client.connect();
    
    const db = client.db('bodies');
    const profilesCollection = db.collection('profiles');
    const ratingsCollection = db.collection('ratings');
    const statsCollection = db.collection('bodycount_stats');
    
    console.log('\n📊 PRODUCTION PROFILES & RELATIONSHIPS VERIFICATION');
    console.log('=' .repeat(60));
    
    // 1. Check unique profiles in database
    const allProfiles = await profilesCollection.find({}).toArray();
    const activeProfiles = await profilesCollection.find({ isActive: true }).toArray();
    const uniqueNames = [...new Set(allProfiles.map(p => p.name))];
    const uniqueActiveNames = [...new Set(activeProfiles.map(p => p.name))];
    
    console.log(`\n1️⃣ DATABASE PROFILE STATUS:`);
    console.log(`   Total profiles in DB: ${allProfiles.length}`);
    console.log(`   Active profiles: ${activeProfiles.length}`);
    console.log(`   Unique names (all): ${uniqueNames.length}`);
    console.log(`   Unique active names: ${uniqueActiveNames.length}`);
    
    // 2. Check relationships (ratings)
    const allRatings = await ratingsCollection.find({}).toArray();
    const uniqueRaterIds = [...new Set(allRatings.map(r => r.raterId))];
    const uniqueRatedIds = [...new Set(allRatings.map(r => r.ratedId))];
    
    console.log(`\n2️⃣ RELATIONSHIPS STATUS:`);
    console.log(`   Total ratings/relationships: ${allRatings.length}`);
    console.log(`   Unique raters: ${uniqueRaterIds.length}`);
    console.log(`   Unique rated profiles: ${uniqueRatedIds.length}`);
    
    // 3. Check bodycount stats
    const allStats = await statsCollection.find({}).toArray();
    const statsWithBodycount = allStats.filter(s => 
      (s.datedCount || 0) + (s.hookupCount || 0) + (s.transactionalCount || 0) > 0
    );
    
    console.log(`\n3️⃣ ANALYTICS STATUS:`);
    console.log(`   Profiles with stats: ${allStats.length}`);
    console.log(`   Profiles with body count > 0: ${statsWithBodycount.length}`);
    
    // 4. Verify specific profiles have relationships
    const profilesWithRelationships = [];
    for (const profile of activeProfiles.slice(0, 10)) { // Check first 10 active profiles
      const ratingsAsRater = await ratingsCollection.find({ raterId: profile._id.toString() }).toArray();
      const ratingsAsRated = await ratingsCollection.find({ ratedId: profile._id.toString() }).toArray();
      const totalRelationships = ratingsAsRater.length + ratingsAsRated.length;
      
      if (totalRelationships > 0) {
        profilesWithRelationships.push({
          name: profile.name,
          id: profile._id.toString(),
          asRater: ratingsAsRater.length,
          asRated: ratingsAsRated.length,
          total: totalRelationships
        });
      }
    }
    
    console.log(`\n4️⃣ PROFILES WITH RELATIONSHIPS (Sample):`);
    if (profilesWithRelationships.length > 0) {
      profilesWithRelationships.forEach(p => {
        console.log(`   ${p.name}: ${p.total} relationships (${p.asRater} given, ${p.asRated} received)`);
      });
    } else {
      console.log(`   ⚠️  No relationships found in sample`);
    }
    
    // 5. Check if we have the expected 45 unique profiles
    console.log(`\n5️⃣ TARGET VERIFICATION:`);
    const has45UniqueProfiles = uniqueActiveNames.length >= 45;
    const hasRelationships = allRatings.length > 0;
    const hasAnalytics = statsWithBodycount.length > 0;
    
    console.log(`   ✅ 45+ unique active profiles: ${has45UniqueProfiles ? 'YES' : 'NO'} (${uniqueActiveNames.length})`);
    console.log(`   ✅ Relationships exist: ${hasRelationships ? 'YES' : 'NO'} (${allRatings.length})`);
    console.log(`   ✅ Analytics working: ${hasAnalytics ? 'YES' : 'NO'} (${statsWithBodycount.length} with data)`);
    
    // 6. List all 45 unique active profiles
    console.log(`\n6️⃣ ALL UNIQUE ACTIVE PROFILES:`);
    uniqueActiveNames.sort().forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    
    // 7. Summary
    console.log(`\n📋 VERIFICATION SUMMARY:`);
    console.log('=' .repeat(40));
    if (has45UniqueProfiles && hasRelationships && hasAnalytics) {
      console.log(`✅ SUCCESS: Production database has ${uniqueActiveNames.length} unique profiles with relationships and analytics`);
    } else {
      console.log(`❌ ISSUES FOUND:`);
      if (!has45UniqueProfiles) console.log(`   - Only ${uniqueActiveNames.length} unique active profiles (need 45+)`);
      if (!hasRelationships) console.log(`   - No relationships found`);
      if (!hasAnalytics) console.log(`   - No analytics data`);
    }
    
  } catch (error) {
    console.error('❌ Error verifying production:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed.');
  }
}

verifyProductionProfilesAndRelationships();