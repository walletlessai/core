
/** 
 * SPDX-License-Identifier: MIT
 * WalletLess Token Contract                                                          
                                        
 █░█░█ ▄▀█ █░░ █░░ █▀▀ ▀█▀ █░░ █▀▀ █▀ █▀
 ▀▄▀▄▀ █▀█ █▄▄ █▄▄ ██▄ ░█░ █▄▄ ██▄ ▄█ ▄█

*/

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WalletLess is ERC20, Ownable, Pausable {
    event sendTokensInfo(string supplyName, address supplyAddress);
    event pausedStatus(bool status);
    event claimedSpendingReward(address user, uint256 amount);
    
    uint256 public spendingRewardTokens = 5_000_000 ether;
    uint256 public spendingRewardRate = 200;

    mapping(address => bool) public _isExcluded;
    mapping(address => uint256) public spenindRewards;

    /**
     * @dev 
     */
    struct Supply {
        string name;
        uint256 amount;
        bool claimed;
    }
    
    mapping(uint256 => Supply) public distributionInfo;

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {
        _mint(address(this), 120_000_000 * 10 ** 18);
        // initializer supply
        distributionInfo[1] = Supply({
            name: "Sale",
            amount : 60_000_000 * 10 ** decimals(),
            claimed: false
        });
        distributionInfo[2] = Supply({
            name: "Team",
            amount : 10_000_000 * 10 ** decimals(),
            claimed: false
        });
        distributionInfo[3] = Supply({
            name: "Liquidity Reward",
            amount : 10_000_000 * 10 ** decimals(),
            claimed: false
        });
        distributionInfo[4] = Supply({
            name: "Spending Reward",
            amount : 5_000_000 * 10 ** decimals(),
            claimed: false
        });
        distributionInfo[5] = Supply({
            name: "Business & Marketing",
            amount : 20_000_000 * 10 ** decimals(),
            claimed: false
        });
        distributionInfo[6] = Supply({
            name: "Referral Reward",
            amount : 3_000_000 * 10 ** decimals(),
            claimed: false
        });
         distributionInfo[7] = Supply({
            name: "Liquidity",
            amount : 12_000_000 * 10 ** decimals(),
            claimed: false
        });
        
        _isExcluded[owner()] = true;
        _isExcluded[address(this)] = true;
        
        }

    /**
     * @dev sending the supply 
     * @param _SupplyId supply id to send 
     * @param _to  address where to receive supply
     */

    function sendTokens(uint256 _SupplyId , address _to) external onlyOwner {
        require(_to != address(0),"WalletLess: _to should not be zero");
        Supply storage listedSupply = distributionInfo[_SupplyId];
        require(!listedSupply.claimed, "WalletLess: Already Claimed!");
        listedSupply.claimed = true;
        _transfer(address(this), _to, listedSupply.amount);
        emit sendTokensInfo(listedSupply.name, _to);
    }

    /**
     * @dev pausing the contract, where transfers or minting will be retricted
     */

    function pause() public onlyOwner {
        _pause();
        emit pausedStatus(true);
    }

    /**
     * @dev unpausing the contract, where transfers or minting will be possible
     */

    function unpause() public onlyOwner {
        _unpause();
        emit pausedStatus(false);
    }

    /**
     * @dev overriding before token transfer from ERC20 contract, adding whenNotPaused modifier to restrict transfers while paused.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
    
    
    /**
     * @dev exclude an address from spending reward 
     * @param account address of lp token or sale contract etc
     */
    function excludeFromSpendingReward(address account) public onlyOwner {
        require(
            !_isExcluded[account],
            "WalletLess:  Account is already excluded"
        );
        _isExcluded[account] = true;
    }

     /**
     * @dev set speindg reward percentage
     * @param _spendingRewardRate reward percentage 200 means 2% 
     */
    function setSpendingReward(uint256 _spendingRewardRate) public onlyOwner {
        require(_spendingRewardRate <= 1000, "WalletLess: too high"); // <= 10%
        spendingRewardRate = _spendingRewardRate;
    }


    function claimSpendingReward() external  {
        require(spenindRewards[msg.sender] > 0 && spenindRewards[msg.sender] <= spendingRewardTokens,"WalletLess: Not have enough Reward");
        spendingRewardTokens = spendingRewardTokens - spenindRewards[msg.sender];
         _transfer(address(this), msg.sender, spenindRewards[msg.sender]);
         emit claimedSpendingReward(msg.sender, spenindRewards[msg.sender]);
        spenindRewards[msg.sender] = 0;
    }

    function _transfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal override {
        if (_isExcluded[_from]) {
             super._transfer(_from, _to, _amount);
        } else {
            uint256 spendingReward = (_amount * spendingRewardRate) / 10_000;
            if (spendingReward > 0) spenindRewards[_from] = spenindRewards[_from] +  spendingReward;  
            super._transfer(_from, _to, _amount);
        }
    }
}
