// Script to populate the database with system profiles
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'bodies';

const systemProfiles = [
  {
    _id: 'system-sean-diddy-combs',
    userId: 'system-sean-diddy-combs',
    name: 'Sean "Diddy" Combs',
    age: 54,
    bio: 'Music mogul, entrepreneur, and cultural icon. Known for his influence in hip-hop, fashion, and business ventures. Father of seven children.',
    images: ['/Sean Combs.png'],
    location: 'Los Angeles, CA / New York, NY',
    socialHandles: {
      instagram: 'diddy',
      twitter: 'Diddy'
    },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-aubrey-oday',
    userId: 'system-aubrey-oday',
    name: 'Aubrey O\'Day',
    age: 40,
    bio: 'Singer, songwriter, and reality TV personality. Former member of Danity Kane and solo artist.',
    images: ['/Aubrey O\'Day.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: 'aubreyoday',
      twitter: 'AubreyODay'
    },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-cassie-ventura',
    userId: 'system-cassie-ventura',
    name: 'Cassie Ventura',
    age: 38,
    bio: 'Singer, model, and actress. Known for hit single "Me & U" and long-term relationship with Sean Combs.',
    images: ['/Cassie Ventura.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: 'cassie',
      twitter: 'CassieVentura'
    },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-jennifer-lopez',
    userId: 'system-jennifer-lopez',
    name: 'Jennifer Lopez',
    age: 54,
    bio: 'Multi-talented entertainer, actress, singer, and businesswoman. Global superstar with numerous hit songs and movies.',
    images: ['/Jennifer Lopez.png'],
    location: 'Los Angeles, CA / New York, NY',
    socialHandles: {
      instagram: 'jlo',
      twitter: 'JLo'
    },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-kim-porter',
    userId: 'system-kim-porter',
    name: 'Kim Porter',
    age: 47,
    bio: 'Model, actress, and mother. Long-term partner of Sean Combs and mother to three of his children.',
    images: ['/Kim Porter.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: 'ladykp',
      twitter: 'LadyKP'
    },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-yung-miami',
    userId: 'system-yung-miami',
    name: 'Yung Miami',
    age: 30,
    bio: 'Rapper and member of City Girls. Known for her bold personality and music career.',
    images: ['/Yung Miami.png'],
    location: 'Miami, FL',
    socialHandles: {
      instagram: 'yungmiami305',
      twitter: 'YungMiami305'
    },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-sarah-chapman',
    userId: 'system-sarah-chapman',
    name: 'Sarah Chapman',
    age: 44,
    bio: 'Entrepreneur and mother. Known for her relationship with Sean Combs and mother to his daughter Chance.',
    images: ['/Sarah Chapman.png'],
    location: 'Atlanta, GA',
    socialHandles: {
      instagram: 'sarahchapman',
      twitter: 'SarahChapman'
    },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'system-misa-hylton',
    userId: 'system-misa-hylton',
    name: 'Misa Hylton',
    age: 50,
    bio: 'Fashion stylist and designer. Pioneer in hip-hop fashion and mother to Sean Combs\' son Justin.',
    images: ['/Misa Hylton.png'],
    location: 'New York, NY',
    socialHandles: {
      instagram: 'misahylton',
      twitter: 'MisaHylton'
    },
    isVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function populateProfiles() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const profilesCollection = db.collection('profiles');
    
    // Clear existing profiles
    await profilesCollection.deleteMany({});
    console.log('Cleared existing profiles');
    
    // Insert system profiles
    const result = await profilesCollection.insertMany(systemProfiles);
    console.log(`Inserted ${result.insertedCount} profiles`);
    
    // Verify insertion
    const count = await profilesCollection.countDocuments();
    console.log(`Total profiles in database: ${count}`);
    
    const profiles = await profilesCollection.find({}).toArray();
    console.log('Profile names:', profiles.map(p => p.name));
    
  } catch (error) {
    console.error('Error populating profiles:', error);
  } finally {
    await client.close();
  }
}

populateProfiles();