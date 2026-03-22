import { Hono } from "hono";
import {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
} from "./todos.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const app = new Hono();

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// Global request counter
let requestCount = 0;

// Request tracking middleware
app.use('*', (c, next) => {
  requestCount++;
  return next();
});

// Load package.json once at startup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));

// Health check endpoint
app.get("/api/health", (c) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  return c.json({ status: "ok", uptime });
});

// Version endpoint
app.get("/api/version", (c) => {
  return c.json({
    name: packageJson.name,
    version: packageJson.version,
    nodeVersion: process.version
  });
});

// List all todos
app.get("/api/todos", (c) => {
  return c.json(getAllTodos());
});

// Get a single todo
app.get("/api/todos/:id", (c) => {
  const todo = getTodoById(Number(c.req.param("id")));
  if (!todo) return c.json({ error: "Not found" }, 404);
  return c.json(todo);
});

// Create a todo
app.post("/api/todos", async (c) => {
  const body = await c.req.json();
  if (!body.title || typeof body.title !== "string") {
    return c.json({ error: "title is required" }, 400);
  }
  const todo = createTodo(body.title);
  return c.json(todo, 201);
});

// Update a todo
app.patch("/api/todos/:id", async (c) => {
  const body = await c.req.json();
  const todo = updateTodo(Number(c.req.param("id")), body);
  if (!todo) return c.json({ error: "Not found" }, 404);
  return c.json(todo);
});

// Delete a todo
app.delete("/api/todos/:id", (c) => {
  const deleted = deleteTodo(Number(c.req.param("id")));
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export default app;
export { requestCount };
