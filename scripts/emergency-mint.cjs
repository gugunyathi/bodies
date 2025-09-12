const { ethers } = require('hardhat');

async function main() {
    console.log('=== EMERGENCY ULTRA-LOW GAS MINTING ===');
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log('Wallet address:', deployer.address);
    
    const initialBalance = await deployer.getBalance();
    console.log('Initial balance:', ethers.utils.formatEther(initialBalance), 'ETH');
    
    // Contract address
    const contractAddress = '0x609cF5C3B0003bcEF4F512B3c2Fa489c8D0EF200';
    
    // Get contract instance
    const TheGameKardashianCollector = await ethers.getContractFactory('TheGameKardashianCollector');
    const contract = TheGameKardashianCollector.attach(contractAddress);
    
    try {
        // Check current supply
        const totalSupply = await contract.totalSupply();
        const remainingNFTs = 100 - totalSupply.toNumber();
        
        console.log('Current NFTs minted:', totalSupply.toString());
        console.log('Remaining NFTs to mint:', remainingNFTs);
        
        if (remainingNFTs <= 0) {
            console.log('✅ All NFTs already minted!');
            return;
        }
        
        // EMERGENCY ultra-low gas settings
        const gasPrice = ethers.utils.parseUnits('0.00001', 'gwei'); // 0.00001 gwei
        const gasLimit = 80000; // Minimal gas limit
        
        console.log('\n=== EMERGENCY GAS SETTINGS ===');
        console.log('Gas Price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
        console.log('Gas Limit:', gasLimit.toLocaleString());
        
        const costPerTx = gasPrice.mul(gasLimit);
        console.log('Cost per NFT:', ethers.utils.formatEther(costPerTx), 'ETH');
        console.log('Total estimated cost:', ethers.utils.formatEther(costPerTx.mul(remainingNFTs)), 'ETH');
        
        let successfulMints = 0;
        let totalGasUsed = ethers.BigNumber.from(0);
        
        // Mint with absolute minimum gas
        for (let i = 0; i < remainingNFTs; i++) {
            const tokenNumber = totalSupply.toNumber() + i + 1;
            
            try {
                console.log(`\n[${i + 1}/${remainingNFTs}] Minting NFT #${tokenNumber}...`);
                
                // Check balance before each mint
                const currentBalance = await deployer.getBalance();
                const estimatedCost = costPerTx;
                
                console.log('Current balance:', ethers.utils.formatEther(currentBalance), 'ETH');
                console.log('Estimated cost:', ethers.utils.formatEther(estimatedCost), 'ETH');
                
                if (currentBalance.lt(estimatedCost.mul(2))) {
                    console.log('⚠️  Balance too low for safe minting');
                    console.log('Need at least:', ethers.utils.formatEther(estimatedCost.mul(2)), 'ETH');
                    break;
                }
                
                // Mint with emergency gas settings
                const mintTx = await contract.mint(deployer.address, {
                    gasPrice: gasPrice,
                    gasLimit: gasLimit
                });
                
                console.log('Transaction hash:', mintTx.hash);
                
                // Wait for confirmation
                const receipt = await mintTx.wait();
                totalGasUsed = totalGasUsed.add(receipt.gasUsed);
                successfulMints++;
                
                console.log('✅ NFT minted successfully!');
                console.log('Gas used:', receipt.gasUsed.toString());
                console.log('Actual cost:', ethers.utils.formatEther(receipt.gasUsed.mul(gasPrice)), 'ETH');
                
                // Small delay to avoid overwhelming the network
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`❌ Error minting NFT #${tokenNumber}:`);
                console.error('Error message:', error.message);
                
                if (error.reason) {
                    console.error('Reason:', error.reason);
                }
                
                // If insufficient funds, stop immediately
                if (error.message.includes('insufficient funds')) {
                    console.log('\n💰 INSUFFICIENT FUNDS - STOPPING');
                    const currentBalance = await deployer.getBalance();
                    console.log('Current balance:', ethers.utils.formatEther(currentBalance), 'ETH');
                    
                    // Calculate how much more is needed
                    const remainingToMint = remainingNFTs - i;
                    const additionalFunding = costPerTx.mul(remainingToMint).mul(2); // 2x buffer
                    console.log('Additional funding needed:', ethers.utils.formatEther(additionalFunding), 'ETH');
                    break;
                }
                
                // For other errors, continue with next NFT
                console.log('Continuing with next NFT...');
            }
        }
        
        // Final summary
        console.log('\n=== FINAL SUMMARY ===');
        console.log('Successfully minted:', successfulMints, 'NFTs');
        console.log('Total gas used:', totalGasUsed.toString());
        
        if (successfulMints > 0) {
            console.log('Average gas per mint:', totalGasUsed.div(successfulMints).toString());
            const totalCost = totalGasUsed.mul(gasPrice);
            console.log('Total cost:', ethers.utils.formatEther(totalCost), 'ETH');
            console.log('Average cost per NFT:', ethers.utils.formatEther(totalCost.div(successfulMints)), 'ETH');
        }
        
        const finalSupply = await contract.totalSupply();
        const finalBalance = await deployer.getBalance();
        
        console.log('\nFinal NFT supply:', finalSupply.toString(), '/ 100');
        console.log('Final balance:', ethers.utils.formatEther(finalBalance), 'ETH');
        console.log('Balance used:', ethers.utils.formatEther(initialBalance.sub(finalBalance)), 'ETH');
        
        if (finalSupply.toNumber() >= 100) {
            console.log('\n🎉 SUCCESS! All 100 NFTs have been minted!');
        } else {
            const remaining = 100 - finalSupply.toNumber();
            console.log(`\n⚠️  ${remaining} NFTs still need to be minted`);
            
            // Calculate exact funding needed for remaining NFTs
            const fundingNeeded = costPerTx.mul(remaining).mul(2); // 2x safety buffer
            console.log('Funding needed for remaining NFTs:', ethers.utils.formatEther(fundingNeeded), 'ETH');
        }
        
    } catch (error) {
        console.error('❌ Emergency minting failed:', error.message);
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