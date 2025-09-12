const fetch = require('node-fetch');

// Base URL for the API
const API_BASE = 'http://localhost:3000/api';

// Kim Kardashian profile data
const kimKardashianProfile = {
  userId: 'system-kim-kardashian',
  name: 'Kim Kardashian',
  age: 44,
  bio: 'Reality TV star, entrepreneur, and social media mogul. Built a billion-dollar empire through SKIMS, KKW Beauty, and various business ventures. Mother of four children.',
  images: ['/Kim Kardashian.png'],
  location: 'Los Angeles, CA',
  socialHandles: {
    instagram: '@kimkardashian',
    twitter: '@KimKardashian'
  }
};

// Relationship partners data
const relationshipProfiles = [
  {
    userId: 'system-damon-thomas',
    name: 'Damon Thomas',
    age: 54,
    bio: 'Music producer and songwriter. Known for producing hits for artists like Pink, Dru Hill, and Lionel Richie. First husband of Kim Kardashian.',
    images: ['/Damon Thomas.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@damonthomas' }
  },
  {
    userId: 'system-ray-j',
    name: 'Ray J',
    age: 43,
    bio: 'Singer, actor, and entrepreneur. Known for hit single "One Wish" and reality TV appearances. Brother of singer Brandy.',
    images: ['/Ray J.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@rayj', twitter: '@rayj' }
  },
  {
    userId: 'system-nick-cannon',
    name: 'Nick Cannon',
    age: 44,
    bio: 'TV host, comedian, and entrepreneur. Known for hosting Wild N Out and The Masked Singer. Father of 12 children with multiple women.',
    images: ['/Nick Cannon.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@nickcannon', twitter: '@NickCannon' }
  },
  {
    userId: 'system-reggie-bush',
    name: 'Reggie Bush',
    age: 39,
    bio: 'Former NFL running back and Heisman Trophy winner. Played for New Orleans Saints, Miami Dolphins, and other teams.',
    images: ['/Reggie Bush.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@reggiebush', twitter: '@ReggieBush' }
  },
  {
    userId: 'system-miles-austin',
    name: 'Miles Austin',
    age: 40,
    bio: 'Former NFL wide receiver. Played primarily for Dallas Cowboys and Cleveland Browns. Known for his speed and route-running ability.',
    images: ['/Miles Austin.png'],
    location: 'Dallas, TX',
    socialHandles: { instagram: '@milesaustin19' }
  },
  {
    userId: 'system-kris-humphries',
    name: 'Kris Humphries',
    age: 39,
    bio: 'Former NBA power forward. Played for multiple teams including New Jersey Nets and Boston Celtics. Known for brief marriage to Kim Kardashian.',
    images: ['/Kris Humphries.png'],
    location: 'Minneapolis, MN',
    socialHandles: { instagram: '@krishumphries', twitter: '@KrisHumphries' }
  },
  {
    userId: 'system-kanye-west',
    name: 'Kanye West',
    age: 47,
    bio: 'Rapper, producer, and fashion designer. Multiple Grammy winner and founder of Yeezy brand. Father of four children with Kim Kardashian.',
    images: ['/Kanye West.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@ye', twitter: '@kanyewest' }
  },
  {
    userId: 'system-pete-davidson',
    name: 'Pete Davidson',
    age: 31,
    bio: 'Comedian and actor. Known for Saturday Night Live and various comedy specials. High-profile relationships with celebrities.',
    images: ['/Pete Davidson.png'],
    location: 'New York, NY',
    socialHandles: { instagram: '@petedavidson' }
  },
  {
    userId: 'system-odell-beckham-jr',
    name: 'Odell Beckham Jr.',
    age: 32,
    bio: 'NFL wide receiver known for spectacular catches and fashion sense. Played for New York Giants, Cleveland Browns, and Los Angeles Rams.',
    images: ['/Odell Beckham Jr..png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@obj', twitter: '@obj' }
  },
  {
    userId: 'system-the-game',
    name: 'The Game',
    age: 45,
    bio: 'Rapper and actor. Known for albums like "The Documentary" and "Doctor\'s Advocate". Member of G-Unit before feud with 50 Cent.',
    images: ['/The Game.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@losangelesconfidential', twitter: '@thegame' }
  },
  {
    userId: 'system-nick-lachey',
    name: 'Nick Lachey',
    age: 51,
    bio: 'Singer and TV personality. Former member of 98 Degrees and ex-husband of Jessica Simpson. Known for reality TV appearances.',
    images: ['/Nick Lachey.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@nicklachey', twitter: '@NickLachey' }
  },
  {
    userId: 'system-gabriel-aubry',
    name: 'Gabriel Aubry',
    age: 48,
    bio: 'Canadian model known for campaigns with major fashion brands. Former partner of Halle Berry and father of their daughter.',
    images: ['/Gabriel Aubry.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@gabrielaubry' }
  },
  {
    userId: 'system-michael-copon',
    name: 'Michael Copon',
    age: 42,
    bio: 'Actor and model. Known for roles in Power Rangers and One Tree Hill. Also worked as a fitness model and personal trainer.',
    images: ['/Michael Copon.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@michaelcopon' }
  },
  {
    userId: 'system-cristiano-ronaldo',
    name: 'Cristiano Ronaldo',
    age: 39,
    bio: 'Portuguese footballer and global superstar. Five-time Ballon d\'Or winner and one of the greatest players of all time.',
    images: ['/Cristiano Ronaldo.png'],
    location: 'Riyadh, Saudi Arabia',
    socialHandles: { instagram: '@cristiano', twitter: '@Cristiano' }
  },
  {
    userId: 'system-drake',
    name: 'Drake',
    age: 38,
    bio: 'Canadian rapper, singer, and entrepreneur. One of the best-selling music artists worldwide. Known for hits like "Hotline Bling" and "God\'s Plan".',
    images: ['/Drake.png'],
    location: 'Toronto, Canada / Los Angeles, CA',
    socialHandles: { instagram: '@champagnepapi', twitter: '@Drake' }
  },
  {
    userId: 'system-meek-mill',
    name: 'Meek Mill',
    age: 37,
    bio: 'Rapper and criminal justice reform advocate. Known for albums like "Dreams and Nightmares" and high-profile legal battles.',
    images: ['/Meek Mill.png'],
    location: 'Philadelphia, PA',
    socialHandles: { instagram: '@meekmill', twitter: '@MeekMill' }
  },
  {
    userId: 'system-van-jones',
    name: 'Van Jones',
    age: 56,
    bio: 'Political commentator, author, and criminal justice reform advocate. CNN contributor and former Obama administration official.',
    images: ['/Van Jones.png'],
    location: 'Los Angeles, CA',
    socialHandles: { instagram: '@vanjones68', twitter: '@VanJones68' }
  },
  {
    userId: 'system-tom-brady',
    name: 'Tom Brady',
    age: 47,
    bio: 'Legendary NFL quarterback with seven Super Bowl wins. Widely considered the greatest quarterback of all time.',
    images: ['/Tom Brady.png'],
    location: 'Tampa, FL',
    socialHandles: { instagram: '@tombrady', twitter: '@TomBrady' }
  }
];

