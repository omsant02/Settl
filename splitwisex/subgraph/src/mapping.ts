import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  GroupCreated,
  ExpenseAdded,
  ExpenseVoided,
  SettlementIntentCreated,
  SettlementFinalized,
} from "../generated/Ledger/Ledger";
import { User, Group, Expense, DebtEdge, SettlementIntent, Settlement } from "../generated/schema";

function getOrCreateUser(addr: Address): User {
  let id = addr.toHex();
  let u = User.load(id);
  if (!u) { u = new User(id); u.save(); }
  return u as User;
}

export function handleGroupCreated(e: GroupCreated): void {
  let g = new Group(e.params.groupId.toString());
  g.name = e.params.name;
  g.createdAt = e.block.timestamp;
  let members: string[] = [];
  for (let i = 0; i < e.params.members.length; i++) {
    members.push(getOrCreateUser(e.params.members[i]).id);
  }
  g.members = members;
  g.save();
}

export function handleExpenseAdded(e: ExpenseAdded): void {
  let ex = new Expense(e.params.expenseId.toString());
  ex.group = e.params.groupId.toString();
  ex.payer = getOrCreateUser(e.params.payer).id;
  ex.token = e.params.token;
  ex.amount = e.params.amount;
  ex.cid = e.params.cid;
  ex.memo = e.params.memo;
  ex.createdAt = e.block.timestamp;
  ex.voided = false;
  ex.save();

  let g = Group.load(ex.group);
  if (!g) return;
  let n = g.members.length;
  if (n <= 1) return;
  let share = ex.amount.div(BigInt.fromI32(n));
  for (let i = 0; i < n; i++) {
    let m = g.members[i];
    if (m == ex.payer) continue;
    let edgeId = ex.group + ":" + m + "->" + ex.payer + ":" + ex.token.toHex();
    let edge = DebtEdge.load(edgeId);
    if (!edge) {
      edge = new DebtEdge(edgeId);
      edge.group = ex.group;
      edge.debtor = m;
      edge.creditor = ex.payer;
      edge.token = ex.token;
      edge.amount = BigInt.zero();
      edge.open = true;
    }
    edge.amount = edge.amount.plus(share);
    edge.save();
  }
}

export function handleExpenseVoided(e: ExpenseVoided): void {
  let ex = Expense.load(e.params.expenseId.toString());
  if (ex) { ex.voided = true; ex.save(); }
}

export function handleSettlementIntentCreated(e: SettlementIntentCreated): void {
  let s = new SettlementIntent(e.params.intentHash.toHex());
  s.group = e.params.groupId.toString();
  s.debtor = getOrCreateUser(e.params.debtor).id;
  s.creditor = getOrCreateUser(e.params.creditor).id;
  s.routeId = e.params.routeId;
  s.createdAt = e.block.timestamp;
  s.save();
}

export function handleSettlementFinalized(e: SettlementFinalized): void {
  let s = new Settlement(e.params.receiptHash.toHex());
  s.group = e.params.groupId.toString();
  s.debtor = getOrCreateUser(e.params.debtor).id;
  s.creditor = getOrCreateUser(e.params.creditor).id;
  s.token = e.params.token;
  s.amount = e.params.amount;
  s.dstChainId = e.params.dstChainId;
  s.dstTxHash = e.params.dstTxHash as Bytes;
  s.finalizedAt = e.block.timestamp;
  s.save();

  let edgeId = s.group + ":" + s.debtor + "->" + s.creditor + ":" + s.token.toHex();
  let edge = DebtEdge.load(edgeId);
  if (edge) {
    edge.amount = edge.amount.minus(s.amount);
    edge.open = edge.amount.gt(BigInt.zero());
    edge.save();
  }
}
