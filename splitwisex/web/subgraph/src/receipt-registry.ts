import { BigInt, Address } from "@graphprotocol/graph-ts";
import {
  ReceiptPinned,
  ReceiptStatusUpdated
} from "../generated/ReceiptRegistry/ReceiptRegistry";
import {
  Receipt,
  ReceiptPinnedEvent,
  ReceiptStatusUpdatedEvent,
  ReceiptStatusUpdate,
  Expense,
  User
} from "../generated/schema";

export function handleReceiptPinned(event: ReceiptPinned): void {
  let expenseId = event.params.expenseId.toString();
  let expense = Expense.load(expenseId);

  if (!expense) {
    // If expense doesn't exist yet, create a placeholder
    expense = new Expense(expenseId);
    expense.group = "unknown";
    expense.payer = event.params.pinner.toHexString();
    expense.token = Address.zero();
    expense.amount = BigInt.fromI32(0);
    expense.cid = event.params.cid;
    expense.memo = "";
    expense.createdAt = event.block.timestamp;
    expense.voided = false;
    expense.filecoinStatus = "PINNED";
    expense.filecoinDealId = event.params.dealId;
    expense.save();
  } else {
    // Update existing expense with Filecoin information
    expense.filecoinStatus = "PINNED";
    expense.filecoinDealId = event.params.dealId;
    expense.save();
  }

  // Ensure User entity exists for pinner
  let pinnerId = event.params.pinner.toHexString();
  let pinner = User.load(pinnerId);
  if (!pinner) {
    pinner = new User(pinnerId);
    pinner.save();
  }

  // Create Receipt entity
  let receiptId = expenseId + "-receipt";
  let receipt = new Receipt(receiptId);
  receipt.expense = expenseId;
  receipt.cid = event.params.cid;
  receipt.dealId = event.params.dealId;
  receipt.status = "PINNED";
  receipt.pinner = pinnerId;
  receipt.pinnedAt = event.params.timestamp;
  receipt.updatedAt = event.params.timestamp;
  receipt.filecoinDealId = event.params.dealId;
  receipt.dealStatus = "ACTIVE";
  receipt.save();

  // Link receipt to expense
  expense.receipt = receiptId;
  expense.save();

  // Create ReceiptPinnedEvent
  let eventId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let pinnedEvent = new ReceiptPinnedEvent(eventId);
  pinnedEvent.expenseId = event.params.expenseId;
  pinnedEvent.receipt = receiptId;
  pinnedEvent.cid = event.params.cid;
  pinnedEvent.dealId = event.params.dealId;
  pinnedEvent.pinner = pinnerId;
  pinnedEvent.timestamp = event.params.timestamp;
  pinnedEvent.transactionHash = event.transaction.hash;
  pinnedEvent.blockNumber = event.block.number;
  pinnedEvent.save();
}

export function handleReceiptStatusUpdated(event: ReceiptStatusUpdatedEvent): void {
  let expenseId = event.params.expenseId.toString();
  let receiptId = expenseId + "-receipt";
  let receipt = Receipt.load(receiptId);

  if (!receipt) {
    // Receipt should exist from ReceiptPinned event, but handle gracefully
    return;
  }

  let oldStatus = receipt.status;

  // Update receipt status
  receipt.status = event.params.status;
  receipt.updatedAt = event.params.timestamp;

  // Update deal status based on the new status
  if (event.params.status == "STORED") {
    receipt.dealStatus = "COMPLETED";
  } else if (event.params.status == "FAILED") {
    receipt.dealStatus = "FAILED";
  }

  receipt.save();

  // Update expense Filecoin status
  let expense = Expense.load(expenseId);
  if (expense) {
    expense.filecoinStatus = event.params.status;
    expense.save();
  }

  // Create ReceiptStatusUpdate tracking entity
  let updateId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let statusUpdate = new ReceiptStatusUpdate(updateId);
  statusUpdate.receipt = receiptId;
  statusUpdate.oldStatus = oldStatus;
  statusUpdate.newStatus = event.params.status;
  statusUpdate.updatedAt = event.params.timestamp;
  statusUpdate.updatedBy = event.transaction.from.toHexString();
  statusUpdate.save();

  // Create ReceiptStatusUpdatedEvent
  let statusEvent = new ReceiptStatusUpdatedEvent(updateId + "-event");
  statusEvent.receipt = receiptId;
  statusEvent.oldStatus = oldStatus;
  statusEvent.newStatus = event.params.status;
  statusEvent.timestamp = event.params.timestamp;
  statusEvent.updatedBy = event.transaction.from.toHexString();
  statusEvent.transactionHash = event.transaction.hash;
  statusEvent.blockNumber = event.block.number;
  statusEvent.save();
}