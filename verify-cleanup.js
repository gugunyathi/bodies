require('dotenv').config({ path: '.env.production' });
const { MongoClient } = require('mongodb');

async function verifyCleanup() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to production MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME || 'bodies');
    const profilesCollection = db.collection('profiles');
    const ratingsCollection = db.collection('ratings');
    const bodycountCollection = db.collection('bodycount_stats');
    
    // Get all profiles
    const allProfiles = await profilesCollection.find({}).toArray();
    const allRatings = await ratingsCollection.find({}).toArray();
    const allBodycounts = await bodycountCollection.find({}).toArray();
    
    console.log(`\n📊 Database Status After Cleanup:`);
    console.log(`   • Total profiles: ${allProfiles.length}`);
    console.log(`   • Total ratings: ${allRatings.length}`);
    console.log(`   • Total bodycount stats: ${allBodycounts.length}`);
    
    // Check for duplicates
    const profileNames = allProfiles.map(p => p.name);
    const uniqueNames = [...new Set(profileNames)];
    
    console.log(`\n🔍 Duplicate Check:`);
    console.log(`   • Unique profile names: ${uniqueNames.length}`);
    console.log(`   • Total profiles: ${allProfiles.length}`);
    
    if (uniqueNames.length === allProfiles.length) {
      console.log('   ✅ NO DUPLICATES FOUND - All profiles are unique!');
    } else {
      console.log('   ❌ DUPLICATES STILL EXIST!');
      
      // Find remaining duplicates
      const duplicates = {};
      profileNames.forEach(name => {
        duplicates[name] = (duplicates[name] || 0) + 1;
      });
      
      Object.keys(duplicates).forEach(name => {
        if (duplicates[name] > 1) {
          console.log(`      • ${name}: ${duplicates[name]} copies`);
        }
      });
    }
    
    // Check active profiles
    const activeProfiles = allProfiles.filter(p => p.isActive);
    console.log(`\n👥 Profile Status:`);
    console.log(`   • Active profiles: ${activeProfiles.length}`);
    console.log(`   • Inactive profiles: ${allProfiles.length - activeProfiles.length}`);
    
    // List all unique profiles
    console.log(`\n📋 All Unique Profiles (${uniqueNames.length}):`);
    uniqueNames.sort().forEach((name, index) => {
      const profile = allProfiles.find(p => p.name === name);
      const status = profile.isActive ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${name}`);
    });
    
    // Verify data integrity
    console.log(`\n🔗 Data Integrity Check:`);
    
    // Check if all ratings reference existing profiles
    const profileIds = new Set(allProfiles.map(p => p._id.toString()));
    let invalidRatings = 0;
    
    allRatings.forEach(rating => {
      if (!profileIds.has(rating.raterId?.toString()) || !profileIds.has(rating.rateeId?.toString())) {
        invalidRatings++;
      }
    });
    
    console.log(`   • Invalid ratings (orphaned): ${invalidRatings}`);
    
    // Check if all bodycount stats reference existing profiles
    let invalidBodycounts = 0;
    
    allBodycounts.forEach(bodycount => {
      if (!profileIds.has(bodycount.profileId?.toString())) {
        invalidBodycounts++;
      }
    });
    
    console.log(`   • Invalid bodycount stats (orphaned): ${invalidBodycounts}`);
    
    if (invalidRatings === 0 && invalidBodycounts === 0) {
      console.log('   ✅ All data references are valid!');
    } else {
      console.log('   ⚠️  Some orphaned data found - may need cleanup');
    }
    
    console.log(`\n🎉 Verification Summary:`);
    console.log(`   • Expected profiles: 45`);
    console.log(`   • Actual profiles: ${allProfiles.length}`);
    console.log(`   • Unique names: ${uniqueNames.length}`);
    console.log(`   • Status: ${allProfiles.length === 45 && uniqueNames.length === 45 ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}`);
    
  } catch (error) {
    console.error('❌ Error verifying cleanup:', error);
  } finally {
    await client.close();
  }
}

verifyCleanup();