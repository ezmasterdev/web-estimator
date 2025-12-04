const siteTypeSelect = document.getElementById("siteType");
const numPagesContainer = document.getElementById("numPagesContainer");
const dynamicInputs = document.getElementById("dynamicInputs");
const initialPlaceholder = document.getElementById("initialPlaceholder");
const chartDisplayContainer = document.getElementById("chartDisplayContainer");
const customLegend = document.getElementById("customLegend");
const pricingDetailsContent = document.getElementById("pricingDetailsContent"); 

let chartInstance = null;

const CHART_COLORS = [
    "#007bff","#28a745","#ffc107","#dc3545","#17a2b8",
    "#6f42c1","#fd7e14","#20c997","#e83e8c"
];

// UPDATED: Added "Miscellaneous"
const PRICING = {
    dynamic: {
        "System Architecture & DB": { base: 3500, unit: 500, threshold: 5, desc: "Initial cost covers up to 5 database tables. +₱500 for every additional table." },
        "Backend Development": { base: 8000, unit: 1000, threshold: 1, desc: "Covers 1 default user role/type. +₱1000 for every additional user type/role." },
        "Frontend Development": { base: 1500, unit: 500, threshold: 1, desc: "Cost for the initial Homepage. +₱500 for every other unique page." },
        "Notifications": { base: 0, unit: 2500, threshold: 0, desc: "In-app notifications are default. +₱2500 for every external service (e.g., email/SMS API)." },
        "Payment Gateways": { base: 0, unit: 3000, threshold: 0, desc: "+₱3000 flat fee for integrating each online payment method (e.g., PayPal, Stripe)." },
        "Cybersecurity (Standard)": { base: 5000, unit: 0, threshold: 0, desc: "Fixed cost for standard security setup (SSL, input sanitization, etc.)." },
        "Deployment & Hosting Setup": { base: 5000, unit: 0, threshold: 0, desc: "Fixed cost for setting up the live production environment." },
        "Testing & Documentation": { base: 4000, unit: 0, threshold: 0, desc: "Fixed cost for quality assurance and comprehensive project handover documents." },
        "Miscellaneous": { base: 5000, unit: 0, threshold: 0, desc: "Fixed cost for unforeseen minor items and general overhead." }
    },
    static: {
        "Frontend Development": { base: 1500, unit: 500, threshold: 1, desc: "Cost for the initial Homepage. +₱500 for every other unique page." },
        "Deployment & Hosting Setup": { base: 3500, unit: 0, threshold: 0, desc: "Fixed cost for setting up static hosting environment." },
        "Testing & Documentation": { base: 3000, unit: 0, threshold: 0, desc: "Fixed cost for quality assurance and basic handover documentation." },
        "Miscellaneous": { base: 3000, unit: 0, threshold: 0, desc: "Fixed cost for unforeseen minor items and general overhead." }
    }
};

// Percentage labels plugin for CHART.js
const percentagePlugin = {
    id: "percentagePlugin",
    afterDraw(chart) {
        const { ctx } = chart;
        const dataset = chart.data.datasets[0];
        const meta = chart.getDatasetMeta(0);
        const total = dataset.data.reduce((a, b) => a + b, 0);

        ctx.save();
        ctx.font = "bold 13px Arial";
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";

        meta.data.forEach((arc, i) => {
            const value = dataset.data[i];
            if (value <= 0) return;

            const percentage = ((value / total) * 100).toFixed(1) + "%";
            const pos = arc.tooltipPosition();
            ctx.fillText(percentage, pos.x, pos.y);
        });

        ctx.restore();
    }
};

function drawEmptyChart() {
    initialPlaceholder.style.display = "flex";
    chartDisplayContainer.style.display = "none";
    document.getElementById("resultTotal").innerText = "Estimated Price: ₱0";
    document.getElementById("breakdown").innerHTML =
        `<li class="list-group-item text-center text-muted">Waiting for input...</li>`;
    if (chartInstance) chartInstance.destroy();
    chartInstance = null;
    customLegend.innerHTML = "";

    document.getElementById("pdf-breakdown-table").innerHTML = "";
}

siteTypeSelect.addEventListener("change", () => {
    const type = siteTypeSelect.value;
    numPagesContainer.style.display = type ? "block" : "none";
    dynamicInputs.style.display = type === "dynamic" ? "block" : "none";
    drawEmptyChart();
});

function calculateComponent(name, input, config, totals) {
    let cost = config.base;
    const extra = Math.max(0, input - config.threshold);

    if (config.unit > 0 && extra > 0) {
        cost += extra * config.unit;
    }
    totals[name] = cost;
}

function calculatePrice(isInit) {
    if (isInit) return drawEmptyChart();

    const type = siteTypeSelect.value;
    const pages = parseInt(document.getElementById("numPages").value) || 0;
    const clientType = document.getElementById("clientType").value;

    if (!type || pages < 1) {
        // Using console.error instead of alert for better user experience
        console.error("Enter a valid site type and at least 1 page.");
        return drawEmptyChart();
    }

    const totals = {};
    const cfg = PRICING[type];

    if (type === "dynamic") {
        calculateComponent("System Architecture & DB", parseInt(numTables.value) || 0, cfg["System Architecture & DB"], totals);
        calculateComponent("Backend Development", parseInt(numRoles.value) || 0, cfg["Backend Development"], totals);
        calculateComponent("Frontend Development", pages, cfg["Frontend Development"], totals);
        calculateComponent("Notifications", parseInt(numExternalNotifs.value) || 0, cfg["Notifications"], totals);
        calculateComponent("Payment Gateways", parseInt(numGateways.value) || 0, cfg["Payment Gateways"], totals);

        totals["Cybersecurity (Standard)"] = cfg["Cybersecurity (Standard)"].base;
        totals["Deployment & Hosting Setup"] = cfg["Deployment & Hosting Setup"].base;
        totals["Testing & Documentation"] = cfg["Testing & Documentation"].base;
        totals["Miscellaneous"] = cfg["Miscellaneous"].base; 
    } else { // static
        calculateComponent("Frontend Development", pages, cfg["Frontend Development"], totals);
        totals["Deployment & Hosting Setup"] = cfg["Deployment & Hosting Setup"].base;
        totals["Testing & Documentation"] = cfg["Testing & Documentation"].base;
        totals["Miscellaneous"] = cfg["Miscellaneous"].base; 
    }

    // Cost before multiplier
    let baseCost = Object.values(totals).reduce((a,b)=>a+b,0);
    
    // Apply FOREIGN MULTIPLIER = x2 (for final client display)
    let finalClientTotal = baseCost;
    if (clientType === "foreign") finalClientTotal *= 2;

    // Use toLocaleString for the on-screen display
    document.getElementById("resultTotal").innerText =
        `Estimated Price: ₱${Math.round(finalClientTotal).toLocaleString()}`;
        
    // Also update the base price input in the discount modal
    document.getElementById("basePriceInput").value = Math.round(finalClientTotal);

    // Breakdown for on-screen UL (using BASE COSTS)
    const breakdownUl = document.getElementById("breakdown");
    breakdownUl.innerHTML = "";
    Object.entries(totals).forEach(([k,v])=>{
        breakdownUl.innerHTML += `
            <li class="list-group-item d-flex justify-content-between">
                <span>${k}</span>
                <span class="text-success fw-bold">₱${v.toLocaleString()}</span>
            </li>`;
    });

    // Breakdown for PDF TABLE (using BASE COSTS)
    const breakdownTable = document.getElementById("pdf-breakdown-table");
    let tableHtml = `
        <thead>
            <tr style="background-color: #007bff; color: white;">
                <th colspan="2">Price Breakdown (Before Multiplier)</th>
            </tr>
            <tr>
                <th>Component</th>
                <th>Estimated Cost (₱)</th>
            </tr>
        </thead>
        <tbody>`;
    Object.entries(totals).forEach(([k,v])=>{
        tableHtml += `
            <tr>
                <td>${k}</td>
                <td style="text-align: right;">${v.toLocaleString()}</td>
            </tr>`;
    });
    tableHtml += `
        <tr style="font-weight: bold; background-color: #f0f0f0;">
            <td>Subtotal</td>
            <td style="text-align: right;">₱${baseCost.toLocaleString()}</td>
        </tr>
        </tbody>`;
    breakdownTable.innerHTML = tableHtml;


    initialPlaceholder.style.display = "none";
    chartDisplayContainer.style.display = "block";

    // Chart for Display ONLY
    const chartData = {
        labels: Object.keys(totals),
        datasets: [{
            data: Object.values(totals),
            backgroundColor: CHART_COLORS
        }]
    };
    
    // On-Screen Chart
    const ctx = document.getElementById("priceChart").getContext("2d");
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: "doughnut",
        data: chartData,
        options: {
            responsive: true,
            plugins: { legend: { display:false } }
        },
        plugins: [percentagePlugin]
    });

    customLegend.innerHTML = "";
    Object.keys(totals).forEach((label,i)=>{
        customLegend.innerHTML += `
            <li class="chart-legend-item mx-2">
                <span class="chart-legend-color" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
                ${label}
            </li>`;
    });

    return finalClientTotal; // Return the final multiplied total for PDF
}

