import { ethers } from "hardhat";

async function main() {
  const [me, a, b] = await ethers.getSigners();
  const addr = require("../artifacts-export/address.json").Ledger as string;
  const ledger = await ethers.getContractAt("Ledger", addr);

  // Create group with 3 members (me, a, b)
  const tx1 = await ledger.createGroup("Trip", [me.address, a.address, b.address]);
  await tx1.wait();

  // Add 3 expenses
  const token = ethers.ZeroAddress; // placeholder token address for demo
  const add = async (payer: string, amount: bigint, memo: string) => {
    const splitData = "0x"; // your encoding later
    const cid = "bafy...demo"; // any CID
    const tx = await ledger.addExpense(1, payer, token, amount, splitData, cid, memo);
    await tx.wait();
  };
  await add(me.address, ethers.parseEther("1.5"), "Dinner");
  await add(a.address, ethers.parseEther("0.5"), "Snacks");
  await add(b.address, ethers.parseEther("2.0"), "Cab");

  // Mock settlement intent + finalize
  const intentHash = ethers.id("intent-1");
  await (await ledger.createSettlementIntent(1, intentHash, a.address, me.address, "route-xyz")).wait();
  const dstTxHash = ethers.keccak256(ethers.toUtf8Bytes("dst-tx"));
  await (
    await ledger.finalizeSettlement(
      1,
      a.address,
      me.address,
      token,
      ethers.parseEther("0.5"),
      137,
      dstTxHash,
      intentHash,
      "0x",
      "0x"
    )
  ).wait();

  console.log("Seed complete");
}

main().catch((e) => { console.error(e); process.exit(1); });


