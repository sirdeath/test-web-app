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
    expect(todo).toEqual({
      id: 1,
      title: "Buy milk",
      completed: false,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    });
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
    expect(todo).toEqual({
      id: 1,
      title: "Test todo",
      completed: false,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    });
  });

  it("GET /api/todos/:id returns 404 for non-existent todo", async () => {
    const res = await app.request("/api/todos/999");
    expect(res.status).toBe(404);
  });

  it("PATCH /api/todos/:id updates a todo", async () => {
    const createRes = await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Original" }),
    });
    const createdTodo = await createRes.json();

    const res = await app.request("/api/todos/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    expect(res.status).toBe(200);
    const todo = await res.json();
    expect(todo).toEqual({
      id: 1,
      title: "Original",
      completed: true,
      createdAt: createdTodo.createdAt // createdAt should remain unchanged
    });
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

describe("TODO createdAt functionality", () => {
  it("createdAt is close to current time when creating a todo", async () => {
    const beforeCreation = new Date();

    const res = await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Time test" }),
    });

    const afterCreation = new Date();
    const todo = await res.json();
    const todoCreatedAt = new Date(todo.createdAt);

    expect(todoCreatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(todoCreatedAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });

  it("multiple todos have createdAt in chronological order", async () => {
    const res1 = await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "First todo" }),
    });

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    const res2 = await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Second todo" }),
    });

    const todo1 = await res1.json();
    const todo2 = await res2.json();

    expect(new Date(todo1.createdAt).getTime()).toBeLessThanOrEqual(new Date(todo2.createdAt).getTime());
  });

  it("createdAt format is valid ISO 8601 string", async () => {
    const res = await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "ISO test" }),
    });

    const todo = await res.json();

    // Check ISO 8601 format
    expect(todo.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    // Validate it's a parseable date
    const parsed = new Date(todo.createdAt);
    expect(parsed.toISOString()).toBe(todo.createdAt);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  it("createdAt remains unchanged when updating todo properties", async () => {
    const createRes = await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Original title" }),
    });
    const originalTodo = await createRes.json();

    // Update title
    const updateTitleRes = await app.request("/api/todos/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated title" }),
    });
    const updatedTodo = await updateTitleRes.json();

    expect(updatedTodo.createdAt).toBe(originalTodo.createdAt);
    expect(updatedTodo.title).toBe("Updated title");

    // Update completed status
    const updateCompletedRes = await app.request("/api/todos/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    const finalTodo = await updateCompletedRes.json();

    expect(finalTodo.createdAt).toBe(originalTodo.createdAt);
    expect(finalTodo.completed).toBe(true);
  });

  it("each todo gets a createdAt timestamp (may be same for rapid creation)", async () => {
    const todos = [];

    // Create multiple todos with small delays
    for (let i = 0; i < 3; i++) {
      const res = await app.request("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Todo ${i + 1}` }),
      });
      todos.push(await res.json());

      // Small delay to potentially get different timestamps
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 2));
      }
    }

    // Extract all createdAt values
    const createdAtValues = todos.map(todo => todo.createdAt);

    // Check that all values are valid timestamps
    createdAtValues.forEach(createdAt => {
      expect(typeof createdAt).toBe("string");
      expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(isNaN(new Date(createdAt).getTime())).toBe(false);
    });

    // Check that timestamps are in non-decreasing order (allowing for same timestamps)
    for (let i = 1; i < createdAtValues.length; i++) {
      const prev = new Date(createdAtValues[i - 1]).getTime();
      const curr = new Date(createdAtValues[i]).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("createdAt is included in todo list response", async () => {
    await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "List test 1" }),
    });

    await app.request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "List test 2" }),
    });

    const listRes = await app.request("/api/todos");
    const todoList = await listRes.json();

    expect(todoList).toHaveLength(2);

    todoList.forEach(todo => {
      expect(todo).toHaveProperty("createdAt");
      expect(typeof todo.createdAt).toBe("string");
      expect(todo.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
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
