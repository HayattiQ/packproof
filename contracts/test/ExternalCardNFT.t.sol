// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ExternalCardNFT} from "../src/ExternalCardNFT.sol";
import {IExternalCardNFT} from "../src/interfaces/IExternalCardNFT.sol";

contract ExternalCardNFTTest is Test {
    ExternalCardNFT internal card;
    address internal admin = address(0xA11CE);
    address internal alice = address(0xA1);
    address internal bob = address(0xB0B);

    bytes32 internal constant ASSET_CLASS = keccak256("PSA_GRADED_CARD");

    function setUp() public {
        card = new ExternalCardNFT(admin);
    }

    function _mint(address to, bytes32 certHash, IExternalCardNFT.CustodyState custody)
        internal
        returns (uint256 tokenId)
    {
        vm.prank(admin);
        tokenId = card.mintCard(
            to,
            certHash,
            ASSET_CLASS,
            keccak256("Charizard-Base-4"),
            95,
            keccak256("auth-report-v1"),
            100e18,
            150e18,
            custody
        );
    }

    function test_mint_setsStateAndReportHash() public {
        uint256 id = _mint(alice, keccak256("CERT-1"), IExternalCardNFT.CustodyState.Custodial);
        assertEq(card.ownerOf(id), alice);
        assertEq(card.tokenIdForCert(keccak256("CERT-1")), id);
        ExternalCardNFT.CardData memory c = card.getCard(id);
        assertEq(c.reportHash, keccak256("auth-report-v1"));
        assertEq(uint8(c.custody), uint8(IExternalCardNFT.CustodyState.Custodial));
    }

    // --- cert uniqueness ---
    function test_revertWhen_duplicateCert() public {
        _mint(alice, keccak256("CERT-DUP"), IExternalCardNFT.CustodyState.Custodial);
        vm.prank(admin);
        vm.expectRevert("ExternalCardNFT: cert exists");
        card.mintCard(
            bob,
            keccak256("CERT-DUP"),
            ASSET_CLASS,
            keccak256("other"),
            90,
            keccak256("r"),
            1,
            2,
            IExternalCardNFT.CustodyState.Custodial
        );
    }

    // --- custody / listing gate ---
    function test_listingGate_custodialEligible() public {
        uint256 id = _mint(alice, keccak256("CERT-C"), IExternalCardNFT.CustodyState.Custodial);
        assertTrue(card.isListingEligible(id));
    }

    function test_listingGate_nonCustodialNotEligible() public {
        uint256 id = _mint(alice, keccak256("CERT-NC"), IExternalCardNFT.CustodyState.NonCustodial);
        assertFalse(card.isListingEligible(id));
    }

    function test_upgradeToCustodial_makesEligible() public {
        uint256 id = _mint(alice, keccak256("CERT-U"), IExternalCardNFT.CustodyState.NonCustodial);
        assertFalse(card.isListingEligible(id));
        vm.prank(admin);
        card.upgradeToCustodial(id);
        assertTrue(card.isListingEligible(id));
    }

    function test_revertWhen_upgradeAlreadyCustodial() public {
        uint256 id = _mint(alice, keccak256("CERT-AC"), IExternalCardNFT.CustodyState.Custodial);
        vm.prank(admin);
        vm.expectRevert("ExternalCardNFT: already custodial");
        card.upgradeToCustodial(id);
    }

    // --- redeem burn/lock + idempotency ---
    function test_redeem_burnsAndIsTerminal() public {
        uint256 id = _mint(alice, keccak256("CERT-R"), IExternalCardNFT.CustodyState.Custodial);
        vm.prank(alice);
        card.redeem(id);
        // token burned -> ownerOf reverts
        vm.expectRevert();
        card.ownerOf(id);
        // redemption state still readable from stored data
        assertEq(uint8(card.redemptionOf(id)), uint8(IExternalCardNFT.RedemptionState.Redeemed));
        // no longer listing-eligible
        assertFalse(card.isListingEligible(id));
    }

    function test_revertWhen_doubleRedeem() public {
        uint256 id = _mint(alice, keccak256("CERT-DR"), IExternalCardNFT.CustodyState.Custodial);
        vm.prank(alice);
        card.redeem(id);
        // second redeem reverts (token no longer exists)
        vm.prank(alice);
        vm.expectRevert();
        card.redeem(id);
    }

    function test_revertWhen_redeemNonCustodial() public {
        uint256 id = _mint(alice, keccak256("CERT-NCR"), IExternalCardNFT.CustodyState.NonCustodial);
        vm.prank(alice);
        vm.expectRevert("ExternalCardNFT: not custodial");
        card.redeem(id);
    }

    function test_revertWhen_redeemNotOwner() public {
        uint256 id = _mint(alice, keccak256("CERT-NO"), IExternalCardNFT.CustodyState.Custodial);
        vm.prank(bob);
        vm.expectRevert("ExternalCardNFT: not owner");
        card.redeem(id);
    }

    function test_updateValuation() public {
        uint256 id = _mint(alice, keccak256("CERT-V"), IExternalCardNFT.CustodyState.Custodial);
        vm.prank(admin);
        card.updateValuation(id, 200e18, 300e18, keccak256("pricing-report-v2"));
        ExternalCardNFT.CardData memory c = card.getCard(id);
        assertEq(c.valuationLow, 200e18);
        assertEq(c.valuationHigh, 300e18);
        assertEq(c.reportHash, keccak256("pricing-report-v2"));
    }
}
