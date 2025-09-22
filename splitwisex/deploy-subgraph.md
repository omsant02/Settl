# Deploy Subgraph to The Graph Studio

## Steps:

1. **Deploy Contract to Polygon Amoy:**
   ```bash
   cd contracts
   # Add your private key to .env file
   npm run deploy:amoy
   npm run export
   ```

2. **Update subgraph.yaml with deployed contract address:**
   - Copy the address from `contracts/artifacts-export/address.json`
   - Replace "YOUR_DEPLOYED_CONTRACT_ADDRESS" in `subgraph/subgraph.yaml`

3. **Install Graph CLI globally:**
   ```bash
   npm install -g @graphprotocol/graph-cli
   ```

4. **Authenticate with The Graph Studio:**
   ```bash
   cd subgraph
   graph auth --studio YOUR_DEPLOY_KEY
   ```

5. **Deploy to Studio:**
   ```bash
   graph codegen
   graph build
   graph deploy --studio splitwisex-ledger
   ```

6. **Update web app .env.local:**
   ```
   NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/YOUR_ID/splitwisex-ledger/v0.0.1
   NEXT_PUBLIC_LEDGER_ADDRESS=YOUR_DEPLOYED_CONTRACT_ADDRESS
   ```

## Resources:
- [The Graph Studio](https://thegraph.com/studio/)
- [Polygon Amoy Faucet](https://faucet.polygon.technology/)
- [Polygon Amoy Explorer](https://amoy.polygonscan.com/)