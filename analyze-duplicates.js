require('dotenv').config({ path: '.env.production' });
const { MongoClient } = require('mongodb');

async function analyzeDuplicates() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to production MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME || 'bodies');
    const profilesCollection = db.collection('profiles');
    
    // Get all profiles
    const allProfiles = await profilesCollection.find({}).toArray();
    console.log(`\n📊 Total profiles in database: ${allProfiles.length}`);
    
    // Group profiles by name to find duplicates
    const profilesByName = {};
    
    allProfiles.forEach(profile => {
      const name = profile.name;
      if (!profilesByName[name]) {
        profilesByName[name] = [];
      }
      profilesByName[name].push({
        _id: profile._id,
        name: profile.name,
        isActive: profile.isActive,
        createdAt: profile.createdAt,
        images: profile.images ? profile.images.length : 0,
        bio: profile.bio ? profile.bio.length : 0,
        socialHandles: profile.socialHandles ? Object.keys(profile.socialHandles).length : 0
      });
    });
    
    // Find duplicates
    const duplicates = {};
    const uniqueNames = [];
    let totalDuplicateProfiles = 0;
    
    Object.keys(profilesByName).forEach(name => {
      if (profilesByName[name].length > 1) {
        duplicates[name] = profilesByName[name];
        totalDuplicateProfiles += profilesByName[name].length - 1; // -1 because we keep one
      } else {
        uniqueNames.push(name);
      }
    });
    
    console.log(`\n🔍 Analysis Results:`);
    console.log(`   • Unique profiles (no duplicates): ${uniqueNames.length}`);
    console.log(`   • Profiles with duplicates: ${Object.keys(duplicates).length}`);
    console.log(`   • Total duplicate profiles to remove: ${totalDuplicateProfiles}`);
    console.log(`   • Expected final count: ${allProfiles.length - totalDuplicateProfiles}`);
    
    console.log(`\n📋 Detailed Duplicate Analysis:`);
    
    Object.keys(duplicates).forEach(name => {
      const profiles = duplicates[name];
      console.log(`\n👤 ${name} (${profiles.length} copies):`);
      
      profiles.forEach((profile, index) => {
        const score = (profile.images * 3) + (profile.bio > 0 ? 2 : 0) + (profile.socialHandles * 1) + (profile.isActive ? 5 : 0);
        console.log(`   ${index + 1}. ID: ${profile._id}`);
        console.log(`      • Active: ${profile.isActive}`);
        console.log(`      • Images: ${profile.images}`);
        console.log(`      • Bio length: ${profile.bio}`);
        console.log(`      • Social handles: ${profile.socialHandles}`);
        console.log(`      • Created: ${profile.createdAt}`);
        console.log(`      • Quality score: ${score}`);
      });
      
      // Recommend which to keep
      const bestProfile = profiles.reduce((best, current) => {
        const bestScore = (best.images * 3) + (best.bio > 0 ? 2 : 0) + (best.socialHandles * 1) + (best.isActive ? 5 : 0);
        const currentScore = (current.images * 3) + (current.bio > 0 ? 2 : 0) + (current.socialHandles * 1) + (current.isActive ? 5 : 0);
        return currentScore > bestScore ? current : best;
      });
      
      console.log(`   ✅ RECOMMENDED TO KEEP: ${bestProfile._id} (highest quality score)`);
    });
    
    // Generate removal list
    const profilesToRemove = [];
    
    Object.keys(duplicates).forEach(name => {
      const profiles = duplicates[name];
      
      // Find the best profile to keep
      const bestProfile = profiles.reduce((best, current) => {
        const bestScore = (best.images * 3) + (best.bio > 0 ? 2 : 0) + (best.socialHandles * 1) + (best.isActive ? 5 : 0);
        const currentScore = (current.images * 3) + (current.bio > 0 ? 2 : 0) + (current.socialHandles * 1) + (current.isActive ? 5 : 0);
        return currentScore > bestScore ? current : best;
      });
      
      // Add all others to removal list
      profiles.forEach(profile => {
        if (profile._id.toString() !== bestProfile._id.toString()) {
          profilesToRemove.push(profile._id);
        }
      });
    });
    
    console.log(`\n🗑️  Profiles to remove (${profilesToRemove.length} total):`);
    profilesToRemove.forEach(id => {
      console.log(`   • ${id}`);
    });
    
    console.log(`\n✅ Analysis complete!`);
    console.log(`   • Current total: ${allProfiles.length} profiles`);
    console.log(`   • After cleanup: ${allProfiles.length - profilesToRemove.length} profiles`);
    console.log(`   • Expected unique names: ${Object.keys(profilesByName).length}`);
    
  } catch (error) {
    console.error('❌ Error analyzing duplicates:', error);
  } finally {
    await client.close();
  }
}

analyzeDuplicates();