import React, { useEffect, useState } from "react";
import "./TasksList.css";

export default function TasksList({ itineraryId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const API = "http://localhost:5050/api/tasks";

  // LOAD EXISTING OR DEFAULT TASKS
  useEffect(() => {
    if (!itineraryId) return;

    const load = async () => {
      try {
        const res = await fetch(`${API}/${itineraryId}`);
        const data = await res.json();

        if (data && data.length > 0) {
          setTasks(data);
        } else {
          // create defaults automatically
          await initDefaults();
        }
      } catch (err) {
        console.error("Fetch tasks failed:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [itineraryId]);

  // CREATE DEFAULT TASKS
  const initDefaults = async () => {
    try {
      const res = await fetch(`${API}/defaults/${itineraryId}`, {
        method: "POST"
      });

      const data = await res.json();
      setTasks(data); // default tasks returned
    } catch (err) {
      console.error("Init tasks error:", err);
    }
  };

  // ADD NEW TASK
  const addTask = async (text) => {
    const res = await fetch(`${API}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itineraryId, text })
    });

    const saved = await res.json();
    setTasks(prev => [...prev, saved]);
  };

  // TOGGLE TASK
  const toggleTask = async (id) => {
    await fetch(`${API}/toggle/${id}`, { method: "PUT" });

    setTasks(prev =>
      prev.map(t => 
        t._id === id ? { ...t, done: !t.done } : t
      )
    );
  };

  if (loading) return <div className="card">Loading tasks…</div>;

  return (
    <div className="tasks-card">
      <h4 className="tasks-title">Tasks</h4>

      <ul className="task-items">
        {tasks.map(t => (
          <li key={t._id} className={`task-row ${t.done ? "done" : ""}`}>
            <label>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleTask(t._id)}
              />
              <span>{t.text}</span>
            </label>
          </li>
        ))}
      </ul>

      <AddTaskInput onAdd={addTask} />
    </div>
  );
}

// Mini input component
function AddTaskInput({ onAdd }) {
  const [text, setText] = useState("");

  return (
    <div className="add-task">
      <input
        placeholder="Add task..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button onClick={() => {
        if (!text.trim()) return;
        onAdd(text);
        setText("");
      }}>
        Add
      </button>
    </div>
  );
}
