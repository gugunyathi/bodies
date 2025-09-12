const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🚀 Starting deployment of The Game - Kardashian Collector NFT...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // Contract parameters
  const name = "The Game - Kardashian Collector";
  const symbol = "TGKC";
  const baseTokenURI = "https://bodies.vercel.app/metadata/";
  const platformWallet = process.env.PLATFORM_WALLET;
  
  if (!platformWallet) {
    throw new Error("PLATFORM_WALLET not found in environment variables");
  }
  
  console.log("🎯 Platform wallet:", platformWallet);
  
  // Deploy the contract
  console.log("📦 Deploying contract...");
  const TheGameKardashianCollector = await ethers.getContractFactory("TheGameKardashianCollector");
  const contract = await TheGameKardashianCollector.deploy(
    name,
    symbol,
    baseTokenURI,
    platformWallet // Set platform wallet as owner
  );
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log("✅ Contract deployed to:", contractAddress);
  console.log("🔗 View on BaseScan: https://basescan.org/address/" + contractAddress);
  
  // Prepare metadata URIs for 100 NFTs
  console.log("📋 Preparing to mint 100 NFTs...");
  const tokenURIs = [];
  
  for (let i = 1; i <= 100; i++) {
    // All NFTs will use the same metadata but with unique token numbers
    tokenURIs.push(`the-game-kardashian-collector.json`);
  }
  
  // Batch mint in groups of 10 to avoid gas limits
  const batchSize = 10;
  const batches = [];
  
  for (let i = 0; i < tokenURIs.length; i += batchSize) {
    batches.push(tokenURIs.slice(i, i + batchSize));
  }
  
  console.log(`🎨 Minting ${tokenURIs.length} NFTs in ${batches.length} batches of ${batchSize}...`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`⏳ Minting batch ${i + 1}/${batches.length} (${batch.length} NFTs)...`);
    
    try {
      const tx = await contract.batchMint(platformWallet, batch);
      await tx.wait();
      console.log(`✅ Batch ${i + 1} minted successfully! Tx: ${tx.hash}`);
      
      // Small delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`❌ Error minting batch ${i + 1}:`, error.message);
      throw error;
    }
  }
  
  // Verify total supply
  const totalSupply = await contract.totalSupply();
  console.log(`🎉 Total NFTs minted: ${totalSupply}/100`);
  
  // Contract verification info
  console.log("\n📋 Contract Verification Info:");
  console.log("Contract Address:", contractAddress);
  console.log("Constructor Args:");
  console.log("  name:", name);
  console.log("  symbol:", symbol);
  console.log("  baseTokenURI:", baseTokenURI);
  console.log("  initialOwner:", platformWallet);
  
  console.log("\n🔍 To verify on BaseScan, run:");
  console.log(`npx hardhat verify --network base ${contractAddress} "${name}" "${symbol}" "${baseTokenURI}" "${platformWallet}"`);
  
  console.log("\n🎊 Deployment and minting completed successfully!");
  console.log(`💎 100 The Game - Kardashian Collector NFTs are now available for purchase!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });