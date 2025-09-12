const { ethers } = require('hardhat');

/**
 * On-Demand NFT Minting Script
 * 
 * This script allows flexible minting of remaining NFTs based on:
 * - Market demand
 * - User purchases
 * - Contract upgrades
 * - Administrative needs
 * 
 * Usage:
 * npx hardhat run scripts/on-demand-mint.cjs --network base -- --count 10
 * npx hardhat run scripts/on-demand-mint.cjs --network base -- --to 0x123... --count 5
 */

async function main() {
    console.log('=== ON-DEMAND NFT MINTING ===');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    let mintCount = 1;
    let recipientAddress = null;
    let gasPrice = '0.00001'; // Default ultra-low gas
    let gasLimit = 80000;
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--count' && args[i + 1]) {
            mintCount = parseInt(args[i + 1]);
        }
        if (args[i] === '--to' && args[i + 1]) {
            recipientAddress = args[i + 1];
        }
        if (args[i] === '--gas-price' && args[i + 1]) {
            gasPrice = args[i + 1];
        }
        if (args[i] === '--gas-limit' && args[i + 1]) {
            gasLimit = parseInt(args[i + 1]);
        }
    }
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    const recipient = recipientAddress || deployer.address;
    
    console.log('Minting account:', deployer.address);
    console.log('Recipient address:', recipient);
    console.log('Requested mint count:', mintCount);
    
    const initialBalance = await deployer.getBalance();
    console.log('Initial balance:', ethers.utils.formatEther(initialBalance), 'ETH');
    
    // Contract address
    const contractAddress = '0x609cF5C3B0003bcEF4F512B3c2Fa489c8D0EF200';
    
    // Get contract instance
    const TheGameKardashianCollector = await ethers.getContractFactory('TheGameKardashianCollector');
    const contract = TheGameKardashianCollector.attach(contractAddress);
    
    try {
        // Check current supply and availability
        const totalSupply = await contract.totalSupply();
        const maxSupply = 100; // Our collection limit
        const availableToMint = maxSupply - totalSupply.toNumber();
        
        console.log('\n=== COLLECTION STATUS ===');
        console.log('Current supply:', totalSupply.toString());
        console.log('Max supply:', maxSupply);
        console.log('Available to mint:', availableToMint);
        
        if (availableToMint <= 0) {
            console.log('❌ Collection is fully minted!');
            return;
        }
        
        // Adjust mint count if necessary
        const actualMintCount = Math.min(mintCount, availableToMint);
        if (actualMintCount < mintCount) {
            console.log(`⚠️  Requested ${mintCount} NFTs, but only ${actualMintCount} available`);
        }
        
        // Gas settings
        const gasPriceWei = ethers.utils.parseUnits(gasPrice, 'gwei');
        const costPerTx = gasPriceWei.mul(gasLimit);
        const totalEstimatedCost = costPerTx.mul(actualMintCount);
        
        console.log('\n=== GAS SETTINGS ===');
        console.log('Gas Price:', gasPrice, 'gwei');
        console.log('Gas Limit:', gasLimit.toLocaleString());
        console.log('Cost per NFT:', ethers.utils.formatEther(costPerTx), 'ETH');
        console.log('Total estimated cost:', ethers.utils.formatEther(totalEstimatedCost), 'ETH');
        
        // Balance check
        const safetyBuffer = totalEstimatedCost.mul(2); // 2x safety buffer
        if (initialBalance.lt(safetyBuffer)) {
            console.log('\n⚠️  WARNING: Low balance detected');
            console.log('Current balance:', ethers.utils.formatEther(initialBalance), 'ETH');
            console.log('Recommended balance:', ethers.utils.formatEther(safetyBuffer), 'ETH');
            console.log('Shortfall:', ethers.utils.formatEther(safetyBuffer.sub(initialBalance)), 'ETH');
            
            // Ask for confirmation to proceed
            console.log('\nProceeding with available balance...');
        }
        
        // Validate recipient address
        if (!ethers.utils.isAddress(recipient)) {
            throw new Error(`Invalid recipient address: ${recipient}`);
        }
        
        console.log('\n=== MINTING PROCESS ===');
        let successfulMints = 0;
        let totalGasUsed = ethers.BigNumber.from(0);
        const mintedTokens = [];
        
        // Mint NFTs one by one for better control
        for (let i = 0; i < actualMintCount; i++) {
            const tokenNumber = totalSupply.toNumber() + i + 1;
            
            try {
                console.log(`\n[${i + 1}/${actualMintCount}] Minting NFT #${tokenNumber} to ${recipient}...`);
                
                // Check balance before each mint
                const currentBalance = await deployer.getBalance();
                if (currentBalance.lt(costPerTx.mul(2))) {
                    console.log('⚠️  Insufficient balance for safe minting');
                    console.log('Stopping minting process');
                    break;
                }
                
                // Mint NFT
                const mintTx = await contract.mint(recipient, {
                    gasPrice: gasPriceWei,
                    gasLimit: gasLimit
                });
                
                console.log('Transaction hash:', mintTx.hash);
                
                // Wait for confirmation
                const receipt = await mintTx.wait();
                totalGasUsed = totalGasUsed.add(receipt.gasUsed);
                successfulMints++;
                mintedTokens.push(tokenNumber);
                
                console.log('✅ NFT minted successfully!');
                console.log('Gas used:', receipt.gasUsed.toString());
                console.log('Actual cost:', ethers.utils.formatEther(receipt.gasUsed.mul(gasPriceWei)), 'ETH');
                
                // Small delay to avoid overwhelming the network
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                console.error(`❌ Error minting NFT #${tokenNumber}:`);
                console.error('Error message:', error.message);
                
                if (error.reason) {
                    console.error('Reason:', error.reason);
                }
                
                // Stop on insufficient funds
                if (error.message.includes('insufficient funds')) {
                    console.log('\n💰 INSUFFICIENT FUNDS - STOPPING MINTING');
                    break;
                }
                
                // Continue with other errors (but log them)
                console.log('Continuing with next NFT...');
            }
        }
        
        // Final summary
        console.log('\n=== MINTING SUMMARY ===');
        console.log('Successfully minted:', successfulMints, 'NFTs');
        console.log('Minted token IDs:', mintedTokens.join(', '));
        console.log('Total gas used:', totalGasUsed.toString());
        
        if (successfulMints > 0) {
            const totalCost = totalGasUsed.mul(gasPriceWei);
            console.log('Total cost:', ethers.utils.formatEther(totalCost), 'ETH');
            console.log('Average cost per NFT:', ethers.utils.formatEther(totalCost.div(successfulMints)), 'ETH');
        }
        
        const finalSupply = await contract.totalSupply();
        const finalBalance = await deployer.getBalance();
        
        console.log('\n=== FINAL STATUS ===');
        console.log('Collection supply:', finalSupply.toString(), '/ 100');
        console.log('Remaining to mint:', 100 - finalSupply.toNumber());
        console.log('Final balance:', ethers.utils.formatEther(finalBalance), 'ETH');
        console.log('Balance used:', ethers.utils.formatEther(initialBalance.sub(finalBalance)), 'ETH');
        
        if (successfulMints === actualMintCount) {
            console.log('\n🎉 All requested NFTs minted successfully!');
        } else if (successfulMints > 0) {
            console.log(`\n⚠️  Partial success: ${successfulMints}/${actualMintCount} NFTs minted`);
        } else {
            console.log('\n❌ No NFTs were minted');
        }
        
    } catch (error) {
        console.error('❌ On-demand minting failed:', error.message);
        if (error.reason) {
            console.error('Reason:', error.reason);
        }
    }
}

// Display usage information if no arguments provided
if (process.argv.length <= 2) {
    console.log('\n=== ON-DEMAND MINTING USAGE ===');
    console.log('Basic usage:');
    console.log('  npx hardhat run scripts/on-demand-mint.cjs --network base');
    console.log('\nAdvanced usage:');
    console.log('  npx hardhat run scripts/on-demand-mint.cjs --network base -- --count 10');
    console.log('  npx hardhat run scripts/on-demand-mint.cjs --network base -- --to 0x123... --count 5');
    console.log('  npx hardhat run scripts/on-demand-mint.cjs --network base -- --count 3 --gas-price 0.00005');
    console.log('\nParameters:');
    console.log('  --count <number>     Number of NFTs to mint (default: 1)');
    console.log('  --to <address>       Recipient address (default: deployer)');
    console.log('  --gas-price <gwei>   Gas price in gwei (default: 0.00001)');
    console.log('  --gas-limit <number> Gas limit (default: 80000)');
    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });