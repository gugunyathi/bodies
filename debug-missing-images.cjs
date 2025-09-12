const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkSpecificProfiles() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    const profiles = await db.collection('profiles').find({
      name: { 
        '$in': [
          'Lori Harvey', 'Miracle Watts', 'Cameron Diaz', 'Emma Heming', 
          'Gina Huynh', 'Joie Chavis', 'Sienna Miller', 
          'Sean "Diddy" Combs', 'Kim Porter'
        ] 
      }
    }).toArray();
    
    console.log('Profile comparison:');
    profiles.forEach(p => {
      console.log('Name:', p.name);
      console.log('Images array:', p.images);
      console.log('Images count:', p.images ? p.images.length : 0);
      console.log('Active:', p.isActive);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkSpecificProfiles();