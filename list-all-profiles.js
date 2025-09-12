const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.production' });

async function listAllProfiles() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to production database...');
    await client.connect();
    
    const db = client.db('bodies');
    const profilesCollection = db.collection('profiles');
    
    // Get all profiles
    const profiles = await profilesCollection.find({}).toArray();
    
    console.log(`\n📊 Found ${profiles.length} profiles in the database:\n`);
    
    // Sort profiles alphabetically by name
    profiles.sort((a, b) => a.name.localeCompare(b.name));
    
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name}`);
      console.log(`   - ID: ${profile._id}`);
      console.log(`   - Body Count: ${profile.bodycount?.total || 0}`);
      console.log(`   - Active: ${profile.active ? 'Yes' : 'No'}`);
      console.log(`   - Image: ${profile.image || 'No image'}`);
      console.log(`   - Relationships: ${profile.relationships?.length || 0}`);
      console.log('');
    });
    
    // Summary statistics
    const activeProfiles = profiles.filter(p => p.active).length;
    const totalBodyCount = profiles.reduce((sum, p) => sum + (p.bodycount?.total || 0), 0);
    const avgBodyCount = profiles.length > 0 ? (totalBodyCount / profiles.length).toFixed(1) : 0;
    
    console.log('\n📈 Database Summary:');
    console.log(`   Total Profiles: ${profiles.length}`);
    console.log(`   Active Profiles: ${activeProfiles}`);
    console.log(`   Inactive Profiles: ${profiles.length - activeProfiles}`);
    console.log(`   Total Body Count: ${totalBodyCount}`);
    console.log(`   Average Body Count: ${avgBodyCount}`);
    
    // List profiles with highest body counts
    const topProfiles = profiles
      .filter(p => p.bodycount?.total > 0)
      .sort((a, b) => (b.bodycount?.total || 0) - (a.bodycount?.total || 0))
      .slice(0, 10);
    
    if (topProfiles.length > 0) {
      console.log('\n🏆 Top 10 Profiles by Body Count:');
      topProfiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.name} - ${profile.bodycount.total}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error listing profiles:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed.');
  }
}

listAllProfiles();