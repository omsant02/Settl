// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/SplitWiseApp.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Namehash for settl.eth: 0x5e7a2404413ef7af1ee4ebad429d79858096091c273e7a78082c724312d8d99a
        bytes32 rootNode = 0x5e7a2404413ef7af1ee4ebad429d79858096091c273e7a78082c724312d8d99a;
        
        vm.startBroadcast(deployerPrivateKey);
        
        SplitWiseApp splitwise = new SplitWiseApp(rootNode, deployer);
        
        vm.stopBroadcast();
        
        console.log("SplitWiseApp deployed to:", address(splitwise));
        console.log("Owner:", splitwise.owner());
        console.log("Root Node:", vm.toString(splitwise.rootNode()));
        
        // Post-deployment instructions
        console.log("\nNEXT STEPS:");
        console.log("1. Go to https://sepolia.app.ens.domains");
        console.log("2. Transfer ownership of settl.eth to:", address(splitwise));
        console.log("3. Test with: cast call", address(splitwise), "registerUser(string)" "alice");
    }
}