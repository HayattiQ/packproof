// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IExternalCardNFT} from "./interfaces/IExternalCardNFT.sol";

/// @title ExternalCardNFT
/// @notice The RWA tokenization core: an ERC-721 registry where each token represents
///         a real, off-platform physical asset (a PSA-graded card) that passed the AI
///         authentication gate. "External" distinguishes these from internal pack-reward
///         NFTs.
///
/// Enforced on-chain invariants (the RWA-honesty gates):
///  1. Cert uniqueness     - the same PSA cert number can never be tokenized twice.
///  2. Two-tier custody     - NonCustodial (provenance/attestation only, NOT tradable)
///                            and Custodial (vaulted, redeemable 1:1, marketplace-listable).
///  3. Listing eligibility  - only Custodial + non-redeemed tokens are listing-eligible,
///                            so a token can never be sold without a guaranteed physical
///                            claim behind it.
///  4. Redeem burn/lock     - redeeming a custodial token (claiming the physical card)
///                            burns the NFT so the digital claim cannot outlive delivery.
///  5. Report hash on-chain - the AI authentication-report content hash is stored with
///                            the mint, making the AI decision verifiable/auditable.
///
/// The schema is asset-class-parameterized (`assetClass`) so additional RWA classes can
/// reuse this standard later (Path-A scalability), and the standard is exposed as a
/// composable building block other Mantle protocols can consume.
contract ExternalCardNFT is ERC721, AccessControl, IExternalCardNFT {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant CUSTODY_ROLE = keccak256("CUSTODY_ROLE");

    struct CardData {
        bytes32 certHash; // keccak256 of the PSA cert number; uniqueness key
        bytes32 assetClass; // e.g. keccak256("PSA_GRADED_CARD"); future-proofing
        bytes32 cardIdentity; // hash of card identity (set/number/player)
        uint16 grade; // PSA grade x10 (e.g. 95 == PSA 9.5); 0..100
        bytes32 reportHash; // hash of the off-chain AI authentication report
        uint128 valuationLow; // valuation snapshot, low bound (minor units)
        uint128 valuationHigh; // valuation snapshot, high bound (minor units)
        CustodyState custody;
        RedemptionState redemption;
    }

    uint256 private _nextTokenId = 1;

    mapping(uint256 => CardData) private _cards;
    /// @dev certHash => tokenId (0 means not tokenized). Enforces uniqueness.
    mapping(bytes32 => uint256) private _certToToken;

    event CardMinted(
        uint256 indexed tokenId,
        bytes32 indexed certHash,
        address indexed owner,
        CustodyState custody,
        bytes32 reportHash
    );
    event ValuationUpdated(uint256 indexed tokenId, uint128 valuationLow, uint128 valuationHigh, bytes32 reportHash);
    event CustodyUpgraded(uint256 indexed tokenId, CustodyState custody);
    event CardRedeemed(uint256 indexed tokenId, address indexed owner, bytes32 certHash);

    constructor(address admin) ERC721("PackProof External Card", "PPCARD") {
        require(admin != address(0), "ExternalCardNFT: bad admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(CUSTODY_ROLE, admin);
    }

    // ---------------------------------------------------------------------
    // Minting (gated by the AI authentication pipeline, off-chain, via MINTER_ROLE)
    // ---------------------------------------------------------------------

    /// @notice Mint an external NFT for a card that passed the AI authentication gate.
    /// @dev Caller (relayer/operator with MINTER_ROLE) is trusted to have run the
    ///      eligibility gate (PSA cross-check passed AND counterfeit-risk below
    ///      threshold). Cert uniqueness is enforced here, on-chain.
    function mintCard(
        address to,
        bytes32 certHash,
        bytes32 assetClass,
        bytes32 cardIdentity,
        uint16 grade,
        bytes32 reportHash,
        uint128 valuationLow,
        uint128 valuationHigh,
        CustodyState custody
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(to != address(0), "ExternalCardNFT: bad recipient");
        require(certHash != bytes32(0), "ExternalCardNFT: bad cert");
        require(_certToToken[certHash] == 0, "ExternalCardNFT: cert exists");
        require(grade <= 100, "ExternalCardNFT: bad grade");
        require(valuationHigh >= valuationLow, "ExternalCardNFT: bad valuation");

        tokenId = _nextTokenId++;
        _certToToken[certHash] = tokenId;
        _cards[tokenId] = CardData({
            certHash: certHash,
            assetClass: assetClass,
            cardIdentity: cardIdentity,
            grade: grade,
            reportHash: reportHash,
            valuationLow: valuationLow,
            valuationHigh: valuationHigh,
            custody: custody,
            redemption: RedemptionState.Active
        });

        _safeMint(to, tokenId);
        emit CardMinted(tokenId, certHash, to, custody, reportHash);
    }

    // ---------------------------------------------------------------------
    // Custody management
    // ---------------------------------------------------------------------

    /// @notice Upgrade a non-custodial provenance token to custodial after the holder
    ///         vaults the physical card. Only the platform custody operator may confirm
    ///         the vaulting, so a token cannot self-promote to "tradable".
    function upgradeToCustodial(uint256 tokenId) external onlyRole(CUSTODY_ROLE) {
        _requireOwned(tokenId);
        CardData storage c = _cards[tokenId];
        require(c.redemption == RedemptionState.Active, "ExternalCardNFT: redeemed");
        require(c.custody == CustodyState.NonCustodial, "ExternalCardNFT: already custodial");
        c.custody = CustodyState.Custodial;
        emit CustodyUpgraded(tokenId, CustodyState.Custodial);
    }

    /// @notice Update the valuation snapshot from the Pricing Agent and record the
    ///         report hash that justifies it.
    function updateValuation(uint256 tokenId, uint128 valuationLow, uint128 valuationHigh, bytes32 reportHash)
        external
        onlyRole(MINTER_ROLE)
    {
        _requireOwned(tokenId);
        require(valuationHigh >= valuationLow, "ExternalCardNFT: bad valuation");
        CardData storage c = _cards[tokenId];
        c.valuationLow = valuationLow;
        c.valuationHigh = valuationHigh;
        c.reportHash = reportHash;
        emit ValuationUpdated(tokenId, valuationLow, valuationHigh, reportHash);
    }

    // ---------------------------------------------------------------------
    // Redemption (burn/lock)
    // ---------------------------------------------------------------------

    /// @notice Redeem a custodial NFT for the underlying physical card. Burns the NFT
    ///         (so the digital claim cannot outlive physical delivery) and frees the
    ///         cert from the uniqueness registry is intentionally NOT done: the cert
    ///         stays bound so the same physical card cannot be re-tokenized while a
    ///         redemption is in flight. Only the token owner may redeem.
    /// @dev Idempotency: after burn the token no longer exists, so a second call
    ///      reverts on ownership check — double-redeem is impossible.
    function redeem(uint256 tokenId) external {
        address owner = ownerOf(tokenId); // reverts if burned/nonexistent
        require(owner == msg.sender, "ExternalCardNFT: not owner");
        CardData storage c = _cards[tokenId];
        require(c.custody == CustodyState.Custodial, "ExternalCardNFT: not custodial");
        require(c.redemption == RedemptionState.Active, "ExternalCardNFT: already redeemed");

        c.redemption = RedemptionState.Redeemed;
        bytes32 certHash = c.certHash;
        _burn(tokenId);
        emit CardRedeemed(tokenId, owner, certHash);
    }

    // ---------------------------------------------------------------------
    // Views relied on by the marketplace and chain client
    // ---------------------------------------------------------------------

    /// @inheritdoc IExternalCardNFT
    function isListingEligible(uint256 tokenId) public view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) return false; // burned / never minted
        CardData storage c = _cards[tokenId];
        return c.custody == CustodyState.Custodial && c.redemption == RedemptionState.Active;
    }

    /// @inheritdoc IExternalCardNFT
    function custodyOf(uint256 tokenId) external view returns (CustodyState) {
        _requireOwned(tokenId);
        return _cards[tokenId].custody;
    }

    /// @inheritdoc IExternalCardNFT
    function redemptionOf(uint256 tokenId) external view returns (RedemptionState) {
        // readable even for burned tokens via stored data; guard only nonexistent-never-minted
        require(_cards[tokenId].certHash != bytes32(0), "ExternalCardNFT: unknown token");
        return _cards[tokenId].redemption;
    }

    /// @inheritdoc IExternalCardNFT
    function tokenIdForCert(bytes32 certHash) external view returns (uint256) {
        return _certToToken[certHash];
    }

    function getCard(uint256 tokenId) external view returns (CardData memory) {
        require(_cards[tokenId].certHash != bytes32(0), "ExternalCardNFT: unknown token");
        return _cards[tokenId];
    }

    /// @inheritdoc IExternalCardNFT
    function ownerOf(uint256 tokenId) public view override(ERC721, IExternalCardNFT) returns (address) {
        return super.ownerOf(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
