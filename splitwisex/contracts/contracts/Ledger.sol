// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Ledger {
    // Events
    event GroupCreated(uint256 indexed groupId, address indexed creator, string name, address[] members);
    event MemberAdded(uint256 indexed groupId, address indexed member);
    event MemberRemoved(uint256 indexed groupId, address indexed member);

    event ExpenseAdded(
        uint256 indexed groupId,
        uint256 indexed expenseId,
        address indexed payer,
        address token,
        uint256 amount,
        bytes splitData,
        string cid,
        string memo,
        uint256 timestamp
    );

    event ExpenseVoided(uint256 indexed groupId, uint256 indexed expenseId, address indexed actor);

    event SettlementIntentCreated(bytes32 indexed intentHash, uint256 indexed groupId, address debtor, address creditor, string routeId);

    event SettlementFinalized(
        bytes32 indexed receiptHash,
        uint256 indexed groupId,
        address debtor,
        address creditor,
        address token,
        uint256 amount,
        uint256 dstChainId,
        bytes32 dstTxHash,
        uint256 timestamp
    );

    // Simple counters for ids
    uint256 public nextGroupId;
    uint256 public nextExpenseId;

    mapping(uint256 => mapping(address => bool)) public isMember; 

    function createGroup(string calldata name, address[] calldata members) external returns (uint256 gid) {
        gid = ++nextGroupId;
        for (uint256 i = 0; i < members.length; i++) {
            isMember[gid][members[i]] = true;
        }
        emit GroupCreated(gid, msg.sender, name, members);
    }

    function addMember(uint256 groupId, address member) external {
        isMember[groupId][member] = true;
        emit MemberAdded(groupId, member);
    }

    function removeMember(uint256 groupId, address member) external {
        isMember[groupId][member] = false;
        emit MemberRemoved(groupId, member);
    }

    function addExpense(
        uint256 groupId,
        address payer,
        address token,
        uint256 amount,
        bytes calldata splitData,
        string calldata cid,
        string calldata memo
    ) external returns (uint256 eid) {
        eid = ++nextExpenseId;
        emit ExpenseAdded(groupId, eid, payer, token, amount, splitData, cid, memo, block.timestamp);
    }

    function voidExpense(uint256 groupId, uint256 expenseId) external {
        emit ExpenseVoided(groupId, expenseId, msg.sender);
    }

    function createSettlementIntent(
        uint256 groupId,
        bytes32 intentHash,
        address debtor,
        address creditor,
        string calldata routeId
    ) external {
        emit SettlementIntentCreated(intentHash, groupId, debtor, creditor, routeId);
    }

    function finalizeSettlement(
        uint256 groupId,
        address debtor,
        address creditor,
        address token,
        uint256 amount,
        uint256 dstChainId,
        bytes32 dstTxHash,
        bytes32 settleIntentHash,
        bytes calldata /*sigDebtor*/,
        bytes calldata /*sigCreditor*/
    ) external {
        bytes32 receiptHash = keccak256(abi.encode(groupId, debtor, creditor, token, amount, dstChainId, dstTxHash, settleIntentHash));
        emit SettlementFinalized(receiptHash, groupId, debtor, creditor, token, amount, dstChainId, dstTxHash, block.timestamp);
    }
}


