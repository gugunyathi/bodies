const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'bodies';

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment variables');
  process.exit(1);
}
const PROFILES_COLLECTION = 'profiles';
const RATINGS_COLLECTION = 'ratings';
const BODYCOUNT_STATS_COLLECTION = 'bodycount_stats';

// Celebrity relationship data extracted from test-profiles page
const celebrityRelationships = {
  'Sean "Diddy" Combs': {
    confirmed: [
      { name: 'Kim Porter', relationship: 'Long-term partner', duration: '1994-2007 (on/off)', type: 'dated' },
      { name: 'Cassie Ventura', relationship: 'Girlfriend', duration: '2007-2018', type: 'dated' },
      { name: 'Jennifer Lopez', relationship: 'Girlfriend', duration: '1999-2001', type: 'dated' },
      { name: 'Sarah Chapman', relationship: 'Brief relationship', duration: '2006-2007', type: 'hookup' },
      { name: 'Misa Hylton-Brim', relationship: 'High school sweetheart', duration: '1991-1995', type: 'dated' },
      { name: 'Yung Miami (Caresha Brownlee)', relationship: 'Current partner', duration: '2022-present', type: 'dated' }
    ]
  },
  'Kim Porter': {
    confirmed: [
      { name: 'Sean "Diddy" Combs', relationship: 'Long-term partner', duration: '1994-2007 (on/off)', type: 'dated' },
      { name: 'Al B. Sure!', relationship: 'Relationship', duration: '1989-1990', type: 'dated' }
    ]
  },
  'Cassie Ventura': {
    confirmed: [
      { name: 'Sean "Diddy" Combs', relationship: 'Girlfriend', duration: '2007-2018', type: 'dated' },
      { name: 'Alex Fine', relationship: 'Husband', duration: '2018-present', type: 'dated' }
    ]
  },
  'Jennifer Lopez': {
    confirmed: [
      { name: 'Sean "Diddy" Combs', relationship: 'Girlfriend', duration: '1999-2001', type: 'dated' },
      { name: 'Ojani Noa', relationship: 'Husband', duration: '1997-1998', type: 'dated' },
      { name: 'Cris Judd', relationship: 'Husband', duration: '2001-2003', type: 'dated' },
      { name: 'Ben Affleck', relationship: 'Fiancé', duration: '2002-2004, 2021-2024', type: 'dated' },
      { name: 'Marc Anthony', relationship: 'Husband', duration: '2004-2014', type: 'dated' },
      { name: 'Casper Smart', relationship: 'Boyfriend', duration: '2011-2016', type: 'dated' },
      { name: 'Alex Rodriguez', relationship: 'Fiancé', duration: '2017-2021', type: 'dated' }
    ]
  },
  'Sarah Chapman': {
    confirmed: [
      { name: 'Sean "Diddy" Combs', relationship: 'Brief relationship', duration: '2006-2007', type: 'hookup' }
    ]
  },
  'Misa Hylton-Brim': {
    confirmed: [
      { name: 'Sean "Diddy" Combs', relationship: 'High school sweetheart', duration: '1991-1995', type: 'dated' },
      { name: 'JoJo Brim', relationship: 'Husband', duration: '1995-2000s', type: 'dated' }
    ]
  },
  'Yung Miami (Caresha Brownlee)': {
    confirmed: [
      { name: 'Sean "Diddy" Combs', relationship: 'Current partner', duration: '2022-present', type: 'dated' },
      { name: 'Jai Wiggins', relationship: 'Ex-boyfriend', duration: '2015-2020', type: 'dated' },
      { name: 'Southside', relationship: 'Ex-boyfriend', duration: '2018-2020', type: 'dated' }
    ]
  },
  'Cameron Diaz': {
    confirmed: [
      { name: 'Justin Timberlake', relationship: 'Boyfriend', duration: '2003-2007', type: 'dated' },
      { name: 'Benji Madden', relationship: 'Husband', duration: '2014-present', type: 'dated' }
    ]
  },
  'Elon Musk': {
    confirmed: [
      { name: 'Justine Wilson', relationship: 'Ex-wife', duration: '2000-2008', type: 'dated' },
      { name: 'Talulah Riley', relationship: 'Ex-wife', duration: '2010-2012, 2013-2016', type: 'dated' },
      { name: 'Grimes (Claire Boucher)', relationship: 'Ex-girlfriend', duration: '2018-2021', type: 'dated' },
      { name: 'Shivon Zilis', relationship: 'Relationship', duration: '2021-2022', type: 'dated' },
      { name: 'Ashley St. Clair', relationship: 'Brief relationship', duration: '2022', type: 'hookup' },
      { name: 'Natasha Bassett', relationship: 'Girlfriend', duration: '2022', type: 'dated' },
      { name: 'Jennifer Gwynne', relationship: 'College girlfriend', duration: '1994-1995', type: 'dated' },
      { name: 'Amber Heard', relationship: 'Ex-girlfriend', duration: '2016-2017', type: 'dated' }
    ]
  },
  'Justine Wilson': {
    confirmed: [
      { name: 'Elon Musk', relationship: 'Ex-husband', duration: '2000-2008', type: 'dated' }
    ]
  },
  'Talulah Riley': {
    confirmed: [
      { name: 'Elon Musk', relationship: 'Ex-husband', duration: '2010-2012, 2013-2016', type: 'dated' }
    ]
  },
  'Grimes (Claire Boucher)': {
    confirmed: [
      { name: 'Elon Musk', relationship: 'Ex-boyfriend', duration: '2018-2021', type: 'dated' }
    ]
  },
  'Shivon Zilis': {
    confirmed: [
      { name: 'Elon Musk', relationship: 'Relationship', duration: '2021-2022', type: 'dated' }
    ]
  },
  'Ashley St. Clair': {
    confirmed: [
      { name: 'Elon Musk', relationship: 'Brief relationship', duration: '2022', type: 'hookup' }
    ]
  },
  'Natasha Bassett': {
    confirmed: [
      { name: 'Elon Musk', relationship: 'Ex-girlfriend', duration: '2022', type: 'dated' }
    ]
  },
  'Jennifer Gwynne': {
    confirmed: [
      { name: 'Elon Musk', relationship: 'College girlfriend', duration: '1994-1995', type: 'dated' }
    ]
  },
  'Amber Heard': {
    confirmed: [
      { name: 'Johnny Depp', relationship: 'Ex-husband', duration: '2015-2017', type: 'dated' },
      { name: 'Elon Musk', relationship: 'Ex-boyfriend', duration: '2016-2017', type: 'dated' }
    ]
  },
  'Cara Delevingne': {
    confirmed: [
      { name: 'Ashley Benson', relationship: 'Ex-girlfriend', duration: '2018-2020', type: 'dated' }
    ]
  },
  'Rihanna': {
    confirmed: [
      { name: 'A$AP Rocky', relationship: 'Partner', duration: '2020-present', type: 'dated' },
      { name: 'Chris Brown', relationship: 'Ex-boyfriend', duration: '2007-2009, 2012-2013', type: 'dated' },
      { name: 'Drake', relationship: 'Ex-boyfriend', duration: '2009-2016 (on/off)', type: 'dated' }
    ]
  },
  'Damon Thomas': {
    confirmed: [
      { name: 'Kim Kardashian', relationship: 'Marriage', duration: '2000-2004', type: 'dated' }
    ]
  },
  'Ray J': {
    confirmed: [
      { name: 'Kim Kardashian', relationship: 'Boyfriend', duration: '2003-2006', type: 'dated' },
      { name: 'Whitney Houston', relationship: 'Rumored relationship', duration: '2007-2012', type: 'dated' }
    ]
  },
  'Nick Cannon': {
    confirmed: [
      { name: 'Kim Kardashian', relationship: 'Brief dating', duration: '2006', type: 'hookup' },
      { name: 'Mariah Carey', relationship: 'Marriage', duration: '2008-2016', type: 'dated' },
      { name: 'Brittany Bell', relationship: 'Relationship', duration: '2015-2020', type: 'dated' },
      { name: 'Abby De La Rosa', relationship: 'Relationship', duration: '2020-2021', type: 'dated' }
    ]
  },
  'Joie Chavis': {
    confirmed: [
      { name: 'Bow Wow', relationship: 'Ex-boyfriend', duration: '2010-2013', type: 'dated' },
      { name: 'Future', relationship: 'Ex-boyfriend', duration: '2017-2018', type: 'dated' }
    ]
  },
  'Lori Harvey': {
    confirmed: [
      { name: 'Michael B. Jordan', relationship: 'Boyfriend', duration: '2020-2022', type: 'dated' },
      { name: 'Future', relationship: 'Ex-boyfriend', duration: '2019-2020', type: 'dated' }
    ]
  },
  'Aubrey O\'Day': {
    confirmed: [
      { name: 'Pauly D', relationship: 'Ex-boyfriend', duration: '2015-2017', type: 'dated' }
    ]
  }
};

