const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://***REDACTED***@cluster0.qvunkxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function checkDatabases() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    console.log('\n=== BODIES DATABASE ===');
    const bodiesDb = client.db('bodies');
    const bodiesProfiles = await bodiesDb.collection('profiles').find({}).toArray();
    console.log('Profiles count:', bodiesProfiles.length);
    console.log('Profile names:', bodiesProfiles.map(p => p.name));
    
    console.log('\n=== BODIES_DEVELOPMENT DATABASE ===');
    const devDb = client.db('bodies_development');
    const devProfiles = await devDb.collection('profiles').find({}).toArray();
    console.log('Profiles count:', devProfiles.length);
    console.log('Profile names:', devProfiles.map(p => p.name));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkDatabases();