import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const addr = require("../artifacts-export/address.json").Ledger as string;
  const ledger = await ethers.getContractAt("Ledger", addr);

  console.log("Creating demo group and expenses...");

  // Create group with 3 members (using valid addresses)
  const members = [
    signer.address,
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // vitalik.eth
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"  // Demo address
  ];

  const tx1 = await ledger.createGroup("ETHGlobal Trip", members);
  await tx1.wait();
  console.log("✅ Group created");

  // Add 3 expenses
  const token = ethers.ZeroAddress; // ETH as token for demo
  const splitData = "0x"; // Equal split encoding

  // Expense 1: Dinner
  const tx2 = await ledger.addExpense(
    1, // groupId
    signer.address, // payer
    token,
    ethers.parseEther("1.5"), // 1.5 ETH
    splitData,
    "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", // Real IPFS hash
    "Group dinner at ETHGlobal"
  );
  await tx2.wait();
  console.log("✅ Expense 1 added: Dinner");

  // Expense 2: Snacks
  const tx3 = await ledger.addExpense(
    1,
    members[1], // Different payer
    token,
    ethers.parseEther("0.5"),
    splitData,
    "bafybeics4njgzpgqdkkdcl7yiojw2viqqptkzl6kydcfuwdkn2rrzhqaiy",
    "Snacks for the team"
  );
  await tx3.wait();
  console.log("✅ Expense 2 added: Snacks");

  // Expense 3: Transportation
  const tx4 = await ledger.addExpense(
    1,
    members[2],
    token,
    ethers.parseEther("2.0"),
    splitData,
    "bafybeifa37oagc7i5k6klcpzxvnydrkxtkksnb4qvznjd6qhddnxrzrlhm",
    "Uber to venue"
  );
  await tx4.wait();
  console.log("✅ Expense 3 added: Transportation");

  console.log("🎉 Demo data created successfully!");
  console.log("📍 Contract:", addr);
  console.log("🌍 Network: Sepolia");
  console.log("🔗 Explorer:", `https://sepolia.etherscan.io/address/${addr}`);
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});