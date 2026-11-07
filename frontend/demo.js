// ─────────────────────────────────────────────────────────────
//  ДЕМО РЕЖИМІ
//  MetaMask орнатылмаған компьютерде интерфейсті көрсету үшін
//  TodoList.sol контрактының браузердегі үлгісі (имитация).
//  Деректер блокчейнге ЖАЗЫЛМАЙДЫ — бет жаңартылғанда жойылады.
//  Функциялар мен require() тексерулері контрактпен бірдей.
// ─────────────────────────────────────────────────────────────

class DemoTodoContract {
  constructor() {
    this.MAX_CONTENT_LENGTH_VALUE = 200;
    this.MAX_PRIORITY_VALUE = 2;
    this.tasks = new Map();   // mapping(uint256 => Task)
    this.count = 0;           // taskCount[msg.sender]
    this.block = 7_400_000;
    this._seed();
  }

  // ── көмекші функциялар ──
  _sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
  _now() { return Math.floor(Date.now() / 1000); }
  _hash() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  _revert(reason) {
    const err = new Error(`execution reverted: "${reason}"`);
    err.code = "CALL_EXCEPTION";
    err.reason = reason;
    throw err;
  }
  _validate(content, priority) {
    const len = new TextEncoder().encode(content).length;
    if (len === 0) this._revert("Content is empty");
    if (len > this.MAX_CONTENT_LENGTH_VALUE) this._revert("Content is too long");
    if (priority > this.MAX_PRIORITY_VALUE) this._revert("Invalid priority");
  }
  _exists(id) {
    id = Number(id);
    if (!(id > 0 && id <= this.count)) this._revert("Task not found");
    if (this.tasks.get(id).deleted) this._revert("Task was deleted");
    return this.tasks.get(id);
  }
  _copy(t) { return { ...t }; }

  // Транзакцияны имитациялау: алдымен тексеру, содан кейін «блокқа қосу»
  _tx(eventName, apply) {
    const hash = this._hash();
    return {
      hash,
      wait: async () => {
        await this._sleep(900);
        const args = apply();
        this.block += 1;
        return {
          hash,
          status: 1,
          blockNumber: this.block,
          gasUsed: BigInt(28000 + Math.floor(Math.random() * 60000)),
          demoEvents: [{ name: eventName, args }]
        };
      }
    };
  }

  _seed() {
    const now = this._now();
    const samples = [
      ["TodoList.sol смарт-контрактын жазу", 2, true],
      ["ethers.js арқылы MetaMask-ты қосу", 1, false],
      ["Sepolia желісіне Deploy жасау", 1, false],
      ["№7 зертханалық жұмысты қорғауға дайындалу", 2, false]
    ];
    samples.forEach(([content, priority, completed], i) => {
      const id = ++this.count;
      const createdAt = now - (samples.length - i) * 3600;
      this.tasks.set(id, {
        id, content, priority, completed, deleted: false,
        createdAt, completedAt: completed ? createdAt + 1800 : 0
      });
    });
  }

  // ── view функциялар ──
  async MAX_CONTENT_LENGTH() { return BigInt(this.MAX_CONTENT_LENGTH_VALUE); }

  async getTask(id) {
    await this._sleep(250);
    return this._copy(this._exists(id));
  }

  async getMyTasks() {
    await this._sleep(350);
    return [...this.tasks.values()].filter((t) => !t.deleted).map((t) => this._copy(t));
  }

  async getMyStats() {
    await this._sleep(150);
    const active = [...this.tasks.values()].filter((t) => !t.deleted);
    return [BigInt(active.length), BigInt(active.filter((t) => t.completed).length)];
  }

  // ── жазу функциялары ──
  async createTask(content, priority) {
    await this._sleep(500);
    this._validate(content, Number(priority));
    return this._tx("TaskCreated", () => {
      const id = ++this.count;
      this.tasks.set(id, {
        id, content, priority: Number(priority), completed: false, deleted: false,
        createdAt: this._now(), completedAt: 0
      });
      return { id: BigInt(id), content, priority: Number(priority) };
    });
  }

  async toggleCompleted(id) {
    await this._sleep(500);
    const task = this._exists(id);
    return this._tx("TaskToggled", () => {
      task.completed = !task.completed;
      task.completedAt = task.completed ? this._now() : 0;
      return { id: BigInt(task.id), completed: task.completed };
    });
  }

  async updateTask(id, content, priority) {
    await this._sleep(500);
    const task = this._exists(id);
    this._validate(content, Number(priority));
    if (task.completed) this._revert("Completed task cannot be edited");
    return this._tx("TaskUpdated", () => {
      task.content = content;
      task.priority = Number(priority);
      return { id: BigInt(task.id), content, priority: Number(priority) };
    });
  }

  async deleteTask(id) {
    await this._sleep(500);
    const task = this._exists(id);
    return this._tx("TaskDeleted", () => {
      task.deleted = true;
      return { id: BigInt(task.id) };
    });
  }
}
