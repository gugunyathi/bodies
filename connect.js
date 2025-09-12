const { MongoClient } = require('mongodb');

// Load environment variables
require('dotenv').config();

console.log('🔍 Node.js version:', process.version);
console.log('📋 Testing MongoDB connection...');

// Use the same URI as the application
const uri = process.env.MONGODB_URI || "mongodb+srv://***REDACTED***@cluster0.qvunkxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Note: Node.js v22 has known SSL compatibility issues with MongoDB Atlas
// This is a known issue: https://github.com/nodejs/node/issues/
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  tls: true,
  tlsAllowInvalidCertificates: true // Allow invalid certificates for Node.js v22 compatibility
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("LinkagesDB");
    const users = db.collection("users");

    const sampleUser = {
      _id: "0xA1B2C3D4E5F6",
      profile_data: { name: "Gugu Nyathi", email: "gugu@linkages.io" },
      privacy_settings: { share_profile: true, allow_ratings: true }
    };

    await users.insertOne(sampleUser);
    console.log("🎉 Sample user inserted");
  } catch (err) {
    console.error("❌ Connection failed:", err);
  } finally {
    await client.close();
  }
}

run();