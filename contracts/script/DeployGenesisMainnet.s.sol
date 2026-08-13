// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {GenesisPass} from "../src/GenesisPass.sol";

/// @notice Deploys GENESIS PASS to Base mainnet. Run ONLY after the Base Sepolia
/// deployment has been exercised end-to-end from the BaseMint UI.
/// Never hardcodes a private key — signing uses Foundry's encrypted keystore
/// (`--account deployer`) or a hardware/ledger flag.
contract DeployGenesisMainnet is Script {
    function run() external {
        require(block.chainid == 8453, "not Base mainnet");

        address owner = vm.envAddress("GENESIS_OWNER");
        address treasury = vm.envAddress("TREASURY_WALLET");
        string memory baseURI = vm.envString("GENESIS_BASE_URI");
        uint64 mintStart = uint64(vm.envUint("GENESIS_MINT_START"));
        uint64 duration = uint64(vm.envOr("GENESIS_MINT_DURATION", uint256(7 days)));
        uint256 price = vm.envOr("GENESIS_PRICE_WEI", uint256(0.0005 ether));
        uint96 royaltyBps = uint96(vm.envOr("GENESIS_ROYALTY_BPS", uint256(500)));

        require(owner != address(0) && treasury != address(0), "addr=0");
        require(price == 0.0005 ether, "price != agreed 0.0005 ETH");
        require(duration == 7 days, "duration != agreed 7 days");
        require(royaltyBps == 500, "royalty != agreed 5%");

        vm.startBroadcast();
        GenesisPass pass = new GenesisPass(
            "Resident Labs // GENESIS PASS",
            "GENESIS",
            baseURI,
            owner,
            treasury,
            price,
            mintStart,
            duration,
            royaltyBps
        );
        vm.stopBroadcast();

        console2.log("chain:            base (8453)");
        console2.log("GenesisPass:     ", address(pass));
        console2.log("owner:           ", owner);
        console2.log("treasury:        ", treasury);
        console2.log("mintStart:       ", mintStart);
        console2.log("mintEnd:         ", pass.mintEnd());
        console2.log("Set VITE_GENESIS_CONTRACT to the GenesisPass address above.");
    }
}
