const { ethers } = require('hardhat');

async function main() {
    console.log('Checking wallet balance and NFT status...');
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log('Wallet address:', deployer.address);
    
    // Check current balance
    const balance = await deployer.getBalance();
    const balanceInEth = ethers.utils.formatEther(balance);
    console.log('Current balance:', balanceInEth, 'ETH');
    console.log('Current balance in wei:', balance.toString());
    
    // Contract address
    const contractAddress = '0x609cF5C3B0003bcEF4F512B3c2Fa489c8D0EF200';
    
    // Get contract instance
    const TheGameKardashianCollector = await ethers.getContractFactory('TheGameKardashianCollector');
    const contract = TheGameKardashianCollector.attach(contractAddress);
    
    // Check current total supply
    const totalSupply = await contract.totalSupply();
    console.log('Current NFTs minted:', totalSupply.toString());
    
    const remaining = 100 - totalSupply.toNumber();
    console.log('NFTs remaining to mint:', remaining);
    
    // Calculate gas cost per mint (from previous data: ~88,111 gas per mint)
    const gasPerMint = 88111;
    const gasPriceInWei = ethers.utils.parseUnits('0.001', 'gwei'); // 0.001 gwei
    const costPerMint = gasPerMint * gasPriceInWei;
    
    console.log('\n=== COST ANALYSIS ===');
    console.log('Gas per mint:', gasPerMint);
    console.log('Gas price:', ethers.utils.formatUnits(gasPriceInWei, 'gwei'), 'gwei');
    console.log('Cost per mint:', ethers.utils.formatEther(costPerMint), 'ETH');
    
    const totalCostForRemaining = costPerMint * remaining;
    console.log('Total cost for', remaining, 'NFTs:', ethers.utils.formatEther(totalCostForRemaining), 'ETH');
    
    // Add 20% buffer for safety
    const totalCostWithBuffer = totalCostForRemaining * 1.2;
    console.log('Total cost with 20% buffer:', ethers.utils.formatEther(totalCostWithBuffer), 'ETH');
    
    const shortfall = totalCostWithBuffer - balance;
    if (shortfall > 0) {
        console.log('\n⚠️  FUNDING NEEDED:', ethers.utils.formatEther(shortfall), 'ETH');
    } else {
        console.log('\n✅ Sufficient funds available for all remaining mints!');
    }
    
    // Estimate USD cost (assuming ETH = $3500)
    const ethPrice = 3500;
    const costInUsd = parseFloat(ethers.utils.formatEther(totalCostWithBuffer)) * ethPrice;
    console.log('Estimated USD cost:', '$' + costInUsd.toFixed(4));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });