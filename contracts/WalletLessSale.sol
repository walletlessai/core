/** 
 * SPDX-License-Identifier: MIT
 * WalletLess Sale Contract                                                          
                                        
 █░█░█ ▄▀█ █░░ █░░ █▀▀ ▀█▀ █░░ █▀▀ █▀ █▀
 ▀▄▀▄▀ █▀█ █▄▄ █▄▄ ██▄ ░█░ █▄▄ ██▄ ▄█ ▄█

*/

pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract WalletLessSale is Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    bool public walletlessSaleEnabled;
    uint256 public minBuy = 100 * 10 ** 18; // if 0 means no limit
    uint256 public maxBuy = 10000 * 10 ** 18; // if 0 means no limit
    uint256 public refRewardRate = 500;
    uint256 public unPaidRefReward;
    uint256 public saleEndTime;
    IERC20 public walletLessCoin;
    uint256 fundsIndex = 0;
    // user state structure
    struct User {
        uint256 tokenBoughts; // total num of tokens user have bought
        uint256 pendingForClaim; // amount of user's tokens that are still locked
        uint256 nextUnlockDate; // unix timestamp of next unlock
    }

    struct Option {
        uint256 price;
        uint256 totalAmount; // total available tokens for sale
        uint256 totalSold; // total sold
        uint256 totalBnb; // total bnb received
        uint256 lockTime; // if 0 means no lock
        bool enabled;
    }
    struct Receiver {
        uint256 ratio;
        uint256 enabled;
    }
    mapping(uint256 => mapping(address => User)) public users;
    mapping(uint256 => Option) public options;
    mapping(address => bool) public isAllowedClaimReward;
    mapping(address => uint256) public refRewardAmount;
    mapping(address => uint256) public fundsRatios;
    mapping(address => bool) internal fundAddressAdded;
    address[] internal fundsAddresses;

    event TokenPurchased(address indexed user, uint256 amount);
    event TokenClaimed(address indexed user, uint256 amount, uint256 _option);
    event SaleEnabled(bool status);
    event BurnTokens(uint256 amount);

    constructor(address walletLessCoin_) {
        walletLessCoin = IERC20(walletLessCoin_);
        saleEndTime = block.timestamp + 120 days;
        options[0] = Option({ // qymball
            price: 333333000000000,
            totalAmount: 20_000_000 * 10 ** 18,
            totalSold: 0,
            totalBnb: 0,
            lockTime: 0,
            enabled: true
        });
        options[1] = Option({  // oaktwo
            price: 250000000000000,
            totalAmount: 6_000_000 * 10 ** 18,
            totalSold: 0,
            totalBnb: 0,
            lockTime: 60 days,
            enabled: true
        });
        options[2] = Option({  // tukanny
            price: 142857000000000,
            totalAmount: 7_000_000 * 10 ** 18,
            totalSold: 0,
            totalBnb: 0,
            lockTime: 90 days,
            enabled: true
        });
        options[3] = Option({  // alei
            price: 100000000000000,
            totalAmount: 8_000_000 * 10 ** 18,
            totalSold: 0,
            totalBnb: 0,
            lockTime: 120 days,
            enabled: true
        });
        options[4] = Option({  // lokhen
            price: 66667000000000,
            totalAmount: 9_000_000 * 10 ** 18,
            totalSold: 0,
            totalBnb: 0,
            lockTime: 180 days,
            enabled: true
        });
        options[5] = Option({  // dietitian
            price: 50000000000000,
            totalAmount: 10_000_000 * 10 ** 18,
            totalSold: 0,
            totalBnb: 0,
            lockTime: 240 days,
            enabled: true
        });

        addorSetFundAddress(0x341f9B9C3b8BC4Ab3a52DAb6fAFF42201A8eccb6, 100);
        addorSetFundAddress(0xd0d4Bdd0E93DF8622149c1Eb53076FBfc8aa1d0D, 100);
        addorSetFundAddress(0xA7556724E33Af7B3Fde340196e86d0FBc380016a, 100);
        addorSetFundAddress(0x6871eE27C51F417d1CEfAA60122367487bdCC8FC, 100);
        addorSetFundAddress(0x7E1Dbef6Da4A558eE4A51ee2C7a9610cCbcd5c46, 100);
        addorSetFundAddress(0xEaC29ECCC493a33e711678f35Bb12fa6948FD319, 300);
        addorSetFundAddress(0x516401cFf4eEaD44a91c1DC83C434346903F72A0, 100);
        addorSetFundAddress(0xF2a959E2CB000a51cFD17E6BEB760B50220A580A, 500); 
        addorSetFundAddress(0x6247bd9967d72D3ef32A5383C20a1d65bAeD4087, 500); 
        addorSetFundAddress(0xC07E62003A6D9fCE3eFAB6Fe0a0b0F6AD5264FD7, 500); 
        addorSetFundAddress(0x9afa4c83b3C2f22A10E803dD075B513C81F1eD54, 500); 
        addorSetFundAddress(0xcaE2D679961bd3e7501E9a48a9f820521bE6d1eE, 500); 
        addorSetFundAddress(0xaBf64A1998Bd68E3d48a68d6353dF6DE569A37bE, 400); 
        addorSetFundAddress(0x805d679427F08a0597a353072298e1ca9C3Cc121, 400); 
        addorSetFundAddress(0xfc7c561Fd8A0B44a07Ef5E8F033a25Fa53a62d29, 200); 
        addorSetFundAddress(0xD6aA74E50cdA3A71b839ab27c4B5823C96e3Fb70, 700); 
        addorSetFundAddress(0x5D49b8e2dc391B16337F1E97152a2878BFf814AF, 700); 
        addorSetFundAddress(0x315eF8c4cEfC554510f6CF98AB465b4F329024B1, 700); 
        addorSetFundAddress(0x400FD42C24a077072A654A783DC58aCb65AA0B60, 700); 
        addorSetFundAddress(0x33c980E461E5E2363e6A2401Edde9E858f3A4807, 700); 
        addorSetFundAddress(0xc6C565D73fd28E06044B01975684862c95d4De57, 600); 
        addorSetFundAddress(0xf9600e50f78C284080d550Df00BF51CADF9165Ef, 500); 
        addorSetFundAddress(0x194761207897B7Be5c054E68825b99AD9609fa19, 1000); 
    }

    receive() external payable {
        require(msg.value > 0, "You cannot send 0 BNB");
        this.buy{value: msg.value}(msg.sender, address(0), 0);
    }

    fallback() external payable {
        require(msg.value > 0, "You cannot send 0 BNB");
        this.buy{value: msg.value}(msg.sender, address(0), 0);
    }

    /**
     * @dev Buy the coins
     * @param _beneficiary  amount want to buy
     */

    function buy(
        address _beneficiary,
        address _ref,
        uint256 _option
    ) external payable {
        require(walletlessSaleEnabled, "WalletLessSale: sale is not enabled");
        require(
            block.timestamp < saleEndTime,
            "WalletLessSale: sale is already finished"
        );
        uint256 bnbAmount = msg.value;
        require(bnbAmount > 0, "WalletLessSale: Insufficient BNB amount");
        Option storage op = options[_option];
        uint256 tokensToBeBought = _getTokenAmount(bnbAmount, _option);
        require(tokensToBeBought > 0, "WalletLessSale: All tokens Sold Out");
        require(
            tokensToBeBought > minBuy,
            "WalletLessSale: All tokens Sold Out"
        );

        uint256 cost = tokensToBeBought.mul(op.price);
        if (bnbAmount > cost) {
            address payable refundAccount = payable(_beneficiary);
            refundAccount.transfer(bnbAmount.sub(cost));
            bnbAmount = cost;
        }
        if (!isAllowedClaimReward[_beneficiary]) {
            isAllowedClaimReward[_beneficiary] = true;
        }
        if (_ref != address(0)) {
            uint256 refReward = (tokensToBeBought * refRewardRate) / 10_000;
            if (refReward > 0) {
                unPaidRefReward = unPaidRefReward + refReward;
                refRewardAmount[_ref] = refRewardAmount[_ref] + refReward;
            }
        }
        op.totalBnb = op.totalBnb.add(bnbAmount);
        op.totalAmount = op.totalAmount.sub(tokensToBeBought);
        op.totalSold = op.totalSold.add(tokensToBeBought);
        User storage userStruct = users[_option][_beneficiary];
        userStruct.tokenBoughts = userStruct.tokenBoughts.add(tokensToBeBought);
        if (op.lockTime > 0) {
            userStruct.pendingForClaim = userStruct.pendingForClaim.add(
                tokensToBeBought
            );
            userStruct.nextUnlockDate = block.timestamp.add(op.lockTime);
        } else {
            walletLessCoin.safeTransfer(msg.sender, tokensToBeBought);
        }
        emit TokenPurchased(msg.sender, tokensToBeBought);
    }

    function claimReward() public {
        require(
            isAllowedClaimReward[msg.sender],
            "WalletLessSale: address is not allowed to call this function"
        );
        walletLessCoin.safeTransfer(msg.sender, refRewardAmount[msg.sender]);
        unPaidRefReward = unPaidRefReward - refRewardAmount[msg.sender];
    }

    function _getTokenAmount(
        uint256 _bnbAmount,
        uint256 _option
    ) internal view returns (uint256) {
        uint256 _amoutOfTokens = _bnbAmount.div(options[_option].price);
        _amoutOfTokens = _amoutOfTokens > maxBuy ? maxBuy : _amoutOfTokens;
        _amoutOfTokens = _amoutOfTokens > options[_option].totalAmount
            ? options[_option].totalAmount
            : _amoutOfTokens;
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
    function claimTokens(uint256 _option) public {
        address user = msg.sender;
        User storage userStruct = users[_option][user];
        require(
            userStruct.pendingForClaim > 0,
            "WalletLessSale: Nothing to claim!"
        );
        require(
            block.timestamp >= userStruct.nextUnlockDate,
            "WalletLessSale: Tokens are still locked!"
        );
        walletLessCoin.safeTransfer(user, userStruct.pendingForClaim);
        userStruct.pendingForClaim = 0;
        userStruct.nextUnlockDate = 0;
        emit TokenClaimed(user, userStruct.pendingForClaim, _option);
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
     * @dev set funds for address e.g marketing , development , dex liquditity etc
     *  * @param _to receiver address
     *  * @param _ratio percentage
     */

    function addORsetFundsRatioForAddress(
        address _to,
        uint256 _ratio
    ) external onlyOwner {
       addorSetFundAddress(_to,_ratio);
    }


    /**
     * @dev transfer BNBs from contract address
     */

    function transferBNB() external onlyOwner {
        uint256 bnbBalance = address(this).balance;
        require(bnbBalance > 0, "PublicSale: Insufficient BNB amount");
        for(uint256 index = 0; index < fundsAddresses.length; index++)
        {
            if(fundsRatios[fundsAddresses[index]] > 0 ){
                uint256 _bnbAmount = (bnbBalance * fundsRatios[fundsAddresses[index]]) / 10_000;
                address payable account = payable(fundsAddresses[index]);
                account.transfer(_bnbAmount);
            }
        }
    }

    function addorSetFundAddress(address _add, uint256 _ratio) internal {
        if(!fundAddressAdded[_add]){
            fundAddressAdded[_add] = true;
            fundsAddresses.push(_add);
        }
        fundsRatios[_add] = _ratio;
    }
}
