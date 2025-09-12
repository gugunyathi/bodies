const { ethers } = require('hardhat');
require('dotenv').config();

async function checkBalance() {
  console.log('🔍 Checking wallet balance on Base mainnet...');
  
  try {
    // Connect to Base mainnet
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.BASE_RPC_URL || 'https://mainnet.base.org'
    );
    
    // Get wallet from private key
    if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === 'your-private-key-here') {
      console.error('❌ Please set PRIVATE_KEY in .env file');
      process.exit(1);
    }
    
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log('Wallet address:', wallet.address);
    
    // Check ETH balance
    const balance = await wallet.getBalance();
    const balanceETH = ethers.utils.formatEther(balance);
    console.log('ETH Balance:', balanceETH, 'ETH');
    
    // Get current gas price
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
    console.log('Current gas price:', gasPriceGwei, 'gwei');
    
    // Estimate deployment cost (approximate)
    const estimatedGasLimit = 2500000; // Conservative estimate for contract deployment
    const estimatedCost = gasPrice.mul(estimatedGasLimit);
    const estimatedCostETH = ethers.utils.formatEther(estimatedCost);
    console.log('Estimated deployment cost:', estimatedCostETH, 'ETH');
    
    // Check if balance is sufficient
    const hasEnoughBalance = balance.gt(estimatedCost.mul(110).div(100)); // 10% buffer
    console.log('\n💰 Balance Status:');
    console.log('- Required (with buffer):', ethers.utils.formatEther(estimatedCost.mul(110).div(100)), 'ETH');
    console.log('- Available:', balanceETH, 'ETH');
    console.log('- Sufficient:', hasEnoughBalance ? '✅ Yes' : '❌ No');
    
    if (!hasEnoughBalance) {
      console.log('\n⚠️  Insufficient balance for deployment!');
      console.log('Please fund your wallet with at least', ethers.utils.formatEther(estimatedCost.mul(110).div(100)), 'ETH');
    } else {
      console.log('\n✅ Wallet is ready for deployment!');
    }
    
    // Convert to USD estimate (approximate)
    const ethPriceUSD = 3500; // Approximate ETH price, should be fetched from API in production
    const costUSD = parseFloat(estimatedCostETH) * ethPriceUSD;
    console.log('Estimated cost in USD: $' + costUSD.toFixed(4));
    
    return {
      address: wallet.address,
      balance: balanceETH,
      gasPrice: gasPriceGwei,
      estimatedCost: estimatedCostETH,
      sufficient: hasEnoughBalance,
      costUSD: costUSD.toFixed(4)
    };
    
  } catch (error) {
    console.error('❌ Error checking balance:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  checkBalance()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { checkBalance };