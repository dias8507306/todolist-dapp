// ─────────────────────────────────────────────────────────────
//  Смарт-контракт баптаулары
//  1) Remix-те TodoList.sol контрактын Deploy жасаңыз
//  2) Контракт адресін төмендегі CONTRACT_ADDRESS-ке қойыңыз
//     (немесе сайттағы «Контракт» өрісіне енгізіңіз)
// ─────────────────────────────────────────────────────────────

const CONTRACT_ADDRESS = "";

// ABI (Application Binary Interface) — сайт пен контракт арасындағы «келісім»:
// қандай функциялар бар, қандай параметрлер қабылдайды, не қайтарады.
const TASK_TUPLE = {
  internalType: "struct TodoList.Task",
  name: "",
  type: "tuple",
  components: [
    { internalType: "uint256", name: "id", type: "uint256" },
    { internalType: "string", name: "content", type: "string" },
    { internalType: "uint8", name: "priority", type: "uint8" },
    { internalType: "bool", name: "completed", type: "bool" },
    { internalType: "bool", name: "deleted", type: "bool" },
    { internalType: "uint256", name: "createdAt", type: "uint256" },
    { internalType: "uint256", name: "completedAt", type: "uint256" }
  ]
};

const CONTRACT_ABI = [
  // ── Оқиғалар (events) ──
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
      { indexed: false, internalType: "string", name: "content", type: "string" },
      { indexed: false, internalType: "uint8", name: "priority", type: "uint8" }
    ],
    name: "TaskCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" }
    ],
    name: "TaskDeleted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
      { indexed: false, internalType: "bool", name: "completed", type: "bool" }
    ],
    name: "TaskToggled",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
      { indexed: false, internalType: "string", name: "content", type: "string" },
      { indexed: false, internalType: "uint8", name: "priority", type: "uint8" }
    ],
    name: "TaskUpdated",
    type: "event"
  },

  // ── Тұрақтылар және public mapping-тер (view) ──
  {
    inputs: [],
    name: "MAX_CONTENT_LENGTH",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "MAX_PRIORITY",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "activeTaskCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "taskCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },

  // ── Жазу функциялары (транзакция) ──
  {
    inputs: [
      { internalType: "string", name: "_content", type: "string" },
      { internalType: "uint8", name: "_priority", type: "uint8" }
    ],
    name: "createTask",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
    name: "toggleCompleted",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "_id", type: "uint256" },
      { internalType: "string", name: "_content", type: "string" },
      { internalType: "uint8", name: "_priority", type: "uint8" }
    ],
    name: "updateTask",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
    name: "deleteTask",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },

  // ── Оқу функциялары (view) ──
  {
    inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
    name: "getTask",
    outputs: [TASK_TUPLE],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getMyTasks",
    outputs: [{ ...TASK_TUPLE, internalType: "struct TodoList.Task[]", type: "tuple[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getMyStats",
    outputs: [
      { internalType: "uint256", name: "total", type: "uint256" },
      { internalType: "uint256", name: "done", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  }
];
