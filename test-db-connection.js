// Simple MongoDB connection test for Next.js environment
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://gugunyathi:BTgxhQ99vmuVgGoC@cluster0.qvunkxy.mongodb.net/LinkagesDB?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  const client = new MongoClient(uri);
  
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Test database access
    const db = client.db('LinkagesDB');
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Test inserting a document
    const usersCollection = db.collection('users');
    const testUser = {
      username: 'testuser',
      email: 'test@example.com',
      createdAt: new Date(),
      bodyCount: 0
    };
    
    const result = await usersCollection.insertOne(testUser);
    console.log('✅ Test user inserted with ID:', result.insertedId);
    
    // Clean up test data
    await usersCollection.deleteOne({ _id: result.insertedId });
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

testConnection();