// Confirmed relationships for ratings
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

// Helper function to create a profile via API
async function createProfile(profileData) {
  try {
    const response = await fetch(`${API_BASE}/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`Failed to create profile for ${profileData.name}: ${error.message}`);
  }
}

// Helper function to create a rating via API
async function createRating(ratingData) {
  try {
    const response = await fetch(`${API_BASE}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ratingData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`Failed to create rating: ${error.message}`);
  }
}

// Helper function to get all profiles
async function getProfiles() {
  try {
    const response = await fetch(`${API_BASE}/profiles`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to get profiles: ${error.message}`);
  }
}

// Main function to create Kim Kardashian network
async function createKimKardashianNetwork() {
  console.log('🚀 Starting Kim Kardashian network creation via API...');
  
  try {
    // Create Kim Kardashian's profile first
    console.log('\n📝 Creating Kim Kardashian profile...');
    const kimProfileResponse = await createProfile(kimKardashianProfile);
    const kimProfile = kimProfileResponse.profile;
    console.log(`✅ Kim Kardashian profile created with ID: ${kimProfile.id}`);
    
    // Create relationship partner profiles
    console.log('\n👥 Creating relationship partner profiles...');
    const createdProfiles = {};
    
    for (const profileData of relationshipProfiles) {
      try {
        const profileResponse = await createProfile(profileData);
        const profile = profileResponse.profile;
        createdProfiles[profileData.name] = profile;
        console.log(`✅ Created profile: ${profileData.name} (ID: ${profile.id})`);
      } catch (error) {
        console.error(`❌ Error creating ${profileData.name}: ${error.message}`);
      }
    }
    
    // Create ratings for confirmed relationships
    console.log('\n💕 Creating confirmed relationship ratings...');
    for (const relationship of confirmedRelationships) {
      const partnerProfile = createdProfiles[relationship.name];
      if (partnerProfile) {
        const ratingData = {
          raterId: kimProfile.id,
          profileId: partnerProfile.id,
          ratingType: relationship.type,
          isAnonymous: false
        };
        
        console.log(`🔍 Creating rating with data:`, JSON.stringify(ratingData, null, 2));
        
        try {
          const rating = await createRating(ratingData);
          console.log(`✅ Created confirmed rating: Kim ↔ ${relationship.name} (${relationship.type})`);
        } catch (error) {
          console.error(`❌ Error creating rating for ${relationship.name}: ${error.message}`);
        }
      } else {
        console.log(`⚠️  Partner profile not found for ${relationship.name}`);
      }
    }
    
    console.log('\n🎉 Kim Kardashian network creation completed!');
    console.log(`📊 Created 1 main profile + ${Object.keys(createdProfiles).length} relationship profiles`);
    console.log(`💕 Created ${confirmedRelationships.length} confirmed relationship ratings`);
    
    // Get final profile count
    const allProfiles = await getProfiles();
    console.log(`\n📈 Total profiles in database: ${allProfiles.length}`);
    
  } catch (error) {
    console.error('❌ Error creating Kim Kardashian network:', error.message);
  }
}

// Run the script
if (require.main === module) {
  createKimKardashianNetwork();
}

module.exports = { createKimKardashianNetwork };