document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const provinceSelect = document.getElementById("province");
  const vTypeSelect = document.getElementById("v-type");
  const vCcInput = document.getElementById("v-cc");
  const regYearInput = document.getElementById("reg-year");
  const lastPaidInput = document.getElementById("last-paid");
  const insuranceSelect = document.getElementById("insurance");
  
  const resultBox = document.getElementById("result");
  const hintEl = document.getElementById("hint");

  // Output STAT elements
  const statBaseTax = document.getElementById("stat-base-tax");
  const statRenewal = document.getElementById("stat-renewal");
  const statFine = document.getElementById("stat-fine");
  const statInsurance = document.getElementById("stat-insurance");
  const statTotal = document.getElementById("stat-total");

  // Output Card elements
  const headline = document.getElementById("headline");
  const headlineAd = document.getElementById("headline-ad");
  const bornLine = document.getElementById("born-line");
  const nextBs = document.getElementById("next-bs");
  const nextAd = document.getElementById("next-ad");
  const statHeartbeats = document.getElementById("stat-heartbeats");

  // Current BS Year (default fallback)
  const CURRENT_BS_YEAR = 2081;

  function calculateTax() {
    const vType = vTypeSelect.value;
    const cc = parseFloat(vCcInput.value) || 0;
    const lastPaid = parseInt(lastPaidInput.value) || CURRENT_BS_YEAR;
    const includeInsurance = insuranceSelect.value === "include";

    if (cc <= 0) {
      hintEl.textContent = "Please enter a valid engine capacity (CC or kW).";
      resultBox.hidden = true;
      return;
    }

    hintEl.textContent = "";

    // 1. Calculate Base Tax Rate
    let baseTax = 0;
    let renewalFee = (vType === "bike" || vType === "ev-bike") ? 300 : 500;
    let insuranceCost = 0;

    if (vType === "bike") {
      if (cc <= 125) baseTax = 3000;
      else if (cc <= 150) baseTax = 5000;
      else if (cc <= 225) baseTax = 6500;
      else if (cc <= 400) baseTax = 12000;
      else if (cc <= 650) baseTax = 25000;
      else baseTax = 35000;

      if (includeInsurance) {
        if (cc <= 149) insuranceCost = 1715;
        else if (cc <= 250) insuranceCost = 1941;
        else insuranceCost = 2167;
      }
    } else if (vType === "car") {
      if (cc <= 1000) baseTax = 22000;
      else if (cc <= 1500) baseTax = 25000;
      else if (cc <= 2000) baseTax = 27000;
      else if (cc <= 2500) baseTax = 37000;
      else if (cc <= 3000) baseTax = 50000;
      else if (cc <= 3500) baseTax = 65000;
      else baseTax = 70000;

      if (includeInsurance) {
        if (cc <= 1000) insuranceCost = 7365;
        else if (cc <= 1600) insuranceCost = 8495;
        else insuranceCost = 10747;
      }
    } else if (vType === "ev-bike") {
      if (cc <= 50) baseTax = 1000;
      else if (cc <= 350) baseTax = 1500;
      else if (cc <= 1000) baseTax = 2000;
      else if (cc <= 1500) baseTax = 2500;
      else baseTax = 3000;

      if (includeInsurance) {
        if (cc <= 800) insuranceCost = 1715;
        else if (cc <= 1200) insuranceCost = 1945;
        else insuranceCost = 2167;
      }
    } else if (vType === "ev-car") {
      if (cc <= 50) baseTax = 5000;
      else if (cc <= 125) baseTax = 15000;
      else if (cc <= 2000) baseTax = 20000;
      else baseTax = 30000;

      if (includeInsurance) {
        if (cc <= 20) insuranceCost = 7365;
        else insuranceCost = 8495;
      }
    }

    // 2. Calculate Unpaid Years & Fine Rate
    let yearsOverdue = Math.max(0, CURRENT_BS_YEAR - lastPaid);
    let totalBaseTaxDue = baseTax * Math.max(1, yearsOverdue);
    let fineRate = 0;

    if (yearsOverdue === 1) {
      fineRate = 0.05; // 5% for early overdue
    } else if (yearsOverdue === 2) {
      fineRate = 0.20; // 20% within same fiscal year end
    } else if (yearsOverdue > 2) {
      fineRate = 0.32 * (yearsOverdue - 1); // 32% per overdue year
    }

    let fineAmount = Math.round(totalBaseTaxDue * fineRate);
    let totalPayable = totalBaseTaxDue + renewalFee + fineAmount + insuranceCost;

    // 3. Render Results to DOM
    statBaseTax.textContent = `NPR ${totalBaseTaxDue.toLocaleString()}`;
    statRenewal.textContent = `NPR ${renewalFee.toLocaleString()}`;
    statFine.textContent = `NPR ${fineAmount.toLocaleString()}`;
    statInsurance.textContent = `NPR ${insuranceCost.toLocaleString()}`;
    statTotal.textContent = `NPR ${totalPayable.toLocaleString()}`;

    headline.textContent = `Total Payable: NPR ${totalPayable.toLocaleString()}`;
    headlineAd.textContent = `Base Tax: NPR ${baseTax.toLocaleString()} / year`;
    bornLine.textContent = `Selected Province: ${provinceSelect.options[provinceSelect.selectedIndex].text}`;

    nextBs.textContent = yearsOverdue === 0 ? "Up to Date (No Fine)" : `${yearsOverdue} Year(s) Overdue`;
    nextAd.textContent = yearsOverdue === 0 ? "Clear Status" : `${Math.round(fineRate * 100)}% Penalty Applied`;

    if (statHeartbeats) {
      statHeartbeats.textContent = baseTax.toLocaleString();
    }

    resultBox.hidden = false;
  }

  // Attach event listeners for real-time updating
  const inputs = [provinceSelect, vTypeSelect, vCcInput, regYearInput, lastPaidInput, insuranceSelect];
  inputs.forEach(input => {
    if (input) {
      input.addEventListener("input", calculateTax);
      input.addEventListener("change", calculateTax);
    }
  });

  // Dynamic current year set in footer
  const yrSpan = document.getElementById("yr");
  if (yrSpan) {
    yrSpan.textContent = new Date().getFullYear();
  }
});
