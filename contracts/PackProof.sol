// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PackProof contract skeleton
/// @notice Hackathon-oriented reference contract for sealed pack sales, reveals, rewards, and AI logs.
/// @dev Production deployment should split responsibilities, add audited ERC-721/1155 implementations,
/// VRF or stronger commit-reveal randomness, and thorough access-control review.
contract PackProof {
    enum PackStatus {
        Draft,
        Live,
        Paused,
        SoldOut,
        Ended
    }

    enum PackTokenStatus {
        Sealed,
        Opened
    }

    struct Pack {
        uint256 price;
        uint256 totalSupply;
        uint256 sold;
        uint256 perWalletLimit;
        bytes32 inventoryRoot;
        bytes32 probabilityHash;
        PackStatus status;
    }

    struct PackToken {
        uint256 packId;
        address owner;
        PackTokenStatus status;
    }

    struct Reward {
        uint256 packId;
        address owner;
        bytes32 rewardId;
        uint8 rank;
        bool redeemed;
    }

    struct AgentLog {
        bytes32 agentId;
        uint256 packId;
        bytes32 inputHash;
        bytes32 outputHash;
        uint8 score;
        uint256 timestamp;
    }

    address public immutable treasury;
    address public admin;

    uint256 public nextPackId = 1;
    uint256 public nextPackTokenId = 1;
    uint256 public nextRewardTokenId = 1;

    mapping(uint256 => Pack) public packs;
    mapping(uint256 => PackToken) public packTokens;
    mapping(uint256 => Reward) public rewards;
    mapping(uint256 => mapping(address => uint256)) public walletPurchases;
    AgentLog[] public agentLogs;

    event PackCreated(uint256 indexed packId, uint256 price, uint256 totalSupply);
    event PackStatusChanged(uint256 indexed packId, PackStatus status);
    event PackPurchased(uint256 indexed packId, uint256 indexed packTokenId, address indexed buyer);
    event PackRevealed(
        uint256 indexed packId,
        uint256 indexed packTokenId,
        uint256 indexed rewardTokenId,
        bytes32 rewardId,
        uint8 rank
    );
    event RewardRedeemed(uint256 indexed rewardTokenId, address indexed owner);
    event AgentLogRecorded(bytes32 indexed agentId, uint256 indexed packId, bytes32 outputHash, uint8 score);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    constructor(address treasury_) {
        require(treasury_ != address(0), "bad treasury");
        treasury = treasury_;
        admin = msg.sender;
    }

    function createPack(
        uint256 price,
        uint256 totalSupply,
        uint256 perWalletLimit,
        bytes32 inventoryRoot,
        bytes32 probabilityHash
    ) external onlyAdmin returns (uint256 packId) {
        require(price > 0, "bad price");
        require(totalSupply > 0, "bad supply");
        require(perWalletLimit > 0, "bad limit");

        packId = nextPackId++;
        packs[packId] = Pack({
            price: price,
            totalSupply: totalSupply,
            sold: 0,
            perWalletLimit: perWalletLimit,
            inventoryRoot: inventoryRoot,
            probabilityHash: probabilityHash,
            status: PackStatus.Draft
        });

        emit PackCreated(packId, price, totalSupply);
    }

    function setPackStatus(uint256 packId, PackStatus status) external onlyAdmin {
        require(packs[packId].totalSupply > 0, "missing pack");
        packs[packId].status = status;
        emit PackStatusChanged(packId, status);
    }

    function purchasePack(uint256 packId) external payable returns (uint256 packTokenId) {
        Pack storage pack = packs[packId];
        require(pack.status == PackStatus.Live, "not live");
        require(pack.sold < pack.totalSupply, "sold out");
        require(msg.value == pack.price, "bad value");
        require(walletPurchases[packId][msg.sender] < pack.perWalletLimit, "limit");

        walletPurchases[packId][msg.sender]++;
        pack.sold++;

        packTokenId = nextPackTokenId++;
        packTokens[packTokenId] = PackToken({packId: packId, owner: msg.sender, status: PackTokenStatus.Sealed});

        if (pack.sold == pack.totalSupply) {
            pack.status = PackStatus.SoldOut;
            emit PackStatusChanged(packId, PackStatus.SoldOut);
        }

        (bool ok,) = treasury.call{value: msg.value}("");
        require(ok, "transfer failed");

        emit PackPurchased(packId, packTokenId, msg.sender);
    }

    function revealPack(uint256 packTokenId, bytes32 userSalt) external returns (uint256 rewardTokenId) {
        PackToken storage token = packTokens[packTokenId];
        require(token.owner == msg.sender, "not owner");
        require(token.status == PackTokenStatus.Sealed, "opened");

        token.status = PackTokenStatus.Opened;

        bytes32 entropy = keccak256(abi.encodePacked(block.prevrandao, block.timestamp, msg.sender, packTokenId, userSalt));
        uint8 rank = _rankFromEntropy(entropy);
        bytes32 rewardId = keccak256(abi.encodePacked(token.packId, packTokenId, rank, entropy));

        rewardTokenId = nextRewardTokenId++;
        rewards[rewardTokenId] = Reward({
            packId: token.packId,
            owner: msg.sender,
            rewardId: rewardId,
            rank: rank,
            redeemed: false
        });

        emit PackRevealed(token.packId, packTokenId, rewardTokenId, rewardId, rank);
    }

    function redeemReward(uint256 rewardTokenId) external {
        Reward storage reward = rewards[rewardTokenId];
        require(reward.owner == msg.sender, "not owner");
        require(!reward.redeemed, "redeemed");
        reward.redeemed = true;
        emit RewardRedeemed(rewardTokenId, msg.sender);
    }

    function recordAgentLog(
        bytes32 agentId,
        uint256 packId,
        bytes32 inputHash,
        bytes32 outputHash,
        uint8 score
    ) external onlyAdmin {
        require(score <= 100, "bad score");
        require(packs[packId].totalSupply > 0, "missing pack");

        agentLogs.push(AgentLog({
            agentId: agentId,
            packId: packId,
            inputHash: inputHash,
            outputHash: outputHash,
            score: score,
            timestamp: block.timestamp
        }));

        emit AgentLogRecorded(agentId, packId, outputHash, score);
    }

    function agentLogCount() external view returns (uint256) {
        return agentLogs.length;
    }

    function _rankFromEntropy(bytes32 entropy) private pure returns (uint8) {
        uint256 roll = uint256(entropy) % 10_000;
        if (roll < 100) return 1;
        if (roll < 700) return 2;
        if (roll < 3_000) return 3;
        return 4;
    }
}
