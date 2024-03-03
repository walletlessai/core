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
        it("Should be disabled Public sale after contract creation", async function () {

            const {WalletlessSale} = await loadFixture(deployWalletlessSale);

            expect(await WalletlessSale.walletlessSaleEnabled()).to.be.equal(false)
        });

        it("Should be proper coins after deployment and sending tokens via WalletLess", async function () {

            const {WalletlessSale, WalletLess} = await loadFixture(deployWalletlessSale);

            expect(await WalletLess.balanceOf(WalletlessSale.address)).to.be.equal("60000000000000000000000000");
        });

        it("Should be able to enable Public sale", async function () {

            const {WalletlessSale} = await loadFixture(deployWalletlessSale);

            await WalletlessSale.setWalletLessSaleEnabled(true);
            expect(await WalletlessSale.walletlessSaleEnabled()).to.be.equal(true)
        });

        it("Should fail if Public sale is enabled by not owner account", async function () {
            const {WalletlessSale, firstAccount} = await loadFixture(deployWalletlessSale);
            await expect(WalletlessSale.connect(firstAccount).setWalletLessSaleEnabled(true)).to.be.revertedWith("Ownable: caller is not the owner")
        });
    });
});
