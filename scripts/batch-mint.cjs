const { ethers } = require('hardhat');

async function main() {
    console.log('Starting optimized batch NFT minting process...');
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log('Minting with account:', deployer.address);
    console.log('Account balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH');
    
    // Contract address from previous deployment
    const contractAddress = '0x609cF5C3B0003bcEF4F512B3c2Fa489c8D0EF200';
    
    // Get contract instance
    const TheGameKardashianCollector = await ethers.getContractFactory('TheGameKardashianCollector');
    const contract = TheGameKardashianCollector.attach(contractAddress);
    
    console.log('Contract attached at:', contractAddress);
    
    try {
        // Check current total supply
        const totalSupply = await contract.totalSupply();
        console.log('Current total supply:', totalSupply.toString());
        
        const targetSupply = 100;
        const remainingToMint = targetSupply - totalSupply.toNumber();
        
        if (remainingToMint <= 0) {
            console.log('✅ All 100 NFTs have already been minted!');
            return;
        }
        
        console.log(`Need to mint ${remainingToMint} more NFTs`);
        
        // Ultra-low gas settings for Base mainnet
        const gasPrice = ethers.utils.parseUnits('0.0005', 'gwei'); // Even lower: 0.0005 gwei
        const gasLimit = 120000; // Reduced gas limit
        
        console.log('Using gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
        console.log('Using gas limit:', gasLimit);
        
        let totalGasUsed = ethers.BigNumber.from(0);
        let successfulMints = 0;
        
        // Mint one by one with ultra-low gas
        for (let i = 0; i < remainingToMint; i++) {
            const tokenNumber = totalSupply.toNumber() + i + 1;
            
            try {
                console.log(`\nMinting NFT #${tokenNumber}...`);
                
                // Check balance before each mint
                const currentBalance = await deployer.getBalance();
                const estimatedCost = gasPrice.mul(gasLimit);
                
                if (currentBalance.lt(estimatedCost.mul(2))) { // Need 2x buffer
                    console.log('⚠️  Insufficient balance for safe minting');
                    console.log('Current balance:', ethers.utils.formatEther(currentBalance), 'ETH');
                    console.log('Estimated cost:', ethers.utils.formatEther(estimatedCost), 'ETH');
                    break;
                }
                
                const mintTx = await contract.mint(deployer.address, {
                    gasPrice: gasPrice,
                    gasLimit: gasLimit
                });
                
                console.log(`Tx hash: ${mintTx.hash}`);
                
                const receipt = await mintTx.wait();
                totalGasUsed = totalGasUsed.add(receipt.gasUsed);
                successfulMints++;
                
                console.log(`✅ NFT #${tokenNumber} minted successfully`);
                console.log(`Gas used: ${receipt.gasUsed.toString()}`);
                
                // Small delay to avoid overwhelming the network
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (error) {
                console.error(`❌ Error minting NFT #${tokenNumber}:`, error.message);
                if (error.reason) {
                    console.error('Reason:', error.reason);
                }
                
                // If it's a gas issue, try with even lower gas
                if (error.message.includes('insufficient funds')) {
                    console.log('💡 Trying with even lower gas settings...');
                    try {
                        const ultraLowGasPrice = ethers.utils.parseUnits('0.0001', 'gwei');
                        const ultraLowGasLimit = 100000;
                        
                        const retryTx = await contract.mint(deployer.address, {
                            gasPrice: ultraLowGasPrice,
                            gasLimit: ultraLowGasLimit
                        });
                        
                        const retryReceipt = await retryTx.wait();
                        totalGasUsed = totalGasUsed.add(retryReceipt.gasUsed);
                        successfulMints++;
                        
                        console.log(`✅ NFT #${tokenNumber} minted with ultra-low gas`);
                        
                    } catch (retryError) {
                        console.error(`❌ Retry failed for NFT #${tokenNumber}:`, retryError.message);
                        break; // Stop if even ultra-low gas fails
                    }
                } else {
                    break; // Stop on other errors
                }
            }
        }
        
        // Final summary
        console.log('\n=== MINTING SUMMARY ===');
        console.log('Successfully minted:', successfulMints, 'NFTs');
        console.log('Total gas used:', totalGasUsed.toString());
        if (successfulMints > 0) {
            console.log('Average gas per mint:', totalGasUsed.div(successfulMints).toString());
        }
        
        const finalSupply = await contract.totalSupply();
        console.log('Final total supply:', finalSupply.toString());
        
        const finalBalance = await deployer.getBalance();
        console.log('Final account balance:', ethers.utils.formatEther(finalBalance), 'ETH');
        
        if (finalSupply.toNumber() >= 100) {
            console.log('🎉 All 100 NFTs have been minted successfully!');
        } else {
            console.log(`⚠️  ${100 - finalSupply.toNumber()} NFTs still need to be minted`);
        }
        
    } catch (error) {
        console.error('❌ Batch minting failed:', error.message);
        if (error.reason) {
            console.error('Reason:', error.reason);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });