const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://***REDACTED***@cluster0.qvunkxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Names of profiles that need to be activated
const profilesToActivate = [
  'Cameron Diaz',
  'Emma Heming',
  'Gina Huynh',
  'Joie Chavis',
  'Lori Harvey',
  'Miracle Watts',
  'Sienna Miller'
];

async function updateProfilesActive() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('bodies');
    const collection = db.collection('profiles');
    
    // Update profiles to set isActive: true
    const result = await collection.updateMany(
      { name: { $in: profilesToActivate } },
      { $set: { isActive: true } }
    );
    
    console.log(`Updated ${result.modifiedCount} profiles to active status`);
    
    // Verify the update
    const activeProfiles = await collection.find({ isActive: true }).toArray();
    console.log(`Total active profiles now: ${activeProfiles.length}`);
    console.log('Active profile names:', activeProfiles.map(p => p.name));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

updateProfilesActive();