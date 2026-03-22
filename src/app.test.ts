import { describe, it, expect, beforeEach } from "vitest";
import app from "./app.js";
import { resetTodos } from "./todos.js";

beforeEach(() => {
  resetTodos();
});

describe("TODO API", () => {
  it("GET /api/todos returns empty array initially", async () => {
    const res = await app.request("/api/todos");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("POST /api/todos creates a todo", async () => {
    const res = await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Buy milk" }),
    });
    expect(res.status).toBe(201);
    const todo = await res.json();
    expect(todo).toEqual({ id: 1, title: "Buy milk", completed: false });
  });

  it("GET /api/todos/:id returns a specific todo", async () => {
    await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test todo" }),
    });
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
    await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Original" }),
    });
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
    await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "To delete" }),
    });
    const res = await app.request("/api/todos/1", { method: "DELETE" });
    expect(res.status).toBe(200);

    const listRes = await app.request("/api/todos");
    expect(await listRes.json()).toEqual([]);
  });

  it("POST /api/todos returns 400 without title", async () => {
    const res = await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe("TODO Filtering API", () => {
  // Helper functions to reduce duplication
  const createTodo = async (title: string) => {
    return app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  };

  const completeTodo = async (id: number) => {
    return app.request(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
  };

  const setupMixedTodos = async () => {
    await createTodo("Completed task");
    await createTodo("Incomplete task");
    await completeTodo(1);
  };

  it("GET /api/todos?completed=true returns only completed todos", async () => {
    await setupMixedTodos();

    const res = await app.request("/api/todos?completed=true");
    expect(res.status).toBe(200);
    const todos = await res.json();
    expect(todos).toHaveLength(1);
    expect(todos[0]).toEqual({ id: 1, title: "Completed task", completed: true });
  });

  it("GET /api/todos?completed=false returns only incomplete todos", async () => {
    await setupMixedTodos();

    const res = await app.request("/api/todos?completed=false");
    expect(res.status).toBe(200);
    const todos = await res.json();
    expect(todos).toHaveLength(1);
    expect(todos[0]).toEqual({ id: 2, title: "Incomplete task", completed: false });
  });

  it("GET /api/todos without filter returns all todos", async () => {
    await setupMixedTodos();

    const res = await app.request("/api/todos");
    expect(res.status).toBe(200);
    const todos = await res.json();
    expect(todos).toHaveLength(2);
    expect(todos[0].completed).toBe(true);
    expect(todos[1].completed).toBe(false);
  });

  it("GET /api/todos?completed=invalid returns 400 error", async () => {
    const res = await app.request("/api/todos?completed=invalid");
    expect(res.status).toBe(400);
    const error = await res.json();
    expect(error.error).toBe("completed parameter must be 'true' or 'false'");
  });

  it("GET /api/todos?completed=true returns empty array when no completed todos exist", async () => {
    await createTodo("Incomplete task 1");
    await createTodo("Incomplete task 2");

    const res = await app.request("/api/todos?completed=true");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("GET /api/todos?completed=false returns empty array when no incomplete todos exist", async () => {
    await createTodo("Task 1");
    await createTodo("Task 2");
    await completeTodo(1);
    await completeTodo(2);

    const res = await app.request("/api/todos?completed=false");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("GET /api/todos filtering works with multiple todos of same status", async () => {
    await createTodo("Completed task 1");
    await createTodo("Completed task 2");
    await createTodo("Incomplete task");
    await completeTodo(1);
    await completeTodo(2);

    const res = await app.request("/api/todos?completed=true");
    expect(res.status).toBe(200);
    const todos = await res.json();
    expect(todos).toHaveLength(2);
    expect(todos.every(todo => todo.completed === true)).toBe(true);
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
