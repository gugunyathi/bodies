require('dotenv').config({ path: '.env.production' });
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

async function deduplicateProfiles() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to production MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME || 'bodies');
    const profilesCollection = db.collection('profiles');
    const ratingsCollection = db.collection('ratings');
    const bodycountCollection = db.collection('bodycount_stats');
    
    // Step 1: Create backup
    console.log('\n📦 Creating backup before deduplication...');
    const allProfiles = await profilesCollection.find({}).toArray();
    const allRatings = await ratingsCollection.find({}).toArray();
    const allBodycounts = await bodycountCollection.find({}).toArray();
    
    const backup = {
      timestamp: new Date().toISOString(),
      profiles: allProfiles,
      ratings: allRatings,
      bodycount_stats: allBodycounts
    };
    
    fs.writeFileSync(`backup-before-deduplication-${Date.now()}.json`, JSON.stringify(backup, null, 2));
    console.log('✅ Backup created successfully');
    
    // Step 2: Analyze duplicates
    console.log('\n🔍 Analyzing duplicates...');
    const profilesByName = {};
    
    allProfiles.forEach(profile => {
      const name = profile.name;
      if (!profilesByName[name]) {
        profilesByName[name] = [];
      }
      profilesByName[name].push(profile);
    });
    
    // Step 3: Identify profiles to keep and remove
    const profilesToRemove = [];
    const profileMappings = {}; // old_id -> new_id mappings
    let duplicateGroups = 0;
    
    Object.keys(profilesByName).forEach(name => {
      const profiles = profilesByName[name];
      
      if (profiles.length > 1) {
        duplicateGroups++;
        console.log(`\n👤 Processing ${name} (${profiles.length} duplicates)`);
        
        // Calculate quality score for each profile
        const scoredProfiles = profiles.map(profile => {
          const score = 
            (profile.images ? profile.images.length * 3 : 0) +
            (profile.bio && profile.bio.length > 0 ? 2 : 0) +
            (profile.socialHandles ? Object.keys(profile.socialHandles).length : 0) +
            (profile.isActive ? 5 : 0) +
            (profile.isVerified ? 3 : 0);
          
          return { ...profile, qualityScore: score };
        });
        
        // Sort by quality score (highest first)
        scoredProfiles.sort((a, b) => b.qualityScore - a.qualityScore);
        
        const bestProfile = scoredProfiles[0];
        console.log(`   ✅ Keeping: ${bestProfile._id} (score: ${bestProfile.qualityScore})`);
        
        // Mark others for removal and create mappings
        for (let i = 1; i < scoredProfiles.length; i++) {
          const profileToRemove = scoredProfiles[i];
          profilesToRemove.push(profileToRemove._id);
          profileMappings[profileToRemove._id.toString()] = bestProfile._id;
          console.log(`   🗑️  Removing: ${profileToRemove._id} (score: ${profileToRemove.qualityScore})`);
        }
      }
    });
    
    console.log(`\n📊 Deduplication Summary:`);
    console.log(`   • Duplicate groups found: ${duplicateGroups}`);
    console.log(`   • Profiles to remove: ${profilesToRemove.length}`);
    console.log(`   • Profiles to keep: ${allProfiles.length - profilesToRemove.length}`);
    
    if (profilesToRemove.length === 0) {
      console.log('\n✅ No duplicates found! Database is already clean.');
      return;
    }
    
    // Step 4: Update ratings to point to kept profiles
    console.log('\n🔄 Updating ratings to reference kept profiles...');
    let ratingsUpdated = 0;
    
    for (const rating of allRatings) {
      let needsUpdate = false;
      const updates = {};
      
      if (profileMappings[rating.raterId?.toString()]) {
        updates.raterId = profileMappings[rating.raterId.toString()];
        needsUpdate = true;
      }
      
      if (profileMappings[rating.rateeId?.toString()]) {
        updates.rateeId = profileMappings[rating.rateeId.toString()];
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await ratingsCollection.updateOne(
          { _id: rating._id },
          { $set: updates }
        );
        ratingsUpdated++;
      }
    }
    
    console.log(`   ✅ Updated ${ratingsUpdated} ratings`);
    
    // Step 5: Update bodycount stats to point to kept profiles
    console.log('\n🔄 Updating bodycount stats to reference kept profiles...');
    let bodycountUpdated = 0;
    
    for (const bodycount of allBodycounts) {
      if (profileMappings[bodycount.profileId?.toString()]) {
        await bodycountCollection.updateOne(
          { _id: bodycount._id },
          { $set: { profileId: profileMappings[bodycount.profileId.toString()] } }
        );
        bodycountUpdated++;
      }
    }
    
    console.log(`   ✅ Updated ${bodycountUpdated} bodycount stats`);
    
    // Step 6: Remove duplicate profiles
    console.log('\n🗑️  Removing duplicate profiles...');
    const deleteResult = await profilesCollection.deleteMany({
      _id: { $in: profilesToRemove }
    });
    
    console.log(`   ✅ Removed ${deleteResult.deletedCount} duplicate profiles`);
    
    // Step 7: Remove orphaned ratings (ratings between removed profiles)
    console.log('\n🧹 Cleaning up orphaned ratings...');
    const orphanedRatings = await ratingsCollection.deleteMany({
      $or: [
        { raterId: { $in: profilesToRemove } },
        { rateeId: { $in: profilesToRemove } }
      ]
    });
    
    console.log(`   ✅ Removed ${orphanedRatings.deletedCount} orphaned ratings`);
    
    // Step 8: Remove orphaned bodycount stats
    console.log('\n🧹 Cleaning up orphaned bodycount stats...');
    const orphanedBodycounts = await bodycountCollection.deleteMany({
      profileId: { $in: profilesToRemove }
    });
    
    console.log(`   ✅ Removed ${orphanedBodycounts.deletedCount} orphaned bodycount stats`);
    
    // Step 9: Final verification
    console.log('\n✅ Deduplication completed! Verifying results...');
    
    const finalProfiles = await profilesCollection.find({}).toArray();
    const finalRatings = await ratingsCollection.find({}).toArray();
    const finalBodycounts = await bodycountCollection.find({}).toArray();
    
    const uniqueNames = [...new Set(finalProfiles.map(p => p.name))];
    
    console.log(`\n📊 Final Results:`);
    console.log(`   • Total profiles: ${finalProfiles.length}`);
    console.log(`   • Unique names: ${uniqueNames.length}`);
    console.log(`   • Total ratings: ${finalRatings.length}`);
    console.log(`   • Total bodycount stats: ${finalBodycounts.length}`);
    
    if (finalProfiles.length === uniqueNames.length) {
      console.log('\n🎉 SUCCESS: All profiles are now unique!');
    } else {
      console.log('\n⚠️  WARNING: Some duplicates may still exist');
    }
    
    // List final unique profiles
    console.log('\n👥 Final unique profiles:');
    uniqueNames.sort().forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
    
  } catch (error) {
    console.error('❌ Error during deduplication:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚨 WARNING: This script will permanently remove duplicate profiles from the production database!');
console.log('📦 A backup will be created before any changes are made.');
console.log('\nThis action cannot be undone without restoring from backup.');

rl.question('\nDo you want to proceed? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    deduplicateProfiles().then(() => {
      console.log('\n✅ Deduplication process completed!');
      rl.close();
    }).catch(error => {
      console.error('\n❌ Deduplication failed:', error);
      rl.close();
      process.exit(1);
    });
  } else {
    console.log('\n❌ Deduplication cancelled by user.');
    rl.close();
  }
});