// Function to populate the modal with pricing details
function populatePricingModal() {
    let content = '';

    for (const type in PRICING) {
        content += `<h3 class="mt-4 mb-3 text-${type === 'dynamic' ? 'success' : 'primary'}">${type.charAt(0).toUpperCase() + type.slice(1)} Site Pricing</h3>`;
        content += `<table class="table table-bordered modal-pricing-table">
                        <thead class="table-light">
                            <tr>
                                <th>Component</th>
                                <th>Base Cost (PHP)</th>
                                <th>Unit Cost / Fee</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>`;

        for (const [component, config] of Object.entries(PRICING[type])) {
            const baseText = config.base > 0 ? `₱${config.base.toLocaleString()}` : 'N/A';
            let unitText;

            if (component === "Frontend Development") {
                unitText = `+₱${config.unit.toLocaleString()}/page`;
            } else if (component === "System Architecture & DB") {
                unitText = `+₱${config.unit.toLocaleString()}/add'l table`;
            } else if (component === "Backend Development") {
                unitText = `+₱${config.unit.toLocaleString()}/add'l role`;
            } else if (config.unit > 0 && config.threshold === 0) {
                 unitText = `+₱${config.unit.toLocaleString()} per unit`;
            } else {
                unitText = 'Fixed';
            }
            
            content += `
                <tr>
                    <td class="fw-bold">${component}</td>
                    <td>${baseText}</td>
                    <td>${unitText}</td>
                    <td class="text-muted small">${config.desc}</td>
                </tr>`;
        }
        content += `</tbody></table>`;
    }
    pricingDetailsContent.innerHTML = content;
}

// RESET
function resetEstimator() {
    siteTypeSelect.value = "";
    document.getElementById("numPages").value = 5;
    document.getElementById("numTables").value = 5;
    document.getElementById("numRoles").value = 1;
    document.getElementById("numExternalNotifs").value = 0;
    document.getElementById("numGateways").value = 0;
    document.getElementById("clientType").value = "local";
    numPagesContainer.style.display = "none";
    dynamicInputs.style.display = "none";
    drawEmptyChart();
    
    // Reset Discount Modal elements on main reset
    document.getElementById("basePriceInput").value = 0;
    document.getElementById("modalSiteTypeStatic").checked = true;
    document.getElementById("referralDiscount").checked = false;
    document.getElementById("studentDiscount").checked = false;
    document.getElementById("planADiscount").checked = false; 
    document.getElementById("discountResult").innerText = "Final Price: ₱0";
    document.getElementById("discountBreakdown").innerHTML = '<li class="list-group-item">No calculations performed yet.</li>';
    document.getElementById("planADiscountDesc").innerText = '(Plan A Discount: 10% Off)'; 
}

