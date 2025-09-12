const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://***REDACTED***@cluster0.qvunkxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Missing profiles that have images but aren't in database
const missingProfiles = [
  {
    name: 'Cameron Diaz',
    image: '/Cameron Diaz.png',
    bio: 'Actress and model',
    age: 51,
    location: 'Los Angeles, CA',
    interests: ['Acting', 'Health', 'Wellness'],
    occupation: 'Actress'
  },
  {
    name: 'Emma Heming',
    image: '/Emma Heming.png',
    bio: 'Model and actress',
    age: 45,
    location: 'Los Angeles, CA',
    interests: ['Modeling', 'Family', 'Wellness'],
    occupation: 'Model'
  },
  {
    name: 'Gina Huynh',
    image: '/Gina Huynh.png',
    bio: 'Social media influencer',
    age: 30,
    location: 'Miami, FL',
    interests: ['Fashion', 'Travel', 'Lifestyle'],
    occupation: 'Influencer'
  },
  {
    name: 'Joie Chavis',
    image: '/Joie Chavis.png',
    bio: 'Entrepreneur and dancer',
    age: 35,
    location: 'Los Angeles, CA',
    interests: ['Dance', 'Business', 'Fitness'],
    occupation: 'Entrepreneur'
  },
  {
    name: 'Lori Harvey',
    image: '/Lori Harvey.png',
    bio: 'Model and socialite',
    age: 27,
    location: 'Atlanta, GA',
    interests: ['Fashion', 'Travel', 'Beauty'],
    occupation: 'Model'
  },
  {
    name: 'Miracle Watts',
    image: '/Miracle Watts.png',
    bio: 'Social media personality',
    age: 29,
    location: 'Houston, TX',
    interests: ['Fashion', 'Beauty', 'Business'],
    occupation: 'Influencer'
  },
  {
    name: 'Sienna Miller',
    image: '/Sienna Miller.png',
    bio: 'Actress and fashion icon',
    age: 42,
    location: 'London, UK',
    interests: ['Acting', 'Fashion', 'Art'],
    occupation: 'Actress'
  },
  // Kim Kardashian relationship profiles
  {
    name: 'Kim Kardashian',
    image: '/Kim Kardashian.png',
    bio: 'Reality TV star, entrepreneur, and social media mogul. Built a billion-dollar empire through SKIMS, KKW Beauty, and various business ventures.',
    age: 44,
    location: 'Los Angeles, CA',
    interests: ['Business', 'Fashion', 'Law'],
    occupation: 'Entrepreneur'
  },
  {
    name: 'Damon Thomas',
    image: '/Damon Thomas.png',
    bio: 'Music producer and songwriter. Known for producing hits for artists like Pink, Dru Hill, and Lionel Richie.',
    age: 54,
    location: 'Los Angeles, CA',
    interests: ['Music', 'Production', 'Entertainment'],
    occupation: 'Music Producer'
  },
  {
    name: 'Ray J',
    image: '/Ray J.png',
    bio: 'Singer, actor, and entrepreneur. Known for hit single "One Wish" and reality TV appearances.',
    age: 43,
    location: 'Los Angeles, CA',
    interests: ['Music', 'Business', 'Entertainment'],
    occupation: 'Singer/Entrepreneur'
  },
  {
    name: 'Nick Cannon',
    image: '/Nick Cannon.png',
    bio: 'TV host, comedian, and entrepreneur. Known for hosting Wild N Out and The Masked Singer.',
    age: 44,
    location: 'Los Angeles, CA',
    interests: ['Comedy', 'Television', 'Music'],
    occupation: 'TV Host/Comedian'
  },
  {
    name: 'Reggie Bush',
    image: '/Reggie Bush.png',
    bio: 'Former NFL running back. Heisman Trophy winner and Super Bowl champion.',
    age: 39,
    location: 'New Orleans, LA',
    interests: ['Football', 'Fitness', 'Business'],
    occupation: 'Former NFL Player'
  },
  {
    name: 'Miles Austin',
    image: '/Miles Austin.png',
    bio: 'Former NFL wide receiver. Played primarily for Dallas Cowboys and Cleveland Browns.',
    age: 40,
    location: 'Dallas, TX',
    interests: ['Football', 'Fitness', 'Business'],
    occupation: 'Former NFL Player'
  },
  {
    name: 'Kris Humphries',
    image: '/Kris Humphries.png',
    bio: 'Former NBA power forward. Played for multiple teams including New Jersey Nets and Boston Celtics.',
    age: 39,
    location: 'Minneapolis, MN',
    interests: ['Basketball', 'Business', 'Fitness'],
    occupation: 'Former NBA Player'
  },
  {
    name: 'Kanye West',
    image: '/Kanye West.png',
    bio: 'Rapper, producer, and fashion designer. Multiple Grammy winner and founder of Yeezy brand.',
    age: 47,
    location: 'Los Angeles, CA',
    interests: ['Music', 'Fashion', 'Design'],
    occupation: 'Rapper/Designer'
  },
  {
    name: 'Pete Davidson',
    image: '/Pete Davidson.png',
    bio: 'Comedian and actor. Known for Saturday Night Live and various comedy specials.',
    age: 31,
    location: 'New York, NY',
    interests: ['Comedy', 'Acting', 'Entertainment'],
    occupation: 'Comedian/Actor'
  },
  {
    name: 'Odell Beckham Jr.',
    image: '/Odell Beckham Jr..png',
    bio: 'NFL wide receiver. Known for spectacular catches and fashion sense.',
    age: 32,
    location: 'Los Angeles, CA',
    interests: ['Football', 'Fashion', 'Fitness'],
    occupation: 'NFL Player'
  },
  {
    name: 'The Game',
    image: '/The Game.png',
    bio: 'Rapper and actor. Known for albums like "The Documentary" and "Doctor\'s Advocate".',
    age: 45,
    location: 'Los Angeles, CA',
    interests: ['Music', 'Acting', 'Business'],
    occupation: 'Rapper/Actor'
  },
  {
    name: 'Nick Lachey',
    image: '/Nick Lachey.png',
    bio: 'Singer and TV personality. Former member of 98 Degrees and reality TV star.',
    age: 51,
    location: 'Los Angeles, CA',
    interests: ['Music', 'Television', 'Entertainment'],
    occupation: 'Singer/TV Host'
  },
  {
    name: 'Gabriel Aubry',
    image: '/Gabriel Aubry.png',
    bio: 'Canadian model. Known for high-fashion campaigns and relationship with Halle Berry.',
    age: 48,
    location: 'Los Angeles, CA',
    interests: ['Modeling', 'Fashion', 'Fitness'],
    occupation: 'Model'
  },
  {
    name: 'Michael Copon',
    image: '/Michael Copon.png',
    bio: 'Actor and model. Known for Power Rangers Time Force and One Tree Hill.',
    age: 42,
    location: 'Los Angeles, CA',
    interests: ['Acting', 'Fitness', 'Entertainment'],
    occupation: 'Actor'
  },
  {
    name: 'Cristiano Ronaldo',
    image: '/Cristiano Ronaldo.png',
    bio: 'Professional footballer. Considered one of the greatest players of all time.',
    age: 39,
    location: 'Riyadh, Saudi Arabia',
    interests: ['Football', 'Fitness', 'Business'],
    occupation: 'Professional Footballer'
  },
  {
    name: 'Drake',
    image: '/Drake.png',
    bio: 'Rapper, singer, and entrepreneur. One of the best-selling music artists worldwide.',
    age: 38,
    location: 'Toronto, Canada',
    interests: ['Music', 'Business', 'Sports'],
    occupation: 'Rapper/Singer'
  },
  {
    name: 'Meek Mill',
    image: '/Meek Mill.png',
    bio: 'Rapper and criminal justice reform activist. Known for his mixtapes and legal battles.',
    age: 37,
    location: 'Philadelphia, PA',
    interests: ['Music', 'Activism', 'Business'],
    occupation: 'Rapper/Activist'
  },
  {
    name: 'Van Jones',
    image: '/Van Jones.png',
    bio: 'Political commentator, author, and criminal justice reform advocate. CNN contributor.',
    age: 56,
    location: 'Los Angeles, CA',
    interests: ['Politics', 'Activism', 'Media'],
    occupation: 'Political Commentator'
  },
  {
    name: 'Tom Brady',
    image: '/Tom Brady.png',
    bio: 'Former NFL quarterback and seven-time Super Bowl champion. Considered the greatest quarterback of all time.',
    age: 47,
    location: 'Tampa, FL',
    interests: ['Football', 'Business', 'Wellness'],
    occupation: 'Former NFL Player'
  }
];

async function populateProfiles() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('bodies');
    const collection = db.collection('profiles');
    
    // Insert missing profiles
    const result = await collection.insertMany(missingProfiles);
    console.log(`Inserted ${result.insertedCount} new profiles`);
    
    // Verify total count
    const totalCount = await collection.countDocuments();
    console.log(`Total profiles in database: ${totalCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

populateProfiles();