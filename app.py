import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from datetime import datetime

# Configure page layout and utility aesthetic
st.set_page_config(
    page_title="GRIDFLEX | Neighbourhood Orchestrator",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Schneider Electric Engineering Theme Styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
        color: #0f172a;
    }
    
    .stMetric {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        padding: 14px 18px;
        border-radius: 10px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    
    .stMetric label {
        font-size: 0.75rem !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
        color: #64748b !important;
    }
    
    .stMetric [data-testid="stMetricValue"] {
        font-family: 'JetBrains Mono', monospace !important;
        font-size: 1.65rem !important;
        font-weight: 800 !important;
        color: #0284c7 !important;
    }
    
    .grid-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 1.25rem;
        margin-bottom: 1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    
    .badge-normal {
        background-color: #ecfdf5;
        color: #047857;
        border: 1px solid #a7f3d0;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
        font-family: 'JetBrains Mono', monospace;
    }
    
    .badge-watch {
        background-color: #fffbeb;
        color: #b45309;
        border: 1px solid #fde68a;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
        font-family: 'JetBrains Mono', monospace;
    }
</style>
""", unsafe_allow_html=True)

SCENARIOS = {
    "NORMAL": {
        "name": "Nominal Baseline",
        "desc": "Mild sunny conditions, scheduled EV loads, balanced transformer thermal operating band.",
        "pv": 72,
        "grossLoad": 88,
        "reqFlex": 0.0,
        "availFlex": 24.5,
        "txLoad": 48.9,
        "voltage": 418.6,
        "bessSoc": 68,
        "bessPower": 0.0,
        "evLoad": 27.0,
        "status": "NORMAL",
        "reverseFlow": "Zero",
        "alert": "System balanced. Zero active flexibility dispatch required."
    },
    "CLOUD_RAMP": {
        "name": "Sudden Cloud Ramp (Intermittent Drop)",
        "desc": "Cloud cover reduces PV from 92 kW to 38 kW in 90 seconds. Required flex dispatched across distributed assets.",
        "pv": 38,
        "grossLoad": 92,
        "reqFlex": 14.2,
        "availFlex": 18.4,
        "txLoad": 53.8,
        "voltage": 414.8,
        "bessSoc": 65,
        "bessPower": 7.0,
        "evLoad": 23.0,
        "status": "WATCH",
        "reverseFlow": "Zero",
        "alert": "54 kW solar generation drop detected. Least-disruptive flexibility dispatch initiated."
    },
    "PV_SURGE": {
        "name": "Midday Solar Surge",
        "desc": "Clearing skies push PV generation to 98 kW while residential load is minimal (34 kW), risking overvoltage.",
        "pv": 98,
        "grossLoad": 34,
        "reqFlex": 16.5,
        "availFlex": 22.0,
        "txLoad": 41.2,
        "voltage": 426.4,
        "bessSoc": 74,
        "bessPower": -12.0,
        "evLoad": 31.0,
        "status": "WATCH",
        "reverseFlow": "Active (9 kW Inflow)",
        "alert": "High reverse flow risk detected. Flexible soaking activated (BESS + Smart EV modulation)."
    },
    "EVENING_PEAK": {
        "name": "Evening Peak Demand Ramp",
        "desc": "Zero PV generation combined with cooking, cooling, and EV charging creates transformer stress.",
        "pv": 0,
        "grossLoad": 142,
        "reqFlex": 21.0,
        "availFlex": 23.2,
        "txLoad": 68.4,
        "voltage": 411.2,
        "bessSoc": 58,
        "bessPower": 12.0,
        "evLoad": 18.0,
        "status": "WATCH",
        "reverseFlow": "Zero",
        "alert": "Transformer loading elevated. Industrial deferment & non-critical EV delay mobilized."
    }
}

FEEDER_PROFILE = pd.DataFrame({
    'time': ['00:00', '03:00', '06:00', '08:00', '10:00', '12:00', '13:15', '15:00', '17:00', '19:00', '21:00', '23:00'],
    'gross_load': [42, 38, 55, 78, 84, 89, 92, 86, 95, 138, 118, 62],
    'pv': [0, 0, 8, 42, 86, 98, 38, 64, 18, 0, 0, 0],
    'net_load': [42, 38, 47, 36, -2, -9, 54, 22, 77, 138, 118, 62],
    'tx_limit': [100]*12
})

with st.sidebar:
    st.markdown("""
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:1rem;">
        <div style="background: linear-gradient(135deg, #00d287, #0084ff); color:white; font-weight:900; font-size:1.2rem; padding:6px 12px; border-radius:8px;">GF</div>
        <div>
            <div style="font-weight:800; font-size:1.15rem; color:#f8fafc; letter-spacing:0.02em;">GRIDFLEX</div>
            <div style="font-size:0.68rem; color:#94a3b8; font-family:'JetBrains Mono', monospace;">SE 2026 PROTOTYPE</div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("<p style='font-size:0.8rem; color:#94a3b8;'>Neighbourhood Orchestrator</p>", unsafe_allow_html=True)
    
    nav_option = st.radio(
        "Navigation Module",
        [
            "00 Overview & Vision",
            "01 Neighbourhood Twin",
            "02 Grid & Feeder State",
            "03 Distributed DERs",
            "04 Flexibility Engine",
            "05 Event Simulator",
            "06 DISCOM Command",
            "07 Reliability & B0 vs B1",
            "08 Economics & Deployment",
            "09 Architecture & Ecosystem"
        ],
        label_visibility="collapsed"
    )

    st.markdown("---")
    st.markdown("### Simulation Scenario")
    scenario_choice = st.selectbox(
        "Select Active Event",
        options=list(SCENARIOS.keys()),
        format_func=lambda k: SCENARIOS[k]["name"]
    )
    
    active_sc = SCENARIOS[scenario_choice]
    
    st.markdown("---")
    st.markdown("""
    <div style="font-family:'JetBrains Mono', monospace; font-size:0.75rem; color:#cbd5e1; line-height:1.6;">
        <div><strong>Status:</strong> <span style="color:#34d399;">● Grid Connected</span></div>
        <div><strong>Telemetry:</strong> <span style="color:#38bdf8;">99.98% Synchronized</span></div>
        <div><strong>Feeder 11kV:</strong> Nominal 415V</div>
        <div><strong>Clock:</strong> 13:15 IST (15m step)</div>
    </div>
    """, unsafe_allow_html=True)

col_h1, col_h2 = st.columns([3, 1])
with col_h1:
    badge_style = "badge-normal" if active_sc["status"] == "NORMAL" else "badge-watch"
    st.markdown(f"""
    <div style="display:flex; align-items:center; gap:12px;">
        <h2 style="margin:0; font-weight:800; font-size:1.6rem; color:#0f172a;">GRIDFLEX Distribution Flexibility Platform</h2>
        <span class="{badge_style}">● {active_sc['status']} ({scenario_choice})</span>
    </div>
    <p style="margin-top:2px; font-size:0.85rem; color:#64748b;">Making Renewable Power Reliable, Neighbourhood by Neighbourhood | <strong>N-01 (Koramangala 315 kVA)</strong></p>
    """, unsafe_allow_html=True)

with col_h2:
    st.info(f"**Dispatch Alert:** {active_sc['alert']}")

st.divider()

if "00 Overview" in nav_option:
    st.markdown("""
    <div class="grid-card" style="background: linear-gradient(135deg, #0a192f, #1e3a5f); color: white;">
        <span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em; color:#00d287; font-weight:700;">Schneider Electric Innovation Prototype 2026</span>
        <h1 style="color:white; font-weight:800; font-size:2.2rem; margin-top:0.4rem; line-height:1.2;">
            Making Renewable Power Reliable,<br/><span style="color:#38bdf8;">Neighbourhood by Neighbourhood.</span>
        </h1>
        <p style="color:#cbd5e1; font-size:1.05rem; max-width:850px; margin-top:0.8rem; line-height:1.6;">
            An intelligent, DISCOM-supervised flexibility orchestration platform that transforms distributed rooftop solar, EV chargers, and flexible loads into a measurable, closed-loop reliability buffer against renewable intermittency.
        </p>
    </div>
    """, unsafe_allow_html=True)

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Available Flexibility", f"{active_sc['availFlex']} kW", "Pool across 220 homes & EVs")
    c2.metric("Required Flexibility", f"{active_sc['reqFlex']} kW", "Shortfall to be absorbed")
    c3.metric("Flexibility Gap", "0.0 kW", "100% Absorbed in Closed Loop")
    c4.metric("Grid Reliability Index", "99.70%", "+0.39% vs unmanaged B0 baseline")

    st.markdown("### The Core Paradigm Shift")
    st.markdown("""
    Instead of asking *where the next battery should be installed*, GridFlex asks:
    **How much flexibility is available right now — and where is it needed?**
    """)
    
    steps_df = pd.DataFrame([
        {"Step": "01 RENEWABLES", "Details": "100 kWp rooftop PV + 10 EVs on 315 kVA DT", "Type": "High Penetration"},
        {"Step": "02 UNCERTAINTY", "Details": "Cloud ramp (-54 kW in 90s) & evening peak spikes", "Type": "Intermittent Ramps"},
        {"Step": "03 FLEXIBILITY", "Details": "Discovered capacity from water heaters, EVs & BESS", "Type": "Distributed Reserves"},
        {"Step": "04 GRIDFLEX ENGINE", "Details": "Closed-loop least-disruptive dispatch optimizer", "Type": "DISCOM Supervised"},
        {"Step": "05 RELIABLE GRID", "Details": "Stable 418V voltage, protected transformer limits", "Type": "99.70% Availability"},
    ])
    st.dataframe(steps_df, use_container_width=True, hide_index=True)

elif "01 Neighbourhood Twin" in nav_option:
    st.subheader("Neighbourhood Digital Twin: N-01 (Koramangala 315 kVA)")
    st.markdown("Live single-line distribution topology, dynamic power flows, and asset telemetry.")

    col_twin, col_inspect = st.columns([7, 5])
    
    with col_twin:
        st.markdown("""
        <div class="grid-card">
            <h4 style="margin:0 0 0.75rem 0;">Logical Single-Line Distribution Bus</h4>
            <div style="font-family:'JetBrains Mono', monospace; font-size:0.85rem; line-height:2.2; background:#f8fafc; padding:1.25rem; border-radius:8px; border:1px solid #e2e8f0;">
                <div>🏢 <strong>33/11 kV Grid Substation</strong> ➔ 132 kW Import | Synchronized</div>
                <div>⚡ <strong>11 kV Feeder (F-04)</strong> ➔ 0.4 km Dog Conductor | Headroom: 51.1%</div>
                <div>🔌 <strong>315 kVA Distribution Transformer</strong> ➔ <span style="color:#0284c7; font-weight:700;">{tx_load}% Loading</span> | {voltage} V Bus</div>
                <div style="border-top:2px solid #0f172a; margin:8px 0; padding-top:4px;"><strong>── 415V Low Voltage 3-Phase Busbar ──</strong></div>
                <div>☀️ <strong>Rooftop PV Aggregate:</strong> {pv} kWp (42 Arrays)</div>
                <div>🔋 <strong>Shared Community BESS:</strong> {bess_power} kW (SOC: {bess_soc}%)</div>
                <div>🚗 <strong>EV Smart Cluster (10 Cars):</strong> {ev_load} kW (8 kW Flex)</div>
                <div>🏠 <strong>220 Residential Homes:</strong> {gross_load} kW Net Demand</div>
                <div>🚰 <strong>3.7 kW Water Pump:</strong> Deferrable (VFD controlled)</div>
                <div>🏭 <strong>Small Industry:</strong> 22 kW Active (3.5 kW Flex Pool)</div>
            </div>
        </div>
        """.format(
            tx_load=active_sc['txLoad'],
            voltage=active_sc['voltage'],
            pv=active_sc['pv'],
            bess_power=f"+{active_sc['bessPower']}" if active_sc['bessPower'] >= 0 else f"{active_sc['bessPower']}",
            bess_soc=active_sc['bessSoc'],
            ev_load=active_sc['evLoad'],
            gross_load=active_sc['grossLoad']
        ), unsafe_allow_html=True)
        
    with col_inspect:
        st.markdown("#### Asset Telemetry Inspector")
        asset_select = st.selectbox(
            "Select Asset to Inspect",
            ["Shared Community BESS (50 kW / 100 kWh)", "EV Smart Charging Cluster", "Residential Cluster (220 Homes)", "315 kVA Transformer"]
        )
        
        if "BESS" in asset_select:
            st.metric("Operating Power", f"{active_sc['bessPower']} kW", "Positive = Discharging")
            st.metric("State of Charge (SOC)", f"{active_sc['bessSoc']}%", "Healthy LFP Chemistry")
            st.markdown("""
            - **Response Speed:** < 1 second
            - **Available Energy:** 67 kWh
            - **Dispatch Priority:** P4 (Preserved for rapid transient bridging)
            """)
        elif "EV" in asset_select:
            st.metric("Cluster Load", f"{active_sc['evLoad']} kW", "10 Connected Vehicles")
            st.metric("Available Flex", "8.0 kW", "OCPP 2.0.1 Throttling")
            st.markdown("""
            - **Response Speed:** 1 minute
            - **Customer Constraint:** Departure time 07:30 AM guaranteed
            - **Dispatch Priority:** P1 (Least-cost, non-disruptive)
            """)
        elif "Transformer" in asset_select:
            st.metric("Transformer Loading", f"{active_sc['txLoad']}%", "Safe Band < 75%")
            st.metric("Bus Voltage", f"{active_sc['voltage']} V", "Nominal 415V ±6%")
            st.markdown("""
            - **Rating:** 315 kVA, Dyn11, 11/0.433 kV
            - **Thermal Headroom:** 51.1%
            - **Reverse Flow:** """ + active_sc['reverseFlow'])
        else:
            st.metric("Gross Household Load", f"{active_sc['grossLoad']} kW", "220 Smart Metred Homes")
            st.metric("Thermal Flex (Geysers/HVAC)", "4.5 kW", "Thermal inertia storage")

elif "02 Grid & Feeder" in nav_option:
    st.subheader("Distribution Feeder & Transformer Operational Telemetry")
    
    k1, k2, k3, k4, k5 = st.columns(5)
    k1.metric("Tx Loading", f"{active_sc['txLoad']}%", "Safe Band < 75%")
    k2.metric("Bus Voltage", f"{active_sc['voltage']} V", "415V ±6% Limits")
    k3.metric("Active Power (P)", "132 kW", "LV Bus Total")
    k4.metric("Reactive Power (Q)", "41 kVAr", "0.95 Power Factor")
    k5.metric("Thermal Headroom", "51.1%", "Dynamic Line Rating")

    st.markdown("#### 24-Hour Power Diurnal Profile: Gross Load vs Solar PV vs Net Feeder Load")
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=FEEDER_PROFILE['time'], y=FEEDER_PROFILE['gross_load'], mode='lines', name='Gross Load (kW)', line=dict(color='#2563eb', width=2.5)))
    fig.add_trace(go.Scatter(x=FEEDER_PROFILE['time'], y=FEEDER_PROFILE['pv'], mode='lines', name='Rooftop PV (kW)', line=dict(color='#f59e0b', width=2.5, dash='dash')))
    fig.add_trace(go.Scatter(x=FEEDER_PROFILE['time'], y=FEEDER_PROFILE['net_load'], mode='lines', name='Net Feeder Load (kW)', line=dict(color='#059669', width=3)))
    fig.add_hline(y=0, line_dash="dot", line_color="#64748b", annotation_text="Net Zero Line")
    fig.update_layout(height=380, margin=dict(l=20, r=20, t=30, b=20), legend=dict(orientation="h", y=1.1))
    st.plotly_chart(fig, use_container_width=True)
    
    st.info("💡 **Grid Note:** Midday solar surge creates negative net-load ramp, which GridFlex buffers by charging the community BESS and modulating EV charging.")

