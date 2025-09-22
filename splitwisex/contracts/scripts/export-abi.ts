import fs from "fs";
import path from "path";

const abiSrc = path.join(__dirname, "..", "artifacts", "contracts", "Ledger.sol", "Ledger.json");
const abiJson = JSON.parse(fs.readFileSync(abiSrc, "utf8"));

const targets = [
  path.join(__dirname, "..", "..", "web", "abis"),
  path.join(__dirname, "..", "..", "subgraph", "abis"),
];
for (const t of targets) {
  fs.mkdirSync(t, { recursive: true });
  fs.writeFileSync(path.join(t, "Ledger.json"), JSON.stringify(abiJson, null, 2));
}
console.log("ABI exported to /web/abis and /subgraph/abis");


