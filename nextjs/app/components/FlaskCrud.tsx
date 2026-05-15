"use client";

import { useState, useEffect, FormEvent } from "react";

const FLASK_API = "http://localhost:3003";

interface Item {
  id: number;
  name: string;
  description: string;
}

// Client-side validation mirroring the Pydantic schemas on the server
function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name is required and cannot be empty";
  if (trimmed.length < 2) return "Name must be at least 2 characters";
  if (trimmed.length > 100) return "Name must be at most 100 characters";
  return null;
}

function validateDescription(description: string): string | null {
  if (description.length > 500) return "Description must be at most 500 characters";
  return null;
}

export default function FlaskCrud() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchItems() {
    const res = await fetch(`${FLASK_API}/api/items`);
    const data = await res.json();
    setItems(data);
  }

  useEffect(() => {
    fetchItems();
  }, []);

  function startEdit(item: Item) {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description);
    setError(null);
  }

  function cancelEdit() {
    setEditingItem(null);
    setName("");
    setDescription("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation (mirrors Pydantic schemas)
    const nameError = validateName(name);
    if (nameError) {
      setError(nameError);
      return;
    }
    const descError = validateDescription(description);
    if (descError) {
      setError(descError);
      return;
    }

    setLoading(true);
    try {
      if (editingItem) {
        const res = await fetch(`${FLASK_API}/api/items/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to update item");
        }
        setEditingItem(null);
      } else {
        const res = await fetch(`${FLASK_API}/api/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to create item");
        }
      }
      setName("");
      setDescription("");
      await fetchItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this item?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${FLASK_API}/api/items/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete item");
      await fetchItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-zinc-200 mb-6">
        Flask
      </h2>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-800 rounded-xl shadow p-6 mb-8 flex flex-col gap-4"
      >
        <h3 className="text-lg font-semibold text-gray-700 dark:text-zinc-200">
          {editingItem ? `Edit Item #${editingItem.id}` : "Add New Item"}
        </h3>

        {error && (
          <p className="text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label
            className="text-sm font-medium text-gray-600 dark:text-zinc-400"
            htmlFor="flask-name"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="flask-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name"
            className="border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-gray-800 dark:text-zinc-100 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-sm font-medium text-gray-600 dark:text-zinc-400"
            htmlFor="flask-description"
          >
            Description
          </label>
          <input
            id="flask-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-gray-800 dark:text-zinc-100 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg px-5 py-2 transition-colors"
          >
            {editingItem ? "Update" : "Create"}
          </button>
          {editingItem && (
            <button
              type="button"
              onClick={cancelEdit}
              className="bg-gray-200 dark:bg-zinc-600 hover:bg-gray-300 dark:hover:bg-zinc-500 text-gray-700 dark:text-zinc-200 font-medium rounded-lg px-5 py-2 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Items list */}
      <div className="flex flex-col gap-4">
        {items.length === 0 && (
          <p className="text-gray-500 dark:text-zinc-400 text-center py-8">
            No items yet. Create one above!
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-zinc-800 rounded-xl shadow px-6 py-4 flex items-start justify-between gap-4"
          >
            <div>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mb-0.5">
                ID: {item.id}
              </p>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100">
                {item.name}
              </h3>
              {item.description && (
                <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">
                  {item.description}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => startEdit(item)}
                className="text-sm bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 font-medium rounded-lg px-3 py-1.5 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-medium rounded-lg px-3 py-1.5 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