elif "03 Distributed DERs" in nav_option:
    st.subheader("Distributed Energy Resources (DER) Registry")
    st.markdown("Verified local flexibility pool registered under consumer consent with dynamic priority.")

    der_df = pd.DataFrame([
        {"Resource": "Shared Community BESS", "Type": "Storage", "Available kW": "35.0 kW", "Energy": "67.0 kWh", "Response": "< 1 sec", "Consent": "Utility Owned", "Constraint": "Min SOC 20%", "Priority": "P4"},
        {"Resource": "EV Cluster (10 Cars)", "Type": "Transport", "Available kW": "8.0 kW", "Energy": "24.0 kWh", "Response": "1 min", "Consent": "Opt-in App", "Constraint": "Departure 07:30", "Priority": "P1"},
        {"Resource": "Water Heaters (Geysers)", "Type": "Thermal", "Available kW": "4.5 kW", "Energy": "6.2 kWh", "Response": "2 min", "Consent": "Dynamic Tariff", "Constraint": "Temp >= 52°C", "Priority": "P2"},
        {"Resource": "Community Water Pump", "Type": "Inductive", "Available kW": "1.2 kW", "Energy": "2.4 kWh", "Response": "5 min", "Consent": "Municipal SLA", "Constraint": "OHT Level > 60%", "Priority": "P3"},
        {"Resource": "Small Industry (Cold Buffer)", "Type": "Industrial", "Available kW": "3.5 kW", "Energy": "4.8 kWh", "Response": "5 min", "Consent": "ESCO Contract", "Constraint": "Temp <= -16°C", "Priority": "P5"},
        {"Resource": "Commercial HVAC Setpoint", "Type": "HVAC", "Available kW": "2.8 kW", "Energy": "3.5 kWh", "Response": "3 min", "Consent": "BTM Agreement", "Constraint": "Max 1.5°C delta", "Priority": "P2"}
    ])
    st.dataframe(der_df, use_container_width=True, hide_index=True)

