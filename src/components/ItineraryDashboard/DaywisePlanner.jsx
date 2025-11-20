import React, { useEffect, useState } from "react";
import "./DaywisePlanner.css";

export default function DaywisePlanner({ destination, departureDate, returnDate }) {
  const [attractions, setAttractions] = useState([]);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);

  // Calculate number of days
  const getDaysArray = () => {
    const start = new Date(departureDate);
    const end = new Date(returnDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const arr = [];
    for (let i = 0; i < diff; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push({
        day: i + 1,
        date: d.toISOString().split("T")[0],
        items: []
      });
    }
    return arr;
  };

  // Fetch attractions
  const loadAttractions = async () => {
    if (!destination) return;

    setLoading(true);

    try {
      const res = await fetch(
        `http://localhost:5050/api/attractions/country/${encodeURIComponent(destination)}`
      );

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      console.log("Fetched attractions:", data);
      setAttractions(data);

      // Assign attractions day-wise
      const daysArr = getDaysArray();
      let index = 0;

      data.forEach((a) => {
        daysArr[index].items.push(a);
        index = (index + 1) % daysArr.length;
      });

      setDays(daysArr);

    } catch (err) {
      console.error("❌ Failed to load attractions:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (destination && departureDate && returnDate) {
      loadAttractions();
    }
  }, [destination, departureDate, returnDate]);

  if (loading) return <p>Loading attractions...</p>;

  return (
    <div className="daywise-planner">

      {days.length === 0 ? (
        <p>No attractions found for {destination}.</p>
      ) : (
        days.map((day) => (
          <div key={day.day} className="day-card">
            <h3>Day {day.day} — {day.date}</h3>

            {day.items.length === 0 ? (
              <p>No attractions for this day.</p>
            ) : (
              <ul>
                {day.items.map((a) => (
                  <li key={a._id} className="attraction-item">
                    <strong>{a.site_name}</strong>
                    <br />
                    <span>{a.location}</span>
                    <br />
                    <small>{a.short_description}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}
    </div>
  );
}
