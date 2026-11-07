// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../contracts/TodoList.sol";

/// @dev Тесттерде екінші пайдаланушыны имитациялайтын көмекші контракт.
///      Оның адресі басқа болғандықтан, TodoList үшін ол — жаңа msg.sender.
contract OtherUser {
    function create(TodoList _todo, string calldata _content) external returns (uint256) {
        return _todo.createTask(_content, 0);
    }

    function toggle(TodoList _todo, uint256 _id) external {
        _todo.toggleCompleted(_id);
    }
}
