// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FilecoinSplitWise
 * @dev A simplified expense splitting app for Filecoin (without ENS dependencies)
 */
contract FilecoinSplitWise is Ownable, ReentrancyGuard {
    
    struct User {
        string username;
        bool registered;
        uint256 registrationTime;
        uint256[] groupIds;
        uint256[] expenseIds;
    }
    
    struct Group {
        uint256 id;
        string name;
        address creator;
        address[] members;
        string[] memberUsernames;
        uint256[] expenseIds;
        bool active;
        uint256 createdAt;
    }
    
    struct Expense {
        uint256 id;
        uint256 groupId;
        address paidBy;
        string paidByUsername;
        uint256 totalAmount;
        string description;
        string category;
        string receiptHash;
        bool fullySettled;
        uint256 timestamp;
    }
    
    struct Split {
        address debtor;
        string debtorUsername;
        uint256 amount;
        bool settled;
    }
    
    struct Settlement {
        address from;
        address to;
        uint256 amount;
        string txHash;
        string fromToken;
        string toToken;
        uint256 timestamp;
    }
    
    mapping(address => User) public users;
    mapping(string => address) public usernameToAddress;
    mapping(uint256 => Group) public groups;
    mapping(uint256 => Expense) public expenses;
    mapping(uint256 => Split[]) public expenseSplits;
    mapping(uint256 => Settlement[]) public expenseSettlements;
    mapping(address => mapping(address => uint256)) public balances;
    
    uint256 public nextGroupId = 1;
    uint256 public nextExpenseId = 1;
    
    event UserRegistered(address indexed user, string username);
    event GroupCreated(uint256 indexed groupId, string name, address indexed creator, string[] memberUsernames);
    event ExpenseAdded(uint256 indexed expenseId, uint256 indexed groupId, address indexed paidBy, uint256 amount, string description);
    event ExpenseSettled(uint256 indexed expenseId, address indexed from, address indexed to, uint256 amount, string txHash);
    
    constructor(address _initialOwner) Ownable(_initialOwner) {}
    
    modifier onlyRegisteredUser() {
        require(users[msg.sender].registered, "User not registered");
        _;
    }
    
    modifier validUsername(string memory username) {
        require(bytes(username).length >= 3 && bytes(username).length <= 20, "Invalid username length");
        require(usernameToAddress[username] == address(0), "Username already taken");
        _;
    }
    
    function registerUser(string memory username) 
        external 
        validUsername(username)
        nonReentrant
    {
        require(!users[msg.sender].registered, "User already registered");
        require(_isValidUsernameFormat(username), "Invalid username format");
        
        users[msg.sender] = User({
            username: username,
            registered: true,
            registrationTime: block.timestamp,
            groupIds: new uint256[](0),
            expenseIds: new uint256[](0)
        });
        
        usernameToAddress[username] = msg.sender;
        
        emit UserRegistered(msg.sender, username);
    }
    
    function adminRegisterUser(string memory username, address user) 
        external 
        onlyOwner
        validUsername(username)
        nonReentrant
    {
        require(!users[user].registered, "User already registered");
        require(_isValidUsernameFormat(username), "Invalid username format");
        
        users[user] = User({
            username: username,
            registered: true,
            registrationTime: block.timestamp,
            groupIds: new uint256[](0),
            expenseIds: new uint256[](0)
        });
        
        usernameToAddress[username] = user;
        
        emit UserRegistered(user, username);
    }
    
    function createGroup(
        string memory groupName,
        string[] memory memberUsernames
    ) external onlyRegisteredUser returns (uint256) {
        require(bytes(groupName).length > 0, "Group name cannot be empty");
        require(memberUsernames.length > 0, "Group must have members");
        
        address[] memory members = new address[](memberUsernames.length);
        for (uint i = 0; i < memberUsernames.length; i++) {
            address memberAddr = usernameToAddress[memberUsernames[i]];
            require(memberAddr != address(0), "Username not found");
            require(users[memberAddr].registered, "All members must be registered");
            members[i] = memberAddr;
        }
        
        bool creatorIncluded = false;
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == msg.sender) {
                creatorIncluded = true;
                break;
            }
        }
        
        if (!creatorIncluded) {
            address[] memory expandedMembers = new address[](members.length + 1);
            string[] memory expandedUsernames = new string[](memberUsernames.length + 1);
            
            for (uint i = 0; i < members.length; i++) {
                expandedMembers[i] = members[i];
                expandedUsernames[i] = memberUsernames[i];
            }
            expandedMembers[members.length] = msg.sender;
            expandedUsernames[memberUsernames.length] = users[msg.sender].username;
            
            members = expandedMembers;
            memberUsernames = expandedUsernames;
        }
        
        uint256 groupId = nextGroupId++;
        groups[groupId] = Group({
            id: groupId,
            name: groupName,
            creator: msg.sender,
            members: members,
            memberUsernames: memberUsernames,
            expenseIds: new uint256[](0),
            active: true,
            createdAt: block.timestamp
        });
        
        for (uint i = 0; i < members.length; i++) {
            users[members[i]].groupIds.push(groupId);
        }
        
        emit GroupCreated(groupId, groupName, msg.sender, memberUsernames);
        return groupId;
    }
    
    function addExpense(
        uint256 groupId,
        uint256 totalAmount,
        string memory description,
        string memory category,
        string memory receiptHash,
        string[] memory debtorUsernames,
        uint256[] memory splitAmounts
    ) external onlyRegisteredUser returns (uint256) {
        require(groups[groupId].active, "Group not active");
        require(totalAmount > 0, "Amount must be greater than 0");
        require(bytes(description).length > 0, "Description required");
        require(debtorUsernames.length == splitAmounts.length, "Arrays length mismatch");
        require(debtorUsernames.length > 0, "Must have debtors");
        require(_isGroupMember(groupId, msg.sender), "Only group members can add expenses");
        
        uint256 totalSplit = 0;
        for (uint i = 0; i < splitAmounts.length; i++) {
            require(splitAmounts[i] > 0, "Split amounts must be greater than 0");
            totalSplit += splitAmounts[i];
        }
        require(totalSplit == totalAmount, "Split amounts must equal total");
        
        uint256 expenseId = nextExpenseId++;
        
        expenses[expenseId] = Expense({
            id: expenseId,
            groupId: groupId,
            paidBy: msg.sender,
            paidByUsername: users[msg.sender].username,
            totalAmount: totalAmount,
            description: description,
            category: category,
            receiptHash: receiptHash,
            fullySettled: false,
            timestamp: block.timestamp
        });
        
        for (uint i = 0; i < debtorUsernames.length; i++) {
            address debtorAddr = usernameToAddress[debtorUsernames[i]];
            require(debtorAddr != address(0), "Debtor username not found");
            require(_isGroupMember(groupId, debtorAddr), "All debtors must be group members");
            
            expenseSplits[expenseId].push(Split({
                debtor: debtorAddr,
                debtorUsername: debtorUsernames[i],
                amount: splitAmounts[i],
                settled: false
            }));
            
            balances[debtorAddr][msg.sender] += splitAmounts[i];
        }
        
        groups[groupId].expenseIds.push(expenseId);
        users[msg.sender].expenseIds.push(expenseId);
        for (uint i = 0; i < debtorUsernames.length; i++) {
            address debtorAddr = usernameToAddress[debtorUsernames[i]];
            users[debtorAddr].expenseIds.push(expenseId);
        }
        
        emit ExpenseAdded(expenseId, groupId, msg.sender, totalAmount, description);
        return expenseId;
    }
    
    function settleExpense(
        uint256 expenseId,
        uint256 debtorIndex,
        string memory fusionTxHash,
        string memory fromToken,
        string memory toToken
    ) external nonReentrant {
        Expense storage expense = expenses[expenseId];
        require(expense.id != 0, "Expense not found");
        require(debtorIndex < expenseSplits[expenseId].length, "Invalid debtor index");
        require(bytes(fusionTxHash).length > 0, "Transaction hash required");
        
        Split storage split = expenseSplits[expenseId][debtorIndex];
        require(split.debtor == msg.sender, "Only debtor can settle");
        require(!split.settled, "Already settled");
        
        uint256 amount = split.amount;
        address creditor = expense.paidBy;
        
        split.settled = true;
        balances[msg.sender][creditor] -= amount;
        
        expenseSettlements[expenseId].push(Settlement({
            from: msg.sender,
            to: creditor,
            amount: amount,
            txHash: fusionTxHash,
            fromToken: fromToken,
            toToken: toToken,
            timestamp: block.timestamp
        }));
        
        bool fullySettled = true;
        Split[] storage splits = expenseSplits[expenseId];
        for (uint i = 0; i < splits.length; i++) {
            if (!splits[i].settled) {
                fullySettled = false;
                break;
            }
        }
        expense.fullySettled = fullySettled;
        
        emit ExpenseSettled(expenseId, msg.sender, creditor, amount, fusionTxHash);
    }
    
    function getUser(address userAddr) external view returns (
        string memory username,
        bool registered,
        uint256 registrationTime,
        uint256[] memory groupIds,
        uint256[] memory expenseIds
    ) {
        User storage user = users[userAddr];
        return (user.username, user.registered, user.registrationTime, user.groupIds, user.expenseIds);
    }
    
    function getGroup(uint256 groupId) external view returns (
        uint256 id,
        string memory name,
        address creator,
        address[] memory members,
        string[] memory memberUsernames,
        uint256[] memory expenseIds,
        bool active,
        uint256 createdAt
    ) {
        Group storage group = groups[groupId];
        return (group.id, group.name, group.creator, group.members, group.memberUsernames, group.expenseIds, group.active, group.createdAt);
    }
    
    function getExpense(uint256 expenseId) external view returns (
        uint256 id,
        uint256 groupId,
        address paidBy,
        string memory paidByUsername,
        uint256 totalAmount,
        string memory description,
        string memory category,
        string memory receiptHash,
        bool fullySettled,
        uint256 timestamp
    ) {
        Expense storage expense = expenses[expenseId];
        return (expense.id, expense.groupId, expense.paidBy, expense.paidByUsername, expense.totalAmount, expense.description, expense.category, expense.receiptHash, expense.fullySettled, expense.timestamp);
    }
    
    function getExpenseSplits(uint256 expenseId) external view returns (Split[] memory) {
        return expenseSplits[expenseId];
    }
    
    function getExpenseSettlements(uint256 expenseId) external view returns (Settlement[] memory) {
        return expenseSettlements[expenseId];
    }
    
    function getUserBalance(address debtor, address creditor) external view returns (uint256) {
        return balances[debtor][creditor];
    }
    
    function resolveUsername(string memory username) external view returns (address) {
        return usernameToAddress[username];
    }
    
    function getUserUsername(address user) external view returns (string memory) {
        return users[user].username;
    }
    
    function _isValidUsernameFormat(string memory username) internal pure returns (bool) {
        bytes memory b = bytes(username);
        for (uint i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            if (!(char >= 0x30 && char <= 0x39) && // 0-9
                !(char >= 0x61 && char <= 0x7A) && // a-z
                char != 0x2D) { // hyphen
                return false;
            }
        }
        return true;
    }
    
    function _isGroupMember(uint256 groupId, address user) internal view returns (bool) {
        address[] memory members = groups[groupId].members;
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == user) {
                return true;
            }
        }
        return false;
    }
    
    function deactivateGroup(uint256 groupId) external {
        require(
            groups[groupId].creator == msg.sender || owner() == msg.sender,
            "Only group creator or contract owner can deactivate"
        );
        groups[groupId].active = false;
    }
    
    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}