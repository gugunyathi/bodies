const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bodies';

async function checkCelebrityStats() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('bodies');
    
    // Find Elon Musk and Sean Diddy Combs profiles
    const profiles = await db.collection('profiles').find({
      name: { $in: ['Elon Musk', 'Sean "Diddy" Combs'] }
    }).toArray();
    
    console.log('=== PROFILES FOUND ===');
    profiles.forEach(p => {
      console.log(`Name: ${p.name}`);
      console.log(`ID: ${p._id}`);
      console.log(`Active: ${p.isActive}`);
      console.log(`Verified: ${p.isVerified}`);
      console.log('---');
    });
    
    // Get their bodycount stats
    const profileIds = profiles.map(p => p._id.toString());
    const stats = await db.collection('bodycount_stats').find({
      profileId: { $in: profileIds }
    }).toArray();
    
    console.log('\n=== BODYCOUNT STATS ===');
    stats.forEach(s => {
      const profile = profiles.find(p => p._id.toString() === s.profileId);
      console.log(`Profile: ${profile ? profile.name : 'Unknown'}`);
      console.log(`ProfileID: ${s.profileId}`);
      console.log(`Dated: ${s.dated}`);
      console.log(`Hookup: ${s.hookup}`);
      console.log(`Transactional: ${s.transactional}`);
      console.log(`Total: ${s.total}`);
      console.log('---');
    });
    
    // Check for any ratings/relationships data
    const ratings = await db.collection('ratings').find({
      $or: [
        { raterId: { $in: profileIds } },
        { rateeId: { $in: profileIds } }
      ]
    }).toArray();
    
    console.log('\n=== RELATIONSHIP RATINGS ===');
    console.log(`Found ${ratings.length} ratings involving these profiles`);
    
    if (ratings.length > 0) {
      ratings.forEach(r => {
        const rater = profiles.find(p => p._id.toString() === r.raterId);
        const ratee = profiles.find(p => p._id.toString() === r.rateeId);
        console.log(`${rater ? rater.name : r.raterId} -> ${ratee ? ratee.name : r.rateeId}`);
        console.log(`Type: ${r.relationshipType}, Score: ${r.score}`);
        console.log(`Source: ${r.source || 'user'}, Evidence: ${r.evidenceType || 'none'}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkCelebrityStats();