const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🚀 Starting deployment of The Game - Kardashian Collector NFT...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  // Base mainnet optimized gas settings
  const gasPrice = ethers.utils.parseUnits('0.001', 'gwei'); // Ultra-low Base gas price
  const gasLimit = 2000000; // Conservative gas limit for contract deployment
  
  console.log("⚡ Using optimized Base gas settings:");
  console.log("   Gas Price:", ethers.utils.formatUnits(gasPrice, 'gwei'), "gwei");
  console.log("   Gas Limit:", gasLimit.toLocaleString());
  console.log("   Estimated Cost: ~$0.01 USD");
  
  // Contract parameters
  const name = "The Game - Kardashian Collector";
  const symbol = "TGKC";
  const baseTokenURI = "https://bodies.vercel.app/metadata/";
  const platformWallet = process.env.PLATFORM_WALLET;
  
  if (!platformWallet) {
    throw new Error("PLATFORM_WALLET not found in environment variables");
  }
  
  console.log("🎯 Platform wallet:", platformWallet);
  
  // Deploy the contract with optimized gas settings
  console.log("📦 Deploying contract...");
  const TheGameKardashianCollector = await ethers.getContractFactory("TheGameKardashianCollector");
  const contract = await TheGameKardashianCollector.deploy(
    name,
    symbol,
    baseTokenURI,
    deployer.address,
    {
      gasPrice: gasPrice,
      gasLimit: gasLimit
    }
  );
  
  await contract.deployed();
  const contractAddress = contract.address;
  
  console.log("✅ Contract deployed to:", contractAddress);
  console.log("🔗 View on BaseScan: https://basescan.org/address/" + contractAddress);
  
  // Set base URI with optimized gas
  console.log("🔧 Setting base URI...");
  const setBaseURITx = await contract.setBaseURI(baseTokenURI, {
    gasPrice: gasPrice,
    gasLimit: 100000
  });
  await setBaseURITx.wait();
  console.log("✅ Base URI set successfully!");
  
  // Mint first NFT to platform wallet with optimized gas
  console.log("🎨 Minting first NFT to platform wallet...");
  const mintTx = await contract.mint(platformWallet, "the-game-kardashian-collector.json", {
    gasPrice: gasPrice,
    gasLimit: 150000
  });
  await mintTx.wait();
  console.log("✅ First NFT minted successfully!");
  
  // Verify total supply
  const totalSupply = await contract.totalSupply();
  console.log(`🎉 Total NFTs minted: ${totalSupply}`);
  
  console.log("\n📋 Contract Info:");
  console.log("Contract Address:", contractAddress);
  console.log("Owner:", await contract.owner());
  console.log("Name:", await contract.name());
  console.log("Symbol:", await contract.symbol());
  
  console.log("\n🎊 Deployment completed successfully!");
  console.log(`💎 The Game - Kardashian Collector NFT contract is now live on Base!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });