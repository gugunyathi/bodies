# Product Requirements Document (PRD): Betting Feature

## 1. Executive Summary

### Vision
Implement a daily automated betting system where users can guess relationships between celebrity profiles, creating an engaging gamification layer that drives user retention and generates revenue through transaction fees.

### Key Objectives
- Increase daily active users through gamified betting mechanics
- Generate revenue via 10% platform fee on prize pools
- Leverage existing relationship data and user ratings for bet resolution
- Provide gas-free betting experience using paymaster integration

## 2. Feature Overview

### Core Concept
Every 24 hours, the system automatically generates a new bet featuring two randomly selected celebrity profiles displayed side-by-side. Users guess the relationship type between them by selecting from predefined categories ("Dated", "Hookup", "Transactional", "No Relationship").

### Betting Mechanics
- **Bet Range**: 1-100 USDC per bet
- **Prize Pool**: Aggregated from all user bets
- **Winner Determination**: Based on majority user ratings/votes
- **Prize Distribution**: Top winners split 90% of pool, 10% to platform
- **Gas-Free**: Paymaster covers transaction costs

## 3. User Stories

### Primary User Stories
1. **As a user**, I want to see today's betting pair displayed prominently so I can quickly understand the betting opportunity
2. **As a user**, I want to place bets between 1-100 USDC on relationship outcomes so I can participate in the game
3. **As a user**, I want to see real-time betting statistics (total pool, my bets, time remaining) so I can make informed decisions
4. **As a user**, I want to receive notifications about bet results and winnings so I stay engaged
5. **As a user**, I want to view my betting history and performance so I can track my success

### Secondary User Stories
1. **As a user**, I want to see evidence/context about the profiles so I can make educated guesses
2. **As a user**, I want to invite friends to bet so we can compete together
3. **As a user**, I want to see leaderboards of top bettors so I can compare my performance

## 4. Technical Requirements

### Frontend Requirements
- Side-by-side profile display component
- Betting interface with USDC amount selection
- Real-time betting statistics dashboard
- Bet history and results page
- Push notification integration
- Responsive design for mobile/desktop

### Backend Requirements
- Automated daily bet generation system
- Smart contract for bet management and prize distribution
- Oracle integration for relationship data verification
- Paymaster integration for gas-free transactions
- Real-time betting statistics API
- Notification service

### Smart Contract Requirements
- Bet placement and validation
- Prize pool management
- Automated winner determination
- Prize distribution logic
- Emergency pause/resume functionality
- Upgrade capability

## 5. User Interface Design

### Main Betting Page Layout
```
┌─────────────────────────────────────────────────────────┐
│                    TODAY'S BET                          │
│  ┌─────────────┐    VS    ┌─────────────┐              │
│  │   Profile   │          │   Profile   │              │
│  │   Image A   │          │   Image B   │              │
│  │             │          │             │              │
│  └─────────────┘          └─────────────┘              │
│       Name A                   Name B                   │
│                                                         │
│  What's their relationship?                             │
│  ○ Dated  ○ Hookup  ○ Transactional  ○ No Relationship │
│                                                         │
│  Bet Amount: [1] ──────●────── [100] USDC             │
│                                                         │
│  ┌─────────────────┐                                   │
│  │   PLACE BET     │                                   │
│  └─────────────────┘                                   │
│                                                         │
│  Prize Pool: $1,234 USDC | Time Left: 14h 23m         │
│  Your Bets: $50 USDC | Total Bettors: 89               │
└─────────────────────────────────────────────────────────┘
```

### Betting Statistics Panel
- Current prize pool amount
- Time remaining for current bet
- Number of participants
- User's total bets on current round
- Distribution of votes by category

## 6. Step-by-Step Implementation Process

### Phase 1: Foundation Setup (Week 1-2)

#### Step 1: Database Schema Design
```sql
-- Betting rounds table
CREATE TABLE betting_rounds (
  id UUID PRIMARY KEY,
  profile_a_id VARCHAR,
  profile_b_id VARCHAR,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status ENUM('active', 'resolved', 'cancelled'),
  correct_answer ENUM('dated', 'hookup', 'transactional', 'none'),
  total_prize_pool DECIMAL,
  created_at TIMESTAMP
);

-- User bets table
CREATE TABLE user_bets (
  id UUID PRIMARY KEY,
  round_id UUID REFERENCES betting_rounds(id),
  user_wallet VARCHAR,
  bet_amount DECIMAL,
  predicted_relationship ENUM('dated', 'hookup', 'transactional', 'none'),
  transaction_hash VARCHAR,
  created_at TIMESTAMP
);

-- Bet results table
CREATE TABLE bet_results (
  id UUID PRIMARY KEY,
  round_id UUID REFERENCES betting_rounds(id),
  user_wallet VARCHAR,
  won_amount DECIMAL,
  payout_transaction_hash VARCHAR,
  created_at TIMESTAMP
);
```

#### Step 2: Smart Contract Development
```solidity
// Key contract functions to implement:
// - placeBet(roundId, prediction, amount)
// - resolveBet(roundId, correctAnswer)
// - claimWinnings(roundId)
// - emergencyPause()
// - withdrawPlatformFees()
```

#### Step 3: Backend API Endpoints
- `GET /api/betting/current` - Get current active betting round
- `POST /api/betting/place` - Place a bet
- `GET /api/betting/stats/:roundId` - Get betting statistics
- `GET /api/betting/history/:wallet` - Get user betting history
- `POST /api/betting/resolve/:roundId` - Resolve betting round (admin)

