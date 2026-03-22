export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

let todos: Todo[] = [];
let nextId = 1;

export function getAllTodos(): Todo[] {
  return todos;
}

export function getTodoById(id: number): Todo | undefined {
  return todos.find((t) => t.id === id);
}

export function createTodo(title: string): Todo {
  const todo: Todo = { id: nextId++, title, completed: false, createdAt: new Date().toISOString() };
  todos.push(todo);
  return todo;
}

export function updateTodo(
  id: number,
  updates: Partial<Pick<Todo, "title" | "completed">>
): Todo | undefined {
  const todo = getTodoById(id);
  if (!todo) return undefined;
  if (updates.title !== undefined) todo.title = updates.title;
  if (updates.completed !== undefined) todo.completed = updates.completed;
  return todo;
}

export function deleteTodo(id: number): boolean {
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) return false;
  todos.splice(index, 1);
  return true;
}

export function resetTodos(): void {
  todos = [];
  nextId = 1;
}
