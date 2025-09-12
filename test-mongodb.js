const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://<username>:<password>@linkagescluster.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

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