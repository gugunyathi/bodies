// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SimpleBetting
 * @dev Minimalistic betting contract with gasless transactions and 10% house fee
 */
contract SimpleBetting is ReentrancyGuard, Ownable, Pausable {
    IERC20 public immutable usdc;
    
    // Constants
    uint256 public constant HOUSE_FEE_PERCENT = 10;
    uint256 public constant MIN_BET = 1e6; // $1 USDC (6 decimals)
    uint256 public constant MAX_BET = 1000e6; // $1000 USDC
    uint256 public constant ROUND_DURATION = 24 hours;
    
    // State variables
    uint256 public currentRound;
    uint256 public bettingDeadline;
    uint256 public totalPoolA;
    uint256 public totalPoolB;
    address public appWallet;
    bool public isRoundActive;
    
    // Structs
    struct BetInfo {
        uint128 amountA; // Amount bet on option A
        uint128 amountB; // Amount bet on option B
        bool hasClaimed; // Whether user has claimed winnings
    }
    
    // Mappings
    mapping(uint256 => mapping(address => BetInfo)) public userBets;
    mapping(uint256 => uint8) public roundWinner; // 0 = not settled, 1 = A wins, 2 = B wins
    mapping(uint256 => uint256) public roundTotalA;
    mapping(uint256 => uint256) public roundTotalB;
    
    // Events
    event BetPlaced(address indexed user, uint256 indexed round, uint8 option, uint256 amount);
    event RoundSettled(uint256 indexed round, uint8 winner, uint256 totalPool, uint256 houseFee);
    event WinningsClaimed(address indexed user, uint256 indexed round, uint256 amount);
    event NewRoundStarted(uint256 indexed round, uint256 deadline);
    event AppWalletUpdated(address indexed oldWallet, address indexed newWallet);
    
    constructor(
        address _usdc,
        address _appWallet
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_appWallet != address(0), "Invalid app wallet address");
        
        usdc = IERC20(_usdc);
        appWallet = _appWallet;
        
        // Start first round
        _startNewRound();
    }
    
    /**
     * @dev Place a bet on option A (1) or B (2)
     * @param option 1 for A, 2 for B
     * @param amount Amount of USDC to bet (in wei, 6 decimals)
     */
    function placeBet(uint8 option, uint256 amount) external nonReentrant whenNotPaused {
        require(isRoundActive, "No active round");
        require(block.timestamp < bettingDeadline, "Betting period ended");
        require(option == 1 || option == 2, "Invalid option");
        require(amount >= MIN_BET && amount <= MAX_BET, "Invalid bet amount");
        
        BetInfo storage userBet = userBets[currentRound][msg.sender];
        
        // Check total bet limit per user
        uint256 totalUserBet = uint256(userBet.amountA) + uint256(userBet.amountB) + amount;
        require(totalUserBet <= MAX_BET, "Exceeds max bet per user");
        
        // Transfer USDC from user
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
        
        // Update bet info
        if (option == 1) {
            userBet.amountA += uint128(amount);
            totalPoolA += amount;
            roundTotalA[currentRound] += amount;
        } else {
            userBet.amountB += uint128(amount);
            totalPoolB += amount;
            roundTotalB[currentRound] += amount;
        }
        
        emit BetPlaced(msg.sender, currentRound, option, amount);
    }
    
    /**
     * @dev Settle the current round and determine winner
     * @param winningOption 1 for A wins, 2 for B wins
     */
    function settleRound(uint8 winningOption) external onlyOwner {
        require(isRoundActive, "No active round");
        require(block.timestamp >= bettingDeadline, "Betting period not ended");
        require(winningOption == 1 || winningOption == 2, "Invalid winning option");
        require(roundWinner[currentRound] == 0, "Round already settled");
        
        uint256 totalPool = totalPoolA + totalPoolB;
        require(totalPool > 0, "No bets placed");
        
        // Calculate house fee
        uint256 houseFee = (totalPool * HOUSE_FEE_PERCENT) / 100;
        
        // Transfer house fee to app wallet
        if (houseFee > 0) {
            require(usdc.transfer(appWallet, houseFee), "House fee transfer failed");
        }
        
        // Set winner
        roundWinner[currentRound] = winningOption;
        
        emit RoundSettled(currentRound, winningOption, totalPool, houseFee);
        
        // Reset for next round
        isRoundActive = false;
        totalPoolA = 0;
        totalPoolB = 0;
        
        // Start new round
        _startNewRound();
    }
    
    /**
     * @dev Claim winnings for a specific round
     * @param round Round number to claim from
     */
    function claimWinnings(uint256 round) external nonReentrant {
        require(roundWinner[round] != 0, "Round not settled");
        
        BetInfo storage userBet = userBets[round][msg.sender];
        require(!userBet.hasClaimed, "Already claimed");
        
        uint8 winner = roundWinner[round];
        uint256 userWinningBet;
        uint256 totalWinningPool;
        
        if (winner == 1) {
            userWinningBet = userBet.amountA;
            totalWinningPool = roundTotalA[round];
        } else {
            userWinningBet = userBet.amountB;
            totalWinningPool = roundTotalB[round];
        }
        
        require(userWinningBet > 0, "No winning bet");
        require(totalWinningPool > 0, "No winning pool");
        
        // Calculate payout: (userBet / winningPool) * (totalPool * 0.9)
        uint256 totalRoundPool = roundTotalA[round] + roundTotalB[round];
        uint256 payoutPool = (totalRoundPool * (100 - HOUSE_FEE_PERCENT)) / 100;
        uint256 payout = (userWinningBet * payoutPool) / totalWinningPool;
        
        // Mark as claimed
        userBet.hasClaimed = true;
        
        // Transfer payout
        require(usdc.transfer(msg.sender, payout), "Payout transfer failed");
        
        emit WinningsClaimed(msg.sender, round, payout);
    }
    
    /**
     * @dev Start a new betting round
     */
    function _startNewRound() private {
        currentRound++;
        bettingDeadline = block.timestamp + ROUND_DURATION;
        isRoundActive = true;
        
        emit NewRoundStarted(currentRound, bettingDeadline);
    }
    
    /**
     * @dev Update app wallet address
     * @param newAppWallet New app wallet address
     */
    function updateAppWallet(address newAppWallet) external onlyOwner {
        require(newAppWallet != address(0), "Invalid address");
        address oldWallet = appWallet;
        appWallet = newAppWallet;
        emit AppWalletUpdated(oldWallet, newAppWallet);
    }
    
    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw function (only if paused)
     */
    function emergencyWithdraw() external onlyOwner whenPaused {
        uint256 balance = usdc.balanceOf(address(this));
        require(usdc.transfer(owner(), balance), "Emergency withdraw failed");
    }
    
    // View functions
    
    /**
     * @dev Get current round info
     */
    function getCurrentRoundInfo() external view returns (
        uint256 round,
        uint256 deadline,
        uint256 poolA,
        uint256 poolB,
        bool active
    ) {
        return (currentRound, bettingDeadline, totalPoolA, totalPoolB, isRoundActive);
    }
    
    /**
     * @dev Get user bet info for a round
     */
    function getUserBet(uint256 round, address user) external view returns (
        uint256 amountA,
        uint256 amountB,
        bool hasClaimed
    ) {
        BetInfo memory bet = userBets[round][user];
        return (bet.amountA, bet.amountB, bet.hasClaimed);
    }
    
    /**
     * @dev Calculate potential payout for a user
     */
    function calculatePayout(uint256 round, address user, uint8 winningOption) external view returns (uint256) {
        require(winningOption == 1 || winningOption == 2, "Invalid option");
        
        BetInfo memory userBet = userBets[round][user];
        uint256 userWinningBet = winningOption == 1 ? userBet.amountA : userBet.amountB;
        
        if (userWinningBet == 0) return 0;
        
        uint256 totalWinningPool = winningOption == 1 ? roundTotalA[round] : roundTotalB[round];
        if (totalWinningPool == 0) return 0;
        
        uint256 totalRoundPool = roundTotalA[round] + roundTotalB[round];
        uint256 payoutPool = (totalRoundPool * (100 - HOUSE_FEE_PERCENT)) / 100;
        
        return (userWinningBet * payoutPool) / totalWinningPool;
    }
    
    /**
     * @dev Get round statistics
     */
    function getRoundStats(uint256 round) external view returns (
        uint256 totalA,
        uint256 totalB,
        uint8 winner
    ) {
        return (roundTotalA[round], roundTotalB[round], roundWinner[round]);
    }
}