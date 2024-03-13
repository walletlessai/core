const { time, loadFixture, constants } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
let bigInt = require("big-integer");



async function deployWalletLess() {
    const [owner, firstAccount, secondAccount] = await ethers.getSigners();
    let WalletLess = await ethers.getContractFactory("WalletLess");
    let name = "WalletLess";
    let symbol = "WLS";
    WalletLess = await WalletLess.deploy(name, symbol);

    return { WalletLess, name, symbol, owner, firstAccount, secondAccount};
}

describe("WalletLess Token Smart Contract", function () {
    describe("Deployment", function () {
        it("Checking initial values of smart contract", async function () {
            const { WalletLess, name, symbol, owner } = await loadFixture(deployWalletLess);
            expect(await WalletLess.name()).to.be.equal(name);
            expect(await WalletLess.symbol()).to.be.equal(symbol);
            expect(await WalletLess.owner()).to.be.equal(owner.address);
            expect(await WalletLess.balanceOf(WalletLess.address)).to.be.equal('120000000000000000000000000');
        });
    });

    describe("Test pause", function () {
        it("Should fail transfer when paused", async function () {
            const { WalletLess, firstAccount } = await loadFixture(deployWalletLess);
            await WalletLess.pause();
            await expect(WalletLess.transfer(firstAccount.address, 2)).to.be.revertedWith("Pausable: paused");     
            await WalletLess.unpause();   
        });
    });
    describe("Test Send Tokens", function () {
        it("Should fail when calling non owner", async function () {
            const { WalletLess, firstAccount } = await loadFixture(deployWalletLess);
            
            await expect(WalletLess.connect(firstAccount).sendTokens("2", firstAccount.address))
                .to.be.revertedWith("Ownable: caller is not the owner");     
        });
        
        it("Should fail while passing address zero", async function () {
            const { WalletLess } = await loadFixture(deployWalletLess);
            
            await expect(WalletLess.sendTokens("2", ethers.constants.AddressZero))
                .to.be.revertedWith("WalletLess: _to should not be zero");     
        });

        it("Should send tokens to Team Address", async function () {
            const { WalletLess, firstAccount } = await loadFixture(deployWalletLess);
            
            await WalletLess.sendTokens("2", firstAccount.address);
            
            expect(await WalletLess.balanceOf(firstAccount.address)).to.be.equal(ethers.utils.parseEther("10000000"));
        });

        it("Should fail when sending again tokens to Team Address", async function () {
            const { WalletLess, firstAccount } = await loadFixture(deployWalletLess);
            
            await WalletLess.sendTokens("2", firstAccount.address);
            
            await expect(WalletLess.sendTokens("2", firstAccount.address)).to.be.revertedWith("WalletLess: Already Claimed!");
        });
    });
    
    describe("Test Spending Reward", function () {
        it("Should receive 2% spending reward", async function () {
            const { WalletLess, firstAccount , secondAccount} = await loadFixture(deployWalletLess);
            await WalletLess.sendTokens("2", firstAccount.address);
            const amount = ethers.utils.parseEther("10000000");
            const rewardAmount =  ethers.utils.parseEther("200000"); // 2% of 10 million tokens
            await WalletLess.connect(firstAccount).transfer(secondAccount.address, amount)
            expect(await WalletLess.spenindRewards(firstAccount.address)).to.be.equal(rewardAmount);
            expect(await WalletLess.spendingRewardTokens()).to.be.equal(ethers.utils.parseEther("5000000")); // total 5 million shoulds in spending reward
            await WalletLess.connect(firstAccount).claimSpendingReward()
            expect(await WalletLess.balanceOf(secondAccount.address)).to.be.equal(amount);
            expect(await WalletLess.balanceOf(firstAccount.address)).to.be.equal(rewardAmount);
            expect(await WalletLess.spenindRewards(firstAccount.address)).to.be.equal('0');
            expect(await WalletLess.spendingRewardTokens()).to.be.equal(ethers.utils.parseEther("4800000")); // total balance in spending rewards
        });
        it("Should Exclude Address from spending reward", async function () {
            const { WalletLess, firstAccount , secondAccount} = await loadFixture(deployWalletLess);
            await WalletLess.sendTokens("2", firstAccount.address);
            const amount = ethers.utils.parseEther("10000000");
            await WalletLess.excludeFromSpendingReward(firstAccount.address);
            await WalletLess.connect(firstAccount).transfer(secondAccount.address, amount);
            expect(await WalletLess.spenindRewards(firstAccount.address)).to.be.equal('0');
            expect(await WalletLess.spendingRewardTokens()).to.be.equal(ethers.utils.parseEther("5000000"));
            expect(WalletLess.connect(firstAccount).claimSpendingReward()).to.be.revertedWith("WalletLess: Not have enough Reward");
        });  
    });

});