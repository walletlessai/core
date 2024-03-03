// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
contract WalletLessSale is Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // seed sale enable flags
    bool public walletlessSaleEnabled;
    uint256 public minBuy = 100 * 10**18;         // if 0 means no limit
    uint256 public maxBuy = 90000 * 10**18;       // if 0 means no limit
    uint256 public refRewardRate = 500;

    IERC20 public walletLessCoin;

    // @noticeuser state structure
    struct User {
        uint256 tokenBoughts; // total num of tokens user have bought
        uint256 pendingForClaim; // amount of user's tokens that are still locked
        uint256 nextUnlockDate; // unix timestamp of next claim unlock
    }

    struct Option {
        uint256 price;
        uint256 totalAmount;    // total available tokens for sale 
        uint256 totalSold;      // total sold
        uint256 totalBnb;       // total bnb received
        uint256 lockTime;       // if 0 means no lock
        bool enabled;
    }
   
    mapping(uint256 => mapping(address => User)) public users;
    mapping(uint256 => Option) public options;
    mapping(address => bool) public isAllowedClaimReward;
    mapping(address => uint256) public refRewardAmount;

    event TokenPurchased(address indexed user, uint256 amount);
    event TokenClaimed(
        address indexed user,
        uint256 amount,
        uint256 _option
    );
    event SaleEnabled(bool status);
    event BurnTokens(uint256 amount);
    constructor(
        address walletLessCoin_
 
    ) {
        walletLessCoin = IERC20(walletLessCoin_);
    }

    receive() external payable {
        require(msg.value > 0, "You cannot send 0 BNB");
         this.buy{value: msg.value}(msg.sender , address(0), 1);
    }

    fallback() external payable {
      require(msg.value > 0, "You cannot send 0 BNB");
         this.buy{value: msg.value}(msg.sender , address(0), 1);
    }
    /**
     * @dev Buy the coins  
     * @param _beneficiary robochainToken amount want to buy
     */

    function buy(
        address _beneficiary,
        address _ref,
        uint256 _option
    ) external payable {
        require(walletlessSaleEnabled, "WalletLessSale: sale is not enabled");
        uint256 bnbAmount = msg.value;
        require(bnbAmount > 0, "WalletLessSale: Insufficient BNB amount");
        Option storage op = options[_option];
        uint256 tokensToBeBought = _getTokenAmount(bnbAmount , _option);
        require(tokensToBeBought > 0, "WalletLessSale: All tokens Sold Out");
        require(tokensToBeBought > minBuy, "WalletLessSale: All tokens Sold Out");
        
        uint256 cost = tokensToBeBought.mul(op.price);
        if (bnbAmount > cost) {
            address payable refundAccount = payable(_beneficiary);
	        refundAccount.transfer(bnbAmount.sub(cost));
            bnbAmount = cost;
        }
        if(!isAllowedClaimReward[_beneficiary]){ 
            isAllowedClaimReward[_beneficiary] = true;
        }
        if(_ref != address(0)){
            uint256 refReward = (tokensToBeBought * refRewardRate) / 10_000;
            if (refReward > 0) refRewardAmount[_ref] = refRewardAmount[_ref] + refReward;  
        }
        op.totalBnb = op.totalBnb.add(bnbAmount);
        op.totalAmount = op.totalAmount.sub(tokensToBeBought);
        op.totalSold = op.totalSold.add(tokensToBeBought);
        User storage userStruct = users[_option][_beneficiary];
        userStruct.tokenBoughts = userStruct.tokenBoughts.add(tokensToBeBought);
        if(op.lockTime > 0){
             userStruct.pendingForClaim = userStruct.pendingForClaim.add(tokensToBeBought);
             userStruct.nextUnlockDate = block.timestamp.add(op.lockTime);
        } else {
             walletLessCoin.safeTransfer(msg.sender, tokensToBeBought);
        }
        emit TokenPurchased(msg.sender, tokensToBeBought);
    }

    function claimReward() public {
        require(isAllowedClaimReward[msg.sender],"WalletLessSale: address is not allowed to call this function");
        address payable refundAccount = payable(msg.sender);
	    refundAccount.transfer(refRewardAmount[msg.sender]);
        refRewardAmount[msg.sender] = 0;
    }

    function _getTokenAmount(uint256 _bnbAmount , uint256 _option)
        internal
        view
        returns (uint256)
    {
        uint256 _amoutOfTokens = _bnbAmount.div(options[_option].price);
        _amoutOfTokens = _amoutOfTokens > maxBuy ? maxBuy : _amoutOfTokens;
        _amoutOfTokens = _amoutOfTokens > options[_option].totalAmount ? options[_option].totalAmount : _amoutOfTokens; 
        return _amoutOfTokens;
    }
    
    /**
     * @dev set ref reward percentage
     * @param _refRewardRate reward percentage 200 means 2% 
     */


    function setRefReward(uint256 _refRewardRate) public onlyOwner {
        require(_refRewardRate <= 1000, "WalletLessSale: too high"); // <= 10%
        refRewardRate = _refRewardRate;
    }
    /**
     * @dev setting walletlessSaleEnabled variable
     * @param enabled boolean True if enables, False otherwise
     */

    function setWalletLessSaleEnabled(bool enabled) external onlyOwner {
        walletlessSaleEnabled = enabled;
        emit SaleEnabled(enabled);
    }

    /**
     * @dev checks if tokens are unlocked and transfers set % from pendingForClaim and  user will recieve all remaining tokens with the last claim
     */
    function claimTokens(uint256 _option) public  {
        address user = msg.sender;
        User storage userStruct = users[_option][user];
        require(userStruct.pendingForClaim > 0,"WalletLessSale: Nothing to claim!");
        require(block.timestamp >= userStruct.nextUnlockDate,"WalletLessSale: Tokens are still locked!");
        walletLessCoin.safeTransfer(user, userStruct.pendingForClaim);
        userStruct.pendingForClaim = 0;
        userStruct.nextUnlockDate = 0;
        emit TokenClaimed(
            user,
            userStruct.pendingForClaim,
           _option
        );
    }

     /**
     * @dev Burn unsold & unclaimed rewards tokens  
     * @param _amount of tokens
     */

    function BurnUnSoldandUnclaimed(uint256 _amount) external onlyOwner {
        walletLessCoin.safeTransfer(address(0), _amount);
        emit BurnTokens(_amount);
    }

    /**
     * @dev emergency withdraw  from contract address
     * @param receiver receiver address 
     * @param coinAddress coin address 
     */

    function emergencyWithdraw(
        address receiver,
        address coinAddress
    ) external onlyOwner {
        IERC20 coin = IERC20(coinAddress);
        coin.safeTransfer(receiver, coin.balanceOf(address(this)));
    }

     /**
     * @dev withdraw BNB from contract address
     *  * @param _to receiver address 
     */
    
    function withdrawBNB(address _to) external onlyOwner {
        uint256 bnbBalance = address(this).balance;
        require(bnbBalance > 0, "PublicSale: Insufficient BNB amount");
        address payable account = payable(_to);
        account.transfer(bnbBalance);
    }
}
