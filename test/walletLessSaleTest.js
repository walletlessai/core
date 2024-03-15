const {
    time,
    loadFixture,
    constants,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
let bigInt = require("big-integer");
const exp = require("constants");

async function deployWalletlessSale() {
    const [owner, firstAccount, secondAccount] = await ethers.getSigners();

    // deploy WalletLess
    let WalletLess = await ethers.getContractFactory("WalletLess");
    let name = "WalletLess";
    let symbol = "WLS";
    WalletLess = await WalletLess.deploy(name, symbol);
    let WalletlessSale = await ethers.getContractFactory("WalletLessSale");
    WalletlessSale = await WalletlessSale.deploy(WalletLess.address);

    await WalletLess.sendTokens("1", WalletlessSale.address);

    return { WalletLess, owner, firstAccount, secondAccount, WalletlessSale };
}


describe("WalletLess Sale", function () {

    describe("test setting WalletLess Sale", function () {
        it("Should be disabled walletless sale after contract creation", async function () {

            const { WalletlessSale } = await loadFixture(deployWalletlessSale);

            expect(await WalletlessSale.walletlessSaleEnabled()).to.be.equal(false)
        });

        it("Should be proper coins after deployment and sending tokens via WalletLess", async function () {

            const { WalletlessSale, WalletLess } = await loadFixture(deployWalletlessSale);

            expect(await WalletLess.balanceOf(WalletlessSale.address)).to.be.equal("60000000000000000000000000");
        });

        it("Should be able to enable walletless sale", async function () {

            const { WalletlessSale } = await loadFixture(deployWalletlessSale);

            await WalletlessSale.setWalletLessSaleEnabled(true);
            expect(await WalletlessSale.walletlessSaleEnabled()).to.be.equal(true)
        });

        it("Should fail if walletless sale is enabled by not owner account", async function () {
            const { WalletlessSale, firstAccount } = await loadFixture(deployWalletlessSale);
            await expect(WalletlessSale.connect(firstAccount).setWalletLessSaleEnabled(true)).to.be.revertedWith("Ownable: caller is not the owner")
        });
    });

    describe("Test buy functionality", function () {
        it("Should fail when calling not turning on walletlessSaleEnabled", async function () {
            const { WalletlessSale, firstAccount } = await loadFixture(deployWalletlessSale);
            await expect(WalletlessSale.connect(firstAccount).buy(firstAccount.address, ethers.constants.AddressZero, 0, { value: ethers.utils.parseEther('1') })).to.be.revertedWith("WalletLessSale: sale is not enabled")
        });
        it("Should fail when sending zero BNB or Ether", async function () {
            const { WalletlessSale, firstAccount } = await loadFixture(deployWalletlessSale);
            await WalletlessSale.setWalletLessSaleEnabled(true);
            await expect(WalletlessSale.connect(firstAccount).buy(firstAccount.address, ethers.constants.AddressZero, 0, { value: ethers.utils.parseEther('0') })).to.be.revertedWith("WalletLessSale: Insufficient BNB amount")
        });
        it("Should fail when buying tokens below 100", async function () {
            const { WalletlessSale, firstAccount } = await loadFixture(deployWalletlessSale);
            var amount = (200000000000000 * 80);
            await WalletlessSale.setWalletLessSaleEnabled(true);
            await expect(WalletlessSale.connect(firstAccount).buy(firstAccount.address, ethers.constants.AddressZero, 0, { value: amount.toString() })).to.be.revertedWith("WalletLessSale: less then 100 tokens not allowed")
        });
        it("Should fail when buying tokens above max", async function () {
            const { WalletlessSale, firstAccount } = await loadFixture(deployWalletlessSale);
            await WalletlessSale.setWalletLessSaleEnabled(true);
            await expect(WalletlessSale.connect(firstAccount).buy(firstAccount.address, ethers.constants.AddressZero, 0, { value: ethers.utils.parseEther('2.1') })).to.be.revertedWith("WalletLessSale: Reached Maximum Cap")
        });
        it("Should Buy Successful without Refferal wihtout Lock with 1 bnb and 5000 tokens", async function () {
            const { WalletlessSale, WalletLess, firstAccount } = await loadFixture(deployWalletlessSale);
            await WalletlessSale.setWalletLessSaleEnabled(true);
            const tx = await WalletlessSale.connect(firstAccount).buy(firstAccount.address, ethers.constants.AddressZero, 0, { value: ethers.utils.parseEther('1') })
            const receipt = await tx.wait()
            for (const event of receipt.events) {
                if (event.event == 'TokenPurchased') {
                    expect(event.args[1]).to.be.equal(ethers.utils.parseEther("5000"))
                }
                //  console.log(`Event ${event.event} with args ${event.args}`);
            }
            expect(await WalletLess.balanceOf(firstAccount.address)).to.be.equal(ethers.utils.parseEther("5000"));
            let userStruct = await WalletlessSale.users(0, firstAccount.address);
            expect(userStruct.tokenBoughts).to.be.equal(ethers.utils.parseEther("5000"));
            expect(userStruct.pendingForClaim).to.be.equal(ethers.utils.parseEther("0"));
        });


        it("Should Buy Successful with lock (option 1) with 1 bnb 6000", async function () {
            const { WalletlessSale, WalletLess, firstAccount } = await loadFixture(deployWalletlessSale);
            await WalletlessSale.setWalletLessSaleEnabled(true);
            const tx = await WalletlessSale.connect(firstAccount).buy(firstAccount.address, ethers.constants.AddressZero, 1, { value: ethers.utils.parseEther('1') })
            const receipt = await tx.wait()
            for (const event of receipt.events) {
                if (event.event == 'TokenPurchased') {
                    expect(event.args[1]).to.be.equal(ethers.utils.parseEther("6000"))
                }
                //  console.log(`Event ${event.event} with args ${event.args}`);
            }
            expect(await WalletLess.balanceOf(firstAccount.address)).to.be.equal(ethers.utils.parseEther("0"));
            let userStruct = await WalletlessSale.users(1, firstAccount.address);
            expect(userStruct.tokenBoughts).to.be.equal(ethers.utils.parseEther("6000"));
            expect(userStruct.pendingForClaim).to.be.equal(ethers.utils.parseEther("6000"));
        });

        it("Should fail claim tokens (option 1) before 60 days", async function () {
            const { WalletlessSale, WalletLess, firstAccount } = await loadFixture(deployWalletlessSale);
            await WalletlessSale.setWalletLessSaleEnabled(true);
            const tx = await WalletlessSale.connect(firstAccount).buy(firstAccount.address, ethers.constants.AddressZero, 1, { value: ethers.utils.parseEther('1') })
            const receipt = await tx.wait()
            for (const event of receipt.events) {
                if (event.event == 'TokenPurchased') {
                    expect(event.args[1]).to.be.equal(ethers.utils.parseEther("6000"))
                }
                //  console.log(`Event ${event.event} with args ${event.args}`);
            }
            expect(await WalletLess.balanceOf(firstAccount.address)).to.be.equal(ethers.utils.parseEther("0"));
            let userStruct = await WalletlessSale.users(1, firstAccount.address);
            expect(userStruct.tokenBoughts).to.be.equal(ethers.utils.parseEther("6000"));
            await expect(WalletlessSale.connect(firstAccount).claimTokens(1)).to.be.revertedWith("WalletLessSale: Tokens are still locked!")

        });

        it("Should Successfully claim tokens (option 1) after 60 days", async function () {
            const { WalletlessSale, WalletLess, firstAccount } = await loadFixture(deployWalletlessSale);
            await WalletlessSale.setWalletLessSaleEnabled(true);
            const tx = await WalletlessSale.connect(firstAccount).buy(firstAccount.address, ethers.constants.AddressZero, 1, { value: ethers.utils.parseEther('1') })
            const receipt = await tx.wait()
            for (const event of receipt.events) {
                if (event.event == 'TokenPurchased') {
                    expect(event.args[1]).to.be.equal(ethers.utils.parseEther("6000"))
                }
                //  console.log(`Event ${event.event} with args ${event.args}`);
            }
            expect(await WalletLess.balanceOf(firstAccount.address)).to.be.equal(ethers.utils.parseEther("0"));

            const duration = 2 * 2592000; //  2 months or 60 days

            await network.provider.send("evm_increaseTime", [duration]);
            await network.provider.send("evm_mine");
            await WalletlessSale.connect(firstAccount).claimTokens(1);

            expect(await WalletLess.balanceOf(firstAccount.address)).to.be.equal(ethers.utils.parseEther("6000"));
            let userStruct = await WalletlessSale.users(1, firstAccount.address);
            expect(userStruct.tokenBoughts).to.be.equal(ethers.utils.parseEther("6000"));
            expect(userStruct.pendingForClaim).to.be.equal(ethers.utils.parseEther("0"));

        });
        it("Should fail double claim tokens (option 1) after 60 days", async function () {
            const { WalletlessSale, WalletLess, firstAccount } = await loadFixture(deployWalletlessSale);
            await WalletlessSale.setWalletLessSaleEnabled(true);
            const tx = await WalletlessSale.connect(firstAccount).buy(firstAccount.address, ethers.constants.AddressZero, 1, { value: ethers.utils.parseEther('1') })
            const receipt = await tx.wait()
            for (const event of receipt.events) {
                if (event.event == 'TokenPurchased') {
                    expect(event.args[1]).to.be.equal(ethers.utils.parseEther("6000"))
                }
                //  console.log(`Event ${event.event} with args ${event.args}`);
            }
            expect(await WalletLess.balanceOf(firstAccount.address)).to.be.equal(ethers.utils.parseEther("0"));

            const duration = 2 * 2592000; //  2 months or 60 days

            await network.provider.send("evm_increaseTime", [duration]);
            await network.provider.send("evm_mine");
            await WalletlessSale.connect(firstAccount).claimTokens(1);

            expect(await WalletLess.balanceOf(firstAccount.address)).to.be.equal(ethers.utils.parseEther("6000"));
            let userStruct = await WalletlessSale.users(1, firstAccount.address);
            expect(userStruct.tokenBoughts).to.be.equal(ethers.utils.parseEther("6000"));
            expect(userStruct.pendingForClaim).to.be.equal(ethers.utils.parseEther("0"));
            await expect(WalletlessSale.connect(firstAccount).claimTokens(1)).to.be.revertedWith("WalletLessSale: Nothing to claim!")

        });
    });
    describe("Test referral functionality", function () {
        it("Should Buy Successful Option 1 with Refferal and updated earning correctly", async function () {
            const { WalletlessSale, WalletLess, firstAccount, secondAccount } = await loadFixture(deployWalletlessSale);
            await WalletlessSale.setWalletLessSaleEnabled(true);
            const tx = await WalletlessSale.connect(firstAccount).buy(firstAccount.address, secondAccount.address, 1, { value: ethers.utils.parseEther('1') })
            const receipt = await tx.wait()
            for (const event of receipt.events) {
                if (event.event == 'TokenPurchased') {
                    expect(event.args[1]).to.be.equal(ethers.utils.parseEther("6000"))
                }
                //  console.log(`Event ${event.event} with args ${event.args}`);
            }
            expect(await WalletLess.balanceOf(firstAccount.address)).to.be.equal(ethers.utils.parseEther("0"));
            let userStruct = await WalletlessSale.users(1, firstAccount.address);
            let refRaward = await WalletlessSale.refRewardAmount(secondAccount.address);
            let unpaidRefReward = await WalletlessSale.unPaidRefReward();
            expect(refRaward).to.be.equal(ethers.utils.parseEther("300"));
            expect(unpaidRefReward).to.be.equal(ethers.utils.parseEther("300"));
            expect(userStruct.tokenBoughts).to.be.equal(ethers.utils.parseEther("6000"));
            expect(userStruct.pendingForClaim).to.be.equal(ethers.utils.parseEther("6000"));

        });

        it("Should fail claim refferal earning without buying WLS", async function () {
            const { WalletlessSale, WalletLess, firstAccount, secondAccount } = await loadFixture(deployWalletlessSale);
            await WalletlessSale.setWalletLessSaleEnabled(true);
            const tx = await WalletlessSale.connect(firstAccount).buy(firstAccount.address, secondAccount.address, 1, { value: ethers.utils.parseEther('1') })
            const receipt = await tx.wait()
            for (const event of receipt.events) {
                if (event.event == 'TokenPurchased') {
                    expect(event.args[1]).to.be.equal(ethers.utils.parseEther("6000"))
                }
                //  console.log(`Event ${event.event} with args ${event.args}`);
            }
            expect(await WalletLess.balanceOf(firstAccount.address)).to.be.equal(ethers.utils.parseEther("0"));
            let userStruct = await WalletlessSale.users(1, firstAccount.address);
            let refRaward = await WalletlessSale.refRewardAmount(secondAccount.address);
            let unpaidRefReward = await WalletlessSale.unPaidRefReward();
            expect(refRaward).to.be.equal(ethers.utils.parseEther("300"));
            expect(unpaidRefReward).to.be.equal(ethers.utils.parseEther("300"));
            expect(userStruct.tokenBoughts).to.be.equal(ethers.utils.parseEther("6000"));
            expect(userStruct.pendingForClaim).to.be.equal(ethers.utils.parseEther("6000"));
            await expect(WalletlessSale.connect(secondAccount).claimReward()).to.be.revertedWith("WalletLessSale: address is not allowed to call claim rewards!")
        });

        it("Should Successfully claim refferal earning", async function () {
            const { WalletlessSale, WalletLess, firstAccount, secondAccount } = await loadFixture(deployWalletlessSale);
            await WalletlessSale.setWalletLessSaleEnabled(true);
            const tx = await WalletlessSale.connect(firstAccount).buy(firstAccount.address, secondAccount.address, 1, { value: ethers.utils.parseEther('1') })
            const receipt = await tx.wait()
            for (const event of receipt.events) {
                if (event.event == 'TokenPurchased') {
                    expect(event.args[1]).to.be.equal(ethers.utils.parseEther("6000"))
                }
                //  console.log(`Event ${event.event} with args ${event.args}`);
            }
            expect(await WalletLess.balanceOf(firstAccount.address)).to.be.equal(ethers.utils.parseEther("0"));
            let userStruct = await WalletlessSale.users(1, firstAccount.address);

            expect(userStruct.tokenBoughts).to.be.equal(ethers.utils.parseEther("6000"));
            expect(userStruct.pendingForClaim).to.be.equal(ethers.utils.parseEther("6000"));
            await WalletlessSale.connect(secondAccount).buy(secondAccount.address, ethers.constants.AddressZero, 1, { value: ethers.utils.parseEther('1') })
            await WalletlessSale.connect(secondAccount).claimReward();
            let refRaward = await WalletlessSale.refRewardAmount(secondAccount.address);
            let unpaidRefReward = await WalletlessSale.unPaidRefReward();

            expect(refRaward).to.be.equal("0");
            expect(unpaidRefReward).to.be.equal("0");
            expect(await WalletLess.balanceOf(secondAccount.address)).to.be.equal(ethers.utils.parseEther("300"));

        });
    });
    describe("Test Burn Functions UnSold Tokens", function () {
        it("Should Successfully claim refferal earning", async function () {
            const { WalletlessSale, WalletLess, firstAccount, secondAccount } = await loadFixture(deployWalletlessSale);
            await WalletlessSale.setWalletLessSaleEnabled(true);
            await WalletlessSale.connect(firstAccount).buy(firstAccount.address, ethers.constants.AddressZero, 0, { value: ethers.utils.parseEther('2') })
            await WalletlessSale.connect(secondAccount).buy(secondAccount.address, ethers.constants.AddressZero, 0, { value: ethers.utils.parseEther('2') })
            await WalletlessSale.BurnUnSoldandUnclaimed(ethers.utils.parseEther('1000000'))
            expect(await WalletLess.balanceOf('0x000000000000000000000000000000000000dEaD')).to.be.equal(ethers.utils.parseEther("1000000"));
        });

    });
});
