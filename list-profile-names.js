const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.production' });

async function listProfileNames() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to production database...');
    await client.connect();
    
    const db = client.db('bodies');
    const profilesCollection = db.collection('profiles');
    
    // Get unique profile names only
    const uniqueNames = await profilesCollection.distinct('name');
    
    console.log(`\n📊 Found ${uniqueNames.length} unique profiles in the database:\n`);
    
    // Sort alphabetically
    uniqueNames.sort();
    
    uniqueNames.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`);
    });
    
    console.log(`\n📈 Total unique profiles: ${uniqueNames.length}`);
    
  } catch (error) {
    console.error('❌ Error listing profiles:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed.');
  }
}

listProfileNames();