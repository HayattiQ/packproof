// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PackManager} from "../src/PackManager.sol";
import {RewardNFT} from "../src/RewardNFT.sol";

contract PackManagerTest is Test {
    PackManager internal mgr;
    RewardNFT internal reward;

    address internal admin = address(0xA11CE);
    address internal treasury = address(0x7777);
    address internal buyer = address(0xB0B);

    bytes32 internal constant INV_ROOT = keccak256("inventory-root");
    bytes32 internal constant ODDS_HASH = keccak256("odds:S1-A6-B23-C70");
    bytes32 internal constant SERVER_SEED = keccak256("server-seed-secret");
    bytes32 internal constant USER_SALT = keccak256("user-salt");

    function setUp() public {
        reward = new RewardNFT(admin);
        mgr = new PackManager(admin, treasury, address(reward));
        bytes32 minterRole = reward.MINTER_ROLE();
        vm.prank(admin);
        reward.grantRole(minterRole, address(mgr));
        vm.deal(buyer, 100 ether);
    }

    function _livePack() internal returns (uint256 packId) {
        vm.startPrank(admin);
        packId = mgr.createPack(1 ether, 10, 5, INV_ROOT, ODDS_HASH);
        mgr.setPackStatus(packId, PackManager.PackStatus.Live);
        vm.stopPrank();
    }

    function _commitment(bytes32 seed) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(seed));
    }

    function test_purchaseRevealRedeem_happyPath() public {
        uint256 packId = _livePack();
        vm.prank(buyer);
        uint256 ptId = mgr.purchasePack{value: 1 ether}(packId, _commitment(SERVER_SEED));
        assertEq(treasury.balance, 1 ether);

        vm.prank(buyer);
        uint256 rid = mgr.revealPack(ptId, SERVER_SEED, USER_SALT);
        assertEq(reward.ownerOf(rid), buyer);

        // verifyReveal happy path
        (bool revealed, bool matches, uint8 rc, uint8 rs) = mgr.verifyReveal(ptId);
        assertTrue(revealed);
        assertTrue(matches);
        assertEq(rc, rs);

        // redeem idempotency
        vm.prank(buyer);
        mgr.redeemReward(rid);
        assertTrue(mgr.rewardRedeemed(rid));
        vm.prank(buyer);
        vm.expectRevert("PackManager: redeemed");
        mgr.redeemReward(rid);
    }

    // --- commit-reveal: wrong seed is rejected ---
    function test_revertWhen_revealWrongSeed() public {
        uint256 packId = _livePack();
        vm.prank(buyer);
        uint256 ptId = mgr.purchasePack{value: 1 ether}(packId, _commitment(SERVER_SEED));

        vm.prank(buyer);
        vm.expectRevert("PackManager: bad seed");
        mgr.revealPack(ptId, keccak256("attacker-chosen-seed"), USER_SALT);
    }

    // --- verifyReveal tamper path: stored seed mutated breaks the match ---
    function test_verifyReveal_tamperDetected() public {
        uint256 packId = _livePack();
        vm.prank(buyer);
        uint256 ptId = mgr.purchasePack{value: 1 ether}(packId, _commitment(SERVER_SEED));
        vm.prank(buyer);
        mgr.revealPack(ptId, SERVER_SEED, USER_SALT);

        // Locate the stored serverSeed slot by scanning the PackToken struct slots and
        // overwrite it with a different value. This does not depend on the exact base
        // storage layout of inherited contracts: we search a window of slots for the
        // known SERVER_SEED value and tamper it.
        bool tampered;
        // Scan candidate mapping slots and struct offsets for the known seed value.
        for (uint256 mapSlot = 0; mapSlot < 16 && !tampered; mapSlot++) {
            uint256 base = uint256(keccak256(abi.encode(ptId, mapSlot)));
            for (uint256 off = 0; off < 8; off++) {
                bytes32 slot = bytes32(base + off);
                if (vm.load(address(mgr), slot) == SERVER_SEED) {
                    vm.store(address(mgr), slot, keccak256("tampered-seed"));
                    tampered = true;
                    break;
                }
            }
        }
        assertTrue(tampered, "serverSeed slot not found");

        (bool revealed, bool matches,,) = mgr.verifyReveal(ptId);
        assertTrue(revealed);
        // commitment check now fails AND recomputed rank diverges -> mismatch
        assertFalse(matches);
    }

    // --- verifyReveal on a sealed (unrevealed) token ---
    function test_verifyReveal_unrevealed() public {
        uint256 packId = _livePack();
        vm.prank(buyer);
        uint256 ptId = mgr.purchasePack{value: 1 ether}(packId, _commitment(SERVER_SEED));
        (bool revealed, bool matches,,) = mgr.verifyReveal(ptId);
        assertFalse(revealed);
        assertFalse(matches);
    }

    function test_revertWhen_revealNotOwner() public {
        uint256 packId = _livePack();
        vm.prank(buyer);
        uint256 ptId = mgr.purchasePack{value: 1 ether}(packId, _commitment(SERVER_SEED));
        vm.prank(address(0xDEAD));
        vm.expectRevert("PackManager: not owner");
        mgr.revealPack(ptId, SERVER_SEED, USER_SALT);
    }

    function test_revertWhen_doubleReveal() public {
        uint256 packId = _livePack();
        vm.prank(buyer);
        uint256 ptId = mgr.purchasePack{value: 1 ether}(packId, _commitment(SERVER_SEED));
        vm.prank(buyer);
        mgr.revealPack(ptId, SERVER_SEED, USER_SALT);
        vm.prank(buyer);
        vm.expectRevert("PackManager: revealed");
        mgr.revealPack(ptId, SERVER_SEED, USER_SALT);
    }

    function test_revertWhen_purchaseNotLive() public {
        vm.prank(admin);
        uint256 packId = mgr.createPack(1 ether, 10, 5, INV_ROOT, ODDS_HASH);
        vm.prank(buyer);
        vm.expectRevert("PackManager: not live");
        mgr.purchasePack{value: 1 ether}(packId, _commitment(SERVER_SEED));
    }

    function test_revertWhen_perWalletLimit() public {
        vm.startPrank(admin);
        uint256 packId = mgr.createPack(1 ether, 10, 1, INV_ROOT, ODDS_HASH);
        mgr.setPackStatus(packId, PackManager.PackStatus.Live);
        vm.stopPrank();

        vm.prank(buyer);
        mgr.purchasePack{value: 1 ether}(packId, _commitment(SERVER_SEED));
        vm.prank(buyer);
        vm.expectRevert("PackManager: limit");
        mgr.purchasePack{value: 1 ether}(packId, _commitment(keccak256("seed2")));
    }

}
