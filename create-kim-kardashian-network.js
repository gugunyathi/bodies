const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bodies';

// Kim Kardashian and her relationship network data
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
    bio: 'TV host, comedian, and entrepreneur. Known for hosting Wild N Out and The Masked Singer. Father of 12 children with multiple women.',
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
    bio: 'Former NFL wide receiver. Played primarily for Dallas Cowboys and Cleveland Browns. Known for his speed and route-running ability.',
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
    bio: 'Former NBA power forward. Played for multiple teams including New Jersey Nets and Boston Celtics. Known for brief marriage to Kim Kardashian.',
    images: ['/Kris Humphries.png'],
    location: 'Minneapolis, MN',
    socialHandles: { instagram: '@krishumphries', twitter: '@KrisHumphries' },
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
    bio: 'Rapper, producer, and fashion designer. Multiple Grammy winner and founder of Yeezy brand. Father of four children with Kim Kardashian.',
    images: ['/Kanye West.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@ye', twitter: '@kanyewest' },
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
  },
  {
    _id: 'system-the-game',
    userId: 'system-the-game',
    name: 'The Game',
    age: 45,
    bio: 'Rapper and actor. Known for albums like "The Documentary" and "Doctor\'s Advocate". Member of G-Unit before feud with 50 Cent.',
    images: ['/The Game.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@losangelesconfidential', twitter: '@thegame' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-nick-lachey',
    userId: 'system-nick-lachey',
    name: 'Nick Lachey',
    age: 51,
    bio: 'Singer and TV personality. Former member of 98 Degrees and ex-husband of Jessica Simpson. Known for reality TV appearances.',
    images: ['/Nick Lachey.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@nicklachey', twitter: '@NickLachey' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-gabriel-aubry',
    userId: 'system-gabriel-aubry',
    name: 'Gabriel Aubry',
    age: 48,
    bio: 'Canadian model known for campaigns with major fashion brands. Former partner of Halle Berry and father of their daughter.',
    images: ['/Gabriel Aubry.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@gabrielaubry' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-michael-copon',
    userId: 'system-michael-copon',
    name: 'Michael Copon',
    age: 42,
    bio: 'Actor and model. Known for roles in Power Rangers and One Tree Hill. Also worked as a fitness model and personal trainer.',
    images: ['/Michael Copon.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@michaelcopon' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-cristiano-ronaldo',
    userId: 'system-cristiano-ronaldo',
    name: 'Cristiano Ronaldo',
    age: 39,
    bio: 'Portuguese footballer and global superstar. Five-time Ballon d\'Or winner and one of the greatest players of all time.',
    images: ['/Cristiano Ronaldo.png'],
    location: 'Riyadh, Saudi Arabia',
    socialHandles: { instagram: '@cristiano', twitter: '@Cristiano' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-drake',
    userId: 'system-drake',
    name: 'Drake',
    age: 38,
    bio: 'Canadian rapper, singer, and entrepreneur. One of the best-selling music artists worldwide. Known for hits like "Hotline Bling" and "God\'s Plan".',
    images: ['/Drake.png'],
    location: 'Toronto, Canada / Los Angeles, CA',
    socialHandles: { instagram: '@champagnepapi', twitter: '@Drake' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-meek-mill',
    userId: 'system-meek-mill',
    name: 'Meek Mill',
    age: 37,
    bio: 'Rapper and criminal justice reform advocate. Known for albums like "Dreams and Nightmares" and high-profile legal battles.',
    images: ['/Meek Mill.png'],
    location: 'Philadelphia, PA',
    socialHandles: { instagram: '@meekmill', twitter: '@MeekMill' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-van-jones',
    userId: 'system-van-jones',
    name: 'Van Jones',
    age: 56,
    bio: 'Political commentator, author, and criminal justice reform advocate. CNN contributor and former Obama administration official.',
    images: ['/Van Jones.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@vanjones68', twitter: '@VanJones68' },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-tom-brady',
    userId: 'system-tom-brady',
    name: 'Tom Brady',
    age: 47,
    bio: 'Legendary NFL quarterback with seven Super Bowl wins. Widely considered the greatest quarterback of all time.',
    images: ['/Tom Brady.png'],
    location: 'Tampa, FL',
    socialHandles: { instagram: '@tombrady', twitter: '@TomBrady' },
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

// Rumored relationships
const rumoredRelationships = [
  { name: 'The Game', type: 'hookup', timeframe: '2006', notes: 'Brief rumored relationship during early career.' },
  { name: 'Nick Lachey', type: 'hookup', timeframe: '2006', notes: 'Rumored brief encounter after Jessica Simpson divorce.' },
  { name: 'Gabriel Aubry', type: 'hookup', timeframe: '2010', notes: 'Rumored connection during Halle Berry relationship.' },
  { name: 'Michael Copon', type: 'hookup', timeframe: '2004', notes: 'Brief rumored connection with actor/model.' },
  { name: 'Cristiano Ronaldo', type: 'hookup', timeframe: '2010', notes: 'Alleged brief encounter during his Real Madrid days.' },
  { name: 'Drake', type: 'hookup', timeframe: '2018', notes: 'Rumored connection amid social media interactions.' },
  { name: 'Meek Mill', type: 'hookup', timeframe: '2018', notes: 'Rumored connection during prison reform advocacy work.' },
  { name: 'Van Jones', type: 'hookup', timeframe: '2021', notes: 'Rumored connection during law school and reform work.' },
  { name: 'Tom Brady', type: 'hookup', timeframe: '2023', notes: 'Brief rumored connection with supermodel post-divorce.' }
];

async function createKimKardashianNetwork() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const profilesCollection = db.collection('profiles');
    const ratingsCollection = db.collection('ratings');
    
    // Create Kim Kardashian's profile
    console.log('\n📝 Creating Kim Kardashian profile...');
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
    console.log('\n👥 Creating relationship partner profiles...');
    for (const profile of relationshipProfiles) {
      try {
        await profilesCollection.insertOne(profile);
        console.log(`✅ Created profile: ${profile.name}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`ℹ️  Profile ${profile.name} already exists, updating...`);
          await profilesCollection.replaceOne(
            { _id: profile._id },
            profile
          );
          console.log(`✅ Updated profile: ${profile.name}`);
        } else {
          console.error(`❌ Error creating ${profile.name}:`, error.message);
        }
      }
    }
    
    // Create ratings for confirmed relationships
    console.log('\n💕 Creating confirmed relationship ratings...');
    for (const relationship of confirmedRelationships) {
      const partnerProfile = relationshipProfiles.find(p => p.name === relationship.name);
      if (partnerProfile) {
        const ratingData = {
          _id: `rating-kim-${partnerProfile._id}`,
          raterId: 'system',
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
        } catch (error) {
          if (error.code === 11000) {
            console.log(`ℹ️  Rating Kim ↔ ${relationship.name} already exists`);
          } else {
            console.error(`❌ Error creating rating for ${relationship.name}:`, error.message);
          }
        }
      }
    }
    
    // Create ratings for rumored relationships
    console.log('\n🤔 Creating rumored relationship ratings...');
    for (const rumor of rumoredRelationships) {
      const partnerProfile = relationshipProfiles.find(p => p.name === rumor.name);
      if (partnerProfile) {
        const ratingData = {
          _id: `rating-kim-rumor-${partnerProfile._id}`,
          raterId: 'anonymous',
          profileId: partnerProfile._id,
          ratingType: rumor.type,
          isAnonymous: true,
          evidence: [],
          notes: rumor.notes,
          timeframe: rumor.timeframe,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        try {
          await ratingsCollection.insertOne(ratingData);
          console.log(`✅ Created rumored rating: Kim ↔ ${rumor.name} (${rumor.type})`);
        } catch (error) {
          if (error.code === 11000) {
            console.log(`ℹ️  Rumored rating Kim ↔ ${rumor.name} already exists`);
          } else {
            console.error(`❌ Error creating rumored rating for ${rumor.name}:`, error.message);
          }
        }
      }
    }
    
    console.log('\n🎉 Kim Kardashian network creation completed!');
    console.log(`📊 Created 1 main profile + ${relationshipProfiles.length} relationship profiles`);
    console.log(`💕 Created ${confirmedRelationships.length} confirmed + ${rumoredRelationships.length} rumored relationship ratings`);
    
  } catch (error) {
    console.error('❌ Error creating Kim Kardashian network:', error);
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
if (require.main === module) {
  createKimKardashianNetwork();
}

module.exports = { createKimKardashianNetwork };