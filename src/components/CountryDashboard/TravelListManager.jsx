import React, { useEffect, useState } from "react";
import apiClient from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";

const TravelListManager = ({ country }) => {
  const { isAuthenticated } = useAuth();
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!country || !isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchExistingNote();
  }, [country, isAuthenticated]);

  const fetchExistingNote = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // ✅ Using apiClient which automatically adds auth token
      const res = await apiClient.get("/api/travelnotes");
      const entry = res.data.find(n => n.countryCode === country.cca2);

      if (entry) {
        setNotes(entry.notes || "");
        setPriority(entry.priority || "");
        setExistingId(entry._id);
      } else {
        setNotes("");
        setPriority("");
        setExistingId(null);
      }
    } catch (err) {
      console.error("Error fetching notes:", err);
      if (err.response?.status === 401) {
        setError("Please log in to view your notes");
      } else {
        setError("Failed to load notes");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!country || !isAuthenticated) {
      alert("Please log in to save notes");
      return;
    }

    setSaving(true);
    setError(null);

    // ✅ No need to send userId - backend extracts it from token
    const payload = {
      countryName: country.name,
      countryCode: country.cca2,
      notes,
      priority,
      flagUrl: country.flags?.svg || country.flag || "",
      region: country.region || "",
    };

    try {
      if (existingId) {
        // ✅ Using apiClient which automatically adds auth token
        await apiClient.put(`/api/travelnotes/${existingId}`, payload);
      } else {
        // ✅ Using apiClient which automatically adds auth token
        const res = await apiClient.post("/api/travelnotes", payload);
        setExistingId(res.data._id);
      }
      
      alert("Note saved successfully!");
      await fetchExistingNote();
    } catch (err) {
      console.error("Error saving note:", err);
      if (err.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
      } else if (err.response?.status === 400 && err.response.data?.error?.includes("already exists")) {
        // Note already exists, refresh to get the existing note
        await fetchExistingNote();
        alert("Note already exists for this country. Loaded existing note.");
      } else {
        alert(err.response?.data?.error || "Failed to save note");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingId || !isAuthenticated) return;
    
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    setError(null);
    
    try {
      // ✅ Using apiClient which automatically adds auth token
      await apiClient.delete(`/api/travelnotes/${existingId}`);
      setNotes("");
      setPriority("");
      setExistingId(null);
      alert("Note deleted successfully!");
    } catch (err) {
      console.error("Error deleting note:", err);
      if (err.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
      } else {
        alert("Failed to delete note");
      }
    }
  };

  if (!country) return null;

  // ✅ Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="card note-card">
        <div className="card-header">Travel Notes</div>
        <div className="card-body">
          <div className="auth-required-message">
            <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
              🔒 Please log in to add travel notes
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card note-card">
        <div className="card-header">Travel Notes</div>
        <div className="card-body">
          <p>Loading note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card note-card">
      <div className="card-header">Travel Notes</div>
      <div className="card-body">
        {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
        
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={`Write notes about ${country.name}...`}
          style={{ width: '100%', minHeight: '80px', padding: '8px', marginBottom: '10px' }}
        />

        <div className="priority-row" style={{ marginBottom: '10px' }}>
          <label>Priority:</label>
          <input
            type="number"
            min="1"
            max="5"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            placeholder="1-5"
            style={{ marginLeft: '10px', width: '60px' }}
          />
        </div>

        <div className="buttons" style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn save" 
            onClick={handleSave} 
            disabled={saving}
            style={{ flex: 1 }}
          >
            {saving ? "Saving..." : existingId ? "Update" : "Save"}
          </button>
          {existingId && (
            <button 
              className="btn delete" 
              onClick={handleDelete}
              style={{ flex: 1 }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TravelListManager;