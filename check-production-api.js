const https = require('https');
const http = require('http');

// List of production URLs to test
const productionUrls = [
  'https://bodies-e9gugzfjt-gugu-2119s-projects.vercel.app', // Latest deployment
  'https://bodies-ks8fo8qgy-gugu-2119s-projects.vercel.app',
  'https://bodies-lyvfbh315-gugu-2119s-projects.vercel.app',
  'https://bodies-ctvqftjvo-gugu-2119s-projects.vercel.app'
];

async function testProductionAPI(baseUrl) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/api/profiles?limit=50&skip=0`;
    console.log(`\n🔍 Testing: ${url}`);
    
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const jsonData = JSON.parse(data);
            console.log(`✅ Success! Profiles found: ${jsonData.profiles ? jsonData.profiles.length : 'N/A'}`);
            if (jsonData.profiles) {
              console.log(`First few profiles:`);
              jsonData.profiles.slice(0, 3).forEach((profile, index) => {
                console.log(`  ${index + 1}. ${profile.name} (${profile.age}) - Active: ${profile.isActive}`);
              });
            }
            resolve({ success: true, count: jsonData.profiles ? jsonData.profiles.length : 0, data: jsonData });
          } else {
            console.log(`❌ Failed with status ${res.statusCode}`);
            console.log(`Response: ${data.substring(0, 500)}...`);
            resolve({ success: false, status: res.statusCode, data });
          }
        } catch (error) {
          console.log(`❌ JSON Parse Error: ${error.message}`);
          console.log(`Raw response: ${data.substring(0, 500)}...`);
          resolve({ success: false, error: error.message, data });
        }
      });
    });
    
    request.on('error', (error) => {
      console.log(`❌ Request Error: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    request.on('timeout', () => {
      console.log(`❌ Request Timeout`);
      request.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function checkAllProductionAPIs() {
  console.log('🚀 Checking Production APIs for Profile Count...');
  
  for (const url of productionUrls) {
    const result = await testProductionAPI(url);
    if (result.success && result.count === 27) {
      console.log(`\n🎉 FOUND WORKING PRODUCTION API: ${url}`);
      console.log(`✅ All 27 profiles are available in production!`);
      return;
    }
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n❌ No working production API found with all 27 profiles');
}

// Run the check
checkAllProductionAPIs().catch(console.error);