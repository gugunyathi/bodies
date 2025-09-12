const { ethers } = require('hardhat');

async function main() {
    console.log('Starting NFT minting process...');
    
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
        // Check if we're the owner
        const owner = await contract.owner();
        console.log('Contract owner:', owner);
        console.log('Deployer address:', deployer.address);
        
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log('ERROR: Deployer is not the contract owner!');
            return;
        }
        
        // Mint NFT with optimized gas settings
        console.log('Minting NFT to:', deployer.address);
        const mintTx = await contract.mint(deployer.address, {
            gasPrice: ethers.utils.parseUnits('0.001', 'gwei'),
            gasLimit: 150000
        });
        
        console.log('Mint transaction hash:', mintTx.hash);
        console.log('Waiting for confirmation...');
        
        const receipt = await mintTx.wait();
        console.log('✅ NFT minted successfully!');
        console.log('Transaction confirmed in block:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());
        
        // Get the token ID from the Transfer event
        const transferEvent = receipt.events?.find(event => event.event === 'Transfer');
        if (transferEvent) {
            const tokenId = transferEvent.args.tokenId;
            console.log('Token ID:', tokenId.toString());
            
            // Get token URI
            const tokenURI = await contract.tokenURI(tokenId);
            console.log('Token URI:', tokenURI);
        }
        
    } catch (error) {
        console.error('❌ Minting failed:', error.message);
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