import React, { useState, useEffect } from "react";
import "./CurrencyConverter.css";

const CurrencyConverter = ({ homeCountry, destinationCountry }) => {
  const [homeCurrency, setHomeCurrency] = useState("");
  const [destinationCurrency, setDestinationCurrency] = useState("");

  const [leftAmount, setLeftAmount] = useState(1);
  const [rightAmount, setRightAmount] = useState("");
  const [rates, setRates] = useState({});

  // Get currency from country
  const fetchCurrency = async (country, setter) => {
    const res = await fetch(`https://restcountries.com/v3.1/name/${country}?fullText=true`);
    const data = await res.json();
    const code = Object.keys(data[0]?.currencies || {})[0];
    setter(code);
  };

  // Fetch both currencies
  useEffect(() => {
    if (homeCountry) fetchCurrency(homeCountry, setHomeCurrency);
    if (destinationCountry) fetchCurrency(destinationCountry, setDestinationCurrency);
  }, [homeCountry, destinationCountry]);

  // Fetch ALL RATES once base currency known
  useEffect(() => {
    if (!homeCurrency) return;

    const fetchRates = async () => {
      const res = await fetch(`https://open.er-api.com/v6/latest/${homeCurrency}`);
      const data = await res.json();
      setRates(data.rates);
    };

    fetchRates();
  }, [homeCurrency]);

  // Convert left → right
  const convertRight = (val) => {
    if (!rates[destinationCurrency]) return;
    setRightAmount((val * rates[destinationCurrency]).toFixed(4));
  };

  // Convert right → left (reverse)
  const convertLeft = (val) => {
    if (!rates[destinationCurrency]) return;
    setLeftAmount((val / rates[destinationCurrency]).toFixed(4));
  };

  // Whenever either currency changes, recalc
  useEffect(() => {
    convertRight(leftAmount);
  }, [destinationCurrency, rates]);

  return (
    <div className="simple-converter">
      
      {/* Headline like Google */}
      {rates[destinationCurrency] && (
        <h3 className="headline">
          1 {homeCurrency} equals<br />
          <span className="big-rate">
            {rates[destinationCurrency].toFixed(4)} {destinationCurrency}
          </span>
        </h3>
      )}

      <div className="converter-box">
        
        {/* LEFT SIDE - editable */}
        <div className="row-box">
          <input
            type="number"
            className="amount-input"
            value={leftAmount}
            onChange={(e) => {
              const val = e.target.value;
              setLeftAmount(val);
              convertRight(val);
            }}
          />

          {/* Currency dropdown */}
          <select
            className="currency-select"
            value={homeCurrency}
            onChange={(e) => setHomeCurrency(e.target.value)}
          >
            {Object.keys(rates).map((cur) => (
              <option key={cur} value={cur}>{cur}</option>
            ))}
          </select>
        </div>

        {/* RIGHT SIDE - editable reverse */}
        <div className="row-box">
          <input
            type="number"
            className="amount-input"
            value={rightAmount}
            onChange={(e) => {
              const val = e.target.value;
              setRightAmount(val);
              convertLeft(val);
            }}
          />

          {/* Currency dropdown */}
          <select
            className="currency-select"
            value={destinationCurrency}
            onChange={(e) => setDestinationCurrency(e.target.value)}
          >
            {Object.keys(rates).map((cur) => (
              <option key={cur} value={cur}>{cur}</option>
            ))}
          </select>
        </div>
      </div>

    </div>
  );
};

export default CurrencyConverter;
