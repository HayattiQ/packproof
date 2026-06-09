// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AttestationLog} from "../src/AttestationLog.sol";
import {ExternalCardNFT} from "../src/ExternalCardNFT.sol";
import {RewardNFT} from "../src/RewardNFT.sol";
import {PackManager} from "../src/PackManager.sol";
import {IExternalCardNFT} from "../src/interfaces/IExternalCardNFT.sol";

/// @notice End-to-end flow mirroring the deploy wiring and the judged demo:
/// AI authentication -> external NFT mint (cert unique) -> attestation hash on-chain
/// -> custody gate -> redeem; then pack commit -> purchase -> reveal -> verifyReveal
/// -> redeem (idempotent).
contract PackProofIntegrationTest is Test {
    AttestationLog internal attLog;
    ExternalCardNFT internal card;
    RewardNFT internal reward;
    PackManager internal mgr;

    address internal admin = address(0xA11CE);
    address internal treasury = address(0x7777);
    address internal collector = address(0xC0117EC);
    address internal buyer = address(0xB0B);

    function setUp() public {
        vm.startPrank(admin);
        attLog = new AttestationLog(admin);
        card = new ExternalCardNFT(admin);
        reward = new RewardNFT(admin);
        mgr = new PackManager(admin, treasury, address(reward));
        reward.grantRole(reward.MINTER_ROLE(), address(mgr));
        vm.stopPrank();

        vm.deal(buyer, 100 ether);
    }

    function test_fullRwaAndPackFlow() public {
        // 1. AI Authentication Agent records its report hash on-chain BEFORE mint.
        bytes32 certHash = keccak256("PSA-CERT-12345678");
        vm.prank(admin);
        attLog.recordAgentLog(
            keccak256("AuthAgent-v1"),
            0, // subjectKind = card
            0, // subjectId unknown pre-mint; could be cert-derived
            keccak256("photos+cert"),
            keccak256("auth-report:passed,risk=0.02,grade=9.5"),
            96
        );

        // 2. Eligible card minted as a custodial (vaulted, tradable) external NFT.
        vm.prank(admin);
        uint256 tokenId = card.mintCard(
            collector,
            certHash,
            keccak256("PSA_GRADED_CARD"),
            keccak256("Charizard-Base-4"),
            95,
            keccak256("auth-report:passed,risk=0.02,grade=9.5"),
            420e18,
            580e18,
            IExternalCardNFT.CustodyState.Custodial
        );
        assertEq(card.ownerOf(tokenId), collector);
        assertTrue(card.isListingEligible(tokenId)); // custodial => listable

        // 3. Pricing Agent updates valuation, hash logged.
        vm.startPrank(admin);
        card.updateValuation(tokenId, 450e18, 600e18, keccak256("pricing-report-v2"));
        attLog.recordAgentLog(
            keccak256("PricingAgent-v1"), 0, tokenId, keccak256("comps"), keccak256("pricing-report-v2"), 90
        );
        vm.stopPrank();

        // 4. Collector redeems the physical card -> NFT burned, terminal.
        vm.prank(collector);
        card.redeem(tokenId);
        assertFalse(card.isListingEligible(tokenId));

        // 5. Provably-fair pack: commit (createPack) then go live.
        bytes32 invRoot = keccak256("inv-root");
        bytes32 serverSeed = keccak256("server-seed");
        vm.startPrank(admin);
        uint256 packId = mgr.createPack(2 ether, 5, 3, invRoot, keccak256("odds"));
        mgr.setPackStatus(packId, PackManager.PackStatus.Live);
        vm.stopPrank();

        // 6. Buyer purchases sealed pack with the operator's seed commitment.
        bytes32 commitment = keccak256(abi.encodePacked(serverSeed));
        vm.prank(buyer);
        uint256 ptId = mgr.purchasePack{value: 2 ether}(packId, commitment);
        assertEq(treasury.balance, 2 ether);

        // 7. Reveal binds to the committed seed; verifyReveal confirms.
        vm.prank(buyer);
        uint256 rid = mgr.revealPack(ptId, serverSeed, keccak256("salt"));
        (bool revealed, bool matches,,) = mgr.verifyReveal(ptId);
        assertTrue(revealed);
        assertTrue(matches);
        assertEq(reward.ownerOf(rid), buyer);

        // 8. Idempotent redeem.
        vm.prank(buyer);
        mgr.redeemReward(rid);
        vm.prank(buyer);
        vm.expectRevert("PackManager: redeemed");
        mgr.redeemReward(rid);

        // attestation attLog accumulated two entries
        assertEq(attLog.logCount(), 2);
    }
}
