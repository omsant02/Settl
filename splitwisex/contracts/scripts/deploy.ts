import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const Ledger = await ethers.getContractFactory("Ledger");
  const ledger = await Ledger.deploy();
  await ledger.waitForDeployment();
  const addr = await ledger.getAddress();
  console.log("Ledger deployed:", addr);

  // Save address for other packages
  const outDir = path.join(__dirname, "..", "artifacts-export");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "address.json"), JSON.stringify({ Ledger: addr }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });


