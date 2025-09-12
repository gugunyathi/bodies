const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// MongoDB connection string from environment
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;
const collectionName = 'profiles';

// Profiles that need image updates
const profilesToUpdate = [
  { name: 'Lori Harvey', imagePath: '/Lori Harvey.png' },
  { name: 'Miracle Watts', imagePath: '/Miracle Watts.png' },
  { name: 'Cameron Diaz', imagePath: '/Cameron Diaz.png' },
  { name: 'Emma Heming', imagePath: '/Emma Heming.png' },
  { name: 'Gina Huynh', imagePath: '/Gina Huynh.png' },
  { name: 'Joie Chavis', imagePath: '/Joie Chavis.png' },
  { name: 'Sienna Miller', imagePath: '/Sienna Miller.png' }
];

async function fixMissingImages() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    console.log('\nUpdating profiles with missing images...');
    
    for (const profile of profilesToUpdate) {
      console.log(`\nProcessing: ${profile.name}`);
      
      // First, check current state
      const currentProfile = await collection.findOne({ name: profile.name });
      if (!currentProfile) {
        console.log(`  ❌ Profile not found: ${profile.name}`);
        continue;
      }
      
      console.log(`  Current images: ${currentProfile.images ? currentProfile.images.length : 'undefined'}`);
      
      // Update the profile with the image path
      const updateResult = await collection.updateOne(
        { name: profile.name },
        { 
          $set: { 
            images: [profile.imagePath],
            image: profile.imagePath // Also set single image field for compatibility
          } 
        }
      );
      
      if (updateResult.modifiedCount > 0) {
        console.log(`  ✅ Successfully updated ${profile.name} with image: ${profile.imagePath}`);
      } else {
        console.log(`  ⚠️  No changes made to ${profile.name}`);
      }
    }
    
    console.log('\n=== Verification ===');
    
    // Verify the updates
    for (const profile of profilesToUpdate) {
      const updatedProfile = await collection.findOne({ name: profile.name });
      if (updatedProfile) {
        console.log(`${profile.name}: ${updatedProfile.images ? updatedProfile.images.length : 0} images`);
        if (updatedProfile.images && updatedProfile.images.length > 0) {
          console.log(`  Image path: ${updatedProfile.images[0]}`);
        }
      }
    }
    
    console.log('\n✅ Image update process completed!');
    
  } catch (error) {
    console.error('Error updating profiles:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the fix
fixMissingImages().catch(console.error);