function formatCurrency(amount) {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 2
    }).format(amount);
}

function calculateTax() {
    let income = parseFloat(document.getElementById("income").value);
    let taxType = document.getElementById("taxType").value;
    let age = parseInt(document.getElementById("age").value) || 0;
    let retirementContribution = parseFloat(document.getElementById("retirementContribution").value) || 0;
    let medicalExpenses = parseFloat(document.getElementById("medicalExpenses").value) || 0;
    let donations = parseFloat(document.getElementById("donations").value) || 0;
    let capitalGains = parseFloat(document.getElementById("capitalGains").value) || 0;
    
    let resultDiv = document.getElementById("result");
    let breakdownDiv = document.getElementById("breakdown");
    let chartContainer = document.getElementById("taxChart");

    if (isNaN(income) || income < 0) {
        resultDiv.innerHTML = "<span style='color:red;'>Please enter a valid income amount.</span>";
        breakdownDiv.innerHTML = "";
        chartContainer.innerHTML = "";
        return;
    }

    // Save user preferences
    saveUserPreferences();

    let tax = 0;
    let breakdown = "";
    let deductions = 0;
    let rebates = 0;
    let netTax = 0;
    let netIncome = 0;
    let effectiveRate = 0;
    let capitalGainsTax = 0;
    let totalTax = 0;
    
    // Tax calculations based on type
    if (taxType === "personal") {
        // Apply deductions first
        // Retirement contributions limited to 27.5% of income or R350,000
        let retirementDeduction = Math.min(retirementContribution, income * 0.275, 350000);
        let taxableIncome = Math.max(0, income - retirementDeduction);
        
        if (retirementDeduction > 0) {
            deductions += retirementDeduction;
            breakdown += `<p>Retirement contribution deduction: ${formatCurrency(retirementDeduction)}</p>`;
        }
        
        // Medical expenses - simplified for demo
        if (medicalExpenses > 0) {
            let medicalDeduction = Math.min(medicalExpenses, 15000); // Simplified
            deductions += medicalDeduction;
            breakdown += `<p>Medical expenses deduction: ${formatCurrency(medicalDeduction)}</p>`;
            taxableIncome -= medicalDeduction;
        }
        
        // Donations deduction - max 10% of taxable income
        if (donations > 0) {
            let donationDeduction = Math.min(donations, taxableIncome * 0.1);
            deductions += donationDeduction;
            breakdown += `<p>Charitable donations deduction: ${formatCurrency(donationDeduction)}</p>`;
            taxableIncome -= donationDeduction;
        }
        
        // Tax brackets for SA
        let brackets = [
            { limit: 237100, rate: 0.18, base: 0 },
            { limit: 370500, rate: 0.26, base: 42678 },
            { limit: 512800, rate: 0.31, base: 77362 },
            { limit: 673000, rate: 0.36, base: 121475 },
            { limit: 857900, rate: 0.39, base: 179147 },
            { limit: 1817000, rate: 0.41, base: 251258 },
            { limit: Infinity, rate: 0.45, base: 644489 }
        ];

        // Calculate base income tax
        let bracketUsed = null;
        for (let i = 0; i < brackets.length; i++) {
            if (taxableIncome <= brackets[i].limit) {
                const prevLimit = i > 0 ? brackets[i-1].limit : 0;
                const amountInBracket = taxableIncome - prevLimit;
                tax = brackets[i].base + amountInBracket * brackets[i].rate;
                bracketUsed = i;
                break;
            }
        }
        
        // Create detailed breakdown of tax calculation
        if (bracketUsed !== null) {
            breakdown += `<h4>Income Tax Calculation:</h4>`;
            
            for (let i = 0; i <= bracketUsed; i++) {
                const prevLimit = i > 0 ? brackets[i-1].limit : 0;
                const upperLimit = i < bracketUsed ? brackets[i].limit : taxableIncome;
                const amountInBracket = upperLimit - prevLimit;
                const taxForBracket = amountInBracket * brackets[i].rate;
                
                if (amountInBracket > 0) {
                    breakdown += `<p>${formatCurrency(amountInBracket)} taxed at ${brackets[i].rate * 100}% = ${formatCurrency(taxForBracket)}</p>`;
                }
            }
        }
        
        // Apply tax rebates based on age
        if (age < 65) {
            rebates = 17235; // Primary rebate
        } else if (age < 75) {
            rebates = 17235 + 9444; // Primary + Secondary rebate
        } else {
            rebates = 17235 + 9444 + 3145; // Primary + Secondary + Tertiary rebate
        }
        
        breakdown += `<p>Tax rebates based on age (${age}): ${formatCurrency(rebates)}</p>`;
        
        // Calculate capital gains tax if applicable
        if (capitalGains > 0) {
            // 40% of capital gains are taxable for individuals
            const taxableCapitalGain = capitalGains * 0.4;
            // Annual exclusion of R40,000
            const taxableGainAfterExclusion = Math.max(0, taxableCapitalGain - 40000);
            
            if (taxableGainAfterExclusion > 0) {
                // Use the marginal tax rate from income tax bracket
                const marginalRate = brackets[bracketUsed].rate;
                capitalGainsTax = taxableGainAfterExclusion * marginalRate;
                
                breakdown += `<h4>Capital Gains Tax:</h4>`;
                breakdown += `<p>Inclusion rate (40%): ${formatCurrency(taxableCapitalGain)}</p>`;
                breakdown += `<p>Annual exclusion: ${formatCurrency(40000)}</p>`;
                breakdown += `<p>Taxable capital gain: ${formatCurrency(taxableGainAfterExclusion)}</p>`;
                breakdown += `<p>CGT at marginal rate (${marginalRate * 100}%): ${formatCurrency(capitalGainsTax)}</p>`;
            } else {
                breakdown += `<p>Capital gains below annual exclusion: No CGT due</p>`;
            }
        }
        
        // Calculate final tax amounts
        netTax = Math.max(0, tax - rebates);
        totalTax = netTax + capitalGainsTax;
        netIncome = income - totalTax;
        effectiveRate = (totalTax / income) * 100;
        
    } else if (taxType === "corporate") {
        tax = income * 0.27; // Corporate Tax Rate in SA is 27%
        breakdown = `<p>Corporate tax is a flat 27%: ${formatCurrency(tax)}</p>`;
        
        // Capital gains for companies (80% inclusion rate)
        if (capitalGains > 0) {
            const taxableCapitalGain = capitalGains * 0.8;
            capitalGainsTax = taxableCapitalGain * 0.27;
            
            breakdown += `<h4>Capital Gains Tax:</h4>`;
            breakdown += `<p>Inclusion rate (80%): ${formatCurrency(taxableCapitalGain)}</p>`;
            breakdown += `<p>CGT at corporate rate (27%): ${formatCurrency(capitalGainsTax)}</p>`;
        }
        
        totalTax = tax + capitalGainsTax;
        netIncome = income - totalTax;
        effectiveRate = (totalTax / income) * 100;
    } else if (taxType === "vat") {
        // VAT calculation
        let vatRate = 0.15; // 15% VAT in South Africa
        let priceExclVat = income / (1 + vatRate);
        let vatAmount = income - priceExclVat;
        
        breakdown = `<h4>VAT Calculation:</h4>`;
        breakdown += `<p>Price including VAT: ${formatCurrency(income)}</p>`;
        breakdown += `<p>Price excluding VAT: ${formatCurrency(priceExclVat)}</p>`;
        breakdown += `<p>VAT amount (15%): ${formatCurrency(vatAmount)}</p>`;
        
        totalTax = vatAmount;
        netIncome = priceExclVat;
        effectiveRate = 15; // Fixed VAT rate
    }

    // Display results
    resultDiv.innerHTML = `
        <h3>Tax Summary</h3>
        <p><strong>Gross Income:</strong> ${formatCurrency(income)}</p>
        ${deductions > 0 ? `<p><strong>Total Deductions:</strong> ${formatCurrency(deductions)}</p>` : ''}
        ${rebates > 0 ? `<p><strong>Tax Rebates:</strong> ${formatCurrency(rebates)}</p>` : ''}
        <p><strong>Total Tax:</strong> ${formatCurrency(totalTax)}</p>
        ${capitalGainsTax > 0 ? `<p><strong>CGT Portion:</strong> ${formatCurrency(capitalGainsTax)}</p>` : ''}
        <p><strong>Effective Tax Rate:</strong> ${effectiveRate.toFixed(2)}%</p>
        <p><strong>Net Income:</strong> ${formatCurrency(netIncome)}</p>
    `;

    breakdownDiv.innerHTML = `<h3>Tax Breakdown</h3>` + breakdown;
    
    // Create tax visualization chart
    createTaxChart(income, totalTax, deductions, netIncome);
}

