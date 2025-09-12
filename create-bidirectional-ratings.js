const { MongoClient } = require('mongodb');

// Production MongoDB URI from .env.production
const PRODUCTION_MONGODB_URI = 'mongodb+srv://***REDACTED***@cluster0.qvunkxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const PRODUCTION_DB_NAME = 'bodies';

// Helper function to generate ObjectId-like string
function generateObjectId() {
  return Math.floor(Date.now() / 1000).toString(16) + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => {
    return Math.floor(Math.random() * 16).toString(16);
  });
}

async function createBidirectionalRatings() {
  console.log('🔄 Creating bidirectional ratings for Kim Kardashian...');
  
  const client = new MongoClient(PRODUCTION_MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to production MongoDB');
    
    const db = client.db(PRODUCTION_DB_NAME);
    const profilesCollection = db.collection('profiles');
    const ratingsCollection = db.collection('ratings');
    
    // Get Kim Kardashian's profile
    const kimProfile = await profilesCollection.findOne({ name: 'Kim Kardashian' });
    if (!kimProfile) {
      throw new Error('Kim Kardashian profile not found');
    }
    
    console.log(`📝 Found Kim Kardashian with ID: ${kimProfile._id}`);
    
    // Get all ratings created by Kim (using string ID format)
    const kimStringId = 'system-kim-kardashian';
    const kimRatings = await ratingsCollection.find({ raterId: kimStringId }).toArray();
    console.log(`💕 Found ${kimRatings.length} ratings created by Kim`);
    
    // Also check for ObjectId format
    const kimObjectIdRatings = await ratingsCollection.find({ raterId: kimProfile._id }).toArray();
    console.log(`💕 Found ${kimObjectIdRatings.length} ratings created by Kim (ObjectId format)`);
    
    let createdCount = 0;
    let skippedCount = 0;
    
    // Create reverse ratings (partners rating Kim back)
    console.log('\n🔄 Creating reverse ratings...');
    
    for (const rating of kimRatings) {
      // Get the partner profile
      const partnerProfile = await profilesCollection.findOne({ _id: rating.profileId });
      if (!partnerProfile) {
        console.log(`⚠️  Partner profile not found for ID: ${rating.profileId}`);
        continue;
      }
      
      // Check if reverse rating already exists (check both string and ObjectId formats)
      const existingReverse = await ratingsCollection.findOne({
        $or: [
          { raterId: partnerProfile._id, profileId: kimProfile._id },
          { raterId: partnerProfile._id, profileId: kimStringId },
          { raterId: `system-${partnerProfile.name.toLowerCase().replace(/\s+/g, '-')}`, profileId: kimStringId }
        ]
      });
      
      if (existingReverse) {
        console.log(`ℹ️  Reverse rating already exists: ${partnerProfile.name} -> Kim`);
        skippedCount++;
        continue;
      }
      
      // Create reverse rating using string ID format for consistency
      const partnerStringId = `system-${partnerProfile.name.toLowerCase().replace(/\s+/g, '-')}`;
      const reverseRatingId = generateObjectId();
      const reverseRating = {
        _id: reverseRatingId,
        raterId: partnerStringId,
        profileId: kimStringId,
        ratingType: rating.ratingType,
        isAnonymous: false,
        evidence: [],
        notes: `Mutual relationship with Kim Kardashian`,
        duration: rating.duration,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      try {
        await ratingsCollection.insertOne(reverseRating);
        console.log(`✅ Created reverse rating: ${partnerProfile.name} -> Kim (${rating.ratingType})`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Error creating reverse rating for ${partnerProfile.name}:`, error.message);
      }
    }
    
    // Verify Kim's new body count (check both string and ObjectId formats)
    console.log('\n🔍 Verifying results...');
    const kimBodyCountRatings = await ratingsCollection.find({ 
      $or: [
        { profileId: kimProfile._id },
        { profileId: kimStringId }
      ]
    }).toArray();
    const newBodyCount = kimBodyCountRatings.length;
    
    console.log('\n🎉 Bidirectional ratings creation completed!');
    console.log(`📊 Created ${createdCount} new reverse ratings`);
    console.log(`⏭️  Skipped ${skippedCount} existing ratings`);
    console.log(`💯 Kim Kardashian's new body count: ${newBodyCount}`);
    
    if (newBodyCount > 0) {
      console.log('\n🏆 Kim Kardashian should now appear on the leaderboards!');
      
      // Show breakdown of ratings
      console.log('\n📋 Rating breakdown:');
      const ratingTypes = {};
      kimBodyCountRatings.forEach(rating => {
        ratingTypes[rating.ratingType] = (ratingTypes[rating.ratingType] || 0) + 1;
      });
      
      Object.entries(ratingTypes).forEach(([type, count]) => {
        console.log(`  • ${type}: ${count}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating bidirectional ratings:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Production database connection closed');
  }
}

// Run the script
if (require.main === module) {
  createBidirectionalRatings()
    .then(() => {
      console.log('\n✨ Bidirectional ratings process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Bidirectional ratings process failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createBidirectionalRatings };