elif "04 Flexibility Engine" in nav_option:
    st.subheader("Flexibility Orchestration Engine & Priority Hierarchy")
    
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Required Flexibility", f"{active_sc['reqFlex']} kW", "Grid net shortfall")
    m2.metric("Available Flexibility", f"{active_sc['availFlex']} kW", "Discovered pool")
    m3.metric("Flexibility Gap", "0.0 kW", "Fully closed")
    m4.metric("Reserve Headroom", f"{round(active_sc['availFlex'] - active_sc['reqFlex'], 1)} kW", "Remaining buffer")
    
    st.markdown("#### Least-Disruption, Least-Cost Prioritization Rationale")
    st.markdown("""
    **The battery is NOT automatically the first resource dispatched.** GridFlex dispatches low-impact demand modulation first to preserve expensive electrochemical battery cycle life.
    """)
    
    hierarchy = [
        {"Rank": "1", "Asset": "EV Smart Throttling", "Dispatched": "4.0 kW", "Response": "1 min", "Disruption": "LOW", "Rationale": "Slows charging speed by 30% for 35 mins without affecting departure SOC."},
        {"Rank": "2", "Asset": "Smart Water Heaters", "Dispatched": "2.0 kW", "Response": "2 min", "Disruption": "LOW", "Rationale": "Capitalizes on thermal inertia. Temperature drops < 0.8°C, invisible to consumer."},
        {"Rank": "3", "Asset": "Community Water Pump", "Dispatched": "1.2 kW", "Response": "5 min", "Disruption": "LOW", "Rationale": "Overhead tank level at 82%. Pumping deferred until solar recovers."},
        {"Rank": "4", "Asset": "Shared Community BESS", "Dispatched": "7.0 kW", "Response": "< 1 sec", "Disruption": "NONE (Degr. Cost)", "Rationale": "Bridges instantaneous transient edge while flexible loads ramp up."},
        {"Rank": "5", "Asset": "Small Industry Deferral", "Dispatched": "3.5 kW", "Response": "5 min", "Disruption": "MEDIUM (Incentive)", "Rationale": "Contractual commercial shedding for prolonged grid stress."}
    ]
    st.dataframe(pd.DataFrame(hierarchy), use_container_width=True, hide_index=True)

