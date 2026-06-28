// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {TokenFactory} from "../src/TokenFactory.sol";
import {NFTFactory} from "../src/NFTFactory.sol";

/// @notice Deploys TokenFactory + NFTFactory.
/// Usage:
///   forge script script/Deploy.s.sol:Deploy \
///     --rpc-url $BASE_SEPOLIA_RPC_URL --account deployer --broadcast --verify
contract Deploy is Script {
    function run() external {
        address treasury = vm.envAddress("TREASURY_WALLET");
        address owner = msg.sender;

        // 0.0001 ETH creation fee by default; 500 bps (5%) default mint fee
        uint256 creationFee = 0.0001 ether;
        uint96 defaultMintBps = 500;

        vm.startBroadcast();
        TokenFactory tokenFactory = new TokenFactory(owner, treasury, creationFee);
        NFTFactory nftFactory = new NFTFactory(owner, treasury, creationFee, defaultMintBps);
        vm.stopBroadcast();

        console2.log("TokenFactory:", address(tokenFactory));
        console2.log("NFTFactory:  ", address(nftFactory));
        console2.log("Treasury:    ", treasury);
    }
}
