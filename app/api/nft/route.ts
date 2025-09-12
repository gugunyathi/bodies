import { NextRequest, NextResponse } from 'next/server';
import { ethers, providers, utils, Wallet, Contract } from 'ethers';

// Contract configuration
const CONTRACT_ADDRESS = '0x609cF5C3B0003bcEF4F512B3c2Fa489c8D0EF200';
const CONTRACT_ABI = [
  'function publicMint(string memory tokenURI) public payable',
  'function totalSupply() public view returns (uint256)',
  'function MAX_SUPPLY() public view returns (uint256)',
  'function PRICE() public view returns (uint256)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function tokenURI(uint256 tokenId) public view returns (string memory)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

// GET /api/nft - Get collection status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    console.log('🎯 NFT API: Fetching collection data for address:', userAddress || 'no address');

    // Setup provider for Base mainnet with timeout
    const provider = new providers.JsonRpcProvider({
      url: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      timeout: 10000 // 10 second timeout
    });
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    // Get collection info with timeout handling
    const [totalSupply, maxSupply, price] = await Promise.all([
      contract.totalSupply(),
      contract.MAX_SUPPLY(),
      contract.PRICE()
    ]);

    const available = Number(maxSupply) - Number(totalSupply);
    
    let userBalance = 0;
    if (userAddress && utils.isAddress(userAddress)) {
      userBalance = Number(await contract.balanceOf(userAddress));
    }

    console.log('🎯 NFT API: Successfully fetched collection data');
    return NextResponse.json({
      success: true,
      collection: {
        name: 'The Game - Kardashian Collector',
        contractAddress: CONTRACT_ADDRESS,
        totalSupply: Number(totalSupply),
        maxSupply: Number(maxSupply),
        available,
        price: utils.formatEther(price),
        priceWei: price.toString(),
        image: '/The Game - Kardashian Collector.png',
        metadata: 'https://bodies.vercel.app/metadata/the-game-kardashian-collector.json'
      },
      user: {
        address: userAddress,
        balance: userBalance
      }
    });
  } catch (error) {
    console.error('🎯 NFT API: Blockchain connection failed, using fallback data:', error);
    
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');
    
    // Return fallback data when blockchain is unavailable
    return NextResponse.json({
      success: true,
      collection: {
        name: 'The Game - Kardashian Collector',
        contractAddress: CONTRACT_ADDRESS,
        totalSupply: 0,
        maxSupply: 1000,
        available: 1000,
        price: '0.001',
        priceWei: '1000000000000000',
        image: '/The Game - Kardashian Collector.png',
        metadata: 'https://bodies.vercel.app/metadata/the-game-kardashian-collector.json'
      },
      user: {
        address: userAddress,
        balance: 0
      },
      fallback: true // Indicate this is fallback data
    });
  }
}

// POST /api/nft - Mint NFT for user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, paymentVerified = false } = body;

    if (!userAddress || !utils.isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Valid user address required' },
        { status: 400 }
      );
    }

    if (!paymentVerified) {
      return NextResponse.json(
        { success: false, error: 'Payment verification required' },
        { status: 400 }
      );
    }

    // Setup provider and signer
    const provider = new providers.JsonRpcProvider(process.env.BASE_RPC_URL || 'https://mainnet.base.org');
    const platformWallet = new Wallet(process.env.PRIVATE_KEY!, provider);
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, platformWallet);

    // Check availability
    const [totalSupply, maxSupply] = await Promise.all([
      contract.totalSupply(),
      contract.MAX_SUPPLY()
    ]);

    const available = Number(maxSupply) - Number(totalSupply);
    if (available <= 0) {
      return NextResponse.json(
        { success: false, error: 'Collection fully minted' },
        { status: 400 }
      );
    }

    // Mint NFT with ultra-low gas settings
    const tokenURI = 'the-game-kardashian-collector.json';
    const mintTx = await contract.publicMint(tokenURI, {
      value: 0, // Free mint, platform covers costs
      gasPrice: utils.parseUnits('0.00001', 'gwei'),
      gasLimit: 80000
    });

    console.log('NFT Mint Transaction:', mintTx.hash);
    
    // Wait for confirmation
    const receipt = await mintTx.wait();
    
    // Extract token ID from Transfer event
    let tokenId = null;
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog?.name === 'Transfer' && parsedLog.args.to === userAddress) {
          tokenId = Number(parsedLog.args.tokenId);
          break;
        }
      } catch (e) {
        // Skip unparseable logs
      }
    }

    return NextResponse.json({
      success: true,
      transaction: {
        hash: mintTx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      },
      nft: {
        tokenId,
        owner: userAddress,
        tokenURI: `https://bodies.vercel.app/metadata/${tokenURI}`,
        image: '/The Game - Kardashian Collector.png'
      },
      collection: {
        newTotalSupply: Number(totalSupply) + 1,
        remaining: available - 1
      }
    });

  } catch (error) {
    console.error('NFT Mint API Error:', error);
    
    let errorMessage = 'Failed to mint NFT';
    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient platform funds for minting';
      } else if (error.message.includes('Max supply reached')) {
        errorMessage = 'Collection fully minted';
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}