// ─────────────────────────────────────────────────────────────
//  To-Do List dApp — негізгі логика
//  Frontend → MetaMask / ethers.js → Ethereum → TodoList.sol
//  Автор: Аязбай Диас
// ─────────────────────────────────────────────────────────────
"use strict";

const MAX_BYTES = 200;
const PRIORITY_LABELS = ["Төмен", "Орташа", "Жоғары"];
const STORAGE_KEY = "todo-dapp:contract-address";

const NETWORKS = {
  1: "Ethereum Mainnet",
  11155111: "Sepolia testnet",
  17000: "Holesky testnet",
  31337: "Localhost 8545",
  1337: "Localhost (Ganache)",
  5777: "Ganache"
};

const EXPLORERS = {
  1: "https://etherscan.io",
  11155111: "https://sepolia.etherscan.io",
  17000: "https://holesky.etherscan.io"
};

// Контракттағы require() хабарламаларының қазақша аудармасы
const REVERT_MESSAGES = {
  "Content is empty": "Тапсырма мәтіні бос болмауы керек.",
  "Content is too long": "Мәтін тым ұзын (ең көбі 200 байт).",
  "Invalid priority": "Маңыздылық деңгейі қате (0, 1 немесе 2).",
  "Task not found": "Мұндай ID-мен тапсырма табылмады.",
  "Task was deleted": "Бұл тапсырма өшірілген.",
  "Completed task cannot be edited": "Орындалған тапсырманы өзгертуге болмайды."
};

// ── Қосымшаның күйі ──
const state = {
  mode: null,          // "wallet" | "demo"
  provider: null,      // ethers.BrowserProvider
  signer: null,        // MetaMask аккаунты (транзакцияға қол қояды)
  account: null,
  chainId: null,
  contract: null,      // ethers.Contract немесе DemoTodoContract
  tasks: [],
  stats: { total: 0, done: 0 },
  filter: "all",
  search: "",
  busy: new Set(),     // транзакциясы жүріп жатқан тапсырмалар
  loading: false
};

const $ = (id) => document.getElementById(id);
const ui = {
  connectBtn: $("connectBtn"),
  accountChip: $("accountChip"),
  accountShort: $("accountShort"),
  networkBadge: $("networkBadge"),
  banner: $("banner"),
  walletStatus: $("walletStatus"),
  walletAddress: $("walletAddress"),
  walletNetwork: $("walletNetwork"),
  walletBalance: $("walletBalance"),
  contractInput: $("contractInput"),
  contractBtn: $("contractBtn"),
  contractStatus: $("contractStatus"),
  addForm: $("addForm"),
  taskInput: $("taskInput"),
  priorityInput: $("priorityInput"),
  byteCounter: $("byteCounter"),
  addBtn: $("addBtn"),
  findForm: $("findForm"),
  findInput: $("findInput"),
  findBtn: $("findBtn"),
  findResult: $("findResult"),
  refreshBtn: $("refreshBtn"),
  statTotal: $("statTotal"),
  statDone: $("statDone"),
  statLeft: $("statLeft"),
  statPercent: $("statPercent"),
  progressBar: $("progressBar"),
  searchInput: $("searchInput"),
  taskList: $("taskList"),
  emptyState: $("emptyState"),
  emptyText: $("emptyText"),
  txLog: $("txLog"),
  txEmpty: $("txEmpty"),
  clearLogBtn: $("clearLogBtn"),
  toasts: $("toasts"),
  editDialog: $("editDialog"),
  editForm: $("editForm"),
  editId: $("editId"),
  editText: $("editText"),
  editCounter: $("editCounter"),
  editPriority: $("editPriority"),
  editCancel: $("editCancel")
};

// ═════════════════════════ Көмекші функциялар ═════════════════════════

const utf8Bytes = (s) => new TextEncoder().encode(s).length;
const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
const shortHash = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "");

function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(Number(ts) * 1000);
  try {
    return d.toLocaleString(["kk-KZ", "ru-RU"], { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return d.toLocaleString();
  }
}

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v; // тек статикалық SVG үшін
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

const ICONS = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
};

function toast(message, type = "info") {
  const node = h("div", { class: `toast ${type}`, text: message });
  ui.toasts.append(node);
  setTimeout(() => node.remove(), type === "err" ? 6500 : 4000);
}

function setLoading(btn, on) {
  btn.classList.toggle("loading", on);
  btn.disabled = on || btn.dataset.forceDisabled === "1";
}

// ethers / MetaMask қатесін түсінікті мәтінге айналдыру
function humanError(err) {
  if (!err) return "Белгісіз қате.";
  const code = err.code ?? err?.info?.error?.code ?? err?.error?.code;
  if (code === "ACTION_REJECTED" || code === 4001) return "Транзакция MetaMask-та қабылданбады.";
  if (code === "INSUFFICIENT_FUNDS") return "Газ төлеуге ETH жеткіліксіз. Sepolia faucet арқылы тестілік ETH алыңыз.";

  const candidates = [err.reason, err.shortMessage, err?.info?.error?.message, err?.error?.message, err.message]
    .filter(Boolean).join(" | ");
  for (const [en, kk] of Object.entries(REVERT_MESSAGES)) {
    if (candidates.includes(en)) return kk;
  }
  if (/insufficient funds/i.test(candidates)) return "Газ төлеуге ETH жеткіліксіз.";
  if (/could not decode result data|BAD_DATA/i.test(candidates)) return "Контракт жауап бермеді: адрес пен желіні тексеріңіз.";
  return err.shortMessage || err.reason || err.message || String(err);
}

// ═════════════════════════ Әмиянды қосу ═════════════════════════

async function connectWallet() {
  if (!window.ethereum) {
    showNoWalletBanner();
    return false;
  }
  if (!window.ethers) {
    toast("ethers.js кітапханасы жүктелмеді. Интернет байланысын тексеріңіз.", "err");
    return false;
  }
  setLoading(ui.connectBtn, true);
  try {
    state.provider = new ethers.BrowserProvider(window.ethereum);
    await state.provider.send("eth_requestAccounts", []); // MetaMask терезесі ашылады
    state.signer = await state.provider.getSigner();
    state.account = await state.signer.getAddress();
    state.chainId = Number((await state.provider.getNetwork()).chainId);
    state.mode = "wallet";
    hideBanner();
    await renderWallet();
    toast("Әмиян қосылды: " + shortAddr(state.account), "ok");

    const saved = ui.contractInput.value.trim();
    if (saved) await connectContract(saved);
    else { updateControls(); renderTasks(); }
    return true;
  } catch (err) {
    toast(humanError(err), "err");
    return false;
  } finally {
    setLoading(ui.connectBtn, false);
  }
}

function startDemo() {
  state.mode = "demo";
  state.account = "0xDe30000000000000000000000000000000000000";
  state.chainId = null;
  state.contract = new DemoTodoContract();
  ui.contractInput.value = "DEMO (браузердегі имитация)";
  ui.contractInput.disabled = true;
  ui.contractBtn.disabled = true;
  ui.contractBtn.dataset.forceDisabled = "1";
  setContractStatus("Демо-контракт іске қосылды. Деректер блокчейнге жазылмайды.", "ok");
  showBanner("info", "ДЕМО РЕЖИМІ: MetaMask табылмады, сондықтан контракттың браузердегі үлгісі қолданылуда. Нақты блокчейнмен жұмыс істеу үшін MetaMask орнатыңыз.");
  renderWallet();
  updateControls();
  loadTasks();
}

async function renderWallet() {
  const connected = !!state.account;
  ui.connectBtn.hidden = connected;
  ui.accountChip.hidden = !connected;
  ui.accountShort.textContent = shortAddr(state.account);

  if (state.mode === "demo") {
    ui.walletStatus.textContent = "Демо режимі";
    ui.walletAddress.textContent = shortAddr(state.account);
    ui.walletNetwork.textContent = "Имитация (блокчейнсіз)";
    ui.walletBalance.textContent = "—";
    ui.networkBadge.hidden = false;
    ui.networkBadge.className = "badge badge-warn";
    ui.networkBadge.textContent = "DEMO";
    return;
  }
  if (!connected) {
    ui.walletStatus.textContent = "Қосылмаған";
    ui.walletAddress.textContent = "—";
    ui.walletNetwork.textContent = "—";
    ui.walletBalance.textContent = "—";
    ui.networkBadge.hidden = true;
    return;
  }

  const netName = NETWORKS[state.chainId] || `Chain ID ${state.chainId}`;
  ui.walletStatus.textContent = "Қосылды ✓";
  ui.walletAddress.textContent = shortAddr(state.account);
  ui.walletAddress.title = state.account;
  ui.walletNetwork.textContent = netName;
  ui.networkBadge.hidden = false;
  ui.networkBadge.textContent = netName;
  ui.networkBadge.className = "badge " + (state.chainId === 1 ? "badge-warn" : "badge-ok");
  if (state.chainId === 1) toast("Назар аударыңыз: Mainnet — нақты ETH жұмсалады. Sepolia желісін таңдаңыз.", "err");

  try {
    const wei = await state.provider.getBalance(state.account);
    ui.walletBalance.textContent = Number(ethers.formatEther(wei)).toFixed(4) + " ETH";
  } catch {
    ui.walletBalance.textContent = "—";
  }
}

function resetWallet() {
  Object.assign(state, { mode: null, provider: null, signer: null, account: null, chainId: null, contract: null, tasks: [] });
  state.stats = { total: 0, done: 0 };
  setContractStatus("Remix-те Deploy жасалған контракт адресін енгізіңіз.");
  renderWallet();
  renderTasks();
  updateControls();
}

// MetaMask-тағы өзгерістерді тыңдау
if (window.ethereum?.on) {
  window.ethereum.on("accountsChanged", async (accounts) => {
    if (state.mode !== "wallet") return;
    if (!accounts.length) {
      resetWallet();
      toast("Әмиян ажыратылды.");
      return;
    }
    state.signer = await state.provider.getSigner();
    state.account = await state.signer.getAddress();
    await renderWallet();
    if (state.contract) {
      state.contract = state.contract.connect(state.signer);
      await loadTasks();
    }
    toast("Аккаунт ауыстырылды: " + shortAddr(state.account));
  });
  // Желі ауысқанда бетті қайта жүктеу (MetaMask ұсынымы)
  window.ethereum.on("chainChanged", () => window.location.reload());
}

// ═════════════════════════ Контрактқа қосылу ═════════════════════════

function setContractStatus(text, type = "") {
  ui.contractStatus.textContent = text;
  ui.contractStatus.className = "hint" + (type ? " " + type : "");
}

async function connectContract(address) {
  address = (address || "").trim();
  ui.contractInput.classList.remove("invalid");
  if (!window.ethereum) { showNoWalletBanner(); return false; }
  if (!window.ethers) { toast("ethers.js кітапханасы жүктелмеді. Интернет байланысын тексеріңіз.", "err"); return false; }
  if (!ethers.isAddress(address)) {
    ui.contractInput.classList.add("invalid");
    setContractStatus("Адрес қате: 0x-тан басталатын 42 таңбалы адрес енгізіңіз.", "err");
    return false;
  }
  // Әмиян әлі қосылмаған болса — алдымен әмиян (ол өзі осы адреске қосылады)
  if (state.mode !== "wallet") return connectWallet();

  setLoading(ui.contractBtn, true);
  try {
    // 1) Осы желіде адресте код бар ма?
    const code = await state.provider.getCode(address);
    if (code === "0x") {
      throw new Error(`Бұл адресте контракт жоқ (${NETWORKS[state.chainId] || "chain " + state.chainId}). Желіні тексеріңіз.`);
    }
    // 2) ABI + адрес + signer → ethers.Contract
    const contract = new ethers.Contract(address, CONTRACT_ABI, state.signer);
    // 3) Бұл шынымен TodoList контракты ма?
    const max = await contract.MAX_CONTENT_LENGTH();
    if (Number(max) !== MAX_BYTES) throw new Error("Бұл адрестегі контракт TodoList емес сияқты.");

    state.contract = contract;
    ui.contractInput.value = ethers.getAddress(address);
    try { localStorage.setItem(STORAGE_KEY, ui.contractInput.value); } catch { /* жеке режим */ }
    setContractStatus("Контракт қосылды ✓ " + shortAddr(address), "ok");
    updateControls();
    await loadTasks();
    return true;
  } catch (err) {
    state.contract = null;
    ui.contractInput.classList.add("invalid");
    const msg = err.message?.startsWith("Бұл") ? err.message : humanError(err);
    setContractStatus(msg, "err");
    updateControls();
    renderTasks();
    return false;
  } finally {
    setLoading(ui.contractBtn, false);
  }
}

