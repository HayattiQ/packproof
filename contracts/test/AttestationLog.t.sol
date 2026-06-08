// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AttestationLog} from "../src/AttestationLog.sol";
import {IAttestationLog} from "../src/interfaces/IAttestationLog.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract AttestationLogTest is Test {
    AttestationLog internal attLog;
    address internal admin = address(0xA11CE);
    address internal stranger = address(0xBEEF);

    function setUp() public {
        attLog = new AttestationLog(admin);
    }

    function test_recordAndRead() public {
        vm.prank(admin);
        uint256 id = attLog.recordAgentLog(
            keccak256("AuthAgent-v1"), 0, 42, keccak256("input"), keccak256("report"), 92
        );
        assertEq(id, 0);
        assertEq(attLog.logCount(), 1);

        IAttestationLog.Attestation memory a = attLog.getLog(0);
        assertEq(a.subjectId, 42);
        assertEq(a.score, 92);
        assertEq(a.outputHash, keccak256("report"));
        assertEq(a.timestamp, block.timestamp);
    }

    function test_revertWhen_notAgent() public {
        bytes32 agentRole = attLog.AGENT_ROLE();
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, agentRole
            )
        );
        vm.prank(stranger);
        attLog.recordAgentLog(bytes32(0), 0, 1, bytes32(0), bytes32(0), 1);
    }

    function test_revertWhen_badScore() public {
        vm.prank(admin);
        vm.expectRevert("AttestationLog: bad score");
        attLog.recordAgentLog(bytes32(0), 0, 1, bytes32(0), bytes32(0), 101);
    }

    function test_revertWhen_badKind() public {
        vm.prank(admin);
        vm.expectRevert("AttestationLog: bad kind");
        attLog.recordAgentLog(bytes32(0), 3, 1, bytes32(0), bytes32(0), 50);
    }
}