// PDF REPORT (UNCHANGED logic)
async function generatePDF() {
    const { jsPDF } = window.jspdf;
    
    // Ensure calculation is run to get the final total and update PDF table
    const finalTotal = calculatePrice(false);
    // Use an internal modal message instead of alert
    if (finalTotal === 0) {
        console.error("Calculation needed before generating PDF.");
        return; 
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageHeight = doc.internal.pageSize.height;
    let y_pos = 10;

    // Helper function to format number with commas without locale issues
    const formatNumber = (num) => {
        // Round to nearest integer and use regex to insert commas
        return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // --- 1. HEADER ---
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 190, y_pos, null, null, 'right');
    y_pos += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor('#007bff');
    doc.text("Web Development Price Estimation Report", 105, y_pos, null, null, 'center');
    y_pos += 5;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0); 
    doc.text("Prepared by EZ Web Solutions", 105, y_pos, null, null, 'center');
    y_pos += 10;
    doc.line(10, y_pos - 3, 200, y_pos - 3); 
    y_pos += 5; 
    
    // --- 2. SUMMARY / TOTAL ---
    const siteType = siteTypeSelect.value;
    const clientType = document.getElementById("clientType").value;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Project Summary`, 10, y_pos);
    y_pos += 7;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Site Type: ${siteType.charAt(0).toUpperCase() + siteType.slice(1)}`, 10, y_pos);
    y_pos += 6;
    doc.text(`Number of Pages: ${document.getElementById("numPages").value}`, 10, y_pos);
    y_pos += 6;
    doc.text(`Client Type: ${clientType === 'foreign' ? 'Foreign Client' : 'Local Client'}`, 10, y_pos);
    y_pos += 10;

    doc.setFontSize(16);
    doc.setTextColor('#dc3545'); 
    doc.setFont('helvetica', 'bold');

    const totalString = `${formatNumber(finalTotal)} php`;
    doc.text(`TOTAL ESTIMATED PRICE: ${totalString}`, 10, y_pos); 

    y_pos += 10;
    doc.setTextColor(0, 0, 0); 

    // --- 3. PRICE BREAKDOWN (Table Capture) ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Detailed Price Breakdown (Before Client Multiplier)`, 10, y_pos);
    y_pos += 3;

    const tableElement = document.getElementById('pdf-table-container');
    const tableCanvas = await html2canvas(tableElement, { scale: 2 });
    const tableImgData = tableCanvas.toDataURL('image/png');
    
    const tableWidth = 190; 
    const tableHeight = tableWidth / tableCanvas.width * tableCanvas.height;
    
    doc.addImage(tableImgData, 'PNG', 10, y_pos, tableWidth, tableHeight);
    y_pos += tableHeight + 10;

    // --- 4. IMPORTANT NOTES/DISCLAIMER ---
    if (y_pos + 70 > pageHeight) { 
        doc.addPage();
        y_pos = 10;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#6c757d'); 
    
    const notes = [
        "IMPORTANT NOTES:",
        "1. This is an **ESTIMATION** only and is subject to change upon detailed final scoping and requirements gathering.",
        `2. The quoted price **INCLUDES** initial hosting and domain registration for the first 1 year, but ongoing maintenance and fees thereafter are not covered.`,
        `3. A multiplier of x2 is applied to Foreign Clients to ensure the financial value of the contract is commensurate with international market rates and to mitigate risks associated with cross-currency fluctuation.`,
        `4. Features requiring complex third-party API integration may incur additional costs.`,
        `5. Revisions or major changes requested **post-deployment** will be billed separately from this contract.`,
        "6. This estimate is valid for **30 days** from the date of issuance."
    ];

    doc.text(notes, 10, y_pos, { maxWidth: 190, lineHeightFactor: 1.5 });
    y_pos += notes.length * 6 + 5;

    // --- 5. FOOTER ---
    doc.line(10, pageHeight - 15, 200, pageHeight - 15); 
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#007bff');
    doc.text("EZ Web Solutions", 10, pageHeight - 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text("Providing innovative web development solutions.", 200, pageHeight - 10, null, null, 'right');

    doc.save("Website_Estimate.pdf");
}

/**
 * Helper function to enforce mutual exclusivity in the UI for discounts.
 * When a discount box is checked, all others in the 'discount-check' group are unchecked.
 */
function handleDiscountCheckbox(checkedElement) {
    const checkboxes = document.querySelectorAll(".discount-check");
    checkboxes.forEach(checkbox => {
        if (checkbox !== checkedElement) {
            checkbox.checked = false;
        }
    });
    // Immediately call the calculator after enforcing UI exclusivity
    calculateDiscounts();
}

/**
 * Prefills the Discount Modal with the current estimated price and site type
 * from the main calculator, if available.
 */
function prefillDiscountModal() {
    const totalElement = document.getElementById("resultTotal").innerText;
    const currentSiteType = siteTypeSelect.value;
    const basePriceInput = document.getElementById("basePriceInput");
    const staticRadio = document.getElementById("modalSiteTypeStatic");
    const dynamicRadio = document.getElementById("modalSiteTypeDynamic");
    
    // Extract number from "Estimated Price: ₱X,XXX"
    const priceMatch = totalElement.match(/₱([\d,]+)/);
    const estimatedPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
    
    // Set the base price
    basePriceInput.value = estimatedPrice;

    // Set the site type radio button
    if (currentSiteType === 'dynamic') {
        dynamicRadio.checked = true;
    } else {
        staticRadio.checked = true;
    }
    
    // Update perk description and status immediately (now just updates text)
    updatePlanADiscountDescription();
    
    // Recalculate upon opening the modal if a base price exists
    if (estimatedPrice > 0) {
        calculateDiscounts();
    } else {
        document.getElementById("discountResult").innerText = "Final Price: ₱0";
        document.getElementById("discountBreakdown").innerHTML = '<li class="list-group-item">Enter a base price and click calculate.</li>';
    }
}

/**
 * Updates the description for Plan A Discount (no longer disables).
 * Rerunning calculateDiscounts is crucial now due to the mutual exclusivity logic.
 */
function updatePlanADiscountDescription() {
    // The discount is now available for all site types.
    const perkDesc = document.getElementById("planADiscountDesc");
    perkDesc.innerHTML = '<span class="text-success fw-bold">(Plan A Discount: 10% Off)</span>';
    
    // Rerun calculation to ensure only one discount is applied correctly after a site type change
    calculateDiscounts();
}

// Event listeners for the modal radio buttons to update the perk description (and rerun calc)
document.getElementById("modalSiteTypeStatic").addEventListener("change", updatePlanADiscountDescription);
document.getElementById("modalSiteTypeDynamic").addEventListener("change", updatePlanADiscountDescription);


/**
 * Calculates the final price based on the estimated price and selected discounts.
 * Uses if/else if structure to ensure only one discount is applied.
 */
function calculateDiscounts() {
    let price = parseFloat(document.getElementById("basePriceInput").value) || 0;
    const isReferral = document.getElementById("referralDiscount").checked;
    const isStudent = document.getElementById("studentDiscount").checked;
    const isPlanA = document.getElementById("planADiscount").checked; 
    
    const selectedCount = isReferral + isStudent + isPlanA;

    if (price <= 0) {
        document.getElementById("discountResult").innerText = "Final Price: ₱0";
        document.getElementById("discountBreakdown").innerHTML = '<li class="list-group-item text-danger">Please enter a positive estimated price.</li>';
        return;
    }

    let finalPrice = price; 
    let discountApplied = false;
    let breakdownHtml = `<li class="list-group-item d-flex justify-content-between">
                             <span class="fw-bold">Base Estimated Price</span>
                             <span class="fw-bold">₱${price.toLocaleString()}</span>
                           </li>`;

    // --- 1. Percentage Discounts (Mutually Exclusive Logic) ---
    // Check discounts in a specific priority order (Referral > Student > Plan A)
    if (isReferral) {
        const discountAmount = price * 0.05; // 5% off
        finalPrice -= discountAmount;
        discountApplied = true;
        breakdownHtml += `<li class="list-group-item d-flex justify-content-between text-success">
                             <span>- Referral Discount (5%)</span>
                             <span>-₱${Math.round(discountAmount).toLocaleString()}</span>
                           </li>`;
    } else if (isStudent) {
        const discountAmount = price * 0.10; // 10% off
        finalPrice -= discountAmount;
        discountApplied = true;
        breakdownHtml += `<li class="list-group-item d-flex justify-content-between text-success">
                             <span>- Student/Thesis Discount (10%)</span>
                             <span>-₱${Math.round(discountAmount).toLocaleString()}</span>
                           </li>`;
    } else if (isPlanA) {
        // Plan A is now a 10% percentage discount
        const discountAmount = price * 0.10; // 10% off
        finalPrice -= discountAmount;
        discountApplied = true;
        breakdownHtml += `<li class="list-group-item d-flex justify-content-between text-success">
                             <span>- Plan A Discount (10% Off)</span>
                             <span>-₱${Math.round(discountAmount).toLocaleString()}</span>
                           </li>`;
    }

    // Add a note if a discount was not applied (e.g., if a box was unchecked)
    if (!discountApplied) {
        breakdownHtml += `<li class="list-group-item text-muted">No discount selected or applied.</li>`;
    }

    // 2. Final Result
    finalPrice = Math.max(0, finalPrice); // Ensure price doesn't go below zero

    breakdownHtml += `<li class="list-group-item d-flex justify-content-between fw-bold bg-light mt-2">
                        <span>Final Price</span>
                        <span>₱${Math.round(finalPrice).toLocaleString()}</span>
                      </li>`;

    document.getElementById("discountResult").innerText = `Final Price: ₱${Math.round(finalPrice).toLocaleString()}`;
    document.getElementById("discountBreakdown").innerHTML = breakdownHtml;
}


window.onload = () => {
    calculatePrice(true);
    populatePricingModal();
    // Pre-populate the modal on load with default 0 price
    prefillDiscountModal(); 
};
