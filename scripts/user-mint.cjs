const { ethers } = require('hardhat');

/**
 * User Minting Script
 * 
 * This script enables users to mint NFTs with:
 * - Paymaster integration for gasless transactions
 * - Payment verification
 * - User-friendly minting process
 * 
 * Usage:
 * npx hardhat run scripts/user-mint.cjs --network base -- --user 0x123... --payment-verified
 */

async function main() {
    console.log('=== USER NFT MINTING ===');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    let userAddress = null;
    let paymentVerified = false;
    let mintCount = 1;
    let usePaymaster = false;
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--user' && args[i + 1]) {
            userAddress = args[i + 1];
        }
        if (args[i] === '--payment-verified') {
            paymentVerified = true;
        }
        if (args[i] === '--count' && args[i + 1]) {
            mintCount = parseInt(args[i + 1]);
        }
        if (args[i] === '--paymaster') {
            usePaymaster = true;
        }
    }
    
    // Validation
    if (!userAddress) {
        throw new Error('User address is required. Use --user <address>');
    }
    
    if (!paymentVerified) {
        throw new Error('Payment verification required. Use --payment-verified flag');
    }
    
    if (!ethers.utils.isAddress(userAddress)) {
        throw new Error(`Invalid user address: ${userAddress}`);
    }
    
    // Get the platform account (for minting)
    const [platformAccount] = await ethers.getSigners();
    
    console.log('Platform account:', platformAccount.address);
    console.log('User address:', userAddress);
    console.log('Mint count:', mintCount);
    console.log('Use paymaster:', usePaymaster);
    
    const initialBalance = await platformAccount.getBalance();
    console.log('Platform balance:', ethers.utils.formatEther(initialBalance), 'ETH');
    
    // Contract address
    const contractAddress = '0x609cF5C3B0003bcEF4F512B3c2Fa489c8D0EF200';
    
    // Get contract instance
    const TheGameKardashianCollector = await ethers.getContractFactory('TheGameKardashianCollector');
    const contract = TheGameKardashianCollector.attach(contractAddress);
    
    try {
        // Check collection availability
        const totalSupply = await contract.totalSupply();
        const maxSupply = 100;
        const availableToMint = maxSupply - totalSupply.toNumber();
        
        console.log('\n=== COLLECTION STATUS ===');
        console.log('Current supply:', totalSupply.toString());
        console.log('Available to mint:', availableToMint);
        
        if (availableToMint <= 0) {
            throw new Error('Collection is fully minted!');
        }
        
        // Adjust mint count if necessary
        const actualMintCount = Math.min(mintCount, availableToMint);
        if (actualMintCount < mintCount) {
            console.log(`⚠️  Requested ${mintCount} NFTs, but only ${actualMintCount} available`);
        }
        
        // Check if user already owns NFTs (optional limit)
        const userBalance = await contract.balanceOf(userAddress);
        console.log('User current NFT balance:', userBalance.toString());
        
        // Gas settings (ultra-low for user mints)
        const gasPrice = ethers.utils.parseUnits('0.00001', 'gwei');
        const gasLimit = 80000;
        const costPerTx = gasPrice.mul(gasLimit);
        
        console.log('\n=== MINTING CONFIGURATION ===');
        if (usePaymaster) {
            console.log('Payment method: Paymaster (gasless for user)');
        } else {
            console.log('Payment method: Platform sponsored');
        }
        console.log('Gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
        console.log('Estimated cost per NFT:', ethers.utils.formatEther(costPerTx), 'ETH');
        
        let successfulMints = 0;
        let totalGasUsed = ethers.BigNumber.from(0);
        const mintedTokens = [];
        
        console.log('\n=== MINTING PROCESS ===');
        
        // Mint NFTs for the user
        for (let i = 0; i < actualMintCount; i++) {
            const tokenNumber = totalSupply.toNumber() + i + 1;
            
            try {
                console.log(`\n[${i + 1}/${actualMintCount}] Minting NFT #${tokenNumber} for user...`);
                
                // Check platform balance before each mint
                const currentBalance = await platformAccount.getBalance();
                if (currentBalance.lt(costPerTx.mul(2))) {
                    console.log('⚠️  Platform insufficient balance for minting');
                    console.log('Stopping minting process');
                    break;
                }
                
                let mintTx;
                
                if (usePaymaster) {
                    // TODO: Implement paymaster integration
                    // For now, use platform-sponsored minting
                    console.log('Note: Paymaster integration pending - using platform sponsorship');
                    mintTx = await contract.mint(userAddress, {
                        gasPrice: gasPrice,
                        gasLimit: gasLimit
                    });
                } else {
                    // Platform-sponsored minting
                    mintTx = await contract.mint(userAddress, {
                        gasPrice: gasPrice,
                        gasLimit: gasLimit
                    });
                }
                
                console.log('Transaction hash:', mintTx.hash);
                
                // Wait for confirmation
                const receipt = await mintTx.wait();
                totalGasUsed = totalGasUsed.add(receipt.gasUsed);
                successfulMints++;
                mintedTokens.push(tokenNumber);
                
                console.log('✅ NFT minted successfully!');
                console.log('Gas used:', receipt.gasUsed.toString());
                console.log('Token ID:', tokenNumber);
                
                // Get token URI for verification
                try {
                    const tokenURI = await contract.tokenURI(tokenNumber);
                    console.log('Token URI:', tokenURI);
                } catch (uriError) {
                    console.log('Token URI not yet available');
                }
                
                // Small delay between mints
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`❌ Error minting NFT #${tokenNumber}:`);
                console.error('Error message:', error.message);
                
                if (error.reason) {
                    console.error('Reason:', error.reason);
                }
                
                // Stop on critical errors
                if (error.message.includes('insufficient funds') || 
                    error.message.includes('execution reverted')) {
                    console.log('\n🛑 Critical error - stopping minting process');
                    break;
                }
                
                console.log('Continuing with next NFT...');
            }
        }
        
        // Final verification
        const finalUserBalance = await contract.balanceOf(userAddress);
        const finalSupply = await contract.totalSupply();
        const finalPlatformBalance = await platformAccount.getBalance();
        
        console.log('\n=== MINTING SUMMARY ===');
        console.log('Successfully minted:', successfulMints, 'NFTs');
        console.log('Minted token IDs:', mintedTokens.join(', '));
        console.log('User final NFT balance:', finalUserBalance.toString());
        console.log('Total gas used:', totalGasUsed.toString());
        
        if (successfulMints > 0) {
            const totalCost = totalGasUsed.mul(gasPrice);
            console.log('Total platform cost:', ethers.utils.formatEther(totalCost), 'ETH');
            console.log('Average cost per NFT:', ethers.utils.formatEther(totalCost.div(successfulMints)), 'ETH');
        }
        
        console.log('\n=== FINAL STATUS ===');
        console.log('Collection supply:', finalSupply.toString(), '/ 100');
        console.log('Remaining to mint:', 100 - finalSupply.toNumber());
        console.log('Platform balance used:', ethers.utils.formatEther(initialBalance.sub(finalPlatformBalance)), 'ETH');
        
        if (successfulMints === actualMintCount) {
            console.log('\n🎉 All requested NFTs minted successfully for user!');
            console.log('User can now view their NFTs in their wallet');
        } else if (successfulMints > 0) {
            console.log(`\n⚠️  Partial success: ${successfulMints}/${actualMintCount} NFTs minted`);
        } else {
            console.log('\n❌ No NFTs were minted');
        }
        
        // Return minting result for API integration
        return {
            success: successfulMints > 0,
            mintedCount: successfulMints,
            tokenIds: mintedTokens,
            userAddress: userAddress,
            transactionCost: successfulMints > 0 ? ethers.utils.formatEther(totalGasUsed.mul(gasPrice)) : '0',
            collectionSupply: finalSupply.toNumber()
        };
        
    } catch (error) {
        console.error('❌ User minting failed:', error.message);
        if (error.reason) {
            console.error('Reason:', error.reason);
        }
        throw error;
    }
}

// Display usage information if no arguments provided
if (process.argv.length <= 2) {
    console.log('\n=== USER MINTING USAGE ===');
    console.log('Required parameters:');
    console.log('  --user <address>        User wallet address');
    console.log('  --payment-verified      Confirm payment has been processed');
    console.log('\nOptional parameters:');
    console.log('  --count <number>        Number of NFTs to mint (default: 1)');
    console.log('  --paymaster            Use paymaster for gasless transactions');
    console.log('\nExamples:');
    console.log('  npx hardhat run scripts/user-mint.cjs --network base -- --user 0x123... --payment-verified');
    console.log('  npx hardhat run scripts/user-mint.cjs --network base -- --user 0x123... --payment-verified --count 3');
    console.log('  npx hardhat run scripts/user-mint.cjs --network base -- --user 0x123... --payment-verified --paymaster');
    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

// Export for API integration
module.exports = { main };