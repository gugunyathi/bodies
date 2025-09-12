require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkBodycountStats() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collection = db.collection('bodycount_stats');
    
    // Get a sample document
    const sampleDoc = await collection.findOne();
    console.log('Sample bodycount_stats document:');
    console.log(JSON.stringify(sampleDoc, null, 2));
    
    // Count total documents
    const count = await collection.countDocuments();
    console.log(`\nTotal bodycount_stats documents: ${count}`);
    
    // Get a few more examples
    const docs = await collection.find().limit(3).toArray();
    console.log('\nFirst 3 documents:');
    docs.forEach((doc, index) => {
      console.log(`Document ${index + 1}:`);
      console.log(`  profileId: ${doc.profileId} (type: ${typeof doc.profileId})`);
      console.log(`  datedCount: ${doc.datedCount}`);
      console.log(`  hookupCount: ${doc.hookupCount}`);
      console.log(`  transactionalCount: ${doc.transactionalCount}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkBodycountStats();