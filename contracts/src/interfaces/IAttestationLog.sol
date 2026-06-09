// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAttestationLog
/// @notice On-chain log of AI agent outputs. Every AI decision in the PackProof
///         pipeline (authentication, pricing, compliance, fairness) emits a
///         structured record whose content hash is written here so the output is
///         independently verifiable and auditable rather than a black box.
interface IAttestationLog {
    /// @param agentId      keccak/identifier of the agent + model/version.
    /// @param subjectKind  0 = card/cert, 1 = pack, 2 = other (asset-class parameterized).
    /// @param subjectId    cert tokenId, packId, etc. depending on subjectKind.
    /// @param inputHash    hash of the AI input (e.g. submitted photos + cert number).
    /// @param outputHash   hash of the structured authentication/pricing/compliance report.
    /// @param score        0..100 confidence/health score.
    /// @param timestamp    block timestamp the log was recorded.
    struct Attestation {
        bytes32 agentId;
        uint8 subjectKind;
        uint256 subjectId;
        bytes32 inputHash;
        bytes32 outputHash;
        uint8 score;
        uint256 timestamp;
    }

    event AgentLogRecorded(
        uint256 indexed logId,
        bytes32 indexed agentId,
        uint8 subjectKind,
        uint256 indexed subjectId,
        bytes32 outputHash,
        uint8 score
    );

    function recordAgentLog(
        bytes32 agentId,
        uint8 subjectKind,
        uint256 subjectId,
        bytes32 inputHash,
        bytes32 outputHash,
        uint8 score
    ) external returns (uint256 logId);

    function logCount() external view returns (uint256);

    function getLog(uint256 logId) external view returns (Attestation memory);
}
