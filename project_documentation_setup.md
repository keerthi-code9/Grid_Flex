# GRIDFLEX: Neighbourhood Flexibility Orchestrator
> **“Making Renewable Power Reliable, Neighbourhood by Neighbourhood”**  
> *Schneider Electric Innovation Challenge — Grid Reliability & Renewable Intermittency Prototype*

---

## ⚡ Executive Summary

India's distribution utilities (DISCOMs) face mounting challenges from the rapid influx of distributed rooftop solar, electric vehicles (EVs), and behind-the-meter assets. Because renewable generation is intermittent, distribution feeders face severe net-load ramps, localized over-voltage spikes, and transformer thermal stress.

Traditional approaches treat batteries as the sole silver bullet. **GRIDFLEX shifts this paradigm**:

> *Instead of asking where the next expensive battery must be installed, GridFlex asks: **How much flexibility is available right now across the neighbourhood — and where is it needed?***

GridFlex acts as a DISCOM-supervised, closed-loop flexibility orchestration layer. It continuously discovers, quantifies, and dispatches distributed energy resources (DERs)—including water heaters, EV charging modulation, municipal pumps, and community batteries—prioritizing the **least-cost, least-disruptive resource first** to buffer solar ramps without customer inconvenience.

---

## 📐 Conceptual Electrical Baseline (N-01 Feeder)

The prototype models an authentic Indian urban distribution sub-network (Koramangala 315 kVA proxy):

| Parameter | Specification | Description / Role |
| :--- | :--- | :--- |
| **Distribution Transformer** | 315 kVA, 11/0.433 kV, Dyn11 | Thermal operating band monitored (30%–75% safe envelope) |
| **Medium Voltage Feeder** | 11 kV (F-04), 0.4 km Dog Conductor | Primary LV injection & headroom tracking |
| **Rooftop Solar PV** | 100 kWp Aggregate (42 Arrays) | Primary source of high-penetration intermittency |
| **Community BESS** | 50 kW / 100 kWh (LFP Chemistry) | Preserved for rapid transient bridging (Priority 4) |
| **Smart EV Fleet** | 10 Vehicles (OCPP 2.0.1 Throttling) | 8.0 kW flexible curtailable charging load (Priority 1) |
| **Residential Consumers** | 220 Smart Metred Households | 4.5 kW thermal inertia flexibility (Water heaters / HVAC) |
| **Municipal & Commercial** | 3.7 kW Water Pump + 22 kW Small Ind. | Deferrable inductive and cold-storage buffer loads |
| **Control Resolution** | 15-second closed-loop / 15-min dispatch | Real-time discovery, verification, and learning loop |

---

## 🔄 The Closed-Loop Flexibility Engine

GridFlex operates on a continuous 6-stage closed loop:

```
[01 OBSERVE] ──► Feeder state, bus voltage (415V), PV generation, household load, EV charging
      │
[02 PREDICT] ──► 15-minute probabilistic solar ramps, net-load trajectory, EV departures
      │
[03 GAP CHECK] ─► Required Flex vs. Verified Online Flexibility Pool ➔ Flexibility Gap
      │
[04 OPTIMIZE] ──► Least-disruption priority ranking (EV/Thermal loads BEFORE cycling BESS)
      │
[05 DISPATCH] ──► Dynamic modulation across edge controllers & community storage
      │
[06 VERIFY] ────► Bus voltage restored to ±6%, transformer load held safe, loop logged
```

### Least-Disruptive Priority Hierarchy
1. **P1 — Smart EV Throttling:** 30% charge rate modulation without altering morning departure SOC.
2. **P2 — Water Heaters (Geysers):** Thermal inertia utilization (temp drops < 0.8°C; invisible to user).
3. **P3 — Community Water Pump:** Deferred pumping when overhead storage tank > 60%.
4. **P4 — Shared Community BESS:** Dispatched for sub-second transient edges to prevent premature cell degradation.
5. **P5 — Small Industry Demand Response:** Contractual cold-buffer deferral with DISCOM tariff incentive.

---

## 🚀 Key Modules in the Prototype

- **00 Overview & Vision:** High-impact problem breakdown, KPI summaries, and core value proposition.
- **01 Neighbourhood Twin:** Interactive electrical bus schematic from 33/11 kV substation down to 415 V LV busbar with live asset inspector telemetry.
- **02 Grid & Feeder State:** Real-time active/reactive power, power factor, 24-hour duck-curve power balance, and transformer thermal envelope monitoring.
- **03 Distributed DERs Registry:** Comprehensive bottom-up inventory covering response times, duration, customer consent status, and dispatch rankings.
- **04 Flexibility Engine:** Side-by-side comparative bars for Required vs. Available Flexibility and the "Why These Resources?" justification logic.
- **05 Closed-Loop Event Simulator:** Step-by-step interactive simulation for **Cloud Ramps**, **Midday PV Surges**, and **Evening Demand Peaks**.
- **06 DISCOM Command Centre:** Fleet-wide supervisory matrix monitoring 24 distribution transformers across urban Bengaluru.
- **07 Reliability Benchmark (B0 vs B1):** Methodological benchmark against uncoordinated baseline (Availability 99.31% → 99.70%, ENS -56.7%, Solar Curtailment -58.7%).
- **08 Economics & Deployment:** Authentic Indian DISCOM rollout model in ₹ Lakhs & ₹ Crores, three-way institutional roles, and ownership matrices.
- **09 Architecture & Ecosystem:** Non-intrusive integration with Schneider Electric EcoStruxure™ ADMS/DERMS, AI vs deterministic engineering constraints, and customer privacy governance.

---

## 🛠️ Tech Stack & Prerequisites

- **Python**: 3.10+
- **Streamlit**: 1.30.0+
- **Plotly**: 5.18.0+
- **Pandas & NumPy**

---

## 💻 Local Setup & Execution

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/gridflex-orchestrator.git
   cd gridflex-orchestrator
   ```

2. **Create and activate a virtual environment (recommended):**
   ```bash
   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate

   # On Windows
   python -m venv venv
   venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch the Streamlit application:**
   ```bash
   streamlit run app.py
   ```
   Open your browser at `http://localhost:8501`.

---

## ☁️ Deployment on Streamlit Community Cloud

1. Push this directory to your GitHub repository containing:
   - `app.py`
   - `requirements.txt`
   - `README.md`
2. Visit [share.streamlit.io](https://share.streamlit.io) and link your GitHub account.
3. Select your repository, specify the `main` branch, set the path to `app.py`, and click **Deploy**.

---

## 📄 Regulatory & Methodology Disclaimer

> **Methodology Note (Illustrative Simulation Results):**  
> All GridFlex metrics (e.g., ENS reduction, availability delta, avoided solar loss) are evaluated against identical synthetic baselines and random seeds to demonstrate evaluation methodology. Figures in Indian Rupees (₹) are illustrative techno-economic benchmarks rather than binding commercial quotes. Real-world deployment requires telemetry calibration with DISCOM feeder metering, SCADA, and AMI infrastructure.

---

## 👥 Schneider Electric Challenge 2026

- **Theme:** Grid Reliability – Renewable Intermittency  
- **Team / Prototype:** GRIDFLEX Neighbourhood Orchestrator  
- **Target Utility Proxy:** BESCOM (Bangalore Electricity Supply Company Limited), Bengaluru, India