function createTaxChart(income, tax, deductions, netIncome) {
    const chartContainer = document.getElementById("taxChart");
    chartContainer.innerHTML = ''; // Clear previous chart
    
    // Create a simple bar chart showing income breakdown
    const chartWidth = chartContainer.offsetWidth;
    const chartHeight = 60;
    
    const grossIncomeWidth = chartWidth;
    const taxWidth = (tax / income) * chartWidth;
    const deductionsWidth = (deductions / income) * chartWidth;
    const netIncomeWidth = (netIncome / income) * chartWidth;
    
    const html = `
        <div class="chart-title">Income Breakdown</div>
        <div class="chart-container">
            <div class="chart-bar gross-income" style="width: ${grossIncomeWidth}px;">
                <div class="chart-label">Gross: ${formatCurrency(income)}</div>
            </div>
            <div class="chart-bar-container">
                <div class="chart-bar tax" style="width: ${taxWidth}px;">
                    <div class="chart-label">Tax: ${formatCurrency(tax)}</div>
                </div>
                ${deductions > 0 ? `
                    <div class="chart-bar deductions" style="width: ${deductionsWidth}px;">
                        <div class="chart-label">Deductions: ${formatCurrency(deductions)}</div>
                    </div>
                ` : ''}
                <div class="chart-bar net-income" style="width: ${netIncomeWidth}px;">
                    <div class="chart-label">Net: ${formatCurrency(netIncome)}</div>
                </div>
            </div>
        </div>
    `;
    
    chartContainer.innerHTML = html;
}

