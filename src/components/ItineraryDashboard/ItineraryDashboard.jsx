// src/components/itinerary/ItineraryDashboard.jsx
import React, { useState, useEffect } from "react";
import "./ItineraryDashboard.css";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import InputSection from "./InputSection";
import CurrencyConverter from "./CurrencyConverter";
import ExpensesTable from "./ExpensesTable";
import TasksList from "./TasksList";
import DaywisePlanner from "./DaywisePlanner";
import ItineraryViz from "./ItineraryViz";
import Chatbot from "./Chatbot";

const ItineraryDashboard = () => {
  const [form, setForm] = useState(null);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const draft = { form, expenses };
    localStorage.setItem("itineraryDraft", JSON.stringify(draft));
  }, [form, expenses]);

  const handleFormSubmit = (savedDoc) => {
    localStorage.removeItem("itineraryDraft");
    setForm(savedDoc);
    setExpenses([]);
  };

  // ✨ PDF EXPORT WITH FULL FEATURES
  const exportPDF = async () => {
    const fullPage = document.getElementById("pdf-wrapper-all");

    const canvas = await html2canvas(fullPage, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      scrollY: -window.scrollY,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // === PAGE 1: TABLE OF CONTENTS ===
    pdf.setFontSize(22);
    pdf.text("📘 Trip Itinerary — Table of Contents", 14, 25);

    pdf.setFontSize(13);
    pdf.text("1. Trip Details", 14, 50);
    pdf.text("2. Day-wise Planner", 14, 65);
    pdf.text("3. Expenses Table", 14, 80);
    pdf.text("4. Expense Visualization", 14, 95);
    pdf.text("5. Tools (Chatbot, Currency Converter, Tasks)", 14, 110);

    pdf.addPage();

    // === PAGE 2+: THE ACTUAL CONTENT ===
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      position = heightLeft - imgHeight;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // === FOOTER + PAGE NUMBERS ===
    const totalPages = pdf.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      // Header
      pdf.setFontSize(10);
      pdf.setTextColor(120);
      pdf.text(
        `Roampedia — ${form?.destination || ""} Travel Itinerary`,
        pdfWidth / 2,
        10,
        { align: "center" }
      );

      // Footer
      pdf.setTextColor(150);
      pdf.text(
        `Page ${i} of ${totalPages}`,
        pdfWidth / 2,
        pdfHeight - 10,
        { align: "center" }
      );
    }

    pdf.save(`itinerary-${form?.destination || "trip"}.pdf`);
  };

  return (
    <div className="itinerary-dashboard">

      {/* FULL WRAPPER FOR PDF */}
      <div id="pdf-wrapper-all" className="pdf-wrapper-all">

        <div className="itinerary-container">

          {/* LEFT COLUMN INCLUDED IN PDF */}
          <div className="left-column">
            <InputSection onSubmit={handleFormSubmit} initialValues={form} />

            <div className={`recommendations ${form ? "visible" : "hidden"}`}>
              <h3>Quick Tools</h3>

              <Chatbot />

              <CurrencyConverter
                homeCountry={form?.homeCountry}
                destinationCountry={form?.destination}
              />

              {form && <TasksList itineraryId={form?._id} />}
            </div>
          </div>

          {/* RIGHT COLUMN INCLUDED IN PDF */}
          <div className="right-column">
            {!form ? (
              <div className="placeholder-note">Enter trip details first.</div>
            ) : (
              <>
                <section className="section card page-break">
                  <h3>Day-wise Planner</h3>
                  <DaywisePlanner
                    destination={form.destination}
                    departureDate={form.departureDate}
                    returnDate={form.returnDate}
                  />
                </section>

                <section className="section card page-break">
                  <h3>Expenses</h3>
                  <ExpensesTable itineraryId={form._id} />
                </section>

                <section className="section card page-break">
                  <h3>Expense Breakdown</h3>
                  <ItineraryViz itineraryId={form._id} destination={form.destination} />
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Button outside capture */}
      <div className="actions-row">
        {form && (
          <button className="btn-export" onClick={exportPDF}>
            Export Full PDF
          </button>
        )}
      </div>
    </div>
  );
};

export default ItineraryDashboard;
