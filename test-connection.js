const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

// Test different connection configurations
const configs = [
  {
    name: 'Standard Config',
    options: {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsAllowInvalidCertificates: false,
      maxPoolSize: 10,
      minPoolSize: 5,
    }
  },
  {
    name: 'Relaxed TLS Config',
    options: {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      tls: true,
      tlsAllowInvalidCertificates: true,
      maxPoolSize: 10,
      minPoolSize: 5,
    }
  },
  {
    name: 'Minimal Config',
    options: {
      serverSelectionTimeoutMS: 10000,
    }
  }
];

async function testConnection(config) {
  console.log(`\n🔍 Testing: ${config.name}`);
  console.log('Options:', JSON.stringify(config.options, null, 2));
  
  const client = new MongoClient(uri, config.options);
  
  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✅ SUCCESS! Connected to MongoDB Atlas!');
    
    // Test database access
    const db = client.db('bodies');
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    return true;
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error code:', error.code);
    console.error('Error type:', error.constructor.name);
    if (error.message.length > 100) {
      console.error('Error message (truncated):', error.message.substring(0, 100) + '...');
    } else {
      console.error('Error message:', error.message);
    }
    return false;
  } finally {
    await client.close();
  }
}

async function runAllTests() {
  console.log('Testing MongoDB Atlas connection...');
  console.log('Node.js version:', process.version);
  console.log('MongoDB driver version:', require('mongodb/package.json').version);
  console.log('Connection URI (masked):', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  
  let successCount = 0;
  
  for (const config of configs) {
    const success = await testConnection(config);
    if (success) {
      successCount++;
      break; // Stop on first success
    }
  }
  
  console.log(`\n📊 Results: ${successCount}/${configs.length} configurations succeeded`);
  
  if (successCount === 0) {
    console.log('\n💡 Troubleshooting suggestions:');
    console.log('1. Check MongoDB Atlas Network Access - ensure your IP is whitelisted');
    console.log('2. Try setting IP access to 0.0.0.0/0 (anywhere) temporarily');
    console.log('3. Verify your connection string is correct');
    console.log('4. Check if VPN or firewall is blocking the connection');
    console.log('5. Consider using a local MongoDB instance for development');
  }
}

runAllTests();