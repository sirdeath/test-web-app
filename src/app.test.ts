import { describe, it, expect, beforeEach } from "vitest";
import app from "./app.js";
import { resetTodos } from "./todos.js";

beforeEach(() => {
  resetTodos();
});

// Helper functions for test simplification
const createTodo = async (title: string) => {
  return app.request("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
};

const deleteAllTodos = async () => {
  return app.request("/api/todos", { method: "DELETE" });
};

const verifyEmptyTodoList = async () => {
  const listRes = await app.request("/api/todos");
  expect(await listRes.json()).toEqual([]);
};

const verifyDeleteResult = async (res: Response, expectedCount: number) => {
  expect(res.status).toBe(200);
  const result = await res.json();
  expect(result).toEqual({ deletedCount: expectedCount });
};

describe("TODO API", () => {
  it("GET /api/todos returns empty array initially", async () => {
    const res = await app.request("/api/todos");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("POST /api/todos creates a todo", async () => {
    const res = await createTodo("Buy milk");
    expect(res.status).toBe(201);
    const todo = await res.json();
    expect(todo).toEqual({ id: 1, title: "Buy milk", completed: false });
  });

  it("GET /api/todos/:id returns a specific todo", async () => {
    await createTodo("Test todo");
    const res = await app.request("/api/todos/1");
    expect(res.status).toBe(200);
    const todo = await res.json();
    expect(todo.title).toBe("Test todo");
  });

  it("GET /api/todos/:id returns 404 for non-existent todo", async () => {
    const res = await app.request("/api/todos/999");
    expect(res.status).toBe(404);
  });

  it("PATCH /api/todos/:id updates a todo", async () => {
    await createTodo("Original");
    const res = await app.request("/api/todos/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    expect(res.status).toBe(200);
    const todo = await res.json();
    expect(todo.completed).toBe(true);
  });

  it("DELETE /api/todos/:id deletes a todo", async () => {
    await createTodo("To delete");
    const res = await app.request("/api/todos/1", { method: "DELETE" });
    expect(res.status).toBe(200);
    await verifyEmptyTodoList();
  });

  it("POST /api/todos returns 400 without title", async () => {
    const res = await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/todos deletes all todos when list is empty", async () => {
    const res = await deleteAllTodos();
    await verifyDeleteResult(res, 0);
    await verifyEmptyTodoList();
  });

  it("DELETE /api/todos deletes all todos when one todo exists", async () => {
    await createTodo("Single todo");
    const res = await deleteAllTodos();
    await verifyDeleteResult(res, 1);
    await verifyEmptyTodoList();
  });

  it("DELETE /api/todos deletes all todos when multiple todos exist", async () => {
    await createTodo("First todo");
    await createTodo("Second todo");
    await createTodo("Third todo");

    const res = await deleteAllTodos();
    await verifyDeleteResult(res, 3);
    await verifyEmptyTodoList();
  });

  it("DELETE /api/todos works with completed and uncompleted todos", async () => {
    // Create completed todo
    await createTodo("Completed todo");
    await app.request("/api/todos/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });

    // Create uncompleted todo
    await createTodo("Uncompleted todo");

    const res = await deleteAllTodos();
    await verifyDeleteResult(res, 2);
    await verifyEmptyTodoList();
  });

  it("DELETE /api/todos resets the list for subsequent operations", async () => {
    // Create and delete all todos
    await createTodo("Test todo");
    const deleteRes = await deleteAllTodos();
    expect(deleteRes.status).toBe(200);

    // Verify we can create new todos after deletion
    const createRes = await createTodo("New todo after deletion");
    expect(createRes.status).toBe(201);

    const newTodo = await createRes.json();
    expect(newTodo.title).toBe("New todo after deletion");

    const listRes = await app.request("/api/todos");
    const todos = await listRes.json();
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe("New todo after deletion");
  });
});

describe("Health API", () => {
  it("GET /api/health returns correct status and format", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);

    const health = await res.json();
    expect(health.status).toBe("ok");
    expect(health.uptime).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(health.uptime)).toBe(true);
  });

  it("GET /api/health uptime increases over time", async () => {
    const res1 = await app.request("/api/health");
    const health1 = await res1.json();

    const res2 = await app.request("/api/health");
    const health2 = await res2.json();

    expect(health2.uptime).toBeGreaterThanOrEqual(health1.uptime);
  });
});

describe("Version API", () => {
  it("GET /api/version returns complete version information", async () => {
    const res = await app.request("/api/version");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const version = await res.json();

    // Check exact fields
    const expectedFields = ["name", "version", "nodeVersion"];
    expect(Object.keys(version)).toEqual(expectedFields);

    // Validate field values and types
    expect(version.name).toBe("test-web-app");
    expect(version.version).toBe("1.0.0");
    expect(typeof version.nodeVersion).toBe("string");
    expect(version.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
  });
});

describe("Stats API", () => {
  it("GET /api/stats returns correct status and format", async () => {
    const res = await app.request("/api/stats");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const stats = await res.json();

    // Check structure and basic types
    expect(stats).toMatchObject({
      requests: { total: expect.any(Number) },
      uptime: expect.any(Number),
      memory: {
        rss: expect.any(Number),
        heapTotal: expect.any(Number),
        heapUsed: expect.any(Number),
        external: expect.any(Number)
      }
    });

    // Basic validations
    expect(stats.requests.total).toBeGreaterThan(0);
    expect(stats.uptime).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(stats.uptime)).toBe(true);
  });

  it("GET /api/stats request counter increases with each call", async () => {
    const res1 = await app.request("/api/stats");
    const stats1 = await res1.json();

    const res2 = await app.request("/api/stats");
    const stats2 = await res2.json();

    expect(stats2.requests.total).toBeGreaterThan(stats1.requests.total);
  });

  it("GET /api/stats uptime increases over time", async () => {
    const res1 = await app.request("/api/stats");
    const stats1 = await res1.json();

    // Small delay to ensure uptime difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const res2 = await app.request("/api/stats");
    const stats2 = await res2.json();

    expect(stats2.uptime).toBeGreaterThanOrEqual(stats1.uptime);
  });

  it("GET /api/stats memory usage values are reasonable", async () => {
    const res = await app.request("/api/stats");
    const stats = await res.json();

    // Basic sanity checks
    expect(stats.memory.heapUsed).toBeLessThanOrEqual(stats.memory.heapTotal);
    expect(stats.memory.rss).toBeGreaterThan(stats.memory.heapTotal);
  });

  it("GET /api/stats tracks requests from other endpoints", async () => {
    const res1 = await app.request("/api/stats");
    const stats1 = await res1.json();

    // Make requests to other endpoints
    await app.request("/api/health");
    await app.request("/api/version");

    const res2 = await app.request("/api/stats");
    const stats2 = await res2.json();

    // Should have increased by at least 3 (health + version + stats)
    expect(stats2.requests.total - stats1.requests.total).toBeGreaterThanOrEqual(3);
  });
});
