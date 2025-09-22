export const GET_GROUPS = `
{ groups(orderBy: createdAt, orderDirection: desc) {
    id name createdAt members { id ensName }
} }`

export const GET_GROUP = (id: string) => `
{ group(id: "${id}") {
    id name members { id ensName }
} }`

export const GET_GROUP_BY_NAME = (name: string) => `
{ groups(where: { name: "${name}" }, first: 1) {
    id name members { id ensName }
} }`

export const GET_EXPENSES = (groupId: string) => `
{ expenses(where: { group: "${groupId}" }, first: 100, orderBy: createdAt, orderDirection: desc) {
    id payer { id } token amount cid memo createdAt
} }`

export const GET_EXPENSE_BY_ID = (expenseId: string) => `
{ expenses(where: { id: "${expenseId}" }, first: 1) {
    id payer { id } token amount cid memo createdAt
    group { id members { id ensName } }
} }`

export const GET_DEBTS = (groupId: string) => `
{ debtEdges(where:{ group: "${groupId}", open: true }) {
    id debtor { id } creditor { id } token amount open
} }`

export const GET_RECEIPTS = (groupId: string) => `
{ receipts(where: { expense_: { group: "${groupId}" } }, orderBy: pinnedAt, orderDirection: desc) {
    id cid dealId status filecoinDealId dealStatus
    expense { id memo amount token }
    pinner { id ensName }
    pinnedAt updatedAt
} }`

export const GET_RECEIPT_EVENTS = (groupId: string) => `
{ receiptPinnedEvents(where: { receipt_: { expense_: { group: "${groupId}" } } }, orderBy: timestamp, orderDirection: desc) {
    id expenseId cid dealId timestamp transactionHash
    pinner { id ensName }
    receipt { id status }
} }`


