// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Remix IDE → "Solidity Unit Testing" плагині арқылы іске қосылады.
import "remix_tests.sol";
import "../contracts/TodoList.sol";
import "./OtherUser.sol"; // екінші пайдаланушы (көмекші контракт)

contract TodoListTest {
    TodoList private todo;

    /// Әр тесттің алдында жаңа контракт орналастырылады
    function beforeEach() public {
        todo = new TodoList();
    }

    // ─────────────── Негізгі операциялар ───────────────

    function testCreateTask() public {
        uint256 id = todo.createTask(unicode"Зертханалық жұмысты тапсыру", 2);
        Assert.equal(id, uint256(1), unicode"Бірінші тапсырманың id = 1");

        TodoList.Task memory t = todo.getTask(1);
        Assert.equal(t.content, unicode"Зертханалық жұмысты тапсыру", unicode"Мәтін сақталуы керек");
        Assert.equal(uint256(t.priority), uint256(2), unicode"Маңыздылық = 2");
        Assert.equal(t.completed, false, unicode"Жаңа тапсырма орындалмаған");
        Assert.equal(t.deleted, false, unicode"Жаңа тапсырма өшірілмеген");
        Assert.ok(t.createdAt > 0, unicode"Құрылған уақыты жазылуы керек");
        Assert.equal(todo.taskCount(address(this)), uint256(1), unicode"taskCount = 1");
        Assert.equal(todo.activeTaskCount(address(this)), uint256(1), unicode"activeTaskCount = 1");
    }

    function testToggleCompleted() public {
        todo.createTask("Read a book", 0);

        todo.toggleCompleted(1);
        TodoList.Task memory t = todo.getTask(1);
        Assert.equal(t.completed, true, unicode"Орындалды деп белгіленуі керек");
        Assert.ok(t.completedAt > 0, unicode"Орындалған уақыты жазылуы керек");

        todo.toggleCompleted(1);
        t = todo.getTask(1);
        Assert.equal(t.completed, false, unicode"Қайта орындалмаған күйге оралуы керек");
        Assert.equal(t.completedAt, uint256(0), unicode"completedAt = 0");
    }

    function testUpdateTask() public {
        todo.createTask("Old text", 0);
        todo.updateTask(1, "New text", 1);

        TodoList.Task memory t = todo.getTask(1);
        Assert.equal(t.content, "New text", unicode"Мәтін өзгеруі керек");
        Assert.equal(uint256(t.priority), uint256(1), unicode"Маңыздылық өзгеруі керек");
    }

    function testDeleteTask() public {
        todo.createTask("Task 1", 0);
        todo.createTask("Task 2", 1);
        todo.createTask("Task 3", 2);

        todo.deleteTask(2);

        TodoList.Task[] memory list = todo.getMyTasks();
        Assert.equal(list.length, uint256(2), unicode"Тізімде 2 тапсырма қалуы керек");
        Assert.equal(list[0].id, uint256(1), unicode"Бірінші — id 1");
        Assert.equal(list[1].id, uint256(3), unicode"Екінші — id 3");
        Assert.equal(todo.taskCount(address(this)), uint256(3), unicode"taskCount өзгермейді");
        Assert.equal(todo.activeTaskCount(address(this)), uint256(2), unicode"activeTaskCount = 2");
    }

    function testGetMyStats() public {
        todo.createTask("A", 0);
        todo.createTask("B", 0);
        todo.createTask("C", 0);
        todo.toggleCompleted(1);
        todo.toggleCompleted(3);
        todo.deleteTask(3);

        (uint256 total, uint256 done) = todo.getMyStats();
        Assert.equal(total, uint256(2), unicode"Белсенді тапсырмалар = 2");
        Assert.equal(done, uint256(1), unicode"Орындалғандар = 1");
    }

    // ─────────────── require() тексерулері ───────────────

    function testEmptyContentReverts() public {
        try todo.createTask("", 1) returns (uint256) {
            Assert.ok(false, unicode"Бос мәтін қабылданбауы керек");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Content is empty", unicode"Қате себебі дұрыс емес");
        }
    }

    function testTooLongContentReverts() public {
        string memory longText = string(new bytes(201));
        try todo.createTask(longText, 1) returns (uint256) {
            Assert.ok(false, unicode"201 байттық мәтін қабылданбауы керек");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Content is too long", unicode"Қате себебі дұрыс емес");
        }
    }

    function testInvalidPriorityReverts() public {
        try todo.createTask("Task", 3) returns (uint256) {
            Assert.ok(false, unicode"Маңыздылық 3 қабылданбауы керек");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Invalid priority", unicode"Қате себебі дұрыс емес");
        }
    }

    function testTaskNotFoundReverts() public {
        try todo.toggleCompleted(99) {
            Assert.ok(false, unicode"Жоқ тапсырма өзгертілмеуі керек");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Task not found", unicode"Қате себебі дұрыс емес");
        }
    }

    function testCompletedTaskCannotBeEdited() public {
        todo.createTask("Done task", 0);
        todo.toggleCompleted(1);
        try todo.updateTask(1, "Changed", 0) {
            Assert.ok(false, unicode"Орындалған тапсырма өзгертілмеуі керек");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Completed task cannot be edited", unicode"Қате себебі дұрыс емес");
        }
    }

    function testDeletedTaskReverts() public {
        todo.createTask("To delete", 0);
        todo.deleteTask(1);
        try todo.getTask(1) returns (TodoList.Task memory) {
            Assert.ok(false, unicode"Өшірілген тапсырма оқылмауы керек");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Task was deleted", unicode"Қате себебі дұрыс емес");
        }
    }

    // ─────────────── Пайдаланушылар бір-бірінен оқшауланған ───────────────

    function testUsersAreIsolated() public {
        OtherUser other = new OtherUser();

        todo.createTask("My task 1", 0);
        todo.createTask("My task 2", 0);
        uint256 otherId = other.create(todo, "Other user's task");

        Assert.equal(otherId, uint256(1), unicode"Басқа пайдаланушының id-лері өзінен басталады");
        Assert.equal(todo.activeTaskCount(address(this)), uint256(2), unicode"Менде 2 тапсырма");
        Assert.equal(todo.activeTaskCount(address(other)), uint256(1), unicode"Басқада 1 тапсырма");

        // Басқа пайдаланушы менің id = 2 тапсырмама қол жеткізе алмайды
        try other.toggle(todo, 2) {
            Assert.ok(false, unicode"Басқаның тапсырмасын өзгертуге болмайды");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Task not found", unicode"Қате себебі дұрыс емес");
        }
        Assert.equal(todo.getTask(2).completed, false, unicode"Менің тапсырмам өзгермеуі керек");
    }
}
