// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IAttestationLog} from "./interfaces/IAttestationLog.sol";

/// @title AttestationLog
/// @notice Append-only on-chain log of AI agent outputs. Each of the four PackProof
///         agents (Authentication, Pricing, Compliance, Fairness) writes the content
///         hash of its structured report here, making every AI decision verifiable
///         and auditable. Low Mantle gas makes per-attestation writes economical.
/// @dev Access-controlled: only addresses with AGENT_ROLE (the relayer / operator
///      backend, or sibling contracts) may append. No hardcoded secrets.
contract AttestationLog is AccessControl, IAttestationLog {
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    Attestation[] private _logs;

    constructor(address admin) {
        require(admin != address(0), "AttestationLog: bad admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AGENT_ROLE, admin);
    }

    /// @inheritdoc IAttestationLog
    function recordAgentLog(
        bytes32 agentId,
        uint8 subjectKind,
        uint256 subjectId,
        bytes32 inputHash,
        bytes32 outputHash,
        uint8 score
    ) external onlyRole(AGENT_ROLE) returns (uint256 logId) {
        require(score <= 100, "AttestationLog: bad score");
        require(subjectKind <= 2, "AttestationLog: bad kind");

        logId = _logs.length;
        _logs.push(
            Attestation({
                agentId: agentId,
                subjectKind: subjectKind,
                subjectId: subjectId,
                inputHash: inputHash,
                outputHash: outputHash,
                score: score,
                timestamp: block.timestamp
            })
        );

        emit AgentLogRecorded(logId, agentId, subjectKind, subjectId, outputHash, score);
    }

    /// @inheritdoc IAttestationLog
    function logCount() external view returns (uint256) {
        return _logs.length;
    }

    /// @inheritdoc IAttestationLog
    function getLog(uint256 logId) external view returns (Attestation memory) {
        require(logId < _logs.length, "AttestationLog: out of range");
        return _logs[logId];
    }
}
