import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI || 'mongodb+srv://***REDACTED***@cluster0.qvunkxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function checkProfileCount() {
  const client = new MongoClient(uri);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('bodies');
    const profilesCollection = db.collection('profiles');
    
    // Get total count
    const totalCount = await profilesCollection.countDocuments();
    console.log(`\n📊 Total profiles in database: ${totalCount}`);
    
    // Get active profiles count
    const activeCount = await profilesCollection.countDocuments({ isActive: true });
    console.log(`📊 Active profiles: ${activeCount}`);
    
    // Get inactive profiles count
    const inactiveCount = await profilesCollection.countDocuments({ isActive: false });
    console.log(`📊 Inactive profiles: ${inactiveCount}`);
    
    // List some profile names
    const profiles = await profilesCollection.find({ isActive: true }).limit(10).toArray();
    console.log('\n👥 Sample active profiles:');
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name} (${profile.age} years old)`);
    });
    
    if (totalCount > 10) {
      console.log(`... and ${totalCount - 10} more profiles`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

checkProfileCount();