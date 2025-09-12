require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkProfiles() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    const profilesCollection = db.collection('profiles');
    const bodycountCollection = db.collection('bodycount_stats');
    
    // Get a sample profile
    const sampleProfile = await profilesCollection.findOne();
    console.log('Sample profile document:');
    console.log(`  _id: ${sampleProfile._id} (type: ${typeof sampleProfile._id})`);
    console.log(`  profileId: ${sampleProfile.profileId} (type: ${typeof sampleProfile.profileId})`);
    console.log(`  name: ${sampleProfile.name}`);
    
    // Check if there's a bodycount_stats entry for this profile
    const bodycountStats = await bodycountCollection.findOne({ profileId: sampleProfile.profileId });
    console.log('\nBodycount stats for this profile:');
    if (bodycountStats) {
      console.log(`  Found stats: dated=${bodycountStats.datedCount}, hookup=${bodycountStats.hookupCount}, transactional=${bodycountStats.transactionalCount}`);
    } else {
      console.log('  No stats found');
    }
    
    // Also check with _id as string
    const bodycountStatsById = await bodycountCollection.findOne({ profileId: sampleProfile._id.toString() });
    console.log('\nBodycount stats using _id as string:');
    if (bodycountStatsById) {
      console.log(`  Found stats: dated=${bodycountStatsById.datedCount}, hookup=${bodycountStatsById.hookupCount}, transactional=${bodycountStatsById.transactionalCount}`);
    } else {
      console.log('  No stats found');
    }
    
    // Get a few profiles that should have stats
    console.log('\nChecking specific profiles with known stats:');
    const knownProfiles = ['system-sean-diddy-combs', 'system-jennifer-lopez', 'system-kim-kardashian'];
    
    for (const profileId of knownProfiles) {
      const profile = await profilesCollection.findOne({ profileId });
      const stats = await bodycountCollection.findOne({ profileId });
      
      console.log(`\n${profileId}:`);
      console.log(`  Profile exists: ${!!profile}`);
      console.log(`  Stats exist: ${!!stats}`);
      if (stats) {
        console.log(`  Stats: dated=${stats.datedCount}, hookup=${stats.hookupCount}, transactional=${stats.transactionalCount}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkProfiles();