// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  TodoList — жеке тапсырмалар тізімі (dApp)
 * @author Аязбай Диас
 * @notice Әр пайдаланушының (MetaMask адресінің) өз тапсырмалар тізімі бар.
 *         Тапсырманы тек оның иесі ғана қоса, өзгерте және өшіре алады.
 * @dev    Блокчейн жария: деректерді кез келген адам оқи алады,
 *         бірақ өзгертуге тек иесінің ғана құқығы бар (msg.sender).
 */
contract TodoList {
    // ─────────────────────────── Тұрақтылар ───────────────────────────

    /// @notice Тапсырма мәтінінің ең үлкен ұзындығы (байтпен)
    uint256 public constant MAX_CONTENT_LENGTH = 200;

    /// @notice Маңыздылық деңгейі: 0 — төмен, 1 — орташа, 2 — жоғары
    uint8 public constant MAX_PRIORITY = 2;

    // ───────────────────────── Деректер құрылымы ─────────────────────────

    struct Task {
        uint256 id;          // тапсырма нөмірі (1, 2, 3, ...)
        string content;      // тапсырма мәтіні
        uint8 priority;      // маңыздылығы (0..2)
        bool completed;      // орындалды ма?
        bool deleted;        // өшірілді ме?
        uint256 createdAt;   // құрылған уақыты (unix timestamp)
        uint256 completedAt; // орындалған уақыты (0 — әлі орындалмаған)
    }

    /// @dev иесінің адресі => (тапсырма id => Task)
    mapping(address => mapping(uint256 => Task)) private tasks;

    /// @notice иесінің адресі => барлық құрылған тапсырмалар саны (соңғы id)
    mapping(address => uint256) public taskCount;

    /// @notice иесінің адресі => өшірілмеген (белсенді) тапсырмалар саны
    mapping(address => uint256) public activeTaskCount;

    // ───────────────────────────── Оқиғалар ─────────────────────────────

    event TaskCreated(address indexed owner, uint256 indexed id, string content, uint8 priority);
    event TaskUpdated(address indexed owner, uint256 indexed id, string content, uint8 priority);
    event TaskToggled(address indexed owner, uint256 indexed id, bool completed);
    event TaskDeleted(address indexed owner, uint256 indexed id);

    // ─────────────────────────── Тексерулер ───────────────────────────

    /// @dev Тапсырма бар және өшірілмеген болуы керек
    modifier taskExists(uint256 _id) {
        require(_id > 0 && _id <= taskCount[msg.sender], "Task not found");
        require(!tasks[msg.sender][_id].deleted, "Task was deleted");
        _;
    }

    /// @dev Мәтін бос емес, тым ұзын емес, маңыздылық 0..2 аралығында
    function _validate(string calldata _content, uint8 _priority) internal pure {
        uint256 len = bytes(_content).length;
        require(len > 0, "Content is empty");
        require(len <= MAX_CONTENT_LENGTH, "Content is too long");
        require(_priority <= MAX_PRIORITY, "Invalid priority");
    }

    // ──────────── Жазу функциялары (транзакция, газ қажет) ────────────

    /// @notice Жаңа тапсырма қосу
    /// @return Жаңа тапсырманың id нөмірі
    function createTask(string calldata _content, uint8 _priority) external returns (uint256) {
        _validate(_content, _priority);

        uint256 newId = ++taskCount[msg.sender];
        tasks[msg.sender][newId] = Task({
            id: newId,
            content: _content,
            priority: _priority,
            completed: false,
            deleted: false,
            createdAt: block.timestamp,
            completedAt: 0
        });
        activeTaskCount[msg.sender]++;

        emit TaskCreated(msg.sender, newId, _content, _priority);
        return newId;
    }

    /// @notice Орындалу күйін ауыстыру: орындалмады <-> орындалды
    function toggleCompleted(uint256 _id) external taskExists(_id) {
        Task storage task = tasks[msg.sender][_id];
        task.completed = !task.completed;
        if (task.completed) {
            task.completedAt = block.timestamp;
        } else {
            task.completedAt = 0;
        }
        emit TaskToggled(msg.sender, _id, task.completed);
    }

    /// @notice Тапсырма мәтінін және маңыздылығын өзгерту
    function updateTask(uint256 _id, string calldata _content, uint8 _priority) external taskExists(_id) {
        _validate(_content, _priority);
        Task storage task = tasks[msg.sender][_id];
        require(!task.completed, "Completed task cannot be edited");

        task.content = _content;
        task.priority = _priority;
        emit TaskUpdated(msg.sender, _id, _content, _priority);
    }

    /// @notice Тапсырманы өшіру (деректер жойылмайды, deleted белгісі қойылады)
    function deleteTask(uint256 _id) external taskExists(_id) {
        tasks[msg.sender][_id].deleted = true;
        activeTaskCount[msg.sender]--;
        emit TaskDeleted(msg.sender, _id);
    }

    // ──────────── Оқу функциялары (view, газ қажет емес) ────────────

    /// @notice Бір тапсырманы id бойынша алу
    function getTask(uint256 _id) external view taskExists(_id) returns (Task memory) {
        return tasks[msg.sender][_id];
    }

    /// @notice Менің барлық өшірілмеген тапсырмаларым
    function getMyTasks() external view returns (Task[] memory) {
        Task[] memory result = new Task[](activeTaskCount[msg.sender]);
        uint256 total = taskCount[msg.sender];
        uint256 j = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (!tasks[msg.sender][i].deleted) {
                result[j] = tasks[msg.sender][i];
                j++;
            }
        }
        return result;
    }

    /// @notice Статистика: барлық белсенді тапсырмалар және орындалғандары
    function getMyStats() external view returns (uint256 total, uint256 done) {
        uint256 count = taskCount[msg.sender];
        for (uint256 i = 1; i <= count; i++) {
            Task storage task = tasks[msg.sender][i];
            if (!task.deleted) {
                total++;
                if (task.completed) {
                    done++;
                }
            }
        }
    }
}
