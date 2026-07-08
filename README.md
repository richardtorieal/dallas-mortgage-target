# DFW Target Mortgage Calculator
A highly polished, interactive web application to help home buyers in the Dallas-Fort Worth (DFW) region estimate target home purchase prices and monthly mortgage payments.

Live URL: (To be deployed on Vercel)  
GitHub Repository: [github.com/richardtorieal/dallas-mortgage-target](https://github.com/richardtorieal/dallas-mortgage-target)

---

## ✨ Features
1. **Target Home Price Calculator (Affordability):**
   * Input a target monthly budget (e.g., $2,500/month).
   * Solve for the maximum home purchase price you can afford.
   * View side-by-side breakdowns for **10%**, **20%**, and **30%** down payment scenarios.
2. **Monthly Payment Estimator:**
   * Input a home purchase price.
   * View a detailed breakdown of monthly costs (Principal & Interest, Property Taxes, Home Insurance, HOA Fees, and PMI).
   * Toggle between down payment scenarios with a beautiful conic-gradient donut chart.
3. **Region-Specific Defaults (Dallas-Fort Worth):**
   * Default Property Tax Rate: **2.1%** ( Collin/Dallas/Denton county averages).
   * Default Home Insurance Rate: **0.55%** (standard Texas hail/wind risk profile).
   * Default HOA Fee: **$60/month** (average subdivision rate).
   * Dynamic PMI calculation (applied only if down payment < 20%).

---

## 🛠️ Technology Stack
* **Vite** - Bundler and development server.
* **Vanilla JavaScript** - Lightweight, zero-dependency calculator logic.
* **Vanilla CSS** - Customized glassmorphic dashboard design, glowing gradients, customized range inputs, and smooth visual feedback.
* **HTML5** - Semantic elements for accessibility and screen reader support.

---

## 🚀 Getting Started

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/richardtorieal/dallas-mortgage-target.git
   cd dallas-mortgage-target
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

---

## 🏛️ License
MIT License.
