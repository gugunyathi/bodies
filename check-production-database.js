const { MongoClient } = require('mongodb');

// Production MongoDB connection
const MONGODB_URI = 'mongodb+srv://***REDACTED***@cluster0.qvunkxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'bodies';

async function checkProductionDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔍 Connecting to production database...');
    await client.connect();
    
    const db = client.db(DB_NAME);
    const profilesCollection = db.collection('profiles');
    const ratingsCollection = db.collection('ratings');
    const statsCollection = db.collection('bodycount_stats');
    
    // Check total profiles
    const totalProfiles = await profilesCollection.countDocuments();
    console.log(`📊 Total profiles in database: ${totalProfiles}`);
    
    // Check active profiles
    const activeProfiles = await profilesCollection.countDocuments({ isActive: true });
    console.log(`✅ Active profiles: ${activeProfiles}`);
    
    // Get unique active profile names
    const uniqueActiveNames = await profilesCollection.distinct('name', { isActive: true });
    console.log(`🎭 Unique active profile names: ${uniqueActiveNames.length}`);
    console.log('📝 Names:', uniqueActiveNames.sort());
    
    // Check for duplicates
    const duplicateCheck = await profilesCollection.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$name', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    if (duplicateCheck.length > 0) {
      console.log('⚠️  DUPLICATE PROFILES FOUND:');
      duplicateCheck.forEach(dup => {
        console.log(`   - ${dup._id}: ${dup.count} copies`);
      });
    } else {
      console.log('✅ No duplicate profiles found');
    }
    
    // Check ratings
    const totalRatings = await ratingsCollection.countDocuments();
    console.log(`💕 Total ratings: ${totalRatings}`);
    
    // Check stats
    const totalStats = await statsCollection.countDocuments();
    console.log(`📈 Total bodycount stats: ${totalStats}`);
    
    // Check which database we're actually in
    const collections = await db.listCollections().toArray();
    console.log('\n🗂️  Available collections:', collections.map(c => c.name));
    
    // Sample a few profiles to verify data quality
    const sampleProfiles = await profilesCollection.find({ isActive: true }).limit(5).toArray();
    console.log('\n📋 Sample profiles:');
    sampleProfiles.forEach(profile => {
      console.log(`   - ${profile.name} (ID: ${profile._id})`);
    });
    
    console.log('\n🎯 SUMMARY:');
    console.log(`   Database: ${DB_NAME}`);
    console.log(`   Total Profiles: ${totalProfiles}`);
    console.log(`   Active Profiles: ${activeProfiles}`);
    console.log(`   Unique Names: ${uniqueActiveNames.length}`);
    console.log(`   Duplicates: ${duplicateCheck.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   Ratings: ${totalRatings}`);
    console.log(`   Stats: ${totalStats}`);
    
    if (uniqueActiveNames.length === 45 && duplicateCheck.length === 0) {
      console.log('\n🎉 DATABASE STATUS: CORRECT - 45 unique profiles, no duplicates');
    } else {
      console.log('\n❌ DATABASE STATUS: INCORRECT - Expected 45 unique profiles');
    }
    
  } catch (error) {
    console.error('❌ Error checking production database:', error);
  } finally {
    await client.close();
  }
}

checkProductionDatabase();