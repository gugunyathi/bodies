const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://***REDACTED***@cluster0.qvunkxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function checkProfileStatus() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('bodies');
    const collection = db.collection('profiles');
    
    // Check all profiles and their isActive status
    const allProfiles = await collection.find({}).toArray();
    console.log('\n=== ALL PROFILES ===');
    console.log('Total profiles:', allProfiles.length);
    
    allProfiles.forEach(profile => {
      console.log(`${profile.name}: isActive = ${profile.isActive}`);
    });
    
    // Check active profiles only
    const activeProfiles = await collection.find({ isActive: true }).toArray();
    console.log('\n=== ACTIVE PROFILES ===');
    console.log('Active profiles count:', activeProfiles.length);
    console.log('Active profile names:', activeProfiles.map(p => p.name));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkProfileStatus();