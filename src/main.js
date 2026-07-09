// main.js — Hearthwise DFW Mortgage Calculator
import './style.css';
import {
  initMap, searchAndLoad, loadListingsAtCenter,
  updateMapListings, toggleSource,
} from './map.js';

/* ── Constants ───────────────────────────────────────── */
const DEFAULTS = Object.freeze({
  BUDGET:           2500,
  HOME_PRICE:       400000,
  DOWN_PCT:         20,
  RATE:             6.5,
  LOAN_TERM:        30,
  TAX_RATE:         2.1,
  INS_RATE:         0.55,
  HOA:              60,
  PMI_RATE:         0.7,
  HOMESTEAD_SCHOOL: 100000,
  HOMESTEAD_LOCAL:  25000,
  OVER65_EXEMPTION: 20000,
  MONTHLY_INCOME:   7500,
});

const COLORS = {
  pi:  '#1c3564',
  tax: '#b8852a',
  ins: '#2d6a4f',
  pmi: '#d92228',
  hoa: '#6b4f9e',
};

/* ── App State ───────────────────────────────────────── */
const state = {
  mode: 'target',      // 'target' | 'payment'
  budget:     DEFAULTS.BUDGET,
  homePrice:  DEFAULTS.HOME_PRICE,
  downPct:    DEFAULTS.DOWN_PCT,
  rate:       DEFAULTS.RATE,
  loanTerm:   DEFAULTS.LOAN_TERM,
  taxRate:    DEFAULTS.TAX_RATE,
  insRate:    DEFAULTS.INS_RATE,
  hoa:        DEFAULTS.HOA,
  homesteadSchool: DEFAULTS.HOMESTEAD_SCHOOL,
  homesteadLocal:  DEFAULTS.HOMESTEAD_LOCAL,
  over65: false,
  monthlyIncome: DEFAULTS.MONTHLY_INCOME,
  activeTab: 'calculator',
};

/* ── Formatting ───────────────────────────────────────── */
const fmt  = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtD = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/* ── Mortgage Math ────────────────────────────────────── */
function calcMonthlyPI(principal, annualRate, termYears) {
  if (annualRate === 0) return principal / (termYears * 12);
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function getTotalExemption() {
  return state.homesteadSchool + state.homesteadLocal + (state.over65 ? DEFAULTS.OVER65_EXEMPTION : 0);
}

function calcBreakdown(homePrice, downPct) {
  const down       = homePrice * downPct / 100;
  const principal  = homePrice - down;
  const exemption  = getTotalExemption();
  const taxableVal = Math.max(0, homePrice - exemption);

  const pi         = calcMonthlyPI(principal, state.rate, state.loanTerm);
  const monthlyTax = (taxableVal * state.taxRate / 100) / 12;
  const monthlyIns = (homePrice * state.insRate / 100) / 12;
  const monthlyPMI = downPct < 20 ? (principal * DEFAULTS.PMI_RATE / 100) / 12 : 0;
  const total      = pi + monthlyTax + monthlyIns + monthlyPMI + state.hoa;

  return { homePrice, down, principal, pi, monthlyTax, monthlyIns, monthlyPMI, hoa: state.hoa, total, downPct };
}

function findTargetPrice(budget) {
  const exemption = getTotalExemption();
  let lo = 10000, hi = 5000000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (calcBreakdown(mid, state.downPct).total < budget) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/* Public: estimate monthly payment for a given price (used by map) */
function estimateMonthly(price) {
  return calcBreakdown(price, state.downPct).total;
}

/* ── Render Results ───────────────────────────────────── */
function renderTargetResults() {
  const panel = document.getElementById('results-panel');
  const downOptions = [10, 20, 30];
  const featured    = state.downPct;

  panel.innerHTML = downOptions.map(dpct => {
    const price    = findTargetPrice(state.budget);
    const b        = calcBreakdown(price, dpct);
    const isFeatured = dpct === featured;
    return `
      <div class="result-card${isFeatured ? ' featured' : ''}">
        ${isFeatured ? '<span class="result-badge">Your Selection</span><br/>' : ''}
        <div class="result-down-label">${dpct}% Down Payment</div>
        <div class="result-price">${fmt(b.homePrice)}</div>
        <div class="result-rows">
          <div class="result-row">
            <span class="result-row-label">Down Payment</span>
            <span class="result-row-val">${fmt(b.down)}</span>
          </div>
          <div class="result-row">
            <span class="result-row-label">Loan Amount</span>
            <span class="result-row-val">${fmt(b.principal)}</span>
          </div>
          <div class="result-row">
            <span class="result-row-label">Principal &amp; Interest</span>
            <span class="result-row-val">${fmt(b.pi)}/mo</span>
          </div>
          <div class="result-row">
            <span class="result-row-label">Property Tax</span>
            <span class="result-row-val">${fmt(b.monthlyTax)}/mo</span>
          </div>
          <div class="result-row">
            <span class="result-row-label">Insurance</span>
            <span class="result-row-val">${fmt(b.monthlyIns)}/mo</span>
          </div>
          <div class="result-row">
            <span class="result-row-label">HOA</span>
            <span class="result-row-val">${fmt(b.hoa)}/mo</span>
          </div>
          <div class="result-row">
            <span class="result-row-label">PMI</span>
            <span class="result-row-val${b.monthlyPMI === 0 ? ' pmi-waived' : ''}">${b.monthlyPMI === 0 ? '$0 (Waived)' : fmt(b.monthlyPMI) + '/mo'}</span>
          </div>
          <div class="result-row">
            <span class="result-row-label" style="font-weight:600;">Total Monthly</span>
            <span class="result-row-val total">${fmt(b.total)}/mo</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderPaymentResults() {
  const panel = document.getElementById('results-panel');
  const b = calcBreakdown(state.homePrice, state.downPct);

  const total = b.pi + b.monthlyTax + b.monthlyIns + b.monthlyPMI + b.hoa;
  const piPct  = (b.pi / total * 100).toFixed(1);
  const taxPct = (b.monthlyTax / total * 100).toFixed(1);
  const insPct = (b.monthlyIns / total * 100).toFixed(1);
  const pmiPct = (b.monthlyPMI / total * 100).toFixed(1);
  const hoaPct = (b.hoa / total * 100).toFixed(1);

  // CSS conic-gradient donut
  let gradient = `conic-gradient(${COLORS.pi} 0% ${piPct}%,`;
  let cumulative = parseFloat(piPct);
  gradient += `${COLORS.tax} ${cumulative}% ${cumulative + parseFloat(taxPct)}%,`;
  cumulative += parseFloat(taxPct);
  gradient += `${COLORS.ins} ${cumulative}% ${cumulative + parseFloat(insPct)}%,`;
  cumulative += parseFloat(insPct);
  if (parseFloat(pmiPct) > 0) {
    gradient += `${COLORS.pmi} ${cumulative}% ${cumulative + parseFloat(pmiPct)}%,`;
    cumulative += parseFloat(pmiPct);
  }
  gradient += `${COLORS.hoa} ${cumulative}% 100%)`;

  panel.innerHTML = `
    <div class="result-card featured">
      <span class="result-badge">Monthly Payment</span>
      <div class="result-price">${fmt(b.total)}<span class="result-price-sub">/month</span></div>

      <div class="breakdown-chart-wrap">
        <div class="breakdown-chart" style="background: radial-gradient(circle at center, white 40%, transparent 40%), ${gradient};"></div>
        <div class="breakdown-legend">
          <div class="legend-row"><span class="legend-swatch" style="background:${COLORS.pi}"></span>P&amp;I ${piPct}%</div>
          <div class="legend-row"><span class="legend-swatch" style="background:${COLORS.tax}"></span>Tax ${taxPct}%</div>
          <div class="legend-row"><span class="legend-swatch" style="background:${COLORS.ins}"></span>Ins ${insPct}%</div>
          ${parseFloat(pmiPct) > 0 ? `<div class="legend-row"><span class="legend-swatch" style="background:${COLORS.pmi}"></span>PMI ${pmiPct}%</div>` : ''}
          <div class="legend-row"><span class="legend-swatch" style="background:${COLORS.hoa}"></span>HOA ${hoaPct}%</div>
        </div>
      </div>

      <div class="result-rows">
        <div class="result-row">
          <span class="result-row-label">Home Price</span>
          <span class="result-row-val">${fmt(b.homePrice)}</span>
        </div>
        <div class="result-row">
          <span class="result-row-label">Down Payment (${b.downPct}%)</span>
          <span class="result-row-val">${fmt(b.down)}</span>
        </div>
        <div class="result-row">
          <span class="result-row-label">Loan Amount</span>
          <span class="result-row-val">${fmt(b.principal)}</span>
        </div>
        <div class="result-row">
          <span class="result-row-label">Principal &amp; Interest</span>
          <span class="result-row-val">${fmt(b.pi)}/mo</span>
        </div>
        <div class="result-row">
          <span class="result-row-label">Property Tax</span>
          <span class="result-row-val">${fmt(b.monthlyTax)}/mo</span>
        </div>
        <div class="result-row">
          <span class="result-row-label">Insurance</span>
          <span class="result-row-val">${fmt(b.monthlyIns)}/mo</span>
        </div>
        <div class="result-row">
          <span class="result-row-label">HOA</span>
          <span class="result-row-val">${fmt(b.hoa)}/mo</span>
        </div>
        <div class="result-row">
          <span class="result-row-label">PMI</span>
          <span class="result-row-val${b.monthlyPMI === 0 ? ' pmi-waived' : ''}">${b.monthlyPMI === 0 ? '$0 (Waived)' : fmt(b.monthlyPMI) + '/mo'}</span>
        </div>
      </div>
    </div>`;
}

function renderResults() {
  if (state.mode === 'target') renderTargetResults();
  else renderPaymentResults();
  updateAdvancedDisplay();
}

/* ── Advanced Tab ─────────────────────────────────────── */
function calcTotalExpenses() {
  return Array.from(document.querySelectorAll('.expense-amount'))
    .reduce((sum, el) => sum + (parseFloat(el.value) || 0), 0);
}

function updateAdvancedDisplay() {
  const exemption = getTotalExemption();
  const taxRate   = state.taxRate / 100;
  const annualSavings  = exemption * taxRate;
  const monthlySavings = annualSavings / 12;

  const totalEl  = document.getElementById('total-exemption-display');
  const savMoEl  = document.getElementById('tax-savings-display');
  const savAnEl  = document.getElementById('tax-savings-annual');
  if (totalEl) totalEl.textContent = fmt(exemption);
  if (savMoEl) savMoEl.textContent = `+${fmt(monthlySavings)}/mo`;
  if (savAnEl) savAnEl.textContent = fmt(annualSavings) + '/year';

  const income   = parseFloat(document.getElementById('monthly-income')?.value || 0);
  const expenses = calcTotalExpenses();
  const available = income - expenses;
  const recommended = income * 0.35;

  const incEl  = document.getElementById('adv-income-display');
  const expEl  = document.getElementById('adv-expenses-display');
  const avEl   = document.getElementById('adv-available-display');
  const recEl  = document.getElementById('adv-recommended-display');
  if (incEl)  incEl.textContent  = fmt(income);
  if (expEl)  expEl.textContent  = `−${fmt(expenses)}`;
  if (avEl)   avEl.innerHTML     = `<strong>${fmt(available)}</strong>`;
  if (recEl)  recEl.textContent  = fmt(recommended);
}

function addExpenseItem(label = '', amount = 0) {
  const list = document.getElementById('expense-items');
  const item = document.createElement('div');
  item.className = 'expense-item';
  item.innerHTML = `
    <input type="text" class="expense-name" placeholder="Label" value="${label}" />
    <div class="field-input-wrap">
      <span class="field-prefix">$</span>
      <input type="number" class="expense-amount field-input" value="${amount}" min="0" />
    </div>
    <button class="expense-remove" aria-label="Remove">×</button>`;
  list.appendChild(item);

  item.querySelector('.expense-remove').addEventListener('click', () => {
    item.remove(); updateAdvancedDisplay();
  });
  item.querySelector('.expense-amount').addEventListener('input', updateAdvancedDisplay);
  item.querySelector('.expense-name').addEventListener('input', updateAdvancedDisplay);
}

/* ── Slider/Input Sync ────────────────────────────────── */
function syncPair(inputId, sliderId, stateKey, { min = 0, max = Infinity, step = 1 } = {}) {
  const inp = document.getElementById(inputId);
  const sld = document.getElementById(sliderId);
  if (!inp) return;

  const apply = (raw) => {
    const v = Math.min(max, Math.max(min, parseFloat(raw) || 0));
    state[stateKey] = v;
    inp.value = raw;
    if (sld) sld.value = v;
    renderResults();
  };

  inp.addEventListener('change', () => apply(inp.value));
  if (sld) sld.addEventListener('input', () => { inp.value = sld.value; apply(sld.value); });
}

function syncSelect(id, stateKey) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('change', () => { state[stateKey] = parseFloat(el.value); renderResults(); });
}

function syncField(id, stateKey, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    state[stateKey] = parseFloat(el.value) || 0;
    onChange?.();
    renderResults();
  });
}

/* ── Tab Switching ────────────────────────────────────── */
function switchTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`);
  });
}

/* ── Mode Switching ───────────────────────────────────── */
function switchMode(mode) {
  state.mode = mode;
  document.getElementById('mode-target').classList.toggle('active', mode === 'target');
  document.getElementById('mode-payment').classList.toggle('active', mode === 'payment');
  document.getElementById('field-budget').classList.toggle('hidden', mode !== 'target');
  document.getElementById('field-price').classList.toggle('hidden', mode !== 'payment');
  renderResults();
}

/* ── Map Integration ─────────────────────────────────── */
let currentSearchResult = null;

function getTargetPriceForMap() {
  if (state.mode === 'target') return findTargetPrice(state.budget);
  return state.homePrice;
}

async function doSearch() {
  const query  = document.getElementById('location-input').value.trim();
  const radius = parseInt(document.getElementById('radius-slider').value, 10);
  if (!query) return;

  currentSearchResult = await searchAndLoad(query, getTargetPriceForMap(), radius, estimateMonthly);
}

function refreshMapListings() {
  if (!currentSearchResult) return;
  loadListingsAtCenter(getTargetPriceForMap(), estimateMonthly);
}

/* ── Init ─────────────────────────────────────────────── */
function init() {

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Mode buttons
  document.getElementById('mode-target').addEventListener('click', () => switchMode('target'));
  document.getElementById('mode-payment').addEventListener('click', () => switchMode('payment'));

  // Calculator inputs
  syncPair('budget', 'budget-slider', 'budget',    { min: 500,   max: 10000,   step: 100  });
  syncPair('home-price', 'price-slider', 'homePrice', { min: 50000, max: 5000000, step: 5000 });
  syncPair('down-pct',   'down-slider',  'downPct',   { min: 3,     max: 80,      step: 1    });
  syncPair('rate',       'rate-slider',  'rate',       { min: 2,     max: 15,      step: 0.1  });
  syncSelect('loan-term', 'loanTerm');

  ['tax-rate', 'ins-rate', 'hoa'].forEach(id => {
    const key = id === 'tax-rate' ? 'taxRate' : id === 'ins-rate' ? 'insRate' : 'hoa';
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { state[key] = parseFloat(el.value) || 0; renderResults(); refreshMapListings(); });
  });

  // Advanced: homestead
  ['homestead-school', 'homestead-local'].forEach(id => {
    const key = id === 'homestead-school' ? 'homesteadSchool' : 'homesteadLocal';
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { state[key] = parseFloat(el.value) || 0; updateAdvancedDisplay(); renderResults(); });
  });

  const over65El = document.getElementById('over65');
  if (over65El) over65El.addEventListener('change', () => { state.over65 = over65El.checked; updateAdvancedDisplay(); renderResults(); });

  // Advanced: budget builder
  const incomeEl = document.getElementById('monthly-income');
  if (incomeEl) incomeEl.addEventListener('input', updateAdvancedDisplay);

  document.getElementById('expense-items')?.querySelectorAll('.expense-remove').forEach(btn => {
    btn.addEventListener('click', () => { btn.closest('.expense-item').remove(); updateAdvancedDisplay(); });
  });
  document.getElementById('expense-items')?.querySelectorAll('.expense-amount').forEach(el => {
    el.addEventListener('input', updateAdvancedDisplay);
  });

  document.getElementById('add-expense-btn')?.addEventListener('click', () => addExpenseItem());

  document.getElementById('apply-budget-btn')?.addEventListener('click', () => {
    const income   = parseFloat(document.getElementById('monthly-income')?.value || 0);
    const expenses = calcTotalExpenses();
    const available = Math.max(0, income - expenses);
    const suggested = Math.min(available, income * 0.35);
    const budgetInput = document.getElementById('budget');
    const budgetSlider = document.getElementById('budget-slider');
    if (budgetInput)  { budgetInput.value  = Math.round(suggested); }
    if (budgetSlider) { budgetSlider.value = Math.round(suggested); }
    state.budget = suggested;
    switchTab('calculator');
    switchMode('target');
    renderResults();
  });

  // Source filters
  document.querySelectorAll('.source-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      const source  = btn.dataset.source;
      const isActive = btn.classList.toggle('active');
      toggleSource(source, isActive);
      refreshMapListings();
    });
  });

  // Location search
  document.getElementById('location-search-btn')?.addEventListener('click', doSearch);
  document.getElementById('location-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });

  // Radius slider
  const radiusSlider = document.getElementById('radius-slider');
  const radiusVal    = document.getElementById('radius-value');
  radiusSlider?.addEventListener('input', () => {
    if (radiusVal) radiusVal.textContent = `${radiusSlider.value} mi`;
  });

  // Map view toggles
  document.getElementById('view-split')?.addEventListener('click', () => {
    document.getElementById('view-split').classList.add('active');
    document.getElementById('view-list-only').classList.remove('active');
    document.getElementById('map-layout').classList.remove('list-only');
  });
  document.getElementById('view-list-only')?.addEventListener('click', () => {
    document.getElementById('view-list-only').classList.add('active');
    document.getElementById('view-split').classList.remove('active');
    document.getElementById('map-layout').classList.add('list-only');
  });

  // Init map
  initMap((lat, lng) => {
    // Map was moved by user — load new listings for visible area
    if (currentSearchResult) {
      const loading = document.getElementById('map-loading');
      if (loading) loading.hidden = false;
      setTimeout(() => {
        const { generateListingsForArea } = _mapModule;
        loadListingsAtCenter(getTargetPriceForMap(), estimateMonthly);
      }, 0);
    }
  });

  // Initial render
  renderResults();
  updateAdvancedDisplay();

  // Auto-search default location after short delay
  setTimeout(() => doSearch(), 800);
}

// Keep a reference to map module functions for the map move handler
const _mapModule = { loadListingsAtCenter };

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
