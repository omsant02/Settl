// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReceiptRegistry
 * @dev Contract to track IPFS receipts and their Filecoin storage deals
 * Emits events that can be indexed by The Graph subgraph
 */
contract ReceiptRegistry {

    // Event emitted when a receipt is pinned to Filecoin
    event ReceiptPinned(
        uint256 indexed expenseId,
        string cid,
        string dealId,
        address indexed pinner,
        uint256 timestamp
    );

    // Event emitted when receipt storage status is updated
    event ReceiptStatusUpdated(
        uint256 indexed expenseId,
        string cid,
        string dealId,
        string status,
        uint256 timestamp
    );

    // Mapping to track receipt information
    mapping(uint256 => ReceiptInfo) public receipts;

    struct ReceiptInfo {
        string cid;
        string dealId;
        string status; // "PENDING", "PINNED", "STORED", "FAILED"
        address pinner;
        uint256 timestamp;
    }

    /**
     * @dev Records that a receipt has been pinned to Filecoin
     * @param expenseId The ID of the expense this receipt belongs to
     * @param cid The IPFS CID of the receipt
     * @param dealId The Filecoin deal ID or job ID from Synapse
     */
    function pinReceipt(
        uint256 expenseId,
        string calldata cid,
        string calldata dealId
    ) external {
        receipts[expenseId] = ReceiptInfo({
            cid: cid,
            dealId: dealId,
            status: "PINNED",
            pinner: msg.sender,
            timestamp: block.timestamp
        });

        emit ReceiptPinned(expenseId, cid, dealId, msg.sender, block.timestamp);
    }

    /**
     * @dev Updates the status of a receipt (e.g., when Filecoin deal is confirmed)
     * @param expenseId The expense ID
     * @param newStatus The new status ("STORED", "FAILED", etc.)
     */
    function updateReceiptStatus(
        uint256 expenseId,
        string calldata newStatus
    ) external {
        ReceiptInfo storage receipt = receipts[expenseId];
        require(bytes(receipt.cid).length > 0, "Receipt not found");
        require(receipt.pinner == msg.sender, "Only pinner can update status");

        receipt.status = newStatus;
        receipt.timestamp = block.timestamp;

        emit ReceiptStatusUpdated(
            expenseId,
            receipt.cid,
            receipt.dealId,
            newStatus,
            block.timestamp
        );
    }

    /**
     * @dev Get receipt information for an expense
     * @param expenseId The expense ID
     * @return ReceiptInfo struct with all receipt data
     */
    function getReceipt(uint256 expenseId) external view returns (ReceiptInfo memory) {
        return receipts[expenseId];
    }

    /**
     * @dev Check if a receipt exists for an expense
     * @param expenseId The expense ID
     * @return bool indicating if receipt exists
     */
    function hasReceipt(uint256 expenseId) external view returns (bool) {
        return bytes(receipts[expenseId].cid).length > 0;
    }
}