// Save and load user preferences
function saveUserPreferences() {
    if (typeof(Storage) !== "undefined") {
        const preferences = {
            income: document.getElementById("income").value,
            taxType: document.getElementById("taxType").value,
            age: document.getElementById("age").value,
            retirementContribution: document.getElementById("retirementContribution").value,
            medicalExpenses: document.getElementById("medicalExpenses").value,
            donations: document.getElementById("donations").value,
            capitalGains: document.getElementById("capitalGains").value
        };
        
        localStorage.setItem("taxCalculatorPrefs", JSON.stringify(preferences));
    }
}

function loadUserPreferences() {
    if (typeof(Storage) !== "undefined") {
        const preferences = JSON.parse(localStorage.getItem("taxCalculatorPrefs"));
        
        if (preferences) {
            document.getElementById("income").value = preferences.income || '';
            document.getElementById("taxType").value = preferences.taxType || 'personal';
            document.getElementById("age").value = preferences.age || '';
            document.getElementById("retirementContribution").value = preferences.retirementContribution || '';
            document.getElementById("medicalExpenses").value = preferences.medicalExpenses || '';
            document.getElementById("donations").value = preferences.donations || '';
            document.getElementById("capitalGains").value = preferences.capitalGains || '';
            
            // Update form visibility based on loaded tax type
            updateFormFields();
        }
    }
}

// Show/hide form fields based on tax type
function updateFormFields() {
    const taxType = document.getElementById("taxType").value;
    const personalFields = document.getElementById("personalFields");
    const corporateFields = document.getElementById("corporateFields");
    const vatFields = document.getElementById("vatFields");
    const capitalGainsField = document.getElementById("capitalGainsField");
    
    // Hide all fields first
    personalFields.style.display = "none";
    corporateFields.style.display = "none";
    vatFields.style.display = "none";
    
    // Show relevant fields based on tax type
    if (taxType === "personal") {
        personalFields.style.display = "block";
        capitalGainsField.style.display = "block";
        document.getElementById("incomeLabel").textContent = "Enter Annual Income:";
    } else if (taxType === "corporate") {
        corporateFields.style.display = "block";
        capitalGainsField.style.display = "block";
        document.getElementById("incomeLabel").textContent = "Enter Annual Profit:";
    } else if (taxType === "vat") {
        vatFields.style.display = "block";
        capitalGainsField.style.display = "none";
        document.getElementById("incomeLabel").textContent = "Enter Amount (incl. VAT):";
    }
}

// Printable report
function generatePrintableReport() {
    const income = parseFloat(document.getElementById("income").value);
    const taxType = document.getElementById("taxType").value;
    
    if (isNaN(income) || income < 0) {
        alert("Please calculate a valid tax first.");
        return;
    }
    
    const resultHTML = document.getElementById("result").innerHTML;
    const breakdownHTML = document.getElementById("breakdown").innerHTML;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tax Report</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                h1, h2, h3 { color: #333; }
                .container { max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #777; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>South African Tax Report</h1>
                    <p>Generated on ${new Date().toLocaleDateString()}</p>
                </div>
                
                <h2>${taxType.charAt(0).toUpperCase() + taxType.slice(1)} Tax Calculation</h2>
                
                <div class="result">
                    ${resultHTML}
                </div>
                
                <div class="breakdown">
                    ${breakdownHTML}
                </div>
                
                <div class="footer">
                    <p>This report is for informational purposes only and does not constitute tax advice.</p>
                </div>
                
                <div class="no-print" style="text-align: center; margin-top: 30px;">
                    <button onclick="window.print()">Print Report</button>
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function() {
    // Add event listener to update form fields when tax type changes
    document.getElementById("taxType").addEventListener("change", updateFormFields);
    
    // Load saved preferences
    loadUserPreferences();
    
    // Initialize form visibility
    updateFormFields();
});