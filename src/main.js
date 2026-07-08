import './style.css';

// DOM elements
const btnToggleTarget = document.getElementById('toggle-target');
const btnTogglePayment = document.getElementById('toggle-payment');

const groupTargetBudget = document.getElementById('group-target-budget');
const groupHomePrice = document.getElementById('group-home-price');

const inputTargetBudget = document.getElementById('input-target-budget');
const rangeTargetBudget = document.getElementById('range-target-budget');

const inputHomePrice = document.getElementById('input-home-price');
const rangeHomePrice = document.getElementById('range-home-price');

const inputInterestRate = document.getElementById('input-interest-rate');
const rangeInterestRate = document.getElementById('range-interest-rate');

const inputTaxRate = document.getElementById('input-tax-rate');
const rangeTaxRate = document.getElementById('range-tax-rate');

const inputInsRate = document.getElementById('input-ins-rate');
const rangeInsRate = document.getElementById('range-ins-rate');

const inputHoaFee = document.getElementById('input-hoa-fee');
const rangeHoaFee = document.getElementById('range-hoa-fee');

const inputPmiRate = document.getElementById('input-pmi-rate');
const rangePmiRate = document.getElementById('range-pmi-rate');

const selectLoanTerm = document.getElementById('select-loan-term');

const targetResultsView = document.getElementById('target-results-view');
const paymentResultsView = document.getElementById('payment-results-view');
const resultsTitle = document.getElementById('results-title');

// Target view values
const valTargetPrice20 = document.getElementById('val-target-price-20');
const valDown20 = document.getElementById('val-down-20');
const valLoan20 = document.getElementById('val-loan-20');
const valPi20 = document.getElementById('val-pi-20');
const valTaxins20 = document.getElementById('val-taxins-20');

const valTargetPrice10 = document.getElementById('val-target-price-10');
const valDown10 = document.getElementById('val-down-10');
const valLoan10 = document.getElementById('val-loan-10');
const valPi10 = document.getElementById('val-pi-10');
const valTaxins10 = document.getElementById('val-taxins-10');
const valPmi10 = document.getElementById('val-pmi-10');

const valTargetPrice30 = document.getElementById('val-target-price-30');
const valDown30 = document.getElementById('val-down-30');
const valLoan30 = document.getElementById('val-loan-30');
const valPi30 = document.getElementById('val-pi-30');
const valTaxins30 = document.getElementById('val-taxins-30');

// Payment view values
const valPaymentTotal = document.getElementById('val-payment-total');
const breakdownPi = document.getElementById('breakdown-pi');
const breakdownTax = document.getElementById('breakdown-tax');
const breakdownIns = document.getElementById('breakdown-ins');
const breakdownHoa = document.getElementById('breakdown-hoa');
const breakdownPmi = document.getElementById('breakdown-pmi');
const breakdownPmiRow = document.getElementById('breakdown-pmi-row');

const btnDown10 = document.getElementById('btn-down-10');
const btnDown20 = document.getElementById('btn-down-20');
const btnDown30 = document.getElementById('btn-down-30');
const paymentDonut = document.getElementById('payment-donut');

// App state
let currentMode = 'target'; // 'target' or 'payment'
let selectedDownPct = 0.20; // 0.10, 0.20, or 0.30 (for payment view)

// Helper to format currency
const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val);
};

const formatCurrencyDec = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

// Connect range slider and number input
const syncInputs = (numberInput, rangeInput, onUpdate) => {
  numberInput.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = parseFloat(rangeInput.min);
    rangeInput.value = val;
    onUpdate();
  });

  rangeInput.addEventListener('input', (e) => {
    numberInput.value = e.target.value;
    onUpdate();
  });
};