// ═════════════════════════ Деректерді оқу (view) ═════════════════════════

function normalizeTask(t) {
  return {
    id: Number(t.id),
    content: t.content,
    priority: Number(t.priority),
    completed: Boolean(t.completed),
    createdAt: Number(t.createdAt),
    completedAt: Number(t.completedAt)
  };
}

async function loadTasks() {
  if (!state.contract) return;
  state.loading = true;
  renderTasks();
  setLoading(ui.refreshBtn, true);
  try {
    // getMyTasks() және getMyStats() — view функциялар: газ қажет емес
    const [list, stats] = await Promise.all([state.contract.getMyTasks(), state.contract.getMyStats()]);
    state.tasks = Array.from(list, normalizeTask);
    state.stats = { total: Number(stats[0]), done: Number(stats[1]) };
  } catch (err) {
    toast("Тапсырмаларды оқу мүмкін болмады: " + humanError(err), "err");
  } finally {
    state.loading = false;
    setLoading(ui.refreshBtn, false);
    updateControls();
    renderTasks();
  }
}

// ═════════════════════════ Транзакциялар (жазу) ═════════════════════════

let txCounter = 0;

function logTx(title) {
  const id = ++txCounter;
  const item = h("li", { class: "tx pending", "data-tx": id },
    h("span", { class: "tx-dot" }),
    h("div", {},
      h("div", { class: "tx-title", text: title }),
      h("div", { class: "tx-sub", text: state.mode === "demo" ? "Демо транзакция дайындалуда…" : "MetaMask-та растауды күтуде…" })
    ),
    h("span", { class: "tx-status", text: "Күтуде…" })
  );
  ui.txLog.prepend(item);
  ui.txEmpty.hidden = true;

  const sub = item.querySelector(".tx-sub");
  const status = item.querySelector(".tx-status");
  const hashNode = (hash) => {
    const explorer = EXPLORERS[state.chainId];
    return explorer
      ? h("a", { href: `${explorer}/tx/${hash}`, target: "_blank", rel: "noopener", class: "mono", text: shortHash(hash) })
      : h("span", { class: "mono", title: hash, text: shortHash(hash) });
  };

  return {
    sent(hash) {
      sub.replaceChildren("Tx: ", hashNode(hash), " · блокқа қосылуда…");
      status.textContent = "Майнинг…";
    },
    ok(hash, receipt) {
      item.className = "tx ok";
      sub.replaceChildren("Tx: ", hashNode(hash), ` · блок #${receipt.blockNumber} · газ ${receipt.gasUsed.toString()}`);
      status.textContent = "Расталды ✓";
    },
    fail(message) {
      item.className = "tx fail";
      sub.textContent = message;
      status.textContent = "Қате ✗";
    }
  };
}

// Транзакцияны жіберу → блокқа қосылғанын күту → тізімді жаңарту
async function sendTx(title, call, taskId = null) {
  const entry = logTx(title);
  if (taskId != null) { state.busy.add(taskId); renderTasks(); }
  try {
    const tx = await call();          // MetaMask қол қояды, транзакция желіге жіберіледі
    entry.sent(tx.hash);
    const receipt = await tx.wait();  // блокқа қосылуын күту
    entry.ok(tx.hash, receipt);
    return receipt;
  } catch (err) {
    const msg = humanError(err);
    entry.fail(msg);
    toast(msg, "err");
    return null;
  } finally {
    if (taskId != null) state.busy.delete(taskId);
    await loadTasks();
  }
}

