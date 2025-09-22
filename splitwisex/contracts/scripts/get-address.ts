import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Wallet address:", signer.address);
  console.log("Balance:", await ethers.provider.getBalance(signer.address));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});