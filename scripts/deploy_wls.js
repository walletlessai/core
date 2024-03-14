// to deploy locally
// run: npx hardhat node on a terminal
// then run: npx hardhat run --network bsc scripts/deploy_wls.js
const hre = require("hardhat");

function sleep(s) {
  return new Promise(resolve => setTimeout(resolve, s*1000));
}

async function main() {
  
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  let name = "Wallet Less";
  let symbol = "WLS";

  let WalletLess = await hre.ethers.getContractFactory("WalletLess");
  WalletLess = await WalletLess.deploy(name, symbol);
  
  console.log("contract address: " + WalletLess.address)

  await sleep(100);
  
  try {
    await hre.run("verify:verify", {
        address: WalletLess.address,
        constructorArguments: [name, symbol],
    });
    console.log("Source Verified on Network");

  } catch (err) {
      console.log("error verify WalletLess", err.message);
  }

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

