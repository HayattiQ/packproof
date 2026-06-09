// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IExternalCardNFT
/// @notice Minimal interface the marketplace / pack manager / chain client rely on
///         to read custody and redemption state of a tokenized real-world card.
interface IExternalCardNFT {
    /// @notice Two honest custody tiers, both first-class.
    /// - NonCustodial: card stays with owner; NFT is an authenticity/provenance
    ///   attestation only and is NOT marketplace-tradable.
    /// - Custodial: physical card is vaulted; NFT is redeemable 1:1 and is the
    ///   ONLY tier eligible for marketplace listing/sale.
    enum CustodyState {
        NonCustodial,
        Custodial
    }

    enum RedemptionState {
        Active,
        Redeemed
    }

    /// @notice Returns true only when the token may be listed/sold on the marketplace
    ///         (custodial tier AND not redeemed). The binding digital <-> physical is
    ///         never misrepresented because non-custodial tokens are gated out here.
    function isListingEligible(uint256 tokenId) external view returns (bool);

    function custodyOf(uint256 tokenId) external view returns (CustodyState);

    function redemptionOf(uint256 tokenId) external view returns (RedemptionState);

    function ownerOf(uint256 tokenId) external view returns (address);

    /// @notice cert number -> tokenId (0 if not yet tokenized). Enforces uniqueness.
    function tokenIdForCert(bytes32 certHash) external view returns (uint256);
}