elif "05 Event Simulator" in nav_option:
    st.subheader("Interactive Closed-Loop Event Simulator")
    st.markdown("Simulate high-probability distribution grid disruptions and observe automated multi-asset orchestration.")
    
    selected_event = st.radio("Choose Trigger Event to Simulate:", list(SCENARIOS.keys()), format_func=lambda x: SCENARIOS[x]["name"], horizontal=True)
    sim_data = SCENARIOS[selected_event]
    
    st.markdown(f"""
    <div class="grid-card" style="border-left: 5px solid #0284c7;">
        <h4 style="margin:0;">Simulated Scenario: {sim_data['name']}</h4>
        <p style="color:#64748b; font-size:0.9rem; margin-top:0.25rem;">{sim_data['desc']}</p>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("#### Automated 5-Step Mitigation Pipeline (15-Second Loop)")
    st.markdown(f"""
    1. **Event Detection:** Solar drops to **{sim_data['pv']} kW** | Gross demand at **{sim_data['grossLoad']} kW**
    2. **Net-Load Ramp Calculated:** Required flexibility identified as **{sim_data['reqFlex']} kW**
    3. **Flexibility Gap Check:** Available pool is **{sim_data['availFlex']} kW** ➔ Flexibility Gap = **0.0 kW**
    4. **Multi-Asset Dispatch:** Dynamic dispatch across EV throttling, Geysers, Water Pump, and BESS ({sim_data['bessPower']} kW)
    5. **Equilibrium Restored:** Bus voltage stabilized at **{sim_data['voltage']} V**, Transformer safe at **{sim_data['txLoad']}%**
    """)
    st.success("✓ Closed-loop verification succeeded: Zero customer interruptions, transformer within thermal envelope.")

elif "06 DISCOM Command" in nav_option:
    st.subheader("DISCOM Flexibility Command Centre (Bengaluru BESCOM Division Proxy)")
    st.markdown("Fleet supervisory view across 24 monitored distribution transformers.")
    
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Feeders Monitored", "24", "11 kV Urban Circuits")
    c2.metric("Total Available Flex", "312 kW", "Across all feeders")
    c3.metric("Total Required Flex", "247 kW", "Current net load need")
    c4.metric("Feeders at Risk", "2", "N-02 & N-06 under watch")
    
    st.markdown("#### Distribution Sub-Network Status")
    discom_feeders = pd.DataFrame([
        {"Feeder ID": "N-01", "Neighbourhood": "Koramangala Sector 4", "Status": "NORMAL", "Available Flex": "18.4 kW", "Required Flex": "14.2 kW", "Gap": "0.0 kW", "Tx Load": "48.9%"},
        {"Feeder ID": "N-02", "Neighbourhood": "Indiranagar 100ft Rd", "Status": "WATCH", "Available Flex": "11.2 kW", "Required Flex": "13.8 kW", "Gap": "2.6 kW", "Tx Load": "78.4%"},
        {"Feeder ID": "N-03", "Neighbourhood": "HSR Layout Sector 1", "Status": "NORMAL", "Available Flex": "22.1 kW", "Required Flex": "16.4 kW", "Gap": "0.0 kW", "Tx Load": "52.1%"},
        {"Feeder ID": "N-04", "Neighbourhood": "Whitefield Tech Enclave", "Status": "NORMAL", "Available Flex": "19.8 kW", "Required Flex": "12.5 kW", "Gap": "0.0 kW", "Tx Load": "44.0%"},
        {"Feeder ID": "N-05", "Neighbourhood": "Jayanagar 4th Block", "Status": "NORMAL", "Available Flex": "15.6 kW", "Required Flex": "14.0 kW", "Gap": "0.0 kW", "Tx Load": "58.2%"},
        {"Feeder ID": "N-06", "Neighbourhood": "Electronic City Phase 1", "Status": "WATCH", "Available Flex": "9.4 kW", "Required Flex": "11.5 kW", "Gap": "2.1 kW", "Tx Load": "81.0%"}
    ])
    st.dataframe(discom_feeders, use_container_width=True, hide_index=True)

elif "07 Reliability" in nav_option:
    st.subheader("Reliability Benchmark: Synthetic Baseline (B0) vs GridFlex (B1)")
    
    st.warning("⚠️ **Methodology Note (Illustrative Simulation Results):** GridFlex impact is evaluated against the same synthetic baseline scenarios using identical random seeds. Values are illustrative to demonstrate evaluation methodology; real deployment requires calibration with DISCOM feeder, outage, AMI, and DER telemetry.")

    rel_df = pd.DataFrame([
        {"Metric": "Grid Availability", "B0 Baseline (Unmanaged)": "99.31%", "GridFlex B1 (Orchestrated)": "99.70%", "Net Improvement": "+0.39%"},
        {"Metric": "Energy Not Served (ENS)", "B0 Baseline (Unmanaged)": "3,000 kWh/yr", "GridFlex B1 (Orchestrated)": "1,300 kWh/yr", "Net Improvement": "-56.7%"},
        {"Metric": "Renewable Solar Lost", "B0 Baseline (Unmanaged)": "945 kWh", "GridFlex B1 (Orchestrated)": "390 kWh", "Net Improvement": "-58.7%"},
        {"Metric": "Peak Net-Load Ramp", "B0 Baseline (Unmanaged)": "128 kW", "GridFlex B1 (Orchestrated)": "82 kW", "Net Improvement": "-35.9%"},
        {"Metric": "Flexibility Gap Events", "B0 Baseline (Unmanaged)": "18 / yr", "GridFlex B1 (Orchestrated)": "6 / yr", "Net Improvement": "-66.7%"}
    ])
    st.dataframe(rel_df, use_container_width=True, hide_index=True)

elif "08 Economics" in nav_option:
    st.subheader("Economics & Indian DISCOM Rollout Model")
    st.markdown("Cost-effective deployment architecture tailored for Indian state distribution utilities.")
    
    st.info("💡 **NOTE:** All figures in Indian Rupees (₹) are illustrative benchmarks — not binding vendor pricing.")
    
    e1, e2, e3, e4 = st.columns(4)
    e1.metric("Pilot CAPEX", "₹35.3 Lakh", "100 kWh BESS + Gateways")
    e2.metric("Annual O&M / SaaS", "₹6.8 Lakh / yr", "Platform & Field testing")
    e3.metric("Enrolled Homes", "220 Homes", "100 kWp PV, 10 EVs")
    e4.metric("Service Cost Proxy", "₹257 / home / mo", "Funded by DT capex deferral")

    st.markdown("#### Institutional Ownership & Maintenance Matrix")
    ownership_df = pd.DataFrame([
        {"Component": "Shared Community BESS (50kW/100kWh)", "Asset Owner": "DISCOM / ESCO", "Operator": "ESCO Aggregator", "Maintenance Responsibility": "Battery Cell Warranty & Inverter O&M"},
        {"Component": "Smart Meters / Edge Gateway", "Asset Owner": "DISCOM (RDSS)", "Operator": "DISCOM AMI Dept", "Maintenance Responsibility": "Field Testing & Firmware Updates"},
        {"Component": "GridFlex Orchestration Platform", "Asset Owner": "ESCO / Software Vendor", "Operator": "GridFlex Operations", "Maintenance Responsibility": "Cloud Model Training & SLA"},
        {"Component": "Flexible Consumer Loads", "Asset Owner": "Consumer / Prosumer", "Operator": "Consumer (Auto-Consent)", "Maintenance Responsibility": "Consumer OEM Warranty + Telemetry"}
    ])
    st.dataframe(ownership_df, use_container_width=True, hide_index=True)

elif "09 Architecture" in nav_option:
    st.subheader("Schneider Electric Ecosystem Integration & Privacy Architecture")
    
    st.markdown("""
    **GridFlex does not replace Schneider Electric distribution products.**  
    Instead, GridFlex acts as a neighbourhood-scale flexibility orchestration layer that interfaces directly with existing utility-grade systems:
    
    - **EcoStruxure™ ADMS:** Wide-area distribution management, SCADA, and outage tracking.
    - **GRIDFLEX (Neighbourhood Layer):** 15-second closed-loop flexibility gap discovery and distributed DER dispatch.
    - **EcoStruxure™ DERMS / RTU:** Feeder automation, power quality meters, and substation protection.
    """)
    
    col_ai, col_det = st.columns(2)
    with col_ai:
        st.markdown("""
        <div class="grid-card">
            <h4 style="color:#6366f1;">🤖 AI-Assisted Forecasting</h4>
            <p style="font-size:0.85rem; color:#64748b;">Probabilistic edge pattern recognition:</p>
            <ul>
                <li>15-minute ahead solar irradiance ramps</li>
                <li>Non-intrusive EV departure time probability</li>
                <li>Residential demand anomaly detection</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
        
    with col_det:
        st.markdown("""
        <div class="grid-card">
            <h4 style="color:#0284c7;">🛡️ Deterministic Grid Optimization</h4>
            <p style="font-size:0.85rem; color:#64748b;">Hard electrical engineering constraints AI cannot violate:</p>
            <ul>
                <li>315 kVA transformer thermal limit</li>
                <li>Voltage bounds compliance (415V ±6%)</li>
                <li>Customer consent rules (e.g. Min 80% EV SOC by 07:00)</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

st.markdown("---")
st.markdown("""
<div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#94a3b8; font-family:'JetBrains Mono', monospace;">
    <div>GRIDFLEX PLATFORM — SCHNEIDER ELECTRIC INNOVATION CHALLENGE 2026</div>
    <div>ILLUSTRATIVE UTILITY PROTOTYPE</div>
</div>
""", unsafe_allow_html=True)
