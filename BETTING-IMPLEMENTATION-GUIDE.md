# Betting Feature Implementation Guide

## Overview
This guide provides detailed step-by-step instructions for implementing the betting feature in the Bodies application. Follow these steps sequentially to ensure proper integration with existing systems.

## Prerequisites
- Existing Bodies application with profile system
- Smart contract development environment (Hardhat)
- MongoDB database access
- Optimism network setup with paymaster
- USDC token contract integration

---

## Phase 1: Database & Smart Contract Foundation

### Step 1: Database Schema Implementation

#### 1.1 Create Migration File
```bash
# Create new migration file
touch migrations/001_create_betting_tables.js
```

#### 1.2 Database Schema
```javascript
// migrations/001_create_betting_tables.js
db.createCollection("betting_rounds", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "profileA", "profileB", "startTime", "endTime", "status"],
      properties: {
        id: { bsonType: "string" },
        profileA: {
          bsonType: "object",
          properties: {
            id: { bsonType: "string" },
            name: { bsonType: "string" },
            image: { bsonType: "string" }
          }
        },
        profileB: {
          bsonType: "object",
          properties: {
            id: { bsonType: "string" },
            name: { bsonType: "string" },
            image: { bsonType: "string" }
          }
        },
        startTime: { bsonType: "date" },
        endTime: { bsonType: "date" },
        status: { enum: ["active", "resolved", "cancelled"] },
        correctAnswer: { enum: ["dated", "hookup", "transactional", "none"] },
        totalPrizePool: { bsonType: "decimal" },
        platformFee: { bsonType: "decimal" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("user_bets", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "roundId", "userWallet", "betAmount", "prediction"],
      properties: {
        id: { bsonType: "string" },
        roundId: { bsonType: "string" },
        userWallet: { bsonType: "string" },
        betAmount: { bsonType: "decimal" },
        prediction: { enum: ["dated", "hookup", "transactional", "none"] },
        transactionHash: { bsonType: "string" },
        blockNumber: { bsonType: "int" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("bet_results", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["id", "roundId", "userWallet"],
      properties: {
        id: { bsonType: "string" },
        roundId: { bsonType: "string" },
        userWallet: { bsonType: "string" },
        wonAmount: { bsonType: "decimal" },
        payoutTransactionHash: { bsonType: "string" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});
```

#### 1.3 Create Database Indexes
```javascript
// Add indexes for performance
db.betting_rounds.createIndex({ "status": 1, "startTime": 1 });
db.betting_rounds.createIndex({ "endTime": 1 });
db.user_bets.createIndex({ "roundId": 1, "userWallet": 1 });
db.user_bets.createIndex({ "userWallet": 1, "createdAt": -1 });
db.bet_results.createIndex({ "roundId": 1 });
db.bet_results.createIndex({ "userWallet": 1, "createdAt": -1 });
```

### Step 2: Smart Contract Development

#### 2.1 Create Betting Contract
```bash
# Create new contract file
touch contracts/BettingSystem.sol
```

#### 2.2 Smart Contract Implementation
```solidity
// contracts/BettingSystem.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract BettingSystem is ReentrancyGuard, Ownable, Pausable {
    IERC20 public immutable usdcToken;
    
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 10; // 10%
    uint256 public constant MIN_BET_AMOUNT = 1e6; // 1 USDC
    uint256 public constant MAX_BET_AMOUNT = 100e6; // 100 USDC
    
    enum RelationshipType { DATED, HOOKUP, TRANSACTIONAL, NONE }
    enum RoundStatus { ACTIVE, RESOLVED, CANCELLED }
    
    struct BettingRound {
        string roundId;
        uint256 startTime;
        uint256 endTime;
        RoundStatus status;
        RelationshipType correctAnswer;
        uint256 totalPrizePool;
        uint256 platformFee;
        mapping(RelationshipType => uint256) voteCounts;
        mapping(RelationshipType => uint256) voteAmounts;
    }
    
    struct UserBet {
        address user;
        uint256 amount;
        RelationshipType prediction;
        uint256 timestamp;
    }
    
    mapping(string => BettingRound) public bettingRounds;
    mapping(string => UserBet[]) public roundBets;
    mapping(string => mapping(address => uint256)) public userBetAmounts;
    
    string public currentRoundId;
    uint256 public totalPlatformFees;
    
    event BettingRoundCreated(string indexed roundId, uint256 startTime, uint256 endTime);
    event BetPlaced(string indexed roundId, address indexed user, uint256 amount, RelationshipType prediction);
    event RoundResolved(string indexed roundId, RelationshipType correctAnswer, uint256 totalPrizePool);
    event WinningsDistributed(string indexed roundId, address indexed winner, uint256 amount);
    event PlatformFeesWithdrawn(uint256 amount);
    
    constructor(address _usdcToken) {
        usdcToken = IERC20(_usdcToken);
    }
    
    function createBettingRound(
        string memory _roundId,
        uint256 _duration
    ) external onlyOwner {
        require(bytes(_roundId).length > 0, "Invalid round ID");
        require(_duration > 0, "Invalid duration");
        
        BettingRound storage round = bettingRounds[_roundId];
        round.roundId = _roundId;
        round.startTime = block.timestamp;
        round.endTime = block.timestamp + _duration;
        round.status = RoundStatus.ACTIVE;
        
        currentRoundId = _roundId;
        
        emit BettingRoundCreated(_roundId, round.startTime, round.endTime);
    }
    
    function placeBet(
        string memory _roundId,
        RelationshipType _prediction,
        uint256 _amount
    ) external nonReentrant whenNotPaused {
        require(_amount >= MIN_BET_AMOUNT && _amount <= MAX_BET_AMOUNT, "Invalid bet amount");
        
        BettingRound storage round = bettingRounds[_roundId];
        require(round.status == RoundStatus.ACTIVE, "Round not active");
        require(block.timestamp >= round.startTime && block.timestamp <= round.endTime, "Round not in betting period");
        
        require(usdcToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        
        UserBet memory newBet = UserBet({
            user: msg.sender,
            amount: _amount,
            prediction: _prediction,
            timestamp: block.timestamp
        });
        
        roundBets[_roundId].push(newBet);
        userBetAmounts[_roundId][msg.sender] += _amount;
        
        round.totalPrizePool += _amount;
        round.voteCounts[_prediction]++;
        round.voteAmounts[_prediction] += _amount;
        
        emit BetPlaced(_roundId, msg.sender, _amount, _prediction);
    }
    
    function resolveBettingRound(
        string memory _roundId,
        RelationshipType _correctAnswer
    ) external onlyOwner {
        BettingRound storage round = bettingRounds[_roundId];
        require(round.status == RoundStatus.ACTIVE, "Round not active");
        require(block.timestamp > round.endTime, "Round still active");
        
        round.correctAnswer = _correctAnswer;
        round.status = RoundStatus.RESOLVED;
        
        uint256 platformFee = (round.totalPrizePool * PLATFORM_FEE_PERCENTAGE) / 100;
        round.platformFee = platformFee;
        totalPlatformFees += platformFee;
        
        emit RoundResolved(_roundId, _correctAnswer, round.totalPrizePool);
        
        _distributePrizes(_roundId);
    }
    
    function _distributePrizes(string memory _roundId) internal {
        BettingRound storage round = bettingRounds[_roundId];
        UserBet[] memory bets = roundBets[_roundId];
        
        uint256 winningPool = round.voteAmounts[round.correctAnswer];
        if (winningPool == 0) return; // No winners
        
        uint256 prizePool = round.totalPrizePool - round.platformFee;
        
        for (uint256 i = 0; i < bets.length; i++) {
            UserBet memory bet = bets[i];
            if (bet.prediction == round.correctAnswer) {
                uint256 winningAmount = (bet.amount * prizePool) / winningPool;
                require(usdcToken.transfer(bet.user, winningAmount), "Prize transfer failed");
                emit WinningsDistributed(_roundId, bet.user, winningAmount);
            }
        }
    }
    
    function withdrawPlatformFees() external onlyOwner {
        uint256 amount = totalPlatformFees;
        totalPlatformFees = 0;
        require(usdcToken.transfer(owner(), amount), "Withdrawal failed");
        emit PlatformFeesWithdrawn(amount);
    }
    
    function getRoundInfo(string memory _roundId) external view returns (
        uint256 startTime,
        uint256 endTime,
        RoundStatus status,
        uint256 totalPrizePool,
        uint256[4] memory voteCounts,
        uint256[4] memory voteAmounts
    ) {
        BettingRound storage round = bettingRounds[_roundId];
        
        voteCounts[0] = round.voteCounts[RelationshipType.DATED];
        voteCounts[1] = round.voteCounts[RelationshipType.HOOKUP];
        voteCounts[2] = round.voteCounts[RelationshipType.TRANSACTIONAL];
        voteCounts[3] = round.voteCounts[RelationshipType.NONE];
        
        voteAmounts[0] = round.voteAmounts[RelationshipType.DATED];
        voteAmounts[1] = round.voteAmounts[RelationshipType.HOOKUP];
        voteAmounts[2] = round.voteAmounts[RelationshipType.TRANSACTIONAL];
        voteAmounts[3] = round.voteAmounts[RelationshipType.NONE];
        
        return (
            round.startTime,
            round.endTime,
            round.status,
            round.totalPrizePool,
            voteCounts,
            voteAmounts
        );
    }
    
    function getUserBets(string memory _roundId, address _user) external view returns (uint256) {
        return userBetAmounts[_roundId][_user];
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}
```

#### 2.3 Deploy Smart Contract
```bash
# Create deployment script
touch scripts/deploy-betting-system.cjs
```

```javascript
// scripts/deploy-betting-system.cjs
const { ethers } = require("hardhat");

async function main() {
  const USDC_ADDRESS = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"; // Optimism USDC
  
  const BettingSystem = await ethers.getContractFactory("BettingSystem");
  const bettingSystem = await BettingSystem.deploy(USDC_ADDRESS);
  
  await bettingSystem.deployed();
  
  console.log("BettingSystem deployed to:", bettingSystem.address);
  
  // Verify contract
  if (process.env.NODE_ENV === "production") {
    await hre.run("verify:verify", {
      address: bettingSystem.address,
      constructorArguments: [USDC_ADDRESS],
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

---

## Phase 2: Backend API Development

### Step 3: Database Models

#### 3.1 Create Betting Models
```bash
# Create models file
touch lib/betting-models.ts
```

```typescript
// lib/betting-models.ts
import { ObjectId } from 'mongodb';

export interface BettingRound {
  _id?: ObjectId;
  id: string;
  profileA: {
    id: string;
    name: string;
    image: string;
  };
  profileB: {
    id: string;
    name: string;
    image: string;
  };
  startTime: Date;
  endTime: Date;
  status: 'active' | 'resolved' | 'cancelled';
  correctAnswer?: 'dated' | 'hookup' | 'transactional' | 'none';
  totalPrizePool: number;
  platformFee: number;
  createdAt: Date;
}

export interface UserBet {
  _id?: ObjectId;
  id: string;
  roundId: string;
  userWallet: string;
  betAmount: number;
  prediction: 'dated' | 'hookup' | 'transactional' | 'none';
  transactionHash: string;
  blockNumber: number;
  createdAt: Date;
}

export interface BetResult {
  _id?: ObjectId;
  id: string;
  roundId: string;
  userWallet: string;
  wonAmount: number;
  payoutTransactionHash?: string;
  createdAt: Date;
}

export interface BettingStats {
  roundId: string;
  totalPrizePool: number;
  totalBettors: number;
  timeRemaining: number;
  voteCounts: {
    dated: number;
    hookup: number;
    transactional: number;
    none: number;
  };
  voteAmounts: {
    dated: number;
    hookup: number;
    transactional: number;
    none: number;
  };
}
```

### Step 4: API Routes Implementation

#### 4.1 Current Betting Round API
```bash
# Create API route
touch app/api/betting/current/route.ts
```

```typescript
// app/api/betting/current/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { BettingRound } from '@/lib/betting-models';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    const currentRound = await db
      .collection<BettingRound>('betting_rounds')
      .findOne(
        { status: 'active' },
        { sort: { startTime: -1 } }
      );
    
    if (!currentRound) {
      return NextResponse.json(
        { error: 'No active betting round found' },
        { status: 404 }
      );
    }
    
    // Calculate time remaining
    const timeRemaining = Math.max(0, currentRound.endTime.getTime() - Date.now());
    
    return NextResponse.json({
      round: currentRound,
      timeRemaining,
      isActive: timeRemaining > 0
    });
  } catch (error) {
    console.error('Error fetching current betting round:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 4.2 Place Bet API
```bash
# Create API route
touch app/api/betting/place/route.ts
```

```typescript
// app/api/betting/place/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserBet, BettingRound } from '@/lib/betting-models';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { roundId, userWallet, betAmount, prediction, transactionHash, blockNumber } = await request.json();
    
    // Validation
    if (!roundId || !userWallet || !betAmount || !prediction || !transactionHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (betAmount < 1 || betAmount > 100) {
      return NextResponse.json(
        { error: 'Bet amount must be between 1 and 100 USDC' },
        { status: 400 }
      );
    }
    
    if (!['dated', 'hookup', 'transactional', 'none'].includes(prediction)) {
      return NextResponse.json(
        { error: 'Invalid prediction' },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    // Check if round is active
    const round = await db
      .collection<BettingRound>('betting_rounds')
      .findOne({ id: roundId, status: 'active' });
    
    if (!round) {
      return NextResponse.json(
        { error: 'Betting round not found or not active' },
        { status: 404 }
      );
    }
    
    // Check if round is still accepting bets
    if (Date.now() > round.endTime.getTime()) {
      return NextResponse.json(
        { error: 'Betting period has ended' },
        { status: 400 }
      );
    }
    
    // Create user bet record
    const userBet: UserBet = {
      id: uuidv4(),
      roundId,
      userWallet,
      betAmount,
      prediction,
      transactionHash,
      blockNumber,
      createdAt: new Date()
    };
    
    await db.collection<UserBet>('user_bets').insertOne(userBet);
    
    // Update round statistics
    await db.collection<BettingRound>('betting_rounds').updateOne(
      { id: roundId },
      { $inc: { totalPrizePool: betAmount } }
    );
    
    return NextResponse.json({
      success: true,
      betId: userBet.id,
      message: 'Bet placed successfully'
    });
  } catch (error) {
    console.error('Error placing bet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 4.3 Betting Statistics API
```bash
# Create API route
touch app/api/betting/stats/[roundId]/route.ts
```

```typescript
// app/api/betting/stats/[roundId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserBet, BettingRound, BettingStats } from '@/lib/betting-models';

export async function GET(
  request: NextRequest,
  { params }: { params: { roundId: string } }
) {
  try {
    const { roundId } = params;
    const { db } = await connectToDatabase();
    
    // Get round info
    const round = await db
      .collection<BettingRound>('betting_rounds')
      .findOne({ id: roundId });
    
    if (!round) {
      return NextResponse.json(
        { error: 'Betting round not found' },
        { status: 404 }
      );
    }
    
    // Get betting statistics
    const bets = await db
      .collection<UserBet>('user_bets')
      .find({ roundId })
      .toArray();
    
    // Calculate statistics
    const stats: BettingStats = {
      roundId,
      totalPrizePool: round.totalPrizePool,
      totalBettors: new Set(bets.map(bet => bet.userWallet)).size,
      timeRemaining: Math.max(0, round.endTime.getTime() - Date.now()),
      voteCounts: {
        dated: bets.filter(bet => bet.prediction === 'dated').length,
        hookup: bets.filter(bet => bet.prediction === 'hookup').length,
        transactional: bets.filter(bet => bet.prediction === 'transactional').length,
        none: bets.filter(bet => bet.prediction === 'none').length
      },
      voteAmounts: {
        dated: bets.filter(bet => bet.prediction === 'dated').reduce((sum, bet) => sum + bet.betAmount, 0),
        hookup: bets.filter(bet => bet.prediction === 'hookup').reduce((sum, bet) => sum + bet.betAmount, 0),
        transactional: bets.filter(bet => bet.prediction === 'transactional').reduce((sum, bet) => sum + bet.betAmount, 0),
        none: bets.filter(bet => bet.prediction === 'none').reduce((sum, bet) => sum + bet.betAmount, 0)
      }
    };
    
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching betting stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 4.4 User Betting History API
```bash
# Create API route
touch app/api/betting/history/[wallet]/route.ts
```

```typescript
// app/api/betting/history/[wallet]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserBet, BetResult, BettingRound } from '@/lib/betting-models';

export async function GET(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const { wallet } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    const { db } = await connectToDatabase();
    
    // Get user bets with round information
    const userBets = await db
      .collection<UserBet>('user_bets')
      .aggregate([
        { $match: { userWallet: wallet } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'betting_rounds',
            localField: 'roundId',
            foreignField: 'id',
            as: 'round'
          }
        },
        { $unwind: '$round' },
        {
          $lookup: {
            from: 'bet_results',
            let: { roundId: '$roundId', userWallet: '$userWallet' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$roundId', '$$roundId'] },
                      { $eq: ['$userWallet', '$$userWallet'] }
                    ]
                  }
                }
              }
            ],
            as: 'result'
          }
        }
      ])
      .toArray();
    
    // Get total count for pagination
    const totalCount = await db
      .collection<UserBet>('user_bets')
      .countDocuments({ userWallet: wallet });
    
    return NextResponse.json({
      bets: userBets,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching betting history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Phase 3: Automated Bet Generation System

### Step 5: Profile Selection Service

#### 5.1 Create Profile Selection Utility
```bash
# Create utility file
touch lib/profile-selection.ts
```

```typescript
// lib/profile-selection.ts
import { connectToDatabase } from './mongodb';

interface Profile {
  id: string;
  name: string;
  image: string;
  isActive: boolean;
}

interface RelationshipData {
  person1: string;
  person2: string;
  relationship: 'dated' | 'hookup' | 'transactional';
  notes?: string;
}

export class ProfileSelectionService {
  private static instance: ProfileSelectionService;
  private relationshipData: RelationshipData[] = [];
  
  private constructor() {}
  
  public static getInstance(): ProfileSelectionService {
    if (!ProfileSelectionService.instance) {
      ProfileSelectionService.instance = new ProfileSelectionService();
    }
    return ProfileSelectionService.instance;
  }
  
  async loadRelationshipData(): Promise<void> {
    try {
      // Load from your existing relationship JSON file
      const fs = require('fs').promises;
      const path = require('path');
      
      const dataPath = path.join(process.cwd(), 'backup-before-deduplication-1756339188588.json');
      const rawData = await fs.readFile(dataPath, 'utf8');
      const data = JSON.parse(rawData);
      
      this.relationshipData = data.relationships || [];
    } catch (error) {
      console.error('Error loading relationship data:', error);
      this.relationshipData = [];
    }
  }
  
  async getActiveProfiles(): Promise<Profile[]> {
    const { db } = await connectToDatabase();
    
    const profiles = await db
      .collection('profiles')
      .find({ isActive: true })
      .project({ id: 1, name: 1, image: 1, isActive: 1 })
      .toArray();
    
    return profiles.map(profile => ({
      id: profile.id || profile._id.toString(),
      name: profile.name,
      image: profile.image,
      isActive: profile.isActive
    }));
  }
  
  async selectRandomPair(): Promise<{ profileA: Profile; profileB: Profile; hasKnownRelationship: boolean }> {
    const profiles = await this.getActiveProfiles();
    
    if (profiles.length < 2) {
      throw new Error('Not enough active profiles for betting');
    }
    
    // Strategy 1: Try to find a pair with known relationship (70% chance)
    if (Math.random() < 0.7 && this.relationshipData.length > 0) {
      const knownPair = this.selectKnownRelationshipPair(profiles);
      if (knownPair) {
        return { ...knownPair, hasKnownRelationship: true };
      }
    }
    
    // Strategy 2: Select completely random pair (30% chance or fallback)
    const shuffled = [...profiles].sort(() => Math.random() - 0.5);
    return {
      profileA: shuffled[0],
      profileB: shuffled[1],
      hasKnownRelationship: false
    };
  }
  
  private selectKnownRelationshipPair(profiles: Profile[]): { profileA: Profile; profileB: Profile } | null {
    const profileMap = new Map(profiles.map(p => [p.name.toLowerCase(), p]));
    
    // Shuffle relationship data to get random known relationship
    const shuffledRelationships = [...this.relationshipData].sort(() => Math.random() - 0.5);
    
    for (const relationship of shuffledRelationships) {
      const profileA = profileMap.get(relationship.person1.toLowerCase());
      const profileB = profileMap.get(relationship.person2.toLowerCase());
      
      if (profileA && profileB) {
        return { profileA, profileB };
      }
    }
    
    return null;
  }
  
  async getRelationshipAnswer(profileA: Profile, profileB: Profile): Promise<'dated' | 'hookup' | 'transactional' | 'none'> {
    const relationship = this.relationshipData.find(rel => 
      (rel.person1.toLowerCase() === profileA.name.toLowerCase() && 
       rel.person2.toLowerCase() === profileB.name.toLowerCase()) ||
      (rel.person1.toLowerCase() === profileB.name.toLowerCase() && 
       rel.person2.toLowerCase() === profileA.name.toLowerCase())
    );
    
    return relationship ? relationship.relationship : 'none';
  }
  
  async getUserRatingBasedAnswer(profileA: Profile, profileB: Profile): Promise<'dated' | 'hookup' | 'transactional' | 'none'> {
    const { db } = await connectToDatabase();
    
    // Query user ratings for this pair
    const ratings = await db
      .collection('ratings')
      .find({
        $or: [
          { profileId: profileA.id, ratedProfileId: profileB.id },
          { profileId: profileB.id, ratedProfileId: profileA.id }
        ]
      })
      .toArray();
    
    if (ratings.length === 0) {
      return 'none';
    }
    
    // Count votes for each relationship type
    const voteCounts = {
      dated: 0,
      hookup: 0,
      transactional: 0,
      none: 0
    };
    
    ratings.forEach(rating => {
      if (rating.relationshipType && voteCounts.hasOwnProperty(rating.relationshipType)) {
        voteCounts[rating.relationshipType as keyof typeof voteCounts]++;
      }
    });
    
    // Return the relationship type with the most votes
    const maxVotes = Math.max(...Object.values(voteCounts));
    const winner = Object.entries(voteCounts).find(([_, count]) => count === maxVotes)?.[0] as keyof typeof voteCounts;
    
    return winner || 'none';
  }
}
```

### Step 6: Automated Bet Generation Service

#### 6.1 Create Bet Generation Service
```bash
# Create service file
touch lib/bet-generation-service.ts
```

```typescript
// lib/bet-generation-service.ts
import { connectToDatabase } from './mongodb';
import { BettingRound } from './betting-models';
import { ProfileSelectionService } from './profile-selection';
import { v4 as uuidv4 } from 'uuid';

export class BetGenerationService {
  private static instance: BetGenerationService;
  private profileService: ProfileSelectionService;
  
  private constructor() {
    this.profileService = ProfileSelectionService.getInstance();
  }
  
  public static getInstance(): BetGenerationService {
    if (!BetGenerationService.instance) {
      BetGenerationService.instance = new BetGenerationService();
    }
    return BetGenerationService.instance;
  }
  
  async generateDailyBet(): Promise<BettingRound> {
    try {
      // Load relationship data
      await this.profileService.loadRelationshipData();
      
      // Select random profile pair
      const { profileA, profileB, hasKnownRelationship } = await this.profileService.selectRandomPair();
      
      // Create betting round
      const roundId = `bet_${Date.now()}_${uuidv4().slice(0, 8)}`;
      const startTime = new Date();
      const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      const bettingRound: BettingRound = {
        id: roundId,
        profileA,
        profileB,
        startTime,
        endTime,
        status: 'active',
        totalPrizePool: 0,
        platformFee: 0,
        createdAt: new Date()
      };
      
      // Save to database
      const { db } = await connectToDatabase();
      await db.collection<BettingRound>('betting_rounds').insertOne(bettingRound);
      
      // Deploy to smart contract
      await this.deployToSmartContract(roundId, 24 * 60 * 60); // 24 hours in seconds
      
      // Send notifications
      await this.notifyUsers(bettingRound);
      
      console.log(`Generated new betting round: ${roundId}`);
      console.log(`Profiles: ${profileA.name} vs ${profileB.name}`);
      console.log(`Has known relationship: ${hasKnownRelationship}`);
      
      return bettingRound;
    } catch (error) {
      console.error('Error generating daily bet:', error);
      throw error;
    }
  }
  
  private async deployToSmartContract(roundId: string, duration: number): Promise<void> {
    try {
      const { ethers } = require('ethers');
      
      // Initialize provider and contract
      const provider = new ethers.providers.JsonRpcProvider(process.env.OPTIMISM_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
      
      const contractAddress = process.env.BETTING_CONTRACT_ADDRESS!;
      const contractABI = [
        "function createBettingRound(string memory _roundId, uint256 _duration) external"
      ];
      
      const contract = new ethers.Contract(contractAddress, contractABI, wallet);
      
      // Create betting round on smart contract
      const tx = await contract.createBettingRound(roundId, duration);
      await tx.wait();
      
      console.log(`Deployed betting round ${roundId} to smart contract: ${tx.hash}`);
    } catch (error) {
      console.error('Error deploying to smart contract:', error);
      throw error;
    }
  }
  
  private async notifyUsers(bettingRound: BettingRound): Promise<void> {
    try {
      // Implementation depends on your notification system
      // This could be push notifications, emails, etc.
      
      const message = {
        title: "New Betting Round Started!",
        body: `Guess the relationship between ${bettingRound.profileA.name} and ${bettingRound.profileB.name}`,
        data: {
          roundId: bettingRound.id,
          type: 'new_betting_round'
        }
      };
      
      // Send push notifications to all users
      // await this.pushNotificationService.sendToAll(message);
      
      console.log('Notifications sent for new betting round');
    } catch (error) {
      console.error('Error sending notifications:', error);
      // Don't throw error - notifications are not critical
    }
  }
  
  async resolveBettingRound(roundId: string): Promise<void> {
    try {
      const { db } = await connectToDatabase();
      
      // Get betting round
      const round = await db
        .collection<BettingRound>('betting_rounds')
        .findOne({ id: roundId, status: 'active' });
      
      if (!round) {
        throw new Error(`Active betting round ${roundId} not found`);
      }
      
      // Determine correct answer
      let correctAnswer: 'dated' | 'hookup' | 'transactional' | 'none';
      
      // First try to get answer from known relationship data
      correctAnswer = await this.profileService.getRelationshipAnswer(round.profileA, round.profileB);
      
      // If no known relationship, use user ratings
      if (correctAnswer === 'none') {
        correctAnswer = await this.profileService.getUserRatingBasedAnswer(round.profileA, round.profileB);
      }
      
      // Update database
      await db.collection<BettingRound>('betting_rounds').updateOne(
        { id: roundId },
        { 
          $set: { 
            status: 'resolved',
            correctAnswer
          }
        }
      );
      
      // Resolve on smart contract
      await this.resolveOnSmartContract(roundId, correctAnswer);
      
      console.log(`Resolved betting round ${roundId} with answer: ${correctAnswer}`);
    } catch (error) {
      console.error('Error resolving betting round:', error);
      throw error;
    }
  }
  
  private async resolveOnSmartContract(roundId: string, correctAnswer: 'dated' | 'hookup' | 'transactional' | 'none'): Promise<void> {
    try {
      const { ethers } = require('ethers');
      
      const provider = new ethers.providers.JsonRpcProvider(process.env.OPTIMISM_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
      
      const contractAddress = process.env.BETTING_CONTRACT_ADDRESS!;
      const contractABI = [
        "function resolveBettingRound(string memory _roundId, uint8 _correctAnswer) external"
      ];
      
      const contract = new ethers.Contract(contractAddress, contractABI, wallet);
      
      // Map answer to enum value
      const answerMap = {
        'dated': 0,
        'hookup': 1,
        'transactional': 2,
        'none': 3
      };
      
      const tx = await contract.resolveBettingRound(roundId, answerMap[correctAnswer]);
      await tx.wait();
      
      console.log(`Resolved betting round ${roundId} on smart contract: ${tx.hash}`);
    } catch (error) {
      console.error('Error resolving on smart contract:', error);
      throw error;
    }
  }
}
```

### Step 7: Cron Job Setup

#### 7.1 Create Cron Job Service
```bash
# Create cron service file
touch lib/cron-service.ts
```

```typescript
// lib/cron-service.ts
import cron from 'node-cron';
import { BetGenerationService } from './bet-generation-service';

export class CronService {
  private static instance: CronService;
  private betGenerationService: BetGenerationService;
  
  private constructor() {
    this.betGenerationService = BetGenerationService.getInstance();
  }
  
  public static getInstance(): CronService {
    if (!CronService.instance) {
      CronService.instance = new CronService();
    }
    return CronService.instance;
  }
  
  startDailyBetGeneration(): void {
    // Run every day at 12:00 PM UTC
    cron.schedule('0 12 * * *', async () => {
      try {
        console.log('Starting daily bet generation...');
        await this.betGenerationService.generateDailyBet();
        console.log('Daily bet generation completed successfully');
      } catch (error) {
        console.error('Error in daily bet generation:', error);
        // Send alert to administrators
        await this.sendAdminAlert('Daily bet generation failed', error);
      }
    }, {
      timezone: 'UTC'
    });
    
    console.log('Daily bet generation cron job started');
  }
  
  startBetResolution(): void {
    // Check for bets to resolve every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.resolveExpiredBets();
      } catch (error) {
        console.error('Error in bet resolution:', error);
        await this.sendAdminAlert('Bet resolution failed', error);
      }
    }, {
      timezone: 'UTC'
    });
    
    console.log('Bet resolution cron job started');
  }
  
  private async resolveExpiredBets(): Promise<void> {
    const { connectToDatabase } = require('./mongodb');
    const { db } = await connectToDatabase();
    
    // Find expired active betting rounds
    const expiredRounds = await db
      .collection('betting_rounds')
      .find({
        status: 'active',
        endTime: { $lt: new Date() }
      })
      .toArray();
    
    for (const round of expiredRounds) {
      try {
        await this.betGenerationService.resolveBettingRound(round.id);
        console.log(`Resolved expired betting round: ${round.id}`);
      } catch (error) {
        console.error(`Error resolving round ${round.id}:`, error);
      }
    }
  }
  
  private async sendAdminAlert(subject: string, error: any): Promise<void> {
    // Implementation depends on your alerting system
    // Could be email, Slack, Discord, etc.
    console.error(`ADMIN ALERT: ${subject}`, error);
  }
  
  startAllJobs(): void {
    this.startDailyBetGeneration();
    this.startBetResolution();
    console.log('All cron jobs started successfully');
  }
}
```

#### 7.2 Initialize Cron Jobs in App
```typescript
// Add to your app startup (e.g., in layout.tsx or a separate initialization file)
import { CronService } from '@/lib/cron-service';

// Initialize cron jobs when the app starts
if (process.env.NODE_ENV === 'production') {
  const cronService = CronService.getInstance();
  cronService.startAllJobs();
}
```

---

## Phase 4: Frontend Implementation

### Step 8: Betting Page Component

#### 8.1 Create Main Betting Page
```bash
# Create betting page
touch app/betting/page.tsx
```

```typescript
// app/betting/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { BettingInterface } from '@/app/components/BettingInterface';
import { BettingStats } from '@/app/components/BettingStats';
import { BettingHistory } from '@/app/components/BettingHistory';
import { useWalletConnection } from '@/app/hooks/useWalletConnection';

interface BettingRound {
  id: string;
  profileA: {
    id: string;
    name: string;
    image: string;
  };
  profileB: {
    id: string;
    name: string;
    image: string;
  };
  startTime: string;
  endTime: string;
  status: 'active' | 'resolved' | 'cancelled';
  totalPrizePool: number;
}

export default function BettingPage() {
  const [currentRound, setCurrentRound] = useState<BettingRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bet' | 'history'>('bet');
  const { isConnected, address } = useWalletConnection();

  useEffect(() => {
    fetchCurrentRound();
  }, []);

  const fetchCurrentRound = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/betting/current');
      
      if (response.ok) {
        const data = await response.json();
        setCurrentRound(data.round);
      } else if (response.status === 404) {
        setCurrentRound(null);
        setError('No active betting round available');
      } else {
        throw new Error('Failed to fetch current round');
      }
    } catch (err) {
      setError('Error loading betting round');
      console.error('Error fetching current round:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading betting round...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-lg mb-8">Connect your wallet to participate in betting</p>
          <button className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold transition-colors">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Celebrity Betting</h1>
          <p className="text-gray-300 text-lg">Guess the relationship and win USDC!</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-black/20 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('bet')}
              className={`px-6 py-2 rounded-md font-semibold transition-colors ${
                activeTab === 'bet'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Current Bet
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-md font-semibold transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              My History
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'bet' && (
          <div className="max-w-4xl mx-auto">
            {currentRound ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <BettingInterface 
                    round={currentRound} 
                    onBetPlaced={fetchCurrentRound}
                  />
                </div>
                <div>
                  <BettingStats roundId={currentRound.id} />
                </div>
              </div>
            ) : (
              <div className="text-center text-white">
                <h2 className="text-2xl font-bold mb-4">No Active Betting Round</h2>
                <p className="text-gray-300 mb-8">
                  {error || 'Check back soon for the next betting opportunity!'}
                </p>
                <button
                  onClick={fetchCurrentRound}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto">
            <BettingHistory walletAddress={address!} />
          </div>
        )}
      </div>
    </div>
  );
}
```

This implementation guide provides a comprehensive, step-by-step approach to building the betting feature. Each phase builds upon the previous one, ensuring a systematic and organized development process. The guide includes detailed code examples, database schemas, API endpoints, smart contracts, and frontend components needed to create a fully functional betting system.