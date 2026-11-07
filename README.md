# To-Do List dApp (Solidity + ethers.js)

A decentralized to-do list: every MetaMask address keeps its own private task list inside an Ethereum smart contract (Sepolia testnet), with a plain HTML/CSS/JS frontend and a built-in browser demo mode that works without a wallet.

```
Frontend (HTML/CSS/JS) → MetaMask + ethers.js (ABI) → Ethereum Sepolia → TodoList.sol
```

## Features

- **Smart contract `TodoList.sol`** (Solidity ^0.8.20)
  - per-owner storage: `mapping(address => mapping(uint256 => Task))`
  - `createTask`, `toggleCompleted`, `updateTask`, `deleteTask` (soft delete), `getTask`, `getMyTasks`, `getMyStats`
  - input validation with `require()` (empty text, > 200 bytes, priority 0..2, missing / deleted task, editing a completed task)
  - events: `TaskCreated`, `TaskUpdated`, `TaskToggled`, `TaskDeleted`
- **12 unit tests** for the Remix *Solidity Unit Testing* plugin, including a helper contract that acts as a second user
- **Frontend**
  - MetaMask connection, account / network / balance display, reacts to account and chain changes
  - checks that the given address really hosts a `TodoList` contract
  - add / complete / edit / delete tasks (each one a transaction), priority levels, byte counter
  - filters (all / active / done), text search, lookup by ID, statistics and progress bar
  - transaction log with Etherscan links, gas used and human-readable `require()` errors (in Kazakh)
  - **demo mode**: if MetaMask is not installed, an in-browser copy of the contract logic (`demo.js`) is used

## Tech stack

Solidity 0.8.20 · Remix IDE (compile, deploy, unit tests) · ethers.js v6 (CDN) · MetaMask · vanilla HTML / CSS / JavaScript

## Project structure

```
contracts/TodoList.sol      smart contract
tests/TodoList_test.sol     12 Remix unit tests
tests/OtherUser.sol         helper contract ("second user")
frontend/index.html         UI
frontend/style.css
frontend/app.js             MetaMask, ethers.js, transactions, UI logic
frontend/contract.js        contract address + ABI
frontend/demo.js            in-browser contract emulation (demo mode)
docs/README.ru.md           original detailed course README (Russian)
```

## How to run

### Demo mode (no wallet, no blockchain)

```bash
cd frontend
python -m http.server 8000
# open http://localhost:8000 in a browser WITHOUT MetaMask → choose demo mode
```

### Real contract on Sepolia

1. Open `contracts/TodoList.sol` in [Remix](https://remix.ethereum.org) → compile.
2. (Tests) add `tests/*.sol`, enable the *Solidity unit testing* plugin → Run → expect `Passed: 12, Failed: 0`.
3. Deploy & Run → *Injected Provider – MetaMask* (Sepolia network, test ETH from a faucet) → Deploy.
4. Serve `frontend/` as above (MetaMask does not work on `file://`), click **Connect Wallet**, paste the contract address (or put it into `CONTRACT_ADDRESS` in `frontend/contract.js`).

> All data in this repository is randomly generated; brand names are anonymized. No contract address or private key is included.

Author: Dias Ayazbay (Blockchain Technologies course, topic #11).

## Кратко (RU)

Личный список задач как dApp в сети Ethereum (Sepolia). Каждый адрес MetaMask может добавлять, менять и удалять только свои задачи.
Смарт-контракт написан на Solidity, в Remix есть 12 unit-тестов.
Сайт работает с контрактом через ethers.js, а без MetaMask включается демо-режим в браузере.