function findEvent(receipt, name) {
  if (!receipt) return null;
  if (receipt.demoEvents) return receipt.demoEvents.find((e) => e.name === name) || null;
  for (const log of receipt.logs || []) {
    try {
      const parsed = state.contract.interface.parseLog(log);
      if (parsed?.name === name) return parsed;
    } catch { /* басқа контракттың логы */ }
  }
  return null;
}

// ── createTask ──
async function addTask(e) {
  e.preventDefault();
  const content = ui.taskInput.value.trim();
  const priority = Number(ui.priorityInput.value);
  if (!validateText(content)) return;

  setLoading(ui.addBtn, true);
  const receipt = await sendTx(`createTask — «${content.slice(0, 40)}»`, () => state.contract.createTask(content, priority));
  setLoading(ui.addBtn, false);
  if (receipt) {
    const ev = findEvent(receipt, "TaskCreated");
    ui.taskInput.value = "";
    updateCounter(ui.taskInput, ui.byteCounter);
    toast(ev ? `Тапсырма #${ev.args.id} блокчейнге жазылды ✓` : "Тапсырма блокчейнге жазылды ✓", "ok");
  }
  updateControls();
}

// ── toggleCompleted ──
async function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  const label = task?.completed ? "орындалмаған деп белгілеу" : "орындалды деп белгілеу";
  const receipt = await sendTx(`toggleCompleted(#${id}) — ${label}`, () => state.contract.toggleCompleted(id), id);
  if (receipt) toast(`#${id} тапсырмасының күйі өзгерді ✓`, "ok");
}

// ── updateTask ──
function openEdit(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  ui.editDialog.dataset.id = id;
  ui.editId.textContent = "#" + id;
  ui.editText.value = task.content;
  ui.editPriority.value = String(task.priority);
  updateCounter(ui.editText, ui.editCounter);
  ui.editDialog.showModal();
  ui.editText.focus();
}

async function saveEdit(e) {
  e.preventDefault();
  const id = Number(ui.editDialog.dataset.id);
  const content = ui.editText.value.trim();
  const priority = Number(ui.editPriority.value);
  if (!validateText(content)) return;
  const task = state.tasks.find((t) => t.id === id);
  if (task && task.content === content && task.priority === priority) {
    ui.editDialog.close();
    return;
  }
  ui.editDialog.close();
  const receipt = await sendTx(`updateTask(#${id})`, () => state.contract.updateTask(id, content, priority), id);
  if (receipt) toast(`#${id} тапсырмасы өзгертілді ✓`, "ok");
}

// ── deleteTask ──
async function removeTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!confirm(`#${id} «${task?.content ?? ""}» тапсырмасын өшіру керек пе?`)) return;
  const receipt = await sendTx(`deleteTask(#${id})`, () => state.contract.deleteTask(id), id);
  if (receipt) toast(`#${id} тапсырмасы өшірілді`, "ok");
}

// ── getTask (ID бойынша іздеу) ──
async function findTask(e) {
  e.preventDefault();
  const id = Number(ui.findInput.value);
  if (!Number.isInteger(id) || id < 1) {
    showFindResult("err", h("span", { text: "ID — 1-ден бастап бүтін сан болуы керек." }));
    return;
  }
  setLoading(ui.findBtn, true);
  try {
    const t = normalizeTask(await state.contract.getTask(id));
    showFindResult("ok",
      h("h4", { text: `Тапсырма #${t.id}` }),
      h("dl", {},
        h("dt", { text: "Мәтін:" }), h("dd", { text: t.content }),
        h("dt", { text: "Маңыздылығы:" }), h("dd", { text: PRIORITY_LABELS[t.priority] }),
        h("dt", { text: "Күйі:" }), h("dd", { text: t.completed ? "Орындалды ✓" : "Орындалмаған" }),
        h("dt", { text: "Құрылды:" }), h("dd", { text: formatDate(t.createdAt) }),
        t.completed ? h("dt", { text: "Орындалды:" }) : null,
        t.completed ? h("dd", { text: formatDate(t.completedAt) }) : null
      )
    );
  } catch (err) {
    showFindResult("err", h("span", { text: humanError(err) }));
  } finally {
    setLoading(ui.findBtn, false);
  }
}

