const { ethers } = require('hardhat');

async function main() {
    console.log('=== PRECISE FUNDING CALCULATION ===');
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log('Wallet address:', deployer.address);
    
    const currentBalance = await deployer.getBalance();
    console.log('Current balance:', ethers.utils.formatEther(currentBalance), 'ETH');
    console.log('Current balance (wei):', currentBalance.toString());
    
    // Contract address
    const contractAddress = '0x609cF5C3B0003bcEF4F512B3c2Fa489c8D0EF200';
    
    // Get contract instance
    const TheGameKardashianCollector = await ethers.getContractFactory('TheGameKardashianCollector');
    const contract = TheGameKardashianCollector.attach(contractAddress);
    
    // Check current supply
    const totalSupply = await contract.totalSupply();
    const remainingNFTs = 100 - totalSupply.toNumber();
    
    console.log('\n=== NFT STATUS ===');
    console.log('Current NFTs minted:', totalSupply.toString());
    console.log('Remaining NFTs to mint:', remainingNFTs);
    
    if (remainingNFTs <= 0) {
        console.log('✅ All NFTs already minted!');
        return;
    }
    
    // Calculate different gas scenarios
    console.log('\n=== GAS COST SCENARIOS ===');
    
    const scenarios = [
        { name: 'Ultra-Low Gas', gasPrice: '0.0001', gasLimit: 100000 },
        { name: 'Minimal Gas', gasPrice: '0.00005', gasLimit: 90000 },
        { name: 'Emergency Gas', gasPrice: '0.00001', gasLimit: 80000 }
    ];
    
    for (const scenario of scenarios) {
        const gasPrice = ethers.utils.parseUnits(scenario.gasPrice, 'gwei');
        const gasLimit = scenario.gasLimit;
        const costPerTx = gasPrice.mul(gasLimit);
        const totalCost = costPerTx.mul(remainingNFTs);
        const buffer = totalCost.mul(20).div(100); // 20% buffer
        const totalWithBuffer = totalCost.add(buffer);
        
        console.log(`\n${scenario.name}:`);
        console.log(`  Gas Price: ${scenario.gasPrice} gwei`);
        console.log(`  Gas Limit: ${gasLimit.toLocaleString()}`);
        console.log(`  Cost per NFT: ${ethers.utils.formatEther(costPerTx)} ETH`);
        console.log(`  Total cost (${remainingNFTs} NFTs): ${ethers.utils.formatEther(totalCost)} ETH`);
        console.log(`  With 20% buffer: ${ethers.utils.formatEther(totalWithBuffer)} ETH`);
        
        const shortfall = totalWithBuffer.sub(currentBalance);
        if (shortfall.gt(0)) {
            console.log(`  ❌ Need additional: ${ethers.utils.formatEther(shortfall)} ETH`);
        } else {
            console.log(`  ✅ Sufficient funds available`);
        }
    }
    
    // Calculate exact funding needed for emergency scenario
    const emergencyGasPrice = ethers.utils.parseUnits('0.00001', 'gwei');
    const emergencyGasLimit = 80000;
    const emergencyCostPerTx = emergencyGasPrice.mul(emergencyGasLimit);
    const emergencyTotalCost = emergencyCostPerTx.mul(remainingNFTs);
    const emergencyBuffer = emergencyTotalCost.mul(50).div(100); // 50% buffer for safety
    const emergencyTotalWithBuffer = emergencyTotalCost.add(emergencyBuffer);
    
    console.log('\n=== RECOMMENDED FUNDING ===');
    console.log('Emergency scenario with 50% safety buffer:');
    console.log('Total needed:', ethers.utils.formatEther(emergencyTotalWithBuffer), 'ETH');
    console.log('Current balance:', ethers.utils.formatEther(currentBalance), 'ETH');
    
    const fundingNeeded = emergencyTotalWithBuffer.sub(currentBalance);
    if (fundingNeeded.gt(0)) {
        console.log('\n🚨 FUNDING REQUIRED:');
        console.log('Amount to add:', ethers.utils.formatEther(fundingNeeded), 'ETH');
        console.log('Amount to add (wei):', fundingNeeded.toString());
        
        // Convert to USD (approximate)
        const ethPriceUSD = 3500; // Approximate ETH price
        const fundingUSD = parseFloat(ethers.utils.formatEther(fundingNeeded)) * ethPriceUSD;
        console.log('Approximate USD cost:', `$${fundingUSD.toFixed(4)}`);
    } else {
        console.log('✅ Sufficient funds available for emergency scenario!');
    }
    
    // Show what the error message means
    console.log('\n=== ERROR ANALYSIS ===');
    console.log('Last error showed:');
    console.log('  Have:', '16894489750210 wei =', ethers.utils.formatEther('16894489750210'), 'ETH');
    console.log('  Want:', '89044000000000 wei =', ethers.utils.formatEther('89044000000000'), 'ETH');
    console.log('  Shortfall:', ethers.utils.formatEther(ethers.BigNumber.from('89044000000000').sub('16894489750210')), 'ETH');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });