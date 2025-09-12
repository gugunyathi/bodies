require('dotenv').config();
const { MongoClient } = require('mongodb');

console.log('Testing simple MongoDB connection...');
console.log('Node.js version:', process.version);

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found in environment variables');
  process.exit(1);
}

console.log('Connection URI (masked):', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

async function testConnection() {
  try {
    console.log('\n🔍 Testing: Minimal connection (no options)');
    const client = new MongoClient(uri);
    
    console.log('Attempting to connect...');
    await client.connect();
    
    console.log('✅ Connection successful!');
    
    // Test database operation
    const db = client.db('bodies');
    const collections = await db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));
    
    await client.close();
    console.log('🔌 Connection closed successfully');
    
  } catch (error) {
    console.log('❌ Connection failed:');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    
    if (error.cause) {
      console.log('Underlying cause:', error.cause.message);
    }
  }
}

testConnection();