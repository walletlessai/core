// to deploy locally
// run: npx hardhat node on a terminal
// then run: npx hardhat run --network bsc scripts/deploy_sale.js
const hre = require("hardhat");

function sleep(s) {
  return new Promise(resolve => setTimeout(resolve, s*1000));
}

async function main() {
  
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());
  

  let WalletLess = await hre.ethers.getContractFactory("WalletLess");
  WalletLess = await WalletLess.attach("0xDC48d2Cd4441Dc7702f12062b2252D9C0E8EfDbc");
  
  let WalletLessSale = await hre.ethers.getContractFactory("WalletLessSale");
  WalletLessSale = await WalletLessSale.deploy("0xDC48d2Cd4441Dc7702f12062b2252D9C0E8EfDbc");

    console.log("contract address WalletLessSale: " + WalletLessSale.address)
    await WalletLess.sendTokens('1', WalletLessSale.address)
  await sleep(100);
  
  try {
    await hre.run("verify:verify", {
        address: WalletLessSale.address,
        constructorArguments: ["0xDC48d2Cd4441Dc7702f12062b2252D9C0E8EfDbc"],
    });
    console.log("Source Verified on Network");

  } catch (err) {
      console.log("error verify WalletLessSale", err.message);
  }

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