function showFindResult(type, ...children) {
  ui.findResult.hidden = false;
  ui.findResult.className = "find-result " + type;
  ui.findResult.replaceChildren(...children);
}

// ═════════════════════════ Интерфейсті салу ═════════════════════════

function validateText(content) {
  const bytes = utf8Bytes(content);
  if (bytes === 0) { toast(REVERT_MESSAGES["Content is empty"], "err"); return false; }
  if (bytes > MAX_BYTES) { toast(REVERT_MESSAGES["Content is too long"], "err"); return false; }
  return true;
}

function updateCounter(input, counter) {
  const bytes = utf8Bytes(input.value.trim());
  counter.textContent = `${bytes} / ${MAX_BYTES} байт`;
  counter.classList.toggle("over", bytes > MAX_BYTES);
  input.classList.toggle("invalid", bytes > MAX_BYTES);
  return bytes;
}

function updateControls() {
  const ready = !!state.contract;
  const bytes = utf8Bytes(ui.taskInput.value.trim());
  if (!ui.addBtn.classList.contains("loading")) ui.addBtn.disabled = !ready || bytes === 0 || bytes > MAX_BYTES;
  if (!ui.findBtn.classList.contains("loading")) ui.findBtn.disabled = !ready;
  if (!ui.refreshBtn.classList.contains("loading")) ui.refreshBtn.disabled = !ready;
}

function renderStats() {
  const { total, done } = state.stats;
  const pct = total ? Math.round((done / total) * 100) : 0;
  ui.statTotal.textContent = total;
  ui.statDone.textContent = done;
  ui.statLeft.textContent = total - done;
  ui.statPercent.textContent = `${pct}% орындалды`;
  ui.progressBar.style.width = pct + "%";
}

function renderTasks() {
  renderStats();

  const q = state.search.toLowerCase();
  const visible = state.tasks
    .filter((t) => state.filter === "all" || (state.filter === "done" ? t.completed : !t.completed))
    .filter((t) => !q || t.content.toLowerCase().includes(q) || String(t.id) === q.replace("#", ""))
    .sort((a, b) => a.completed - b.completed || b.priority - a.priority || a.id - b.id);

  ui.taskList.replaceChildren(...visible.map(renderTask));

  let empty = "";
  if (!state.account) empty = "Тапсырмаларды көру үшін әмиянды қосыңыз (Connect Wallet).";
  else if (!state.contract) empty = "Контракт адресін енгізіп, «Контрактқа қосылу» батырмасын басыңыз.";
  else if (state.loading && !state.tasks.length) empty = "Блокчейннен оқылуда…";
  else if (!state.tasks.length) empty = "Әзірге тапсырма жоқ. Сол жақтағы формадан алғашқы тапсырманы қосыңыз.";
  else if (!visible.length) empty = "Сүзгіге сәйкес тапсырма жоқ.";
  ui.emptyText.textContent = empty;
  ui.emptyState.hidden = !empty;
}

