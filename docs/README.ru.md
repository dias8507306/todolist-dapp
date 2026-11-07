# To-Do List dApp — Жеке тапсырмалар тізімі

**Студент:** Аязбай Диас · **Пән:** Блокчейн технологиялары · **Тема №11:** To-Do List

Децентрализованное приложение: каждый пользователь (адрес MetaMask) ведёт свой список задач в смарт-контракте Ethereum (Sepolia).

```
Frontend (HTML/CSS/JS) → MetaMask + ethers.js (ABI) → Ethereum Sepolia → TodoList.sol
```

## Структура проекта

```
todo-dapp/
├── contracts/
│   └── TodoList.sol          ← смарт-контракт (Solidity ^0.8.20)
├── tests/
│   ├── TodoList_test.sol     ← 12 unit-тестов для Remix
│   └── OtherUser.sol         ← вспомогательный контракт («второй пользователь»)
└── frontend/
    ├── index.html            ← сайт
    ├── style.css
    ├── app.js                ← логика: MetaMask, ethers.js, транзакции
    ├── contract.js           ← адрес контракта + ABI
    └── demo.js               ← демо-режим без MetaMask
```

## Смарт-контракт

**Данные:**

```solidity
struct Task {
    uint256 id;  string content;  uint8 priority;   // 0 төмен, 1 орташа, 2 жоғары
    bool completed;  bool deleted;  uint256 createdAt;  uint256 completedAt;
}
mapping(address => mapping(uint256 => Task)) private tasks;  // владелец → id → задача
mapping(address => uint256) public taskCount;                 // сколько задач создано
mapping(address => uint256) public activeTaskCount;           // сколько не удалено
```

**Функции:**

| Функция | Тип | Что делает |
|---|---|---|
| `createTask(content, priority)` | транзакция | добавить задачу |
| `toggleCompleted(id)` | транзакция | отметить выполненной / вернуть |
| `updateTask(id, content, priority)` | транзакция | изменить текст и важность |
| `deleteTask(id)` | транзакция | удалить (ставится флаг `deleted`) |
| `getTask(id)` | view | одна задача по ID |
| `getMyTasks()` | view | все мои задачи |
| `getMyStats()` | view | всего / выполнено |

**Проверки `require()`:** пустой текст, текст длиннее 200 байт, приоритет > 2, задача не найдена, задача удалена, выполненную задачу нельзя редактировать. Каждый пользователь видит и меняет только свои задачи (через `msg.sender`).

**События:** `TaskCreated`, `TaskUpdated`, `TaskToggled`, `TaskDeleted`.

## Запуск — шаг за шагом

### 1. Контракт в Remix

1. Откройте [remix.ethereum.org](https://remix.ethereum.org), создайте workspace, папки `contracts` и `tests`.
2. Загрузите `contracts/TodoList.sol` → вкладка **Solidity Compiler** → **Compile TodoList.sol**.
3. (Тесты) Загрузите `tests/TodoList_test.sol` и `tests/OtherUser.sol` → **Plugin manager** → включите **Solidity unit testing** → **Run**. Должно быть **Passed: 12, Failed: 0**.

### 2. Deploy в Sepolia

1. В MetaMask выберите сеть **Sepolia** и получите тестовые ETH (Sepolia faucet — например, Google Cloud Web3 faucet).
2. Remix → **Deploy & Run** → Environment: **Injected Provider – MetaMask** → Contract: `TodoList` → **Deploy** → подтвердите в MetaMask.
3. Скопируйте адрес контракта из раздела **Deployed Contracts**.

### 3. Сайт

MetaMask не работает со страницами `file://`, поэтому сайт нужно открыть через локальный сервер:

- **VS Code:** откройте папку `frontend` → правой кнопкой по `index.html` → **Open with Live Server**;
- **или** в терминале: `cd frontend` → `python -m http.server 8000` → откройте http://localhost:8000

Затем: **Connect Wallet** → вставьте адрес контракта → **Контрактқа қосылу**. Адрес запоминается в браузере; можно также сразу вписать его в `CONTRACT_ADDRESS` в `frontend/contract.js`.

> Если MetaMask не установлен, сайт предложит **демо-режим** — копию логики контракта прямо в браузере (без блокчейна), удобно показать интерфейс.

## Что умеет сайт

- подключение MetaMask, адрес, сеть, баланс; реакция на смену аккаунта/сети;
- проверка, что по адресу действительно развёрнут TodoList;
- добавление задачи с важностью и счётчиком байтов (200 байт ≈ 100 кириллических символов);
- отметка выполнения, редактирование, удаление — каждое действие отдельная транзакция;
- поиск по ID (`getTask`), фильтры «Барлығы / Белсенді / Орындалған», поиск по тексту;
- статистика и прогресс (`getMyStats`);
- журнал транзакций: хеш (ссылка на Sepolia Etherscan), блок, газ, ошибки `require()` на казахском.

## Шпаргалка к защите

- **dApp vs обычный сайт:** данные и правила хранятся не на сервере, а в смарт-контракте блокчейна; изменить их можно только транзакцией, подписанной владельцем кошелька.
- **MetaMask** хранит ключ и подписывает транзакции; **ethers.js** отправляет запросы в сеть; **ABI** описывает функции контракта, чтобы JS мог их вызывать.
- **struct** — структура задачи; **mapping** — «словарь» адрес → id → задача; **require()** — проверка условий, при ошибке транзакция откатывается.
- **Меняют данные (газ):** `createTask`, `toggleCompleted`, `updateTask`, `deleteTask`. **Только читают (бесплатно):** `getTask`, `getMyTasks`, `getMyStats`, `taskCount`, `activeTaskCount`.
- **«Жеке» не значит «секретный»:** блокчейн публичный, прочитать данные может любой, но изменить свой список может только его владелец.
