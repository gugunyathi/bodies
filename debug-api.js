require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function debugAPI() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    const profilesCollection = db.collection('profiles');
    const bodycountCollection = db.collection('bodycount_stats');
    
    // Get first 5 profiles like the API does
    const profiles = await profilesCollection
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log('First 5 profiles from API query:');
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name}`);
      console.log(`   _id: ${profile._id} (type: ${typeof profile._id})`);
      console.log(`   _id.toString(): ${profile._id.toString()}`);
    });
    
    // Get the profile IDs as strings
    const profileIds = profiles.map(p => p._id.toString());
    console.log('\nProfile IDs being searched:', profileIds);
    
    // Search for bodycount stats
    const stats = await bodycountCollection.find({
      profileId: { $in: profileIds }
    }).toArray();
    
    console.log('\nBodycount stats found:', stats.length);
    stats.forEach(stat => {
      console.log(`  ${stat.profileId}: dated=${stat.datedCount}, hookup=${stat.hookupCount}, transactional=${stat.transactionalCount}`);
    });
    
    // Also check what profileIds exist in bodycount_stats
    console.log('\nAll profileIds in bodycount_stats:');
    const allStats = await bodycountCollection.find({}).toArray();
    allStats.forEach(stat => {
      console.log(`  ${stat.profileId} (type: ${typeof stat.profileId})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debugAPI();