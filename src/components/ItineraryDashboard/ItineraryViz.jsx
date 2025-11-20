import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import "./ItineraryViz.css";

// Category colors
const COLORS = ["#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444"];

export default function ItineraryViz({ itineraryId, destination }) {
  const country = destination;
  const [items, setItems] = useState([]);
  // attractions (for categories)
  const [attractions, setAttractions] = useState([]);
  const [loadingAttractions, setLoadingAttractions] = useState(false);

  // mobile/keyboard open category
  const [openCategory, setOpenCategory] = useState(null);

  const expensesAPI = `http://localhost:5050/api/expenses`;
  const attractionAPI = `http://localhost:5050/api/attractions/country`;

  // Fetch updated expenses every 2s
  useEffect(() => {
    if (!itineraryId) return;

    const fetchExpenses = async () => {
      try {
        const res = await fetch(`${expensesAPI}/${itineraryId}`);
        const data = await res.json();

        if (data && data.items) setItems(data.items);
      } catch (err) {
        console.error("Viz fetch error:", err);
      }
    };

    fetchExpenses();
    const interval = setInterval(fetchExpenses, 2000);

    return () => clearInterval(interval);
  }, [itineraryId]);

    
  // -------------------- fetch attractions for destination --------------------
  useEffect(() => {
    if (!country) {
      setAttractions([]);
      return;
    }

    let mounted = true;
    const loadAttractions = async () => {
      setLoadingAttractions(true);
      try {
        const url = `${attractionAPI}/${encodeURIComponent(country)}`;
        const res = await fetch(url);

        if (!res.ok) {
          console.warn("Attractions endpoint returned not ok:", res.status);
          setAttractions([]);
          setLoadingAttractions(false);
          return;
        }

        const data = await res.json();
        console.log("ItineraryViz: fetched attractions for", country, data);

        if (!mounted) return;

        if (Array.isArray(data)) {
          // normalize shape to ensure fields exist
          const normalized = data.map((a) => ({
            _id: a._id,
            site_name: a.site_name || a.name || "Unknown",
            category: a.category || "Other",
            year_inscribed: a.year_inscribed || "",
            location: a.location || "",
            short_description: a.short_description || "",
            lat: a.lat !== undefined ? Number(a.lat) : undefined,
            lon: a.lon !== undefined ? Number(a.lon) : undefined,
          }));
          setAttractions(normalized);
        } else if (data && typeof data === "object") {
          // sometimes backend returns object wrapper
          // try to find an array inside common keys
          if (Array.isArray(data.results)) setAttractions(data.results);
          else if (Array.isArray(data.data)) setAttractions(data.data);
          else setAttractions([]);
        } else {
          setAttractions([]);
        }
      } catch (err) {
        console.error("ItineraryViz: attraction fetch error", err);
        setAttractions([]);
      } finally {
        setLoadingAttractions(false);
      }
    };

    loadAttractions();

    return () => {
      mounted = false;
    };
  }, [country]);

  // Prepare pie chart data
  const pieData = items.map((i) => ({
    name: i.category,
    value: Number(i.budget || 0),
  }));

  const total = pieData.reduce((sum, x) => sum + x.value, 0);
  
  // -------------------- group attractions by category --------------------
  const groups = attractions.reduce((acc, a) => {
    const cat = a.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});

  const categoryOrder = ["Cultural", "Natural", "Mixed", "Other"];
  const breakdown = categoryOrder.map((cat) => ({
    category: cat,
    items: groups[cat] || [],
    count: (groups[cat] || []).length,
  }));

  // toggle category open for mobile (click)
  const toggleCategory = (cat) => {
    setOpenCategory((prev) => (prev === cat ? null : cat));
  };

  return (
    <section className="viz-container">
      <h2>Itinerary Visualizations</h2>

      {/* PIE CHART */}
      <div className="viz-card">
        <h3>Budget Distribution</h3>

        <div className="chart-box">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <div className="total-display">
            Total Budget: <strong>{total}</strong>
          </div>
        </div>

        {/* CATEGORY SUMMARY CARDS */}
        <div className="summary-grid">
          {pieData.map((item, i) => {
            const pct = total === 0 ? 0 : ((item.value / total) * 100).toFixed(1);
            return (
              <div className="summary-card" key={i}>
                <div className="summary-title">{item.name}</div>
                <div className="summary-amount">{item.value}</div>
                <div className="summary-percent">{pct}% of total</div>
              </div>
            );
          })}
        </div>
      </div>
      
      
      {/* ------------------ ATTRACTION CATEGORY BREAKDOWN (second viz) ------------------ */}
      <div className="viz-card" style={{ marginTop: "1.25rem" }}>
        <h3>Attraction Categories in {country || "—"}</h3>

        {loadingAttractions ? (
          <p>Loading attractions…</p>
        ) : attractions.length === 0 ? (
          <p>No attractions found for {country || "this destination"}.</p>
        ) : (
          <div className="attr-breakdown" role="list">
            {breakdown.map((b) => {
              const barWidth = Math.max(b.count * 36, 8); // scale
              return (
                <div
                  key={b.category}
                  className="attr-row"
                  onClick={() => toggleCategory(b.category)}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") toggleCategory(b.category);
                  }}
                >
                  <div className="attr-label">{b.category}</div>

                  <div
                    className="attr-bar"
                    style={{
                      width: `${barWidth}px`,
                      backgroundColor: b.count > 0 ? "#4F46E5" : "#E6EEF8",
                    }}
                    title={`${b.count} site(s)`}
                  />

                  <div className="attr-count">{b.count}</div>

                  <div className={`attr-popup ${openCategory === b.category ? "open" : ""}`}>
                    <strong>{b.category} Sites ({b.count})</strong>
                    <ul>
                      {b.items.map((a) => (
                        <li key={a._id} className="attr-list-item">
                          <div className="site-name">{a.site_name}</div>
                          {a.location ? <div className="site-location">{a.location}</div> : null}
                          {a.short_description ? (
                            <div className="site-desc">{a.short_description}</div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
    </section>
  );
}

// import React, { useEffect, useState } from "react";
// import {
//   PieChart,
//   Pie,
//   Cell,
//   Tooltip,
//   Legend,
//   ResponsiveContainer
// } from "recharts";
// import "./ItineraryViz.css";

// // colors used for pie & small UI accents
// const COLORS = ["#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444"];

// /**
//  * Props:
//  *  - itineraryId (optional)         -> fetches expenses for pie chart
//  *  - destination (string)           -> country name used to fetch attractions
//  *
//  * Notes:
//  *  - Attraction objects expected to include:
//  *    _id, site_name, category, year_inscribed, location, short_description, lat, lon
//  */
// export default function ItineraryViz({ itineraryId, destination }) {
//   // expenses (for pie)
//   const [items, setItems] = useState([]);
//   // attractions (for categories)
//   const [attractions, setAttractions] = useState([]);
//   const [loadingAttractions, setLoadingAttractions] = useState(false);
//   const [loadingExpenses, setLoadingExpenses] = useState(false);

//   // mobile/keyboard open category
//   const [openCategory, setOpenCategory] = useState(null);

//   const expensesAPI = `http://localhost:5050/api/expenses`;
//   const attractionAPI = `http://localhost:5050/api/attractions/country`;

//   // -------------------- fetch expenses (if itineraryId present) --------------------
//   useEffect(() => {
//     if (!itineraryId) {
//       setItems([]);
//       return;
//     }

//     let mounted = true;
//     const loadExpenses = async () => {
//       setLoadingExpenses(true);
//       try {
//         const res = await fetch(`${expensesAPI}/${itineraryId}`);
//         if (!res.ok) {
//           console.warn("Expenses endpoint returned not ok:", res.status);
//           setItems([]);
//           setLoadingExpenses(false);
//           return;
//         }
//         const data = await res.json();
//         if (!mounted) return;
//         if (data && Array.isArray(data.items)) setItems(data.items);
//         else setItems([]);
//       } catch (err) {
//         console.error("ItineraryViz: expense fetch failed", err);
//         setItems([]);
//       } finally {
//         setLoadingExpenses(false);
//       }
//     };

//     loadExpenses();
//     const iv = setInterval(loadExpenses, 3000); // refresh periodically
//     return () => {
//       mounted = false;
//       clearInterval(iv);
//     };
//   }, [itineraryId]);

//   // -------------------- fetch attractions for destination --------------------
//   useEffect(() => {
//     if (!destination) {
//       setAttractions([]);
//       return;
//     }

//     let mounted = true;
//     const loadAttractions = async () => {
//       setLoadingAttractions(true);
//       try {
//         const url = `${attractionAPI}/${encodeURIComponent(destination)}`;
//         const res = await fetch(url);

//         if (!res.ok) {
//           console.warn("Attractions endpoint returned not ok:", res.status);
//           setAttractions([]);
//           setLoadingAttractions(false);
//           return;
//         }

//         const data = await res.json();
//         console.log("ItineraryViz: fetched attractions:", data);

//         if (!mounted) return;

//         if (Array.isArray(data)) {
//           // normalize shape to ensure fields exist
//           const normalized = data.map((a) => ({
//             _id: a._id,
//             site_name: a.site_name || a.name || "Unknown",
//             category: a.category || "Other",
//             year_inscribed: a.year_inscribed || "",
//             location: a.location || "",
//             short_description: a.short_description || "",
//             lat: a.lat !== undefined ? Number(a.lat) : undefined,
//             lon: a.lon !== undefined ? Number(a.lon) : undefined,
//           }));
//           setAttractions(normalized);
//         } else if (data && typeof data === "object") {
//           // sometimes backend returns object wrapper
//           // try to find an array inside common keys
//           if (Array.isArray(data.results)) setAttractions(data.results);
//           else if (Array.isArray(data.data)) setAttractions(data.data);
//           else setAttractions([]);
//         } else {
//           setAttractions([]);
//         }
//       } catch (err) {
//         console.error("ItineraryViz: attraction fetch error", err);
//         setAttractions([]);
//       } finally {
//         setLoadingAttractions(false);
//       }
//     };

//     loadAttractions();

//     return () => {
//       mounted = false;
//     };
//   }, [destination]);

//   // -------------------- pie chart data (from expenses) --------------------
//   const pieData = items.map((i) => ({
//     name: i.category || "Other",
//     value: Number(i.budget || 0),
//   }));
//   const totalBudget = pieData.reduce((s, p) => s + p.value, 0);

//   // -------------------- group attractions by category --------------------
//   const groups = attractions.reduce((acc, a) => {
//     const cat = a.category || "Other";
//     if (!acc[cat]) acc[cat] = [];
//     acc[cat].push(a);
//     return acc;
//   }, {});

//   const categoryOrder = ["Cultural", "Natural", "Mixed", "Other"];
//   const breakdown = categoryOrder.map((cat) => ({
//     category: cat,
//     items: groups[cat] || [],
//     count: (groups[cat] || []).length,
//   }));

//   // toggle category open for mobile (click)
//   const toggleCategory = (cat) => {
//     setOpenCategory((prev) => (prev === cat ? null : cat));
//   };

//   return (
//     <section className="viz-container" aria-live="polite">
//       <h2 className="viz-header">Itinerary Visualizations</h2>

//       {/* ------------------ PIE CHART (expenses) ------------------ */}
//       <div className="viz-card">
//         <h3>Budget Distribution</h3>

//         {loadingExpenses ? (
//           <p>Loading budget data…</p>
//         ) : pieData.length === 0 ? (
//           <p>No budget items available.</p>
//         ) : (
//           <>
//             <div className="chart-box">
//               <ResponsiveContainer width="100%" height={300}>
//                 <PieChart>
//                   <Pie
//                     data={pieData}
//                     dataKey="value"
//                     nameKey="name"
//                     cx="50%"
//                     cy="50%"
//                     outerRadius={110}
//                     label
//                   >
//                     {pieData.map((_, index) => (
//                       <Cell key={index} fill={COLORS[index % COLORS.length]} />
//                     ))}
//                   </Pie>
//                   <Tooltip />
//                   <Legend />
//                 </PieChart>
//               </ResponsiveContainer>

//               <div className="total-display">
//                 Total Budget: <strong>{totalBudget}</strong>
//               </div>
//             </div>

//             <div className="summary-grid">
//               {pieData.map((item, i) => {
//                 const pct = totalBudget === 0 ? 0 : ((item.value / totalBudget) * 100).toFixed(1);
//                 return (
//                   <div className="summary-card" key={i}>
//                     <div className="summary-title">{item.name}</div>
//                     <div className="summary-amount">{item.value}</div>
//                     <div className="summary-percent">{pct}% of total</div>
//                   </div>
//                 );
//               })}
//             </div>
//           </>
//         )}
//       </div>

      // {/* ------------------ ATTRACTION CATEGORY BREAKDOWN (second viz) ------------------ */}
      // <div className="viz-card" style={{ marginTop: "1.25rem" }}>
      //   <h3>Attraction Categories in {destination || "—"}</h3>

      //   {loadingAttractions ? (
      //     <p>Loading attractions…</p>
      //   ) : attractions.length === 0 ? (
      //     <p>No attractions found for {destination || "this destination"}.</p>
      //   ) : (
      //     <div className="attr-breakdown" role="list">
      //       {breakdown.map((b) => {
      //         const barWidth = Math.max(b.count * 36, 8); // scale
      //         return (
      //           <div
      //             key={b.category}
      //             className="attr-row"
      //             onClick={() => toggleCategory(b.category)}
      //             role="listitem"
      //             tabIndex={0}
      //             onKeyDown={(e) => {
      //               if (e.key === "Enter") toggleCategory(b.category);
      //             }}
      //           >
      //             <div className="attr-label">{b.category}</div>

      //             <div
      //               className="attr-bar"
      //               style={{
      //                 width: `${barWidth}px`,
      //                 backgroundColor: b.count > 0 ? "#4F46E5" : "#E6EEF8",
      //               }}
      //               title={`${b.count} site(s)`}
      //             />

      //             <div className="attr-count">{b.count}</div>

      //             <div className={`attr-popup ${openCategory === b.category ? "open" : ""}`}>
      //               <strong>{b.category} Sites ({b.count})</strong>
      //               <ul>
      //                 {b.items.map((a) => (
      //                   <li key={a._id} className="attr-list-item">
      //                     <div className="site-name">{a.site_name}</div>
      //                     {a.location ? <div className="site-location">{a.location}</div> : null}
      //                     {a.short_description ? (
      //                       <div className="site-desc">{a.short_description}</div>
      //                     ) : null}
      //                   </li>
      //                 ))}
      //               </ul>
      //             </div>
      //           </div>
      //         );
      //       })}
      //     </div>
      //   )}
      // </div>
//     </section>
//   );
// }
