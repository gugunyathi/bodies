const { MongoClient } = require('mongodb');

// Production MongoDB URI from .env.production
const PRODUCTION_MONGODB_URI = 'mongodb+srv://***REDACTED***@cluster0.qvunkxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const PRODUCTION_DB_NAME = 'bodies';

async function verifyProductionMigration() {
  console.log('🔍 Verifying Kim Kardashian migration in production database...');
  
  const client = new MongoClient(PRODUCTION_MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to production MongoDB');
    
    const db = client.db(PRODUCTION_DB_NAME);
    const profilesCollection = db.collection('profiles');
    const ratingsCollection = db.collection('ratings');
    
    // Find Kim Kardashian's profile
    console.log('\n📝 Checking Kim Kardashian profile...');
    const kimProfile = await profilesCollection.findOne({ name: 'Kim Kardashian' });
    
    if (!kimProfile) {
      console.error('❌ Kim Kardashian profile not found in production!');
      return;
    }
    
    console.log(`✅ Kim Kardashian found with ID: ${kimProfile._id}`);
    console.log(`📍 Location: ${kimProfile.location}`);
    console.log(`📱 Instagram: ${kimProfile.socialHandles?.instagram}`);
    
    // Check her ratings
    console.log('\n💕 Checking Kim Kardashian ratings...');
    const kimRatings = await ratingsCollection.find({ raterId: kimProfile._id }).toArray();
    
    console.log(`📊 Total ratings created by Kim: ${kimRatings.length}`);
    
    if (kimRatings.length > 0) {
      console.log('\n🔗 Relationship ratings:');
      for (const rating of kimRatings) {
        // Get the partner profile
        const partnerProfile = await profilesCollection.findOne({ _id: rating.profileId });
        const partnerName = partnerProfile ? partnerProfile.name : 'Unknown';
        console.log(`  • ${partnerName}: ${rating.ratingType} (${rating.duration || 'No duration'})`);
      }
    }
    
    // Check ratings received by Kim (body count)
    console.log('\n📈 Checking ratings received by Kim (body count)...');
    const ratingsForKim = await ratingsCollection.find({ profileId: kimProfile._id }).toArray();
    console.log(`📊 Total ratings received by Kim: ${ratingsForKim.length}`);
    
    if (ratingsForKim.length > 0) {
      console.log('\n👥 Ratings from others:');
      for (const rating of ratingsForKim) {
        const raterProfile = await profilesCollection.findOne({ _id: rating.raterId });
        const raterName = raterProfile ? raterProfile.name : 'Anonymous';
        console.log(`  • From ${raterName}: ${rating.ratingType}`);
      }
    }
    
    // Check relationship partners
    console.log('\n👥 Checking relationship partner profiles...');
    const partnerNames = [
      'Damon Thomas', 'Ray J', 'Nick Cannon', 'Reggie Bush', 
      'Miles Austin', 'Kris Humphries', 'Kanye West', 
      'Pete Davidson', 'Odell Beckham Jr.'
    ];
    
    let foundPartners = 0;
    for (const partnerName of partnerNames) {
      const partner = await profilesCollection.findOne({ name: partnerName });
      if (partner) {
        foundPartners++;
        console.log(`✅ ${partnerName} found with ID: ${partner._id}`);
      } else {
        console.log(`❌ ${partnerName} not found`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  • Kim Kardashian profile: ${kimProfile ? '✅' : '❌'}`);
    console.log(`  • Relationship partners found: ${foundPartners}/${partnerNames.length}`);
    console.log(`  • Ratings created by Kim: ${kimRatings.length}`);
    console.log(`  • Ratings received by Kim: ${ratingsForKim.length}`);
    
    // Calculate body count (should be same as ratings received)
    const bodyCount = ratingsForKim.length;
    console.log(`  • Kim's body count: ${bodyCount}`);
    
    if (bodyCount > 0) {
      console.log('\n🎉 Migration successful! Kim Kardashian should now appear on leaderboards.');
    } else {
      console.log('\n⚠️  Kim has no body count yet. Ratings may need to be created by other users.');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Production database connection closed');
  }
}

// Run the verification
if (require.main === module) {
  verifyProductionMigration()
    .then(() => {
      console.log('\n✨ Verification completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = { verifyProductionMigration };