function renderTask(t) {
  const busy = state.busy.has(t.id);
  return h("li", { class: `task${t.completed ? " done" : ""}${busy ? " pending" : ""}`, "data-id": t.id },
    h("button", {
      class: "check", "data-action": "toggle",
      title: t.completed ? "Орындалмаған деп белгілеу" : "Орындалды деп белгілеу",
      "aria-label": "toggleCompleted", html: ICONS.check
    }),
    h("div", {},
      h("p", { class: "task-text", text: t.content }),
      h("div", { class: "task-meta" },
        h("span", { class: "task-id", text: "#" + t.id }),
        h("span", { class: `prio prio-${t.priority}`, text: PRIORITY_LABELS[t.priority] ?? t.priority }),
        h("span", { text: "Құрылды: " + formatDate(t.createdAt) }),
        t.completed ? h("span", { text: "Орындалды: " + formatDate(t.completedAt) }) : null,
        busy ? h("span", { text: "⏳ транзакция…" }) : null
      )
    ),
    h("div", { class: "task-actions" },
      h("button", {
        class: "icon-btn", "data-action": "edit", html: ICONS.edit,
        title: t.completed ? "Орындалған тапсырманы өзгертуге болмайды" : "Өзгерту",
        disabled: t.completed
      }),
      h("button", { class: "icon-btn del", "data-action": "delete", title: "Өшіру", html: ICONS.trash })
    )
  );
}

// ═════════════════════════ Банер ═════════════════════════

function showBanner(type, text, actions = []) {
  ui.banner.className = "banner " + type;
  ui.banner.replaceChildren(h("span", { text }));
  if (actions.length) ui.banner.append(h("div", { class: "banner-actions" }, actions));
  ui.banner.hidden = false;
}
function hideBanner() { ui.banner.hidden = true; }

function showNoWalletBanner() {
  const demoBtn = h("button", { class: "btn btn-secondary btn-sm", text: "Демо режимін ашу" });
  demoBtn.addEventListener("click", startDemo);
  const install = h("a", { class: "btn btn-ghost btn-sm", href: "https://metamask.io/download/", target: "_blank", rel: "noopener", text: "MetaMask орнату" });
  showBanner("warn", "MetaMask табылмады. Орнатыңыз немесе интерфейсті демо режимінде қараңыз.", [install, demoBtn]);
}

// ═════════════════════════ Оқиғаларды байланыстыру ═════════════════════════

ui.connectBtn.addEventListener("click", connectWallet);
ui.contractBtn.addEventListener("click", () => connectContract(ui.contractInput.value));
ui.contractInput.addEventListener("keydown", (e) => { if (e.key === "Enter") connectContract(ui.contractInput.value); });
ui.addForm.addEventListener("submit", addTask);
ui.taskInput.addEventListener("input", () => { updateCounter(ui.taskInput, ui.byteCounter); updateControls(); });
ui.taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!ui.addBtn.disabled) ui.addForm.requestSubmit(); }
});
ui.findForm.addEventListener("submit", findTask);
ui.refreshBtn.addEventListener("click", loadTasks);
ui.searchInput.addEventListener("input", () => { state.search = ui.searchInput.value.trim(); renderTasks(); });
ui.clearLogBtn.addEventListener("click", () => { ui.txLog.replaceChildren(); ui.txEmpty.hidden = false; });

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    state.filter = tab.dataset.filter;
    renderTasks();
  });
});

ui.taskList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn || btn.disabled) return;
  const id = Number(btn.closest(".task").dataset.id);
  if (state.busy.has(id)) return;
  ({ toggle: toggleTask, edit: openEdit, delete: removeTask })[btn.dataset.action]?.(id);
});

ui.editForm.addEventListener("submit", saveEdit);
ui.editCancel.addEventListener("click", () => ui.editDialog.close());
ui.editText.addEventListener("input", () => updateCounter(ui.editText, ui.editCounter));

// ═════════════════════════ Іске қосу ═════════════════════════

(function init() {
  let saved = "";
  try { saved = localStorage.getItem(STORAGE_KEY) || ""; } catch { /* жеке режим */ }
  ui.contractInput.value = CONTRACT_ADDRESS || saved;

  renderWallet();
  renderTasks();
  updateControls();

  if (!window.ethereum) {
    showNoWalletBanner();
    return;
  }
  // Егер сайт бұрын рұқсат алған болса — автоматты түрде қосылу (терезе ашылмайды)
  window.ethereum.request({ method: "eth_accounts" })
    .then((accounts) => { if (accounts.length) connectWallet(); })
    .catch(() => {});
})();
