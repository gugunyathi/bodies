const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.production' });

async function checkActiveProfiles() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to production database...');
    await client.connect();
    
    const db = client.db('bodies');
    const profilesCollection = db.collection('profiles');
    
    // Check active vs inactive profiles
    const activeProfiles = await profilesCollection.find({ isActive: true }).toArray();
    const inactiveProfiles = await profilesCollection.find({ isActive: false }).toArray();
    const nullActiveProfiles = await profilesCollection.find({ isActive: { $exists: false } }).toArray();
    
    console.log(`\n📊 Profile Activity Status:`);
    console.log(`   Active profiles (isActive: true): ${activeProfiles.length}`);
    console.log(`   Inactive profiles (isActive: false): ${inactiveProfiles.length}`);
    console.log(`   Profiles without isActive field: ${nullActiveProfiles.length}`);
    
    if (activeProfiles.length > 0) {
      console.log('\n✅ Active Profiles:');
      activeProfiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.name} (ID: ${profile._id})`);
      });
    }
    
    // Check what the API query would return
    const apiQuery = { isActive: true };
    const apiProfiles = await profilesCollection.find(apiQuery).limit(10).toArray();
    console.log(`\n🔍 API Query Result (isActive: true, limit 10): ${apiProfiles.length} profiles`);
    
    if (apiProfiles.length > 0) {
      console.log('   First 10 API profiles:');
      apiProfiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.name}`);
      });
    }
    
    // Check if there are profiles with different field names
    const activeFieldVariations = await profilesCollection.find({ active: true }).toArray();
    console.log(`\n🔍 Profiles with 'active: true' field: ${activeFieldVariations.length}`);
    
  } catch (error) {
    console.error('❌ Error checking profiles:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed.');
  }
}

checkActiveProfiles();