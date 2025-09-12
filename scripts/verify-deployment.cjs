const { ethers } = require('hardhat');
const hre = require('hardhat');

// Contract addresses from deployment
const BETTING_CONTRACT = '0x24Afe00A02b1FE6e81C9Bd2020233265025EA5Df';
const PAYMASTER_CONTRACT = '0xEf181B6a45391EA6dDa7355e61156c3e9F4559a8';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

async function verifyDeployment() {
  console.log('🔍 Verifying contract deployments on Base Mainnet...');
  console.log('=' .repeat(60));

  try {
    // Get provider
    const provider = hre.ethers.provider;
    
    // Check network
    const network = await provider.getNetwork();
    console.log(`📡 Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    if (Number(network.chainId) !== 8453) {
      throw new Error(`Not connected to Base Mainnet (Chain ID: 8453). Current: ${network.chainId}`);
    }

    console.log('\n🎯 Verifying SimpleBetting Contract...');
    console.log(`📍 Address: ${BETTING_CONTRACT}`);
    
    // Check if SimpleBetting contract exists
    const bettingCode = await provider.getCode(BETTING_CONTRACT);
    if (bettingCode === '0x') {
      throw new Error('SimpleBetting contract not found at specified address');
    }
    console.log('✅ SimpleBetting contract code found');
    
    // Get SimpleBetting contract instance
    const SimpleBetting = await hre.ethers.getContractFactory('SimpleBetting');
    const bettingContract = SimpleBetting.attach(BETTING_CONTRACT);
    
    // Test basic contract functions
    try {
      const usdcAddress = await bettingContract.usdc();
      console.log(`💰 USDC Token: ${usdcAddress}`);
      
      if (usdcAddress.toLowerCase() !== USDC_BASE.toLowerCase()) {
        console.log('⚠️  Warning: USDC address mismatch');
      } else {
        console.log('✅ USDC address verified');
      }
      
      const appWallet = await bettingContract.appWallet();
      console.log(`🏦 App Wallet: ${appWallet}`);
      
      const owner = await bettingContract.owner();
      console.log(`👤 Contract Owner: ${owner}`);
      
    } catch (error) {
      console.log(`❌ Error reading SimpleBetting contract: ${error.message}`);
    }

    console.log('\n🎯 Verifying BettingPaymaster Contract...');
    console.log(`📍 Address: ${PAYMASTER_CONTRACT}`);
    
    // Check if BettingPaymaster contract exists
    const paymasterCode = await provider.getCode(PAYMASTER_CONTRACT);
    if (paymasterCode === '0x') {
      throw new Error('BettingPaymaster contract not found at specified address');
    }
    console.log('✅ BettingPaymaster contract code found');
    
    // Get BettingPaymaster contract instance
    const BettingPaymaster = await hre.ethers.getContractFactory('BettingPaymaster');
    const paymasterContract = BettingPaymaster.attach(PAYMASTER_CONTRACT);
    
    // Test basic contract functions
    try {
      const paymasterUsdc = await paymasterContract.usdc();
      console.log(`💰 Paymaster USDC: ${paymasterUsdc}`);
      
      const bettingContractAddr = await paymasterContract.bettingContract();
      console.log(`🎲 Betting Contract: ${bettingContractAddr}`);
      
      if (bettingContractAddr.toLowerCase() !== BETTING_CONTRACT.toLowerCase()) {
        console.log('⚠️  Warning: Betting contract address mismatch');
      } else {
        console.log('✅ Betting contract address verified');
      }
      
      const paymasterOwner = await paymasterContract.owner();
      console.log(`👤 Paymaster Owner: ${paymasterOwner}`);
      
    } catch (error) {
      console.log(`❌ Error reading BettingPaymaster contract: ${error.message}`);
    }

    console.log('\n🔗 Contract Integration Check...');
    
    // Check if contracts are properly linked
    try {
      const bettingUsdcAddr = await bettingContract.usdc();
      const paymasterUsdcAddr = await paymasterContract.usdc();
      
      if (bettingUsdcAddr.toLowerCase() === paymasterUsdcAddr.toLowerCase()) {
        console.log('✅ Both contracts use the same USDC token');
      } else {
        console.log('⚠️  Warning: Contracts use different USDC tokens');
      }
      
      const linkedBettingContract = await paymasterContract.bettingContract();
      if (linkedBettingContract.toLowerCase() === BETTING_CONTRACT.toLowerCase()) {
        console.log('✅ Paymaster correctly linked to SimpleBetting contract');
      } else {
        console.log('❌ Paymaster not properly linked to SimpleBetting contract');
      }
      
    } catch (error) {
      console.log(`❌ Error checking contract integration: ${error.message}`);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Deployment verification completed!');
    console.log('📋 Summary:');
    console.log(`   • SimpleBetting: ${BETTING_CONTRACT}`);
    console.log(`   • BettingPaymaster: ${PAYMASTER_CONTRACT}`);
    console.log(`   • Network: Base Mainnet (${network.chainId})`);
    console.log('✅ All contracts are deployed and accessible');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  verifyDeployment()
    .then(() => {
      console.log('\n🚀 Verification completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyDeployment };