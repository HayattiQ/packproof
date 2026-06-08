// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AttestationLog} from "../src/AttestationLog.sol";
import {ExternalCardNFT} from "../src/ExternalCardNFT.sol";
import {RewardNFT} from "../src/RewardNFT.sol";
import {PackManager} from "../src/PackManager.sol";

/// @title Deploy
/// @notice Deploys the full PackProof contract set to Mantle Sepolia (chainId 5003)
///         and wires the cross-contract roles.
///
/// Usage:
///   forge script contracts/script/Deploy.s.sol:Deploy \
///     --rpc-url mantle_sepolia --broadcast --verify
///
/// Required env:
///   PRIVATE_KEY            deployer key (also becomes admin/operator)
///   TREASURY_ADDRESS       pack sale proceeds recipient (defaults to deployer)
contract Deploy is Script {
    uint256 internal constant MANTLE_SEPOLIA = 5003;

    function run()
        external
        returns (
            AttestationLog attestationLog,
            ExternalCardNFT externalCard,
            RewardNFT rewardNFT,
            PackManager packManager
        )
    {
        // Target-chain awareness: warn (do not hard-revert) so the same script works
        // for local anvil dry-runs.
        if (block.chainid != MANTLE_SEPOLIA) {
            console2.log("WARNING: not on Mantle Sepolia (5003). chainid =", block.chainid);
        }

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(pk);
        address treasury = vm.envOr("TREASURY_ADDRESS", admin);

        vm.startBroadcast(pk);

        attestationLog = new AttestationLog(admin);
        externalCard = new ExternalCardNFT(admin);
        rewardNFT = new RewardNFT(admin);
        packManager = new PackManager(admin, treasury, address(rewardNFT));

        // Allow the PackManager to mint reward NFTs.
        rewardNFT.grantRole(rewardNFT.MINTER_ROLE(), address(packManager));

        vm.stopBroadcast();

        console2.log("AttestationLog:", address(attestationLog));
        console2.log("ExternalCardNFT:", address(externalCard));
        console2.log("RewardNFT:", address(rewardNFT));
        console2.log("PackManager:", address(packManager));
        console2.log("Treasury:", treasury);
    }
}
