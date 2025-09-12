const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// Production MongoDB URI
const PRODUCTION_MONGODB_URI = 'mongodb+srv://***REDACTED***@cluster0.qvunkxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const PRODUCTION_DB_NAME = 'bodies';

async function updateNickCannonImage() {
  console.log('🔍 Updating Nick Cannon image in production database...');
  
  const client = new MongoClient(PRODUCTION_MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to production MongoDB');
    
    const db = client.db(PRODUCTION_DB_NAME);
    const profilesCollection = db.collection('profiles');
    
    // Find Nick Cannon's profile
    console.log('\n📝 Checking Nick Cannon profile...');
    const nickProfile = await profilesCollection.findOne({ name: 'Nick Cannon' });
    
    if (!nickProfile) {
      console.error('❌ Nick Cannon profile not found in production!');
      return;
    }
    
    console.log(`✅ Nick Cannon found with ID: ${nickProfile._id}`);
    console.log(`📸 Current image: ${nickProfile.images ? nickProfile.images[0] : 'No image'}`);
    console.log(`📍 Location: ${nickProfile.location}`);
    console.log(`📱 Instagram: ${nickProfile.socialHandles?.instagram}`);
    
    // Update his image to the new one
    const updatedProfile = {
      ...nickProfile,
      images: ['/Nick Cannon.png'], // Ensure the image path is correct
      updatedAt: new Date()
    };
    
    console.log('\n🔄 Updating Nick Cannon profile with new image...');
    const updateResult = await profilesCollection.replaceOne(
      { _id: nickProfile._id },
      updatedProfile
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('✅ Nick Cannon profile updated successfully!');
      console.log(`📸 New image path: ${updatedProfile.images[0]}`);
    } else {
      console.log('ℹ️  No changes made to Nick Cannon profile');
    }
    
    // Verify the update
    const verifyProfile = await profilesCollection.findOne({ name: 'Nick Cannon' });
    console.log('\n🔍 Verification:');
    console.log(`📸 Current image: ${verifyProfile.images ? verifyProfile.images[0] : 'No image'}`);
    console.log(`🕒 Last updated: ${verifyProfile.updatedAt}`);
    
  } catch (error) {
    console.error('❌ Error updating Nick Cannon profile:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the update
updateNickCannonImage().catch(console.error);