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

describe("WalletLess", function () {
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
});