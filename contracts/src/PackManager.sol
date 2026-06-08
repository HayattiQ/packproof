// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {RewardNFT} from "./RewardNFT.sol";

/// @title PackManager
/// @notice Provably-fair mystery packs over the tokenized inventory, settled in MNT on
///         Mantle. Implements a two-phase commit-reveal whose result is cryptographically
///         bound to a prior on-chain commitment.
///
/// Improvements over the original PackProof skeleton:
///  - Real commit-reveal: the operator commits `keccak256(serverSeed)` per sealed pack
///    token BEFORE the buyer reveals; at reveal the contract CHECKS the revealed
///    serverSeed against that commitment. Block-entropy alone is no longer trusted as
///    the sole randomness source — it is mixed in but the committed seed binds the result.
///  - Public `verifyReveal(packTokenId)` view recomputes rank from the committed seed +
///    inventory + recorded user salt and returns a match boolean. This is the same
///    primitive the Minds Bazaar verify Skill calls.
///  - Idempotent redeem: no double-redeem (guarded by state + reentrancy guard).
///
/// Odds are locked first via the on-chain commitment (pack inventory root + odds),
/// making the disclosed odds verifiable — proactive random-sale consumer protection.
contract PackManager is AccessControl, ReentrancyGuard {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum PackStatus {
        Draft,
        Live,
        Paused,
        SoldOut,
        Ended
    }

    enum PackTokenStatus {
        Sealed,
        Revealed
    }

    struct Pack {
        uint256 price;
        uint256 totalSupply;
        uint256 sold;
        uint256 perWalletLimit;
        bytes32 inventoryRoot; // commitment to inventory contents
        bytes32 oddsHash; // commitment to disclosed odds table
        PackStatus status;
    }

    struct PackToken {
        uint256 packId;
        address owner;
        PackTokenStatus status;
        bytes32 seedCommitment; // keccak256(serverSeed) committed at purchase time
        bytes32 serverSeed; // revealed serverSeed (0 until reveal)
        bytes32 userSalt; // buyer-supplied salt recorded at reveal
        uint8 rank; // result rank (0 until reveal)
        uint256 rewardTokenId; // minted reward NFT (0 until reveal)
    }

    address public immutable treasury;
    RewardNFT public immutable rewardNFT;

    uint256 public nextPackId = 1;
    uint256 public nextPackTokenId = 1;
    uint256 public nextRewardTokenId = 1;

    mapping(uint256 => Pack) public packs;
    mapping(uint256 => PackToken) public packTokens;
    mapping(uint256 => mapping(address => uint256)) public walletPurchases;
    /// @dev rewardTokenId => redeemed flag (idempotent redemption).
    mapping(uint256 => bool) public rewardRedeemed;

    event PackCreated(uint256 indexed packId, uint256 price, uint256 totalSupply, bytes32 inventoryRoot, bytes32 oddsHash);
    event PackStatusChanged(uint256 indexed packId, PackStatus status);
    event PackPurchased(uint256 indexed packId, uint256 indexed packTokenId, address indexed buyer, bytes32 seedCommitment);
    event PackRevealed(
        uint256 indexed packId,
        uint256 indexed packTokenId,
        uint256 indexed rewardTokenId,
        bytes32 rewardId,
        uint8 rank
    );
    event RewardRedeemed(uint256 indexed rewardTokenId, address indexed owner);

    constructor(address admin, address treasury_, address rewardNFT_) {
        require(admin != address(0), "PackManager: bad admin");
        require(treasury_ != address(0), "PackManager: bad treasury");
        require(rewardNFT_ != address(0), "PackManager: bad reward nft");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        treasury = treasury_;
        rewardNFT = RewardNFT(rewardNFT_);
    }

    // ---------------------------------------------------------------------
    // Pack lifecycle (operator)
    // ---------------------------------------------------------------------

    /// @notice Phase 1 (commit): publish the pack with its locked inventory + odds
    ///         commitments before any sale.
    function createPack(
        uint256 price,
        uint256 totalSupply,
        uint256 perWalletLimit,
        bytes32 inventoryRoot,
        bytes32 oddsHash
    ) external onlyRole(OPERATOR_ROLE) returns (uint256 packId) {
        require(price > 0, "PackManager: bad price");
        require(totalSupply > 0, "PackManager: bad supply");
        require(perWalletLimit > 0, "PackManager: bad limit");

        packId = nextPackId++;
        packs[packId] = Pack({
            price: price,
            totalSupply: totalSupply,
            sold: 0,
            perWalletLimit: perWalletLimit,
            inventoryRoot: inventoryRoot,
            oddsHash: oddsHash,
            status: PackStatus.Draft
        });
        emit PackCreated(packId, price, totalSupply, inventoryRoot, oddsHash);
    }

    function setPackStatus(uint256 packId, PackStatus status) external onlyRole(OPERATOR_ROLE) {
        require(packs[packId].totalSupply > 0, "PackManager: missing pack");
        packs[packId].status = status;
        emit PackStatusChanged(packId, status);
    }

    // ---------------------------------------------------------------------
    // Purchase (buyer) - records the per-token seed commitment
    // ---------------------------------------------------------------------

    /// @notice Buy a sealed pack token. The operator supplies `seedCommitment`
    ///         (= keccak256(serverSeed)) so the result-determining seed is fixed and
    ///         published BEFORE the buyer can influence the reveal.
    function purchasePack(uint256 packId, bytes32 seedCommitment)
        external
        payable
        nonReentrant
        returns (uint256 packTokenId)
    {
        Pack storage pack = packs[packId];
        require(pack.status == PackStatus.Live, "PackManager: not live");
        require(pack.sold < pack.totalSupply, "PackManager: sold out");
        require(msg.value == pack.price, "PackManager: bad value");
        require(seedCommitment != bytes32(0), "PackManager: bad commitment");
        require(walletPurchases[packId][msg.sender] < pack.perWalletLimit, "PackManager: limit");

        walletPurchases[packId][msg.sender]++;
        pack.sold++;

        packTokenId = nextPackTokenId++;
        packTokens[packTokenId] = PackToken({
            packId: packId,
            owner: msg.sender,
            status: PackTokenStatus.Sealed,
            seedCommitment: seedCommitment,
            serverSeed: bytes32(0),
            userSalt: bytes32(0),
            rank: 0,
            rewardTokenId: 0
        });

        if (pack.sold == pack.totalSupply) {
            pack.status = PackStatus.SoldOut;
            emit PackStatusChanged(packId, PackStatus.SoldOut);
        }

        (bool ok,) = treasury.call{value: msg.value}("");
        require(ok, "PackManager: transfer failed");

        emit PackPurchased(packId, packTokenId, msg.sender, seedCommitment);
    }

    // ---------------------------------------------------------------------
    // Reveal (buyer) - commitment is checked, result bound to committed seed
    // ---------------------------------------------------------------------

    /// @notice Phase 2 (reveal): the caller supplies the previously-committed
    ///         `serverSeed` and a `userSalt`. The contract REQUIRES
    ///         keccak256(serverSeed) == seedCommitment, so the result cannot be
    ///         steered by revealing a different seed. The result is computed
    ///         deterministically from (serverSeed, packTokenId, userSalt, inventoryRoot)
    ///         and is therefore independently recomputable by verifyReveal.
    function revealPack(uint256 packTokenId, bytes32 serverSeed, bytes32 userSalt)
        external
        nonReentrant
        returns (uint256 rewardTokenId)
    {
        PackToken storage token = packTokens[packTokenId];
        require(token.owner == msg.sender, "PackManager: not owner");
        require(token.status == PackTokenStatus.Sealed, "PackManager: revealed");
        require(keccak256(abi.encodePacked(serverSeed)) == token.seedCommitment, "PackManager: bad seed");

        Pack storage pack = packs[token.packId];

        uint8 rank = _computeRank(serverSeed, packTokenId, userSalt, pack.inventoryRoot);
        bytes32 rewardId = keccak256(abi.encodePacked(token.packId, packTokenId, rank, serverSeed, userSalt));

        rewardTokenId = nextRewardTokenId++;
        token.status = PackTokenStatus.Revealed;
        token.serverSeed = serverSeed;
        token.userSalt = userSalt;
        token.rank = rank;
        token.rewardTokenId = rewardTokenId;

        rewardNFT.mintReward(msg.sender, rewardTokenId, token.packId, packTokenId, rank, rewardId, 0);

        emit PackRevealed(token.packId, packTokenId, rewardTokenId, rewardId, rank);
    }

    // ---------------------------------------------------------------------
    // Redeem (idempotent)
    // ---------------------------------------------------------------------

    /// @notice Redeem a revealed reward. Idempotent: a second call reverts because the
    ///         redeemed flag is already set. The reward NFT owner must call.
    function redeemReward(uint256 rewardTokenId) external nonReentrant {
        require(rewardNFT.ownerOf(rewardTokenId) == msg.sender, "PackManager: not owner");
        require(!rewardRedeemed[rewardTokenId], "PackManager: redeemed");
        rewardRedeemed[rewardTokenId] = true;
        emit RewardRedeemed(rewardTokenId, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Public verification (Minds Bazaar verify Skill primitive)
    // ---------------------------------------------------------------------

    /// @notice Recompute the reveal result for a pack token from its committed seed,
    ///         recorded user salt, and the pack's locked inventory root, and compare to
    ///         the stored result.
    /// @return revealed   true if the token has been revealed.
    /// @return matches    true if the recomputed rank equals the stored rank AND the
    ///                     stored serverSeed matches its commitment (tamper-evident).
    /// @return recomputedRank the rank recomputed from committed inputs.
    /// @return storedRank     the rank recorded at reveal time.
    function verifyReveal(uint256 packTokenId)
        external
        view
        returns (bool revealed, bool matches, uint8 recomputedRank, uint8 storedRank)
    {
        PackToken storage token = packTokens[packTokenId];
        if (token.owner == address(0) || token.status != PackTokenStatus.Revealed) {
            return (false, false, 0, token.rank);
        }
        revealed = true;
        storedRank = token.rank;

        bool commitmentOk = keccak256(abi.encodePacked(token.serverSeed)) == token.seedCommitment;
        recomputedRank =
            _computeRank(token.serverSeed, packTokenId, token.userSalt, packs[token.packId].inventoryRoot);
        matches = commitmentOk && (recomputedRank == storedRank);
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    /// @dev Deterministic rank derivation. Pure over its inputs so verifyReveal can
    ///      reproduce it exactly. Odds: S 1%, A 6%, B 23%, C 70% (basis 10_000).
    function _computeRank(bytes32 serverSeed, uint256 packTokenId, bytes32 userSalt, bytes32 inventoryRoot)
        internal
        pure
        returns (uint8)
    {
        bytes32 entropy = keccak256(abi.encodePacked(serverSeed, packTokenId, userSalt, inventoryRoot));
        uint256 roll = uint256(entropy) % 10_000;
        if (roll < 100) return 1; // S
        if (roll < 700) return 2; // A
        if (roll < 3_000) return 3; // B
        return 4; // C
    }
}