### Phase 2: Core Betting System (Week 3-4)

#### Step 4: Automated Bet Generation Service
```javascript
// Cron job that runs every 24 hours
// 1. Select two random profiles from active profiles
// 2. Ensure profiles have relationship data or sufficient user ratings
// 3. Create new betting round in database
// 4. Deploy betting round to smart contract
// 5. Send notifications to users
```

#### Step 5: Frontend Betting Interface
- Create `BettingPage` component with side-by-side profile display
- Implement betting form with amount slider and relationship selection
- Add real-time statistics display
- Integrate wallet connection and transaction handling

#### Step 6: Paymaster Integration
- Configure paymaster for USDC transactions
- Implement gas-free betting experience
- Add transaction status tracking

### Phase 3: Resolution & Distribution (Week 5-6)

#### Step 7: Oracle Integration
```javascript
// Oracle service to determine correct answers
// 1. Query existing relationship data from JSON files
// 2. If no definitive data, use majority vote from user ratings
// 3. Implement minimum threshold for vote validity
// 4. Add manual override capability for edge cases
```

#### Step 8: Prize Distribution Logic
```javascript
// Winner determination algorithm:
// 1. Identify all users who bet on correct answer
// 2. Calculate prize share based on bet amount (weighted distribution)
// 3. Deduct 10% platform fee
// 4. Execute batch payout transactions
// 5. Update user balances and betting history
```

#### Step 9: Notification System
- Implement push notifications for bet results
- Email notifications for significant winnings
- In-app notification center

### Phase 4: User Experience & Analytics (Week 7-8)

#### Step 10: Betting History & Statistics
- Create user dashboard showing betting performance
- Implement leaderboards for top performers
- Add detailed analytics and insights

#### Step 11: Social Features
- Friend invitation system
- Betting groups/competitions
- Social sharing of wins

#### Step 12: Mobile Optimization
- Responsive design for mobile betting
- Progressive Web App (PWA) features
- Touch-optimized betting interface

### Phase 5: Testing & Launch (Week 9-10)

#### Step 13: Comprehensive Testing
- Unit tests for all smart contract functions
- Integration tests for betting flow
- Load testing for high-volume betting
- Security audit of smart contracts

#### Step 14: Beta Launch
- Deploy to testnet with limited user group
- Gather feedback and iterate
- Monitor system performance and reliability

#### Step 15: Production Launch
- Deploy to mainnet
- Launch marketing campaign
- Monitor metrics and user adoption
- Implement feedback and improvements

## 7. Success Metrics

### Primary KPIs
- Daily Active Users (DAU) increase by 40%
- Average betting volume per user: $25 USDC/day
- User retention rate: 70% weekly retention
- Platform revenue: $500+ USDC daily from fees

### Secondary KPIs
- Average time spent on betting page: 5+ minutes
- Bet completion rate: 85%
- User satisfaction score: 4.2+/5.0
- Social sharing rate: 15% of winners

## 8. Risk Management

### Technical Risks
- Smart contract vulnerabilities → Comprehensive security audit
- Oracle manipulation → Multiple data sources and manual oversight
- Paymaster fund depletion → Automated monitoring and alerts

### Business Risks
- Low user adoption → Aggressive marketing and referral programs
- Regulatory concerns → Legal compliance review
- Prize pool manipulation → Bet limits and monitoring systems

### Operational Risks
- System downtime during peak betting → Redundant infrastructure
- Incorrect bet resolution → Manual review process for disputed outcomes
- User fund security → Multi-sig wallets and insurance coverage

## 9. Future Enhancements

### Phase 2 Features
- Multi-profile betting (3+ celebrities)
- Custom bet creation by users
- Live betting during events
- NFT rewards for top performers

### Advanced Features
- AI-powered relationship prediction hints
- Video evidence integration
- Celebrity endorsements and partnerships
- Cross-platform betting integration

## 10. Technical Architecture

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  Smart Contract │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   (Solidity)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Wallet   │    │   Database      │    │   Blockchain    │
│   (MetaMask)    │    │   (MongoDB)     │    │   (Optimism)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow
1. **Bet Creation**: Automated service creates daily betting rounds
2. **User Interaction**: Frontend displays betting interface
3. **Bet Placement**: User submits bet through smart contract
4. **Resolution**: Oracle determines correct answer
5. **Distribution**: Smart contract distributes prizes automatically

## 11. Implementation Timeline

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| 1-2  | Foundation | Database schema, Smart contract, API design |
| 3-4  | Core System | Betting interface, Automated generation, Paymaster |
| 5-6  | Resolution | Oracle integration, Prize distribution, Notifications |
| 7-8  | UX/Analytics | User dashboard, Social features, Mobile optimization |
| 9-10 | Launch | Testing, Beta launch, Production deployment |

## 12. Resource Requirements

### Development Team
- 1 Smart Contract Developer (10 weeks)
- 2 Frontend Developers (8 weeks)
- 1 Backend Developer (10 weeks)
- 1 DevOps Engineer (4 weeks)
- 1 QA Engineer (6 weeks)

### Infrastructure Costs
- Smart contract deployment: ~$500
- Paymaster funding: $5,000 initial
- Server infrastructure: $200/month
- Third-party services: $100/month

### Marketing Budget
- Launch campaign: $10,000
- Influencer partnerships: $5,000
- Referral program: $3,000

This PRD provides a comprehensive roadmap for implementing the betting feature, ensuring all technical, business, and user experience requirements are addressed systematically.