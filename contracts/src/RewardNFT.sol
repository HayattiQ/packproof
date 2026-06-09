// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RewardNFT
/// @notice Internal pack-reward NFT minted by the PackManager on reveal. A reward may
///         reference an external (graded) card NFT from the tokenized inventory.
/// @dev Mint is gated to MINTER_ROLE (held by the PackManager). Distinct from
///      ExternalCardNFT: rewards are internal artifacts of the pack mechanic.
contract RewardNFT is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct RewardData {
        uint256 packId;
        uint256 packTokenId; // the sealed pack token that revealed this reward
        uint8 rank; // 1 = S (best) .. 4 = C
        bytes32 rewardId; // deterministic reward identity from the reveal
        uint256 externalCardId; // 0 if none; else the granted ExternalCardNFT tokenId
    }

    mapping(uint256 => RewardData) private _rewards;

    event RewardMinted(
        uint256 indexed tokenId,
        uint256 indexed packTokenId,
        address indexed owner,
        uint8 rank,
        bytes32 rewardId
    );

    constructor(address admin) ERC721("PackProof Reward", "PPREWARD") {
        require(admin != address(0), "RewardNFT: bad admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Mint a reward NFT. Only the PackManager (MINTER_ROLE) may call.
    function mintReward(
        address to,
        uint256 tokenId,
        uint256 packId,
        uint256 packTokenId,
        uint8 rank,
        bytes32 rewardId,
        uint256 externalCardId
    ) external onlyRole(MINTER_ROLE) {
        _rewards[tokenId] = RewardData({
            packId: packId,
            packTokenId: packTokenId,
            rank: rank,
            rewardId: rewardId,
            externalCardId: externalCardId
        });
        _safeMint(to, tokenId);
        emit RewardMinted(tokenId, packTokenId, to, rank, rewardId);
    }

    function getReward(uint256 tokenId) external view returns (RewardData memory) {
        _requireOwned(tokenId);
        return _rewards[tokenId];
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
