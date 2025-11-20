import React, { useEffect, useState } from "react";

export default function ExpensesTable({ itineraryId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const API = `http://localhost:5050/api/expenses`;

  useEffect(() => {
    if (!itineraryId) return;

    const load = async () => {
      try {
        const res = await fetch(`${API}/${itineraryId}`);
        const data = await res.json();

        if (data && data.items) setItems(data.items);
      } catch (err) {
        console.error("Fetch expenses failed:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [itineraryId]);

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addRow = () =>
    setItems([...items, { category: "", budget: 0, notes: "" }]);

  const removeRow = (i) =>
    setItems(items.filter((_, idx) => idx !== i));

  const saveExpenses = async () => {
    try {
      const res = await fetch(`${API}/${itineraryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (res.ok) alert("Saved!");
      else alert("Failed to save");
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const total = items.reduce((sum, item) => sum + Number(item.budget || 0), 0);

  if (loading) return <div className="card">Loading expenses…</div>;

  return (
    <section className="card expenses-table">
      <h3>Expenses</h3>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Budget</th>
              <th>Notes / Priority</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {items.map((e, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={e.category}
                    onChange={(ev) =>
                      updateItem(i, "category", ev.target.value)
                    }
                  />
                </td>

                <td>
                  <input
                    type="number"
                    value={e.budget}
                    onChange={(ev) =>
                      updateItem(i, "budget", Number(ev.target.value))
                    }
                  />
                </td>

                <td>
                  <input
                    value={e.notes}
                    onChange={(ev) =>
                      updateItem(i, "notes", ev.target.value)
                    }
                    placeholder="optional"
                  />
                </td>

                <td>
                  <button className="small" onClick={() => removeRow(i)}>
                    ✖
                  </button>
                </td>
              </tr>
            ))}

            {/* TOTAL ROW */}
            <tr className="total-row">
              <td><strong>Total</strong></td>
              <td><strong>{total}</strong></td>
              <td></td>
              <td></td>
            </tr>

          </tbody>
        </table>
      </div>

      <div className="table-actions">
        <button onClick={addRow}>+ Add Row</button>
        <button className="save-btn" onClick={saveExpenses}>💾 Save</button>
      </div>
    </section>
  );
}