async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(DB_NAME);
}

async function findProfileByName(db, name) {
  const profilesCollection = db.collection(PROFILES_COLLECTION);
  
  // Try exact match first
  let profile = await profilesCollection.findOne({ name: name });
  if (profile) return profile;
  
  // Try case-insensitive match
  profile = await profilesCollection.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (profile) return profile;
  
  // Try partial match for names with nicknames
  const nameParts = name.split(' ');
  for (const part of nameParts) {
    if (part.length > 3) { // Only search meaningful parts
      profile = await profilesCollection.findOne({ name: { $regex: new RegExp(part, 'i') } });
      if (profile) return profile;
    }
  }
  
  return null;
}

async function createRating(db, raterProfileId, ratedProfileId, ratingType, notes) {
  const ratingsCollection = db.collection(RATINGS_COLLECTION);
  
  // Check if rating already exists
  const existingRating = await ratingsCollection.findOne({
    raterProfileId: raterProfileId,
    ratedProfileId: ratedProfileId,
    ratingType: ratingType
  });
  
  if (existingRating) {
    console.log(`Rating already exists: ${raterProfileId} -> ${ratedProfileId} (${ratingType})`);
    return existingRating;
  }
  
  const rating = {
    raterProfileId: raterProfileId,
    ratedProfileId: ratedProfileId,
    ratingType: ratingType,
    rating: 5, // Default rating for confirmed relationships
    notes: notes || '',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await ratingsCollection.insertOne(rating);
  console.log(`Created rating: ${raterProfileId} -> ${ratedProfileId} (${ratingType})`);
  return { ...rating, _id: result.insertedId };
}

async function updateBodycountStats(db, profileId) {
  const ratingsCollection = db.collection(RATINGS_COLLECTION);
  const statsCollection = db.collection(BODYCOUNT_STATS_COLLECTION);
  
  // Aggregate ratings for this profile
  const stats = await ratingsCollection.aggregate([
    { $match: { ratedProfileId: profileId } },
    {
      $group: {
        _id: '$ratingType',
        count: { $sum: 1 },
        totalRating: { $sum: '$rating' }
      }
    }
  ]).toArray();
  
  const datedCount = stats.find(s => s._id === 'dated')?.count || 0;
  const hookupCount = stats.find(s => s._id === 'hookup')?.count || 0;
  const transactionalCount = stats.find(s => s._id === 'transactional')?.count || 0;
  const totalRatings = datedCount + hookupCount + transactionalCount;
  
  const totalRatingSum = stats.reduce((sum, s) => sum + s.totalRating, 0);
  const averageRating = totalRatings > 0 ? totalRatingSum / totalRatings : 0;
  
  await statsCollection.updateOne(
    { profileId: profileId },
    {
      $set: {
        profileId: profileId,
        totalRatings: totalRatings,
        datedCount: datedCount,
        hookupCount: hookupCount,
        transactionalCount: transactionalCount,
        averageRating: averageRating,
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
  
  console.log(`Updated stats for profile ${profileId}: ${datedCount} dated, ${hookupCount} hookup, ${transactionalCount} transactional`);
}

async function populateRatingsFromRelationships() {
  const db = await connectToDatabase();
  
  console.log('Starting to populate ratings from celebrity relationships...');
  
  let totalRatingsCreated = 0;
  let profilesProcessed = 0;
  
  for (const [celebrityName, data] of Object.entries(celebrityRelationships)) {
    console.log(`\nProcessing ${celebrityName}...`);
    
    const celebrityProfile = await findProfileByName(db, celebrityName);
    if (!celebrityProfile) {
      console.log(`Profile not found for: ${celebrityName}`);
      continue;
    }
    
    profilesProcessed++;
    
    for (const relationship of data.confirmed) {
      const partnerProfile = await findProfileByName(db, relationship.name);
      if (!partnerProfile) {
        console.log(`Partner profile not found for: ${relationship.name}`);
        continue;
      }
      
      // Create rating from celebrity to partner
      const notes = `${relationship.relationship} (${relationship.duration})`;
      await createRating(
        db,
        celebrityProfile._id,
        partnerProfile._id,
        relationship.type,
        notes
      );
      
      // Create reciprocal rating from partner to celebrity
      await createRating(
        db,
        partnerProfile._id,
        celebrityProfile._id,
        relationship.type,
        notes
      );
      
      totalRatingsCreated += 2;
    }
    
    // Update bodycount stats for this celebrity
    await updateBodycountStats(db, celebrityProfile._id);
  }
  
  console.log(`\n✅ Completed! Processed ${profilesProcessed} profiles and created ${totalRatingsCreated} ratings.`);
  
  // Update stats for all profiles that received ratings
  console.log('\nUpdating bodycount stats for all affected profiles...');
  const ratingsCollection = db.collection(RATINGS_COLLECTION);
  const allRatedProfiles = await ratingsCollection.distinct('ratedProfileId');
  
  for (const profileId of allRatedProfiles) {
    await updateBodycountStats(db, profileId);
  }
  
  console.log(`Updated stats for ${allRatedProfiles.length} profiles.`);
  
  process.exit(0);
}

// Run the script
populateRatingsFromRelationships().catch(console.error);