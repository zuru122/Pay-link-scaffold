// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Deploy script: broadcasts PaymentLink deployment to Monad Testnet
import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/PaymentLink.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        PaymentLink paymentLink = new PaymentLink();
        console.log("Deployed at:", address(paymentLink));
        vm.stopBroadcast();
    }
}