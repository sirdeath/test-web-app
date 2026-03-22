import { Hono } from "hono";
import {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
} from "./todos.js";

const app = new Hono();

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
