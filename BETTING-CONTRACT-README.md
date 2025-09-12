# Simple Betting Smart Contract

A minimalistic, gas-optimized betting smart contract with paymaster integration for gasless transactions on Base Network.

## 🎯 Features

- **Simple Binary Betting**: Users bet on Option A or Option B
- **24-Hour Rounds**: Automatic round cycling every 24 hours
- **USDC Betting**: All bets placed in USDC (Base Network)
- **10% House Fee**: Sustainable revenue model
- **Gasless Transactions**: Paymaster covers gas fees
- **Proportional Payouts**: Winners share 90% of total pool proportionally
- **Emergency Controls**: Pause/unpause functionality
- **Gas Optimized**: Deploy cost under $0.05

## 📋 Contract Overview

### Core Contracts

1. **SimpleBetting.sol** - Main betting contract
2. **BettingPaymaster.sol** - Gas sponsorship contract

### Key Parameters

- **Minimum Bet**: $1 USDC
- **Maximum Bet**: $1,000 USDC per user per round
- **Round Duration**: 24 hours
- **House Fee**: 10%
- **Network**: Base (Ethereum L2)

## 🚀 Deployment

### Prerequisites

1. Node.js and npm installed
2. Hardhat configured
3. Base Network RPC endpoint
4. Wallet with ETH for deployment

### Environment Setup

```bash
# Install dependencies
npm install

# Set environment variables
echo "PRIVATE_KEY=your_private_key" >> .env
echo "BASE_RPC_URL=https://mainnet.base.org" >> .env
echo "NEXT_PUBLIC_BETTING_CONTRACT=" >> .env
```

### Deploy Contracts

```bash
# Deploy SimpleBetting contract
npx hardhat run scripts/deploy-betting.cjs --network base

# Update .env with contract address
echo "NEXT_PUBLIC_BETTING_CONTRACT=0x..." >> .env
```

### Expected Deployment Cost

- **SimpleBetting**: ~$0.02 - $0.04
- **BettingPaymaster**: ~$0.01 - $0.02
- **Total**: Under $0.05

## 🔧 Contract Functions

### User Functions

```solidity
// Place a bet (1 = Option A, 2 = Option B)
function placeBet(uint8 option, uint256 amount) external

// Claim winnings from a completed round
function claimWinnings(uint256 round) external
```

### View Functions

```solidity
// Get current round information
function getCurrentRoundInfo() external view returns (
    uint256 round,
    uint256 deadline,
    uint256 poolA,
    uint256 poolB,
    bool active
)

// Get user's bet for a specific round
function getUserBet(uint256 round, address user) external view returns (
    uint256 amountA,
    uint256 amountB,
    bool hasClaimed
)

// Calculate potential payout
function calculatePayout(uint256 round, address user, uint8 winningOption) external view returns (uint256)
```

### Admin Functions

```solidity
// Settle a round (owner only)
function settleRound(uint8 winningOption) external onlyOwner

// Update app wallet address
function updateAppWallet(address newAppWallet) external onlyOwner

// Emergency pause/unpause
function pause() external onlyOwner
function unpause() external onlyOwner
```

## 💰 Economic Model

### Betting Mechanics

1. Users place bets on Option A or Option B
2. All bets pooled together for 24 hours
3. After deadline, admin settles round with winning option
4. 10% goes to app wallet as house fee
5. Remaining 90% distributed proportionally to winners

### Payout Formula

```
User Payout = (User Winning Bet / Total Winning Pool) × (Total Pool × 0.9)
```

### Example Scenario

- Total Pool: $1,000 USDC
- Option A Pool: $600 USDC (loses)
- Option B Pool: $400 USDC (wins)
- House Fee: $100 USDC
- Winner Pool: $900 USDC

User with $40 bet on Option B receives:
`($40 / $400) × $900 = $90 USDC`

## ⛽ Gasless Integration

### Paymaster Setup

1. Deploy BettingPaymaster contract
2. Fund paymaster with ETH for gas sponsorship
3. Configure minimum USDC balance requirement
4. Integrate with Coinbase Paymaster endpoint

### Frontend Integration

```typescript
// Use the provided React hook
import { useBettingContract } from './hooks/useBettingContract';

function BettingComponent() {
  const { placeBet, currentRound, loading } = useBettingContract();
  
  const handleBet = async () => {
    await placeBet(1, '10'); // Bet $10 on Option A
  };
  
  return (
    <button onClick={handleBet} disabled={loading}>
      Place Bet
    </button>
  );
}
```

## 🔒 Security Features

### Built-in Protections

- **Reentrancy Guards**: Prevents reentrancy attacks
- **Input Validation**: All parameters validated
- **Access Controls**: Owner-only admin functions
- **Pause Mechanism**: Emergency stop functionality
- **Overflow Protection**: Solidity 0.8+ built-in protection

### Best Practices

- Use multi-sig wallet for owner functions
- Regular security audits recommended
- Monitor contract events for unusual activity
- Keep paymaster funded but not over-funded

## 📊 Monitoring & Analytics

### Key Events

```solidity
event BetPlaced(address indexed user, uint256 indexed round, uint8 option, uint256 amount);
event RoundSettled(uint256 indexed round, uint8 winner, uint256 totalPool, uint256 houseFee);
event WinningsClaimed(address indexed user, uint256 indexed round, uint256 amount);
```

### Metrics to Track

- Total volume per round
- Number of unique bettors
- Average bet size
- House edge performance
- Gas costs and paymaster usage

## 🛠️ Development

### Testing

```bash
# Run contract tests
npx hardhat test

# Test with coverage
npx hardhat coverage
```

### Local Development

```bash
# Start local hardhat node
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy-betting.cjs --network localhost

# Start frontend
npm run dev
```

## 🔄 Upgrade Path

### Phase 1 (Current)
- Basic binary betting
- Manual round settlement
- Simple paymaster integration

### Phase 2 (Future)
- Oracle integration for automated settlement
- Multiple concurrent betting topics
- Advanced payout mechanisms
- Governance token integration

## 📝 Contract Addresses

### Base Mainnet

- **USDC Token**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **SimpleBetting**: `TBD` (after deployment)
- **BettingPaymaster**: `TBD` (after deployment)

### Base Testnet (Sepolia)

- **USDC Token**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **SimpleBetting**: `TBD`
- **BettingPaymaster**: `TBD`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This smart contract is provided as-is. Users should:

- Understand the risks of betting
- Only bet what they can afford to lose
- Verify contract code before interacting
- Use at their own risk

The developers are not responsible for any losses incurred through the use of this contract.

## 📞 Support

For technical support or questions:

- Create an issue in the repository
- Review the documentation
- Check existing issues for solutions

---

**Built for Base Network • Optimized for Gas Efficiency • Designed for Simplicity**