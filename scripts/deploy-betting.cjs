const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Deploying SimpleBetting contract...');
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  
  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log('Account balance:', ethers.utils.formatEther(balance), 'ETH');
  
  // Contract addresses for Base Network
  const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC
  const APP_WALLET = deployer.address; // Use deployer as app wallet for now
  
  console.log('USDC Address:', USDC_BASE);
  console.log('App Wallet:', APP_WALLET);
  
  // Get contract factory
  const SimpleBetting = await ethers.getContractFactory('SimpleBetting');
  
  // Estimate gas for deployment
  const deploymentData = SimpleBetting.getDeployTransaction(USDC_BASE, APP_WALLET);
  const estimatedGas = await deployer.estimateGas(deploymentData);
  console.log('Estimated gas for deployment:', estimatedGas.toString());
  
  // Get current gas price
  const gasPrice = await deployer.getGasPrice();
  console.log('Current gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
  
  // Calculate deployment cost
  const deploymentCost = estimatedGas.mul(gasPrice);
  console.log('Estimated deployment cost:', ethers.utils.formatEther(deploymentCost), 'ETH');
  
  // Deploy with optimized gas settings
  const contract = await SimpleBetting.deploy(USDC_BASE, APP_WALLET, {
    gasLimit: estimatedGas.mul(120).div(100), // Add 20% buffer
    gasPrice: gasPrice
  });
  
  console.log('⏳ Waiting for deployment...');
  await contract.deployed();
  
  console.log('✅ SimpleBetting deployed to:', contract.address);
  console.log('Transaction hash:', contract.deployTransaction.hash);
  
  // Wait for a few confirmations
  console.log('⏳ Waiting for confirmations...');
  await contract.deployTransaction.wait(2);
  
  // Get actual deployment cost
  const receipt = await contract.deployTransaction.wait();
  const actualCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
  console.log('Actual deployment cost:', ethers.utils.formatEther(actualCost), 'ETH');
  console.log('Gas used:', receipt.gasUsed.toString());
  
  // Verify contract info
  console.log('\n📋 Contract Info:');
  console.log('- Contract Address:', contract.address);
  console.log('- USDC Token:', await contract.usdc());
  console.log('- App Wallet:', await contract.appWallet());
  console.log('- Current Round:', (await contract.currentRound()).toString());
  console.log('- House Fee:', (await contract.HOUSE_FEE_PERCENT()).toString() + '%');
  console.log('- Min Bet:', ethers.utils.formatUnits(await contract.MIN_BET(), 6), 'USDC');
  console.log('- Max Bet:', ethers.utils.formatUnits(await contract.MAX_BET(), 6), 'USDC');
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress: contract.address,
    transactionHash: contract.deployTransaction.hash,
    deployer: deployer.address,
    network: 'base',
    gasUsed: receipt.gasUsed.toString(),
    gasCost: ethers.utils.formatEther(actualCost),
    timestamp: new Date().toISOString()
  };
  
  console.log('\n💾 Deployment completed successfully!');
  console.log('Contract ready for betting operations.');
  
  return deploymentInfo;
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });

module.exports = { main };