const { ethers } = require('hardhat');

/**
 * Contract Upgrade Script
 * 
 * This script handles contract upgrades for:
 * - Adding new features
 * - Updating metadata URIs
 * - Modifying minting parameters
 * - Administrative functions
 * 
 * Usage:
 * npx hardhat run scripts/contract-upgrade.cjs --network base -- --action update-base-uri --uri https://new-uri.com/
 */

async function main() {
    console.log('=== CONTRACT UPGRADE MANAGEMENT ===');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    let action = null;
    let newBaseURI = null;
    let newOwner = null;
    let paused = null;
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--action' && args[i + 1]) {
            action = args[i + 1];
        }
        if (args[i] === '--uri' && args[i + 1]) {
            newBaseURI = args[i + 1];
        }
        if (args[i] === '--new-owner' && args[i + 1]) {
            newOwner = args[i + 1];
        }
        if (args[i] === '--pause') {
            paused = true;
        }
        if (args[i] === '--unpause') {
            paused = false;
        }
    }
    
    if (!action) {
        throw new Error('Action is required. Use --action <action-name>');
    }
    
    // Get the owner account
    const [owner] = await ethers.getSigners();
    console.log('Owner account:', owner.address);
    
    const initialBalance = await owner.getBalance();
    console.log('Owner balance:', ethers.utils.formatEther(initialBalance), 'ETH');
    
    // Contract address
    const contractAddress = '0x609cF5C3B0003bcEF4F512B3c2Fa489c8D0EF200';
    
    // Get contract instance
    const TheGameKardashianCollector = await ethers.getContractFactory('TheGameKardashianCollector');
    const contract = TheGameKardashianCollector.attach(contractAddress);
    
    try {
        // Verify ownership
        const contractOwner = await contract.owner();
        if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) {
            throw new Error(`Not contract owner. Contract owner: ${contractOwner}, Current account: ${owner.address}`);
        }
        
        console.log('✅ Ownership verified');
        
        // Get current contract state
        const totalSupply = await contract.totalSupply();
        console.log('Current supply:', totalSupply.toString());
        
        // Ultra-low gas settings
        const gasPrice = ethers.utils.parseUnits('0.00001', 'gwei');
        const gasLimit = 100000;
        
        console.log('\n=== EXECUTING ACTION:', action.toUpperCase(), '===');
        
        let txHash = null;
        
        switch (action) {
            case 'update-base-uri':
                if (!newBaseURI) {
                    throw new Error('New base URI is required. Use --uri <new-uri>');
                }
                
                console.log('Updating base URI to:', newBaseURI);
                const updateUriTx = await contract.setBaseURI(newBaseURI, {
                    gasPrice: gasPrice,
                    gasLimit: gasLimit
                });
                
                console.log('Transaction hash:', updateUriTx.hash);
                await updateUriTx.wait();
                txHash = updateUriTx.hash;
                
                console.log('✅ Base URI updated successfully');
                break;
                
            case 'transfer-ownership':
                if (!newOwner) {
                    throw new Error('New owner address is required. Use --new-owner <address>');
                }
                
                if (!ethers.utils.isAddress(newOwner)) {
                    throw new Error(`Invalid new owner address: ${newOwner}`);
                }
                
                console.log('Transferring ownership to:', newOwner);
                const transferTx = await contract.transferOwnership(newOwner, {
                    gasPrice: gasPrice,
                    gasLimit: gasLimit
                });
                
                console.log('Transaction hash:', transferTx.hash);
                await transferTx.wait();
                txHash = transferTx.hash;
                
                console.log('✅ Ownership transferred successfully');
                console.log('⚠️  You are no longer the contract owner!');
                break;
                
            case 'pause-contract':
                console.log('Pausing contract...');
                // Note: This requires a pausable contract implementation
                console.log('⚠️  Pause functionality not implemented in current contract');
                console.log('Consider upgrading to a pausable contract for this feature');
                break;
                
            case 'check-status':
                console.log('\n=== CONTRACT STATUS ===');
                console.log('Contract address:', contractAddress);
                console.log('Owner:', await contract.owner());
                console.log('Name:', await contract.name());
                console.log('Symbol:', await contract.symbol());
                console.log('Total supply:', (await contract.totalSupply()).toString());
                
                // Try to get base URI (may fail if not set)
                try {
                    // Get a sample token URI to check base URI
                    if (totalSupply.gt(0)) {
                        const sampleURI = await contract.tokenURI(1);
                        console.log('Sample token URI:', sampleURI);
                    }
                } catch (error) {
                    console.log('Base URI not accessible or not set');
                }
                
                console.log('✅ Status check completed');
                break;
                
            case 'emergency-withdraw':
                // Emergency function to withdraw any ETH sent to contract
                console.log('Checking contract ETH balance...');
                const contractBalance = await ethers.provider.getBalance(contractAddress);
                
                if (contractBalance.gt(0)) {
                    console.log('Contract balance:', ethers.utils.formatEther(contractBalance), 'ETH');
                    console.log('⚠️  Emergency withdrawal not implemented in current contract');
                    console.log('Consider adding withdrawal functionality in future upgrades');
                } else {
                    console.log('Contract balance: 0 ETH - no withdrawal needed');
                }
                break;
                
            case 'batch-mint-admin':
                // Administrative batch minting
                const mintCount = 10; // Default batch size
                const availableToMint = 100 - totalSupply.toNumber();
                const actualMintCount = Math.min(mintCount, availableToMint);
                
                if (actualMintCount <= 0) {
                    console.log('❌ No NFTs available to mint');
                    break;
                }
                
                console.log(`Batch minting ${actualMintCount} NFTs to owner...`);
                
                for (let i = 0; i < actualMintCount; i++) {
                    const mintTx = await contract.mint(owner.address, {
                        gasPrice: gasPrice,
                        gasLimit: 80000
                    });
                    
                    console.log(`NFT ${i + 1}/${actualMintCount} - Tx: ${mintTx.hash}`);
                    await mintTx.wait();
                    
                    // Small delay
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                console.log('✅ Batch minting completed');
                break;
                
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        
        // Final summary
        const finalBalance = await owner.getBalance();
        const gasUsed = initialBalance.sub(finalBalance);
        
        console.log('\n=== UPGRADE SUMMARY ===');
        console.log('Action executed:', action);
        if (txHash) {
            console.log('Transaction hash:', txHash);
        }
        console.log('Gas cost:', ethers.utils.formatEther(gasUsed), 'ETH');
        console.log('Final balance:', ethers.utils.formatEther(finalBalance), 'ETH');
        
        const finalSupply = await contract.totalSupply();
        console.log('Final collection supply:', finalSupply.toString(), '/ 100');
        
        console.log('\n✅ Contract upgrade operation completed successfully');
        
    } catch (error) {
        console.error('❌ Contract upgrade failed:', error.message);
        if (error.reason) {
            console.error('Reason:', error.reason);
        }
        throw error;
    }
}

// Display usage information if no arguments provided
if (process.argv.length <= 2) {
    console.log('\n=== CONTRACT UPGRADE USAGE ===');
    console.log('Available actions:');
    console.log('  update-base-uri      Update the base URI for metadata');
    console.log('  transfer-ownership   Transfer contract ownership');
    console.log('  check-status         Check current contract status');
    console.log('  emergency-withdraw   Check and withdraw contract balance');
    console.log('  batch-mint-admin     Administrative batch minting');
    console.log('\nExamples:');
    console.log('  npx hardhat run scripts/contract-upgrade.cjs --network base -- --action check-status');
    console.log('  npx hardhat run scripts/contract-upgrade.cjs --network base -- --action update-base-uri --uri https://new-metadata.com/');
    console.log('  npx hardhat run scripts/contract-upgrade.cjs --network base -- --action transfer-ownership --new-owner 0x123...');
    console.log('  npx hardhat run scripts/contract-upgrade.cjs --network base -- --action batch-mint-admin');
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