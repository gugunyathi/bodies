const { MongoClient } = require('mongodb');
const fetch = require('node-fetch');

// Production MongoDB URI from .env.production
const PRODUCTION_MONGODB_URI = 'mongodb+srv://***REDACTED***@cluster0.qvunkxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const PRODUCTION_DB_NAME = 'bodies';

// Kim Kardashian profile data
const kimKardashianProfile = {
  _id: 'system-kim-kardashian',
  userId: 'system-kim-kardashian',
  name: 'Kim Kardashian',
  age: 44,
  bio: 'Reality TV star, entrepreneur, and social media mogul. Built a billion-dollar empire through SKIMS, KKW Beauty, and various business ventures. Mother of four children.',
  images: ['/Kim Kardashian.png'],
  location: 'Los Angeles, CA',
  socialHandles: {
    instagram: '@kimkardashian',
    twitter: '@KimKardashian'
  },
  isVerified: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Kim Kardashian's relationship partners
const relationshipProfiles = [
  {
    _id: 'system-damon-thomas',
    userId: 'system-damon-thomas',
    name: 'Damon Thomas',
    age: 54,
    bio: 'Music producer and songwriter. Known for producing hits for artists like Pink, Dru Hill, and Lionel Richie. First husband of Kim Kardashian.',
    images: ['/Damon Thomas.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@damonthomas' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-ray-j',
    userId: 'system-ray-j',
    name: 'Ray J',
    age: 43,
    bio: 'Singer, actor, and entrepreneur. Known for hit single "One Wish" and reality TV appearances. Brother of singer Brandy.',
    images: ['/Ray J.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@rayj', twitter: '@rayj' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-nick-cannon',
    userId: 'system-nick-cannon',
    name: 'Nick Cannon',
    age: 44,
    bio: 'TV host, comedian, and entrepreneur. Known for hosting Wild \'N Out and America\'s Got Talent. Father of multiple children with various partners.',
    images: ['/Nick Cannon.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@nickcannon', twitter: '@NickCannon' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-reggie-bush',
    userId: 'system-reggie-bush',
    name: 'Reggie Bush',
    age: 39,
    bio: 'Former NFL running back and Heisman Trophy winner. Played for New Orleans Saints, Miami Dolphins, and other teams.',
    images: ['/Reggie Bush.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@reggiebush', twitter: '@ReggieBush' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-miles-austin',
    userId: 'system-miles-austin',
    name: 'Miles Austin',
    age: 40,
    bio: 'Former NFL wide receiver. Played primarily for Dallas Cowboys and Cleveland Browns. Known for his speed and route-running.',
    images: ['/Miles Austin.png'],
    location: 'Dallas, TX',
    socialHandles: { instagram: '@milesaustin19' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-kris-humphries',
    userId: 'system-kris-humphries',
    name: 'Kris Humphries',
    age: 39,
    bio: 'Former NBA power forward. Played for multiple teams including New Jersey Nets and Boston Celtics. Known for 72-day marriage to Kim Kardashian.',
    images: ['/Kris Humphries.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@krishumphries' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-kanye-west',
    userId: 'system-kanye-west',
    name: 'Kanye West',
    age: 47,
    bio: 'Rapper, producer, and fashion designer. Known for albums like "The College Dropout" and "My Beautiful Dark Twisted Fantasy". Father of four children with Kim Kardashian.',
    images: ['/Kanye West.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@kanyewest' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-pete-davidson',
    userId: 'system-pete-davidson',
    name: 'Pete Davidson',
    age: 31,
    bio: 'Comedian and actor. Known for Saturday Night Live and various comedy specials. High-profile relationships with celebrities.',
    images: ['/Pete Davidson.png'],
    location: 'New York, NY',
    socialHandles: { instagram: '@petedavidson' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-odell-beckham-jr',
    userId: 'system-odell-beckham-jr',
    name: 'Odell Beckham Jr.',
    age: 32,
    bio: 'NFL wide receiver known for spectacular catches and fashion sense. Played for New York Giants, Cleveland Browns, and Los Angeles Rams.',
    images: ['/Odell Beckham Jr..png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@obj', twitter: '@obj' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Kim Kardashian's confirmed relationships for ratings
const confirmedRelationships = [
  { name: 'Damon Thomas', type: 'dated', duration: '2000-2004', notes: 'First marriage, music producer. Divorced due to alleged abuse and control issues.' },
  { name: 'Ray J', type: 'dated', duration: '2003-2006', notes: 'High-profile relationship that included infamous tape. On-and-off relationship.' },
  { name: 'Nick Cannon', type: 'dated', duration: '2006', notes: 'Short-lived relationship before his marriage to Mariah Carey.' },
  { name: 'Reggie Bush', type: 'dated', duration: '2007-2010', notes: 'Serious relationship with NFL player. Ended due to career pressures and distance.' },
  { name: 'Miles Austin', type: 'dated', duration: '2010', notes: 'Brief relationship with Dallas Cowboys player.' },
  { name: 'Kris Humphries', type: 'dated', duration: '2011', notes: 'Highly publicized 72-day marriage. Divorced citing irreconcilable differences.' },
  { name: 'Kanye West', type: 'dated', duration: '2012-2022', notes: 'Longest relationship, married with four children (North, Saint, Chicago, Psalm). Divorced due to his mental health issues and erratic behavior.' },
  { name: 'Pete Davidson', type: 'dated', duration: '2021-2022', notes: 'High-profile relationship after Kanye divorce. Ended due to long distance and busy schedules.' },
  { name: 'Odell Beckham Jr.', type: 'hookup', duration: '2023', notes: 'Brief rumored connection after Pete Davidson breakup.' }
];

// Helper function to generate ObjectId-like string
function generateObjectId() {
  return Math.floor(Date.now() / 1000).toString(16) + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => {
    return Math.floor(Math.random() * 16).toString(16);
  });
}

// Main migration function
async function migrateKimKardashianToProduction() {
  console.log('🚀 Starting Kim Kardashian network migration to production...');
  console.log('🔗 Connecting to production database...');
  
  const client = new MongoClient(PRODUCTION_MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to production MongoDB');
    
    const db = client.db(PRODUCTION_DB_NAME);
    const profilesCollection = db.collection('profiles');
    const ratingsCollection = db.collection('ratings');
    
    // Verify we're connected to the right database
    const stats = await db.stats();
    console.log(`📊 Connected to database: ${stats.db}`);
    
    // Check existing profiles count
    const existingProfilesCount = await profilesCollection.countDocuments();
    console.log(`📈 Existing profiles in production: ${existingProfilesCount}`);
    
    // Create Kim Kardashian's profile
    console.log('\n📝 Creating Kim Kardashian profile in production...');
    try {
      await profilesCollection.insertOne(kimKardashianProfile);
      console.log('✅ Kim Kardashian profile created successfully');
    } catch (error) {
      if (error.code === 11000) {
        console.log('ℹ️  Kim Kardashian profile already exists, updating...');
        await profilesCollection.replaceOne(
          { _id: kimKardashianProfile._id },
          kimKardashianProfile
        );
        console.log('✅ Kim Kardashian profile updated');
      } else {
        throw error;
      }
    }
    
    // Create relationship partner profiles
    console.log('\n👥 Creating relationship partner profiles in production...');
    let createdProfiles = 0;
    let updatedProfiles = 0;
    
    for (const profile of relationshipProfiles) {
      try {
        await profilesCollection.insertOne(profile);
        console.log(`✅ Created profile: ${profile.name}`);
        createdProfiles++;
      } catch (error) {
        if (error.code === 11000) {
          console.log(`ℹ️  Profile ${profile.name} already exists, updating...`);
          await profilesCollection.replaceOne(
            { _id: profile._id },
            profile
          );
          console.log(`✅ Updated profile: ${profile.name}`);
          updatedProfiles++;
        } else {
          console.error(`❌ Error creating ${profile.name}:`, error.message);
        }
      }
    }
    
    // Get Kim Kardashian's profile ID for ratings
    const kimProfile = await profilesCollection.findOne({ _id: kimKardashianProfile._id });
    if (!kimProfile) {
      throw new Error('Kim Kardashian profile not found after creation');
    }
    
    // Create ratings for confirmed relationships
    console.log('\n💕 Creating confirmed relationship ratings in production...');
    let createdRatings = 0;
    let skippedRatings = 0;
    
    for (const relationship of confirmedRelationships) {
      const partnerProfile = relationshipProfiles.find(p => p.name === relationship.name);
      if (partnerProfile) {
        const ratingId = generateObjectId();
        const ratingData = {
          _id: ratingId,
          raterId: kimProfile._id,
          profileId: partnerProfile._id,
          ratingType: relationship.type,
          isAnonymous: false,
          evidence: [],
          notes: relationship.notes,
          duration: relationship.duration,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        try {
          await ratingsCollection.insertOne(ratingData);
          console.log(`✅ Created confirmed rating: Kim ↔ ${relationship.name} (${relationship.type})`);
          createdRatings++;
        } catch (error) {
          if (error.code === 11000) {
            console.log(`ℹ️  Rating Kim ↔ ${relationship.name} already exists`);
            skippedRatings++;
          } else {
            console.error(`❌ Error creating rating for ${relationship.name}:`, error.message);
          }
        }
      }
    }
    
    // Final verification
    console.log('\n🔍 Verifying migration results...');
    const finalProfilesCount = await profilesCollection.countDocuments();
    const kimRatingsCount = await ratingsCollection.countDocuments({ raterId: kimProfile._id });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log(`📊 Production database now has ${finalProfilesCount} profiles (was ${existingProfilesCount})`);
    console.log(`👥 Created ${createdProfiles} new profiles, updated ${updatedProfiles} existing profiles`);
    console.log(`💕 Created ${createdRatings} new ratings, skipped ${skippedRatings} existing ratings`);
    console.log(`🔗 Kim Kardashian now has ${kimRatingsCount} total ratings in production`);
    
    // Verify Kim Kardashian exists in production
    const verifyKim = await profilesCollection.findOne({ name: 'Kim Kardashian' });
    if (verifyKim) {
      console.log(`✅ Verified: Kim Kardashian exists in production with ID: ${verifyKim._id}`);
    } else {
      console.error('❌ Error: Kim Kardashian not found in production after migration');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Production database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  migrateKimKardashianToProduction()
    .then(() => {
      console.log('\n✨ Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration process failed:', error.message);
      process.exit(1);
    });
}

module.exports = { migrateKimKardashianToProduction };