// Core calculations
const calculate = () => {
  const interestRate = parseFloat(inputInterestRate.value) / 100;
  const taxRate = parseFloat(inputTaxRate.value) / 100;
  const insRate = parseFloat(inputInsRate.value) / 100;
  const hoaFee = parseFloat(inputHoaFee.value);
  const pmiRate = parseFloat(inputPmiRate.value) / 100;
  const loanTerm = parseInt(selectLoanTerm.value);
  
  const r = interestRate / 12;
  const n = loanTerm * 12;
  
  // Principal and Interest factor (per dollar of loan amount)
  const piFactor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  if (currentMode === 'target') {
    const budget = parseFloat(inputTargetBudget.value);
    
    const calculateTargetForDownPayment = (downPct) => {
      // coefficients for purchase price X
      const coeffPi = (1 - downPct) * piFactor;
      const coeffTax = taxRate / 12;
      const coeffIns = insRate / 12;
      const coeffPmi = downPct < 0.20 ? ((1 - downPct) * pmiRate) / 12 : 0;
      
      const totalCoeff = coeffPi + coeffTax + coeffIns + coeffPmi;
      
      // Target price formula: X = (budget - hoaFee) / totalCoeff
      const price = Math.max(0, (budget - hoaFee) / totalCoeff);
      const downPayment = price * downPct;
      const loanAmount = price - downPayment;
      const pi = loanAmount * piFactor;
      const taxAndIns = (price * (taxRate + insRate)) / 12;
      const pmi = downPct < 0.20 ? (loanAmount * pmiRate) / 12 : 0;
      
      return { price, downPayment, loanAmount, pi, taxAndIns, pmi };
    };

    const res20 = calculateTargetForDownPayment(0.20);
    const res10 = calculateTargetForDownPayment(0.10);
    const res30 = calculateTargetForDownPayment(0.30);

    // Update 20% down view
    valTargetPrice20.textContent = formatCurrency(res20.price);
    valDown20.textContent = formatCurrency(res20.downPayment);
    valLoan20.textContent = formatCurrency(res20.loanAmount);
    valPi20.textContent = formatCurrency(res20.pi);
    valTaxins20.textContent = formatCurrency(res20.taxAndIns);

    // Update 10% down view
    valTargetPrice10.textContent = formatCurrency(res10.price);
    valDown10.textContent = formatCurrency(res10.downPayment);
    valLoan10.textContent = formatCurrency(res10.loanAmount);
    valPi10.textContent = formatCurrency(res10.pi);
    valTaxins10.textContent = formatCurrency(res10.taxAndIns);
    valPmi10.textContent = formatCurrency(res10.pmi);

    // Update 30% down view
    valTargetPrice30.textContent = formatCurrency(res30.price);
    valDown30.textContent = formatCurrency(res30.downPayment);
    valLoan30.textContent = formatCurrency(res30.loanAmount);
    valPi30.textContent = formatCurrency(res30.pi);
    valTaxins30.textContent = formatCurrency(res30.taxAndIns);

  } else {
    // Payment breakdown mode
    const price = parseFloat(inputHomePrice.value);
    const downPayment = price * selectedDownPct;
    const loanAmount = price - downPayment;
    
    const pi = loanAmount * piFactor;
    const tax = (price * taxRate) / 12;
    const ins = (price * insRate) / 12;
    const pmi = selectedDownPct < 0.20 ? (loanAmount * pmiRate) / 12 : 0;
    
    const total = pi + tax + ins + hoaFee + pmi;

    // Update numbers
    valPaymentTotal.textContent = formatCurrency(total);
    breakdownPi.textContent = formatCurrencyDec(pi);
    breakdownTax.textContent = formatCurrencyDec(tax);
    breakdownIns.textContent = formatCurrencyDec(ins);
    breakdownHoa.textContent = formatCurrencyDec(hoaFee);
    
    if (pmi > 0) {
      breakdownPmiRow.classList.remove('hidden');
      breakdownPmi.textContent = formatCurrencyDec(pmi);
    } else {
      breakdownPmiRow.classList.add('hidden');
    }

    // Update Donut Chart
    const pctPi = (pi / total) * 100;
    const pctTax = (tax / total) * 100;
    const pctIns = (ins / total) * 100;
    const pctHoa = (hoaFee / total) * 100;
    const pctPmi = (pmi / total) * 100;

    const stopPi = pctPi;
    const stopTax = stopPi + pctTax;
    const stopIns = stopTax + pctIns;
    const stopHoa = stopIns + pctHoa;

    paymentDonut.style.setProperty('--seg-pi', `${stopPi}%`);
    paymentDonut.style.setProperty('--seg-tax', `${stopTax}%`);
    paymentDonut.style.setProperty('--seg-ins', `${stopIns}%`);
    paymentDonut.style.setProperty('--seg-hoa', `${stopHoa}%`);
  }
};

// Mode Toggles
btnToggleTarget.addEventListener('click', () => {
  if (currentMode === 'target') return;
  currentMode = 'target';
  btnToggleTarget.classList.add('active');
  btnToggleTarget.setAttribute('aria-pressed', 'true');
  btnTogglePayment.classList.remove('active');
  btnTogglePayment.setAttribute('aria-pressed', 'false');
  
  groupTargetBudget.classList.remove('hidden');
  groupHomePrice.classList.add('hidden');
  
  targetResultsView.classList.remove('hidden');
  paymentResultsView.classList.add('hidden');
  resultsTitle.textContent = "Target Home Purchase Price";
  calculate();
});

btnTogglePayment.addEventListener('click', () => {
  if (currentMode === 'payment') return;
  currentMode = 'payment';
  btnTogglePayment.classList.add('active');
  btnTogglePayment.setAttribute('aria-pressed', 'true');
  btnToggleTarget.classList.remove('active');
  btnToggleTarget.setAttribute('aria-pressed', 'false');
  
  groupHomePrice.classList.remove('hidden');
  groupTargetBudget.classList.add('hidden');
  
  paymentResultsView.classList.remove('hidden');
  targetResultsView.classList.add('hidden');
  resultsTitle.textContent = "Estimated Monthly Payment Breakdown";
  calculate();
});

// Down Payment selector click listeners (in payment view)
const handleDownSelector = (pct, clickedBtn) => {
  selectedDownPct = pct;
  [btnDown10, btnDown20, btnDown30].forEach(btn => btn.classList.remove('active'));
  clickedBtn.classList.add('active');
  calculate();
};

btnDown10.addEventListener('click', () => handleDownSelector(0.10, btnDown10));
btnDown20.addEventListener('click', () => handleDownSelector(0.20, btnDown20));
btnDown30.addEventListener('click', () => handleDownSelector(0.30, btnDown30));

// Setup dynamic syncs
syncInputs(inputTargetBudget, rangeTargetBudget, calculate);
syncInputs(inputHomePrice, rangeHomePrice, calculate);
syncInputs(inputInterestRate, rangeInterestRate, calculate);
syncInputs(inputTaxRate, rangeTaxRate, calculate);
syncInputs(inputInsRate, rangeInsRate, calculate);
syncInputs(inputHoaFee, rangeHoaFee, calculate);
syncInputs(inputPmiRate, rangePmiRate, calculate);

selectLoanTerm.addEventListener('change', calculate);

// Initial run
calculate();
