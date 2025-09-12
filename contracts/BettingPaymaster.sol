// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BettingPaymaster
 * @dev Simple paymaster for sponsoring gas fees for betting operations
 * Integrates with Coinbase Paymaster on Base Network
 */
contract BettingPaymaster is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    address public immutable bettingContract;
    
    // Paymaster settings
    uint256 public maxGasPerTx = 200000; // Max gas to sponsor per transaction
    uint256 public minUsdcBalance = 1e6; // Min 1 USDC balance required
    bool public paymasterActive = true;
    
    // Gas sponsorship tracking
    mapping(address => uint256) public sponsoredGasUsed;
    mapping(address => uint256) public lastSponsoredTime;
    
    // Events
    event GasSponsored(address indexed user, uint256 gasAmount, uint256 gasCost);
    event PaymasterConfigUpdated(uint256 maxGas, uint256 minBalance, bool active);
    event FundsDeposited(address indexed depositor, uint256 amount);
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    
    constructor(
        address _usdc,
        address _bettingContract
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_bettingContract != address(0), "Invalid betting contract");
        
        usdc = IERC20(_usdc);
        bettingContract = _bettingContract;
    }
    
    /**
     * @dev Check if user is eligible for gas sponsorship
     * @param user User address to check
     * @param gasLimit Gas limit for the transaction
     */
    function canSponsorGas(address user, uint256 gasLimit) external view returns (bool) {
        if (!paymasterActive) return false;
        if (gasLimit > maxGasPerTx) return false;
        
        // Check user has minimum USDC balance
        uint256 userBalance = usdc.balanceOf(user);
        if (userBalance < minUsdcBalance) return false;
        
        // Check paymaster has enough ETH for gas
        uint256 estimatedCost = gasLimit * tx.gasprice;
        if (address(this).balance < estimatedCost) return false;
        
        return true;
    }
    
    /**
     * @dev Sponsor gas for a betting transaction
     * @param user User whose gas is being sponsored
     * @param gasUsed Actual gas used in the transaction
     */
    function sponsorGas(address user, uint256 gasUsed) external payable nonReentrant {
        require(msg.sender == bettingContract, "Only betting contract");
        require(paymasterActive, "Paymaster inactive");
        require(gasUsed <= maxGasPerTx, "Gas limit exceeded");
        
        // Verify user has minimum USDC balance
        uint256 userBalance = usdc.balanceOf(user);
        require(userBalance >= minUsdcBalance, "Insufficient USDC balance");
        
        uint256 gasCost = gasUsed * tx.gasprice;
        require(address(this).balance >= gasCost, "Insufficient paymaster balance");
        
        // Update tracking
        sponsoredGasUsed[user] += gasUsed;
        lastSponsoredTime[user] = block.timestamp;
        
        // Refund gas to the transaction sender (relayer)
        (bool success, ) = payable(tx.origin).call{value: gasCost}("");
        require(success, "Gas refund failed");
        
        emit GasSponsored(user, gasUsed, gasCost);
    }
    
    /**
     * @dev Deposit ETH to fund gas sponsorship
     */
    function depositFunds() external payable {
        require(msg.value > 0, "No funds sent");
        emit FundsDeposited(msg.sender, msg.value);
    }
    
    /**
     * @dev Withdraw ETH from paymaster (owner only)
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function withdrawFunds(uint256 amount, address payable recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(address(this).balance >= amount, "Insufficient balance");
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(recipient, amount);
    }
    
    /**
     * @dev Update paymaster configuration
     * @param _maxGasPerTx Maximum gas per transaction
     * @param _minUsdcBalance Minimum USDC balance required
     * @param _active Whether paymaster is active
     */
    function updateConfig(
        uint256 _maxGasPerTx,
        uint256 _minUsdcBalance,
        bool _active
    ) external onlyOwner {
        maxGasPerTx = _maxGasPerTx;
        minUsdcBalance = _minUsdcBalance;
        paymasterActive = _active;
        
        emit PaymasterConfigUpdated(_maxGasPerTx, _minUsdcBalance, _active);
    }
    
    /**
     * @dev Emergency pause paymaster
     */
    function pausePaymaster() external onlyOwner {
        paymasterActive = false;
        emit PaymasterConfigUpdated(maxGasPerTx, minUsdcBalance, false);
    }
    
    /**
     * @dev Resume paymaster operations
     */
    function resumePaymaster() external onlyOwner {
        paymasterActive = true;
        emit PaymasterConfigUpdated(maxGasPerTx, minUsdcBalance, true);
    }
    
    // View functions
    
    /**
     * @dev Get paymaster status and configuration
     */
    function getPaymasterInfo() external view returns (
        bool active,
        uint256 maxGas,
        uint256 minBalance,
        uint256 ethBalance,
        address bettingAddr
    ) {
        return (
            paymasterActive,
            maxGasPerTx,
            minUsdcBalance,
            address(this).balance,
            bettingContract
        );
    }
    
    /**
     * @dev Get user's gas sponsorship history
     * @param user User address
     */
    function getUserGasHistory(address user) external view returns (
        uint256 totalGasSponsored,
        uint256 lastSponsored
    ) {
        return (sponsoredGasUsed[user], lastSponsoredTime[user]);
    }
    
    /**
     * @dev Estimate gas cost for sponsorship
     * @param gasLimit Gas limit for transaction
     */
    function estimateGasCost(uint256 gasLimit) external view returns (uint256) {
        return gasLimit * tx.gasprice;
    }
    
    // Receive ETH for funding
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
    
    fallback() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
}