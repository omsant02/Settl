// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/SplitWiseApp.sol";

contract DeployFilecoinScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying to Filecoin Calibration testnet...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        // For Filecoin, we'll use a custom root node since ENS might not be available
        // You can create your own domain or use a placeholder
        bytes32 rootNode = keccak256(abi.encodePacked("splitwise.fil"));
        
        vm.startBroadcast(deployerPrivateKey);
        
        SplitWiseApp splitwise = new SplitWiseApp(rootNode, deployer);
        
        vm.stopBroadcast();
        
        console.log("\n=== DEPLOYMENT SUCCESSFUL ===");
        console.log("SplitWiseApp deployed to:", address(splitwise));
        console.log("Owner:", splitwise.owner());
        console.log("Root Node:", vm.toString(splitwise.rootNode()));
        console.log("Network: Filecoin Calibration");
        console.log("Chain ID: 314159");
        
        // Post-deployment instructions for Filecoin
        console.log("\nNEXT STEPS FOR FILECOIN:");
        console.log("1. Note: ENS functionality will be limited on Filecoin");
        console.log("2. Consider using admin registration instead: adminRegisterUser()");
        console.log("3. Test with admin registration:");
        console.log("   cast send", address(splitwise), "adminRegisterUser(string,address)" "alice" "0xYourTestAddress" "--rpc-url filecoin-calibration --private-key $PRIVATE_KEY");
        console.log("4. Verify deployment:");
        console.log("   cast call", address(splitwise), "owner()" "--rpc-url filecoin-calibration");
    }
}