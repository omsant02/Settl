// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface ENS {
    function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external returns (bytes32);
}

interface IResolver {
    function setAddr(bytes32 node, address addr) external;
}

contract Web3ExpenseTracker is Ownable {
    
    ENS public immutable ens;
    IResolver public immutable resolver;
    bytes32 public immutable rootNode;
    
    struct User {
        string subdomain;
        bool registered;
    }
    
    struct Expense {
        uint256 id;
        uint256 groupId;
        address paidBy;
        uint256 amount;
        string description;
        string receiptHash;
        address[] splitWith;
        mapping(address => uint256) owedAmounts;
        mapping(address => bool) settled;
        mapping(address => string) settlementTxHashes;
        bool active;
        uint256 timestamp;
    }
    
    struct Group {
        uint256 id;
        string name;
        address[] members;
        uint256[] expenseIds;
        bool active;
        uint256 createdAt;
    }
    
    mapping(address => User) public users;
    mapping(string => address) public subdomainToAddress;
    mapping(uint256 => Expense) public expenses;
    mapping(uint256 => Group) public groups;
    mapping(address => mapping(address => uint256)) public balances;
    mapping(address => uint256[]) public userExpenses;
    mapping(address => uint256[]) public userGroups;
    
    uint256 public nextExpenseId = 1;
    uint256 public nextGroupId = 1;
    
    event UserRegistered(address indexed user, string subdomain);
    event GroupCreated(uint256 indexed groupId, string name, address indexed creator);
    event ExpenseAdded(uint256 indexed expenseId, uint256 indexed groupId, address indexed paidBy, uint256 amount);
    event ExpenseSettled(uint256 indexed expenseId, address indexed from, address indexed to, uint256 amount, string txHash);
    event ExpenseUpdated(uint256 indexed expenseId, string newDescription, string newReceiptHash);

    constructor(
        address _ens,
        address _resolver,
        bytes32 _rootNode,
        address _initialOwner
    ) Ownable(_initialOwner) {
        ens = ENS(_ens);
        resolver = IResolver(_resolver);
        rootNode = _rootNode;
    }

    function registerUser(string memory subdomain) external {
        require(!users[msg.sender].registered, "Already registered");
        require(subdomainToAddress[subdomain] == address(0), "Subdomain taken");
        require(bytes(subdomain).length > 0, "Invalid subdomain");
        
        bytes32 labelHash = keccak256(abi.encodePacked(subdomain));
        bytes32 subnode = keccak256(abi.encodePacked(rootNode, labelHash));
        
        ens.setSubnodeOwner(rootNode, labelHash, msg.sender);
        resolver.setAddr(subnode, msg.sender);
        
        users[msg.sender] = User(subdomain, true);
        subdomainToAddress[subdomain] = msg.sender;
        
        emit UserRegistered(msg.sender, subdomain);
    }

    function createGroup(string memory groupName, address[] memory members) external returns (uint256) {
        require(users[msg.sender].registered, "Must be registered");
        require(bytes(groupName).length > 0, "Invalid group name");
        require(members.length > 0, "Group must have members");
        
        for (uint i = 0; i < members.length; i++) {
            require(users[members[i]].registered, "All members must be registered");
        }
        
        uint256 groupId = nextGroupId++;
        Group storage newGroup = groups[groupId];
        newGroup.id = groupId;
        newGroup.name = groupName;
        newGroup.members = members;
        newGroup.active = true;
        newGroup.createdAt = block.timestamp;
        
        bool creatorIncluded = false;
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == msg.sender) {
                creatorIncluded = true;
                break;
            }
        }
        if (!creatorIncluded) {
            newGroup.members.push(msg.sender);
        }
        
        for (uint i = 0; i < newGroup.members.length; i++) {
            userGroups[newGroup.members[i]].push(groupId);
        }
        
        emit GroupCreated(groupId, groupName, msg.sender);
        return groupId;
    }

    function addExpense(
        uint256 groupId,
        uint256 amount,
        string memory description,
        string memory receiptHash,
        address[] memory splitWith,
        uint256[] memory splitAmounts
    ) external returns (uint256) {
        require(groups[groupId].active, "Group not active");
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(description).length > 0, "Description required");
        require(splitWith.length > 0, "Must split with someone");
        require(splitWith.length == splitAmounts.length, "Arrays length mismatch");
        
        bool isMember = false;
        for (uint i = 0; i < groups[groupId].members.length; i++) {
            if (groups[groupId].members[i] == msg.sender) {
                isMember = true;
                break;
            }
        }
        require(isMember, "Only group members can add expenses");
        
        uint256 totalSplit = 0;
        for (uint i = 0; i < splitAmounts.length; i++) {
            require(splitAmounts[i] > 0, "Split amounts must be greater than 0");
            totalSplit += splitAmounts[i];
        }
        require(totalSplit == amount, "Split amounts must equal total");
        
        uint256 expenseId = nextExpenseId++;
        Expense storage expense = expenses[expenseId];
        expense.id = expenseId;
        expense.groupId = groupId;
        expense.paidBy = msg.sender;
        expense.amount = amount;
        expense.description = description;
        expense.receiptHash = receiptHash;
        expense.splitWith = splitWith;
        expense.active = true;
        expense.timestamp = block.timestamp;
        
        for (uint i = 0; i < splitWith.length; i++) {
            expense.owedAmounts[splitWith[i]] = splitAmounts[i];
            balances[splitWith[i]][msg.sender] += splitAmounts[i];
            userExpenses[splitWith[i]].push(expenseId);
        }
        
        groups[groupId].expenseIds.push(expenseId);
        userExpenses[msg.sender].push(expenseId);
        
        emit ExpenseAdded(expenseId, groupId, msg.sender, amount);
        return expenseId;
    }

    function settleExpense(uint256 expenseId, string memory fusionTxHash) external {
        Expense storage expense = expenses[expenseId];
        require(expense.active, "Expense not active");
        require(expense.owedAmounts[msg.sender] > 0, "Nothing owed");
        require(!expense.settled[msg.sender], "Already settled");
        require(bytes(fusionTxHash).length > 0, "Transaction hash required");
        
        uint256 amountOwed = expense.owedAmounts[msg.sender];
        address paidBy = expense.paidBy;
        
        balances[msg.sender][paidBy] -= amountOwed;
        expense.settled[msg.sender] = true;
        expense.settlementTxHashes[msg.sender] = fusionTxHash;
        
        emit ExpenseSettled(expenseId, msg.sender, paidBy, amountOwed, fusionTxHash);
    }

    function updateExpense(uint256 expenseId, string memory newDescription, string memory newReceiptHash) external {
        require(expenses[expenseId].paidBy == msg.sender, "Only expense creator can update");
        require(bytes(newDescription).length > 0, "Description cannot be empty");
        
        expenses[expenseId].description = newDescription;
        if (bytes(newReceiptHash).length > 0) {
            expenses[expenseId].receiptHash = newReceiptHash;
        }
        
        emit ExpenseUpdated(expenseId, newDescription, newReceiptHash);
    }

    function deactivateGroup(uint256 groupId) external {
        require(groups[groupId].active, "Group already inactive");
        require(groups[groupId].members[0] == msg.sender || owner() == msg.sender, "Not authorized");
        groups[groupId].active = false;
    }

    function getGroup(uint256 groupId) external view returns (
        uint256 id,
        string memory name,
        address[] memory members,
        uint256[] memory expenseIds,
        bool active,
        uint256 createdAt
    ) {
        Group storage group = groups[groupId];
        return (group.id, group.name, group.members, group.expenseIds, group.active, group.createdAt);
    }
    
    function getExpense(uint256 expenseId) external view returns (
        uint256 id,
        uint256 groupId,
        address paidBy,
        uint256 amount,
        string memory description,
        string memory receiptHash,
        address[] memory splitWith,
        bool active,
        uint256 timestamp
    ) {
        Expense storage expense = expenses[expenseId];
        return (
            expense.id,
            expense.groupId,
            expense.paidBy,
            expense.amount,
            expense.description,
            expense.receiptHash,
            expense.splitWith,
            expense.active,
            expense.timestamp
        );
    }
    
    function getOwedAmount(uint256 expenseId, address user) external view returns (uint256) {
        return expenses[expenseId].owedAmounts[user];
    }
    
    function isSettled(uint256 expenseId, address user) external view returns (bool) {
        return expenses[expenseId].settled[user];
    }
    
    function getSettlementTxHash(uint256 expenseId, address user) external view returns (string memory) {
        return expenses[expenseId].settlementTxHashes[user];
    }
    
    function getBalance(address debtor, address creditor) external view returns (uint256) {
        return balances[debtor][creditor];
    }
    
    function getUserSubdomain(address user) external view returns (string memory) {
        return users[user].subdomain;
    }
    
    function getUserExpenses(address user) external view returns (uint256[] memory) {
        return userExpenses[user];
    }
    
    function getUserGroups(address user) external view returns (uint256[] memory) {
        return userGroups[user];
    }
    
    function getAllBalances(address user) external view returns (
        address[] memory creditors,
        uint256[] memory amounts
    ) {
        uint256 count = 0;
        address[] memory tempCreditors = new address[](users[user].registered ? 100 : 0);
        uint256[] memory tempAmounts = new uint256[](users[user].registered ? 100 : 0);
        
        for (uint i = 0; i < userExpenses[user].length; i++) {
            uint256 expenseId = userExpenses[user][i];
            address creditor = expenses[expenseId].paidBy;
            uint256 balance = balances[user][creditor];
            
            if (balance > 0) {
                bool found = false;
                for (uint j = 0; j < count; j++) {
                    if (tempCreditors[j] == creditor) {
                        found = true;
                        break;
                    }
                }
                if (!found && count < 100) {
                    tempCreditors[count] = creditor;
                    tempAmounts[count] = balance;
                    count++;
                }
            }
        }
        
        creditors = new address[](count);
        amounts = new uint256[](count);
        for (uint i = 0; i < count; i++) {
            creditors[i] = tempCreditors[i];
            amounts[i] = tempAmounts[i];
        }
    }
}