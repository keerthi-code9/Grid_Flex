import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Zap,
  BatteryCharging,
  Sun,
  Car,
  Home,
  Factory,
  Cpu,
  BarChart3,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  TrendingDown,
  Info,
  Sliders,
  DollarSign,
  ChevronRight,
  Maximize2,
  ArrowRight,
  RefreshCw,
  Clock,
  Radio,
  Compass,
  Building2,
  SlidersHorizontal,
  CloudSun,
  Eye,
  Settings,
  Lock,
  ChevronDown
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';

// Core baseline parameters specified for consistency:
// 315 kVA Transformer | 100 kWp Rooftop PV | 220 Consumers | 10 EVs (27 kW) | 50 kW / 100 kWh BESS | 22 kW Small Ind | 3.7 kW Pump

const SIMULATION_SCENARIOS = {
  NORMAL: {
    id: 'NORMAL',
    name: 'Nominal Baseline',
    desc: 'Mild sunny conditions, scheduled EV loads, balanced transformer thermal operating band.',
    pv: 72,
    grossLoad: 88,
    requiredFlex: 0,
    availableFlex: 24.5,
    transformerLoad: 48.9,
    voltage: 418.6,
    bessSoc: 68,
    bessPower: 0,
    evLoad: 27,
    status: 'NORMAL',
    reverseFlow: false,
    alertMsg: 'System balanced. Zero active flexibility dispatch required.'
  },
  CLOUD_RAMP: {
    id: 'CLOUD_RAMP',
    name: 'Sudden Cloud Ramp',
    desc: 'Cloud cover reduces PV from 92 kW to 38 kW in 90 seconds. Net load spikes, requiring rapid distributed response.',
    pv: 38,
    grossLoad: 92,
    requiredFlex: 14.2,
    availableFlex: 18.4,
    transformerLoad: 53.8,
    voltage: 414.8,
    bessSoc: 65,
    bessPower: 7.0,
    evLoad: 23,
    status: 'WATCH',
    reverseFlow: false,
    alertMsg: '54 kW solar generation drop detected. Least-disruptive flexibility dispatch initiated.'
  },
  PV_SURGE: {
    id: 'PV_SURGE',
    name: 'Midday Solar Surge',
    desc: 'Clearing skies push PV generation to 98 kW while residential load is minimal (34 kW), threatening reverse power flow and voltage rise.',
    pv: 98,
    grossLoad: 34,
    requiredFlex: 16.5,
    availableFlex: 22.0,
    transformerLoad: 41.2,
    voltage: 426.4,
    bessSoc: 74,
    bessPower: -12.0, // Charging
    evLoad: 31,
    status: 'WATCH',
    reverseFlow: true,
    alertMsg: 'High reverse flow risk detected. Flexible soaking activated (BESS + Smart EV modulation).'
  },
  EVENING_PEAK: {
    id: 'EVENING_PEAK',
    name: 'Evening Peak Demand Ramp',
    desc: 'Zero PV generation combined with simultaneous residential cooking, cooling, and EV plugging creates transformer stress.',
    pv: 0,
    grossLoad: 142,
    requiredFlex: 21.0,
    availableFlex: 23.2,
    transformerLoad: 68.4,
    voltage: 411.2,
    bessSoc: 58,
    bessPower: 12.0,
    evLoad: 18, // Throttled
    status: 'WATCH',
    reverseFlow: false,
    alertMsg: 'Transformer loading elevated. Industrial deferment & non-critical EV delay mobilized.'
  }
};

const FEEDER_24HR_PROFILE = [
  { time: '00:00', grossLoad: 42, pv: 0, netLoad: 42, flexUsed: 0, txLimit: 100 },
  { time: '03:00', grossLoad: 38, pv: 0, netLoad: 38, flexUsed: 0, txLimit: 100 },
  { time: '06:00', grossLoad: 55, pv: 8, netLoad: 47, flexUsed: 0, txLimit: 100 },
  { time: '08:00', grossLoad: 78, pv: 42, netLoad: 36, flexUsed: 2.1, txLimit: 100 },
  { time: '10:00', grossLoad: 84, pv: 86, netLoad: -2, flexUsed: 8.5, txLimit: 100 },
  { time: '12:00', grossLoad: 89, pv: 98, netLoad: -9, flexUsed: 14.2, txLimit: 100 },
  { time: '13:15', grossLoad: 92, pv: 38, netLoad: 54, flexUsed: 14.2, txLimit: 100 },
  { time: '15:00', grossLoad: 86, pv: 64, netLoad: 22, flexUsed: 6.0, txLimit: 100 },
  { time: '17:00', grossLoad: 95, pv: 18, netLoad: 77, flexUsed: 9.8, txLimit: 100 },
  { time: '19:00', grossLoad: 138, pv: 0, netLoad: 138, flexUsed: 18.5, txLimit: 100 },
  { time: '21:00', grossLoad: 118, pv: 0, netLoad: 118, flexUsed: 11.2, txLimit: 100 },
  { time: '23:00', grossLoad: 62, pv: 0, netLoad: 62, flexUsed: 1.0, txLimit: 100 },
];

const DISCOM_NEIGHBOURHOODS = [
  { id: 'N-01', name: 'Koramangala Sector 4', status: 'NORMAL', flexAvail: 18.4, flexReq: 14.2, gap: 0, txLoad: 48.9, vMargin: '4.8%', pvh: 100, evs: 10 },
  { id: 'N-02', name: 'Indiranagar 100ft Feeder', status: 'WATCH', flexAvail: 11.2, flexReq: 13.8, gap: 2.6, txLoad: 78.4, vMargin: '1.2%', pvh: 140, evs: 18 },
  { id: 'N-03', name: 'HSR Layout Sector 1', status: 'NORMAL', flexAvail: 22.1, flexReq: 16.4, gap: 0, txLoad: 52.1, vMargin: '5.2%', pvh: 120, evs: 12 },
  { id: 'N-04', name: 'Whitefield Tech Enclave', status: 'NORMAL', flexAvail: 19.8, flexReq: 12.5, gap: 0, txLoad: 44.0, vMargin: '6.1%', pvh: 90, evs: 15 },
  { id: 'N-05', name: 'Jayanagar 4th Block', status: 'NORMAL', flexAvail: 15.6, flexReq: 14.0, gap: 0, txLoad: 58.2, vMargin: '3.9%', pvh: 85, evs: 8 },
  { id: 'N-06', name: 'Electronic City Phase 1', status: 'WATCH', flexAvail: 9.4, flexReq: 11.5, gap: 2.1, txLoad: 81.0, vMargin: '0.9%', pvh: 160, evs: 24 }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('neighbourhood');
  const [currentScenario, setCurrentScenario] = useState('CLOUD_RAMP');
  const [selectedAsset, setSelectedAsset] = useState('bess');
  const [simStep, setSimStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [demoMode, setDemoMode] = useState(true);

  // Active scenario properties
  const sc = SIMULATION_SCENARIOS[currentScenario];

  // Automated step simulation runner
  useEffect(() => {
    let timer;
    if (isSimulating && simStep < 5) {
      timer = setTimeout(() => {
        setSimStep(prev => prev + 1);
      }, 1400);
    } else if (simStep >= 5) {
      setIsSimulating(false);
    }
    return () => clearTimeout(timer);
  }, [isSimulating, simStep]);

  const triggerSimulation = (scenarioKey) => {
    setCurrentScenario(scenarioKey);
    setSimStep(1);
    setIsSimulating(true);
  };

  const resetSimulation = () => {
    setCurrentScenario('NORMAL');
    setSimStep(0);
    setIsSimulating(false);
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#0f172a] font-sans antialiased overflow-hidden select-none">
      {/* Persistent Utility Sidebar */}
      <aside className="w-64 bg-[#0a192f] text-slate-200 flex flex-col justify-between border-r border-[#1e293b] flex-shrink-0 z-20">
        <div>
          {/* Logo & Platform Brand */}
          <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00d287] to-[#0084ff] flex items-center justify-center font-black text-white text-lg tracking-wider shadow-md">
                GF
              </div>
              <div>
                <div className="font-bold text-base text-white tracking-wide flex items-center gap-1.5">
                  GRIDFLEX
                  <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    SE 2026
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-400 font-mono tracking-tight leading-none mt-0.5">
                  Neighbourhood Orchestrator
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-sm font-medium">
            {[
              { id: 'overview', label: '00 Overview & Vision', icon: Compass },
              { id: 'neighbourhood', label: '01 Neighbourhood Twin', icon: Layers },
              { id: 'feeder', label: '02 Grid & Feeder State', icon: Activity },
              { id: 'ders', label: '03 Distributed DERs', icon: Zap },
              { id: 'flexibility', label: '04 Flexibility Engine', icon: SlidersHorizontal },
              { id: 'events', label: '05 Event Simulator', icon: Play },
              { id: 'discom', label: '06 DISCOM Command', icon: Building2 },
              { id: 'reliability', label: '07 Reliability & B0 vs B1', icon: ShieldCheck },
              { id: 'economics', label: '08 Economics & Deployment', icon: DollarSign },
              { id: 'architecture', label: '09 Ecosystem & Privacy', icon: Lock }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-left text-xs tracking-wide ${
                    isActive
                      ? 'bg-[#0084ff] text-white font-semibold shadow-sm shadow-blue-500/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer telemetry indicator */}
        <div className="p-4 border-t border-slate-800/80 bg-[#061120] text-xs">
          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="text-slate-400 font-mono uppercase tracking-wider">Telemetry Link</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              99.98%
            </span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>Feeder 11kV:</span>
              <span className="text-slate-200 font-mono">Synchronized</span>
            </div>
            <div className="flex justify-between">
              <span>DISCOM ADMS:</span>
              <span className="text-slate-200 font-mono">EcoStruxure Ready</span>
            </div>
            <div className="flex justify-between">
              <span>Simulation Clock:</span>
              <span className="text-amber-300 font-mono">13:15 IST (15m step)</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f4f7fb]">
        {/* Top Utility Bar */}
        <header className="h-14 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between flex-shrink-0 z-10 shadow-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Neighbourhood:</span>
              <div className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs px-2.5 py-1 rounded font-bold border border-slate-300 flex items-center gap-1.5">
                <span>N-01 (Koramangala 315 kVA)</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs text-slate-500 uppercase font-semibold">State:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tracking-tight ${
                  sc.status === 'NORMAL'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    : 'bg-amber-50 text-amber-700 border border-amber-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${sc.status === 'NORMAL' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                {sc.status} ({currentScenario.replace('_', ' ')})
              </span>
            </div>
          </div>

          {/* Right Header Status Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 px-2 uppercase">Scenario</span>
              <select
                value={currentScenario}
                onChange={(e) => {
                  setCurrentScenario(e.target.value);
                  setSimStep(0);
                  setIsSimulating(false);
                }}
                className="bg-white text-xs font-semibold text-slate-800 border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="NORMAL">Normal Midday</option>
                <option value="CLOUD_RAMP">Cloud Ramp (PV Drop)</option>
                <option value="PV_SURGE">Midday PV Surge</option>
                <option value="EVENING_PEAK">Evening Peak Demand</option>
              </select>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <button
                onClick={() => setDemoMode(!demoMode)}
                className={`px-2.5 py-1 rounded text-xs font-bold font-mono tracking-wider transition-all border ${
                  demoMode
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {demoMode ? 'SYNTHETIC DEMO ACTIVE' : 'LIVE TELEMETRY'}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 text-slate-800">
          {activeTab === 'overview' && <OverviewView setActiveTab={setActiveTab} triggerSimulation={triggerSimulation} />}
          {activeTab === 'neighbourhood' && (
            <NeighbourhoodTwinView
              sc={sc}
              selectedAsset={selectedAsset}
              setSelectedAsset={setSelectedAsset}
              currentScenario={currentScenario}
              triggerSimulation={triggerSimulation}
              simStep={simStep}
            />
          )}
          {activeTab === 'feeder' && <FeederOperationsView sc={sc} />}
          {activeTab === 'ders' && <DistributedDERsView sc={sc} />}
          {activeTab === 'flexibility' && <FlexibilityEngineView sc={sc} />}
          {activeTab === 'events' && (
            <EventSimulatorView
              sc={sc}
              currentScenario={currentScenario}
              simStep={simStep}
              isSimulating={isSimulating}
              triggerSimulation={triggerSimulation}
              resetSimulation={resetSimulation}
            />
          )}
          {activeTab === 'discom' && <DiscomCommandCentreView sc={sc} />}
          {activeTab === 'reliability' && <ReliabilityImpactView />}
          {activeTab === 'economics' && <EconomicsDeploymentView />}
          {activeTab === 'architecture' && <ArchitectureEcosystemView />}
        </main>
      </div>
    </div>
  );
}

function OverviewView({ setActiveTab, triggerSimulation }) {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      {/* Hero Banner */}
      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-blue-50 via-indigo-50/30 to-transparent pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-4">
            <Radio className="w-3.5 h-3.5 animate-pulse text-blue-600" /> Schneider Electric Innovation Prototype 2026
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0a192f] tracking-tight leading-tight">
            Making Renewable Power Reliable, <br />
            <span className="text-[#0084ff]">Neighbourhood by Neighbourhood.</span>
          </h1>
          <p className="mt-4 text-slate-600 text-base leading-relaxed">
            An intelligent, DISCOM-supervised flexibility orchestration platform that turns distributed rooftop solar,
            EV chargers, and flexible loads into a measurable, closed-loop reliability buffer against renewable intermittency.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('neighbourhood')}
              className="px-5 py-2.5 bg-[#0084ff] hover:bg-blue-600 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <Layers className="w-4 h-4" /> Launch Digital Twin Control Room
            </button>
            <button
              onClick={() => setActiveTab('flexibility')}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg border border-slate-300 shadow-2xs flex items-center gap-2 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-600" /> Explore Flexibility Hierarchy
            </button>
            <button
              onClick={() => {
                setActiveTab('events');
                triggerSimulation('CLOUD_RAMP');
              }}
              className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-sm rounded-lg border border-amber-300 shadow-2xs flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4 text-amber-600" /> Run Cloud Ramp Demo
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Available Flexibility', val: '18.4 kW', sub: 'Pool across 220 homes, EVs & BESS', color: 'text-emerald-600', icon: Zap },
          { label: 'Required Flexibility', val: '14.2 kW', sub: 'Mitigates 54 kW cloud solar drop', color: 'text-blue-600', icon: Activity },
          { label: 'Flexibility Gap', val: '0.0 kW', sub: 'Closed loop: 100% gap absorbed', color: 'text-slate-800', icon: ShieldCheck },
          { label: 'Grid Reliability Index', val: '99.70%', sub: 'vs 99.31% synthetic B0 baseline', color: 'text-indigo-600', icon: CheckCircle2 }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
                <span>{kpi.label}</span>
                <Icon className="w-4 h-4 text-slate-400" />
              </div>
              <div className={`text-2xl font-bold font-mono tracking-tight ${kpi.color}`}>
                {kpi.val}
              </div>
              <div className="text-xs text-slate-500 mt-1">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* The Core Paradigm Shift Visual Flow */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">The Core Problem & GridFlex Solution Architecture</h2>
          <p className="text-xs text-slate-500">
            India's DISCOM challenge isn't just "installing more batteries" — it is knowing in real-time how much flexibility exists right now and dispatching it prior to feeder stress.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center pt-2">
          {[
            {
              step: '01',
              title: 'RENEWABLES',
              desc: '100 kWp rooftop PV + 10 EVs on 315 kVA DT',
              tag: 'High Penetration',
              border: 'border-blue-200',
              bg: 'bg-blue-50/50'
            },
            {
              step: '02',
              title: 'UNCERTAINTY',
              desc: 'Cloud ramp (-54 kW in 90s) & evening surges',
              tag: 'Intermittent Ramps',
              border: 'border-amber-200',
              bg: 'bg-amber-50/50'
            },
            {
              step: '03',
              title: 'FLEXIBILITY',
              desc: 'Discovered capacity from water heaters, EVs, BESS',
              tag: 'Distributed Reserves',
              border: 'border-emerald-200',
              bg: 'bg-emerald-50/50'
            },
            {
              step: '04',
              title: 'GRIDFLEX ENGINE',
              desc: 'Closed-loop least-disruptive dispatch optimizer',
              tag: 'DISCOM Supervised',
              border: 'border-indigo-200',
              bg: 'bg-indigo-50/50'
            },
            {
              step: '05',
              title: 'RELIABLE GRID',
              desc: 'Stable 418V voltage, protected transformer limits',
              tag: '99.70% Availability',
              border: 'border-cyan-200',
              bg: 'bg-cyan-50/50'
            }
          ].map((item, i) => (
            <div key={i} className={`p-4 rounded-lg border ${item.border} ${item.bg} relative flex flex-col justify-between h-full`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400">{item.step}</span>
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                    {item.tag}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-800 tracking-tight">{item.title}</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dual Core Value Propositions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#0a192f] to-[#12284c] text-white p-6 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase font-mono text-[#00d287] tracking-wider mb-2 font-bold">
              Primary Value Proposition
            </div>
            <p className="text-lg font-semibold leading-snug text-slate-100">
              “GridFlex turns distributed energy resources into an intelligent, measurable flexibility layer for the distribution grid.”
            </p>
          </div>
          <div className="mt-6 text-xs text-slate-300 border-t border-slate-700/60 pt-3">
            Enables Indian distribution utilities to onboard 2-3x more rooftop solar without triggering multi-crore transformer augmentations.
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase font-mono text-blue-600 tracking-wider mb-2 font-bold">
              Operating Philosophy
            </div>
            <p className="text-lg font-semibold text-slate-800 leading-snug">
              “Instead of asking where the next battery should be installed, GridFlex asks: How much flexibility is available right now — and where is it needed?”
            </p>
          </div>
          <div className="mt-6 text-xs text-slate-500 border-t border-slate-100 pt-3">
            Battery is not depleted first: GridFlex dispatches low-disruption smart EV modulation and thermal inertia before degrading electrochemical storage.
          </div>
        </div>
      </div>
    </div>
  );
}

function NeighbourhoodTwinView({ sc, selectedAsset, setSelectedAsset, currentScenario, triggerSimulation, simStep }) {
  const assets = {
    substation: {
      id: 'substation',
      title: '33/11 kV Substation',
      type: 'Grid Injection Point',
      power: '132 kW Import',
      health: 'Normal',
      specs: '10 MVA Power Transformer, OLTC Automatic Tap',
      details: 'Feeder bus voltage nominal at 11.02 kV. Active supervisory feed to DISCOM SCADA.'
    },
    feeder: {
      id: 'feeder',
      title: '11 kV Feeder (F-04)',
      type: 'Medium Voltage Distribution',
      power: '132 kW active',
      health: 'Thermal Headroom 51.1%',
      specs: '0.4 km underground dog conductor',
      details: 'Reverse flow safely absorbed during midday generation surplus without line tripping.'
    },
    transformer: {
      id: 'transformer',
      title: '315 kVA Distribution Transformer',
      type: 'Distribution Core',
      power: `${sc.transformerLoad}% loaded`,
      health: sc.transformerLoad > 70 ? 'Warning' : 'Healthy',
      specs: '315 kVA 11/0.433 kV, Dyn11, Oil Natural Air Cooled',
      details: `Operating at ${sc.voltage}V phase-to-phase. Peak thermal limit protected by coordinated flexibility.`
    },
    pv: {
      id: 'pv',
      title: 'Rooftop PV Aggregate',
      type: 'Solar Generation Resource',
      power: `${sc.pv} kWp Generation`,
      health: 'Operating',
      specs: '100 kWp installed across 42 rooftop arrays with smart solar inverters',
      details: 'Telemetry sampled every 15s. Volt-VAr curves configured to IEEE 1547 compliant bounds.'
    },
    bess: {
      id: 'bess',
      title: 'Shared Community BESS',
      type: 'Lithium-ion LFP Storage',
      power: sc.bessPower > 0 ? `+${sc.bessPower} kW Discharging` : sc.bessPower < 0 ? `${sc.bessPower} kW Charging` : '0 kW Standby',
      health: 'Ready',
      specs: '50 kW / 100 kWh C-rate 0.5C',
      soc: `${sc.bessSoc}%`,
      availableFlex: '35 kW',
      availableEnergy: '67 kWh',
      responseTime: '<1 sec',
      duration: '1.8 hours',
      details: 'Preserved for rapid transient absorption. Dispatched only when customer loads cannot bridge the net-load gap.'
    },
    evs: {
      id: 'evs',
      title: 'EV Smart Charging Cluster',
      type: 'Flexible Transportation Load',
      power: `${sc.evLoad} kW Aggregate Load`,
      health: 'Modulating',
      specs: '10 Smart AC Type-2 Chargers (7.4 kW each) with OCPP 2.0.1 smart throttling',
      availableFlex: '8.0 kW curtailment',
      responseTime: '1 min',
      duration: '45 mins',
      details: 'Dispatched under departure-time customer consent without violating daily morning commuting requirements.'
    },
    homes: {
      id: 'homes',
      title: 'Residential Cluster (220 Homes)',
      type: 'Baseline Household Demand',
      power: `${sc.grossLoad} kW Net Consumption`,
      health: 'Supplied',
      specs: '220 Smart Metred Consumer Connections (Advanced Metering Infrastructure)',
      availableFlex: '4.5 kW (water heating & HVAC modulation)',
      responseTime: '2 min',
      duration: '1 hour',
      details: 'Thermal storage inertia in domestic hot water and cooling provides non-intrusive flexibility buffering.'
    },
    pump: {
      id: 'pump',
      title: 'Community Water Pump',
      type: 'Municipal Flexible Inductive Load',
      power: '3.7 kW Active',
      health: 'Deferrable',
      specs: '3.7 kW Submersible Variable Frequency Drive (VFD)',
      availableFlex: '1.2 kW',
      responseTime: '5 min',
      duration: '2 hours',
      details: 'Overhead tank level currently 82%. Pump cycle can be paused up to 120 minutes with zero consumer impact.'
    },
    industry: {
      id: 'industry',
      title: 'Small Commercial & Industry',
      type: 'Commercial Flexible Load',
      power: '22 kW Baseline',
      health: 'Enrolled in Demand Response',
      specs: 'Cold storage buffer & small workshop mechanical presses',
      availableFlex: '3.5 kW',
      responseTime: '5 min',
      duration: '30 mins',
      details: 'Receives ₹3.20/kW incentive for scheduled thermal compressor deferrals during grid stress.'
    }
  };

  const active = assets[selectedAsset] || assets.bess;

  return (
    <div className="space-y-6">
      {/* Header with Quick Scenario Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Neighbourhood Digital Twin: N-01
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              Live Topology Model
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time power flows, asset health, and telemetry for the 315 kVA Koramangala distribution sub-network.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerSimulation('CLOUD_RAMP')}
            className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded shadow-2xs flex items-center gap-1.5"
          >
            <CloudSun className="w-3.5 h-3.5" /> Inject Cloud Ramp Event
          </button>
          <button
            onClick={() => triggerSimulation('NORMAL')}
            className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded shadow-2xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restore Baseline
          </button>
        </div>
      </div>

      {/* Grid Schematics and Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Electrical Network Diagram (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Single-Line Schematic (Click nodes to inspect)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Bus Voltage: <strong className="text-slate-700">{sc.voltage} V</strong> | Load: <strong className="text-slate-700">{sc.transformerLoad}%</strong>
            </span>
          </div>

          {/* Schematic SVG Diagram */}
          <div className="w-full bg-[#f8fafc] rounded-xl border border-slate-200/80 p-6 relative min-h-[380px] flex flex-col justify-between">
            {/* Top Grid & Substation Pipeline */}
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* 33kV Substation */}
              <div
                onClick={() => setSelectedAsset('substation')}
                className={`cursor-pointer p-3 rounded-lg border transition-all text-center ${
                  selectedAsset === 'substation'
                    ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Building2 className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                <div className="font-bold text-xs text-slate-800">33/11 kV Grid</div>
                <div className="text-[10px] text-slate-500 font-mono">Substation S-12</div>
                <div className="text-[10px] font-semibold text-emerald-600 mt-1">● Synchronized</div>
              </div>

              {/* 11kV Feeder Line */}
              <div
                onClick={() => setSelectedAsset('feeder')}
                className={`cursor-pointer p-3 rounded-lg border transition-all text-center relative ${
                  selectedAsset === 'feeder'
                    ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Activity className="w-6 h-6 mx-auto text-indigo-600 mb-1" />
                <div className="font-bold text-xs text-slate-800">11 kV Feeder F-04</div>
                <div className="text-[10px] text-slate-500 font-mono">0.4 km Conductor</div>
                <div className="text-[10px] font-semibold text-blue-600 mt-1">Headroom: 51.1%</div>
              </div>

              {/* 315 kVA Transformer */}
              <div
                onClick={() => setSelectedAsset('transformer')}
                className={`cursor-pointer p-3 rounded-lg border transition-all text-center ${
                  selectedAsset === 'transformer'
                    ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Cpu className={`w-6 h-6 mx-auto mb-1 ${sc.transformerLoad > 70 ? 'text-amber-500' : 'text-emerald-600'}`} />
                <div className="font-bold text-xs text-slate-800">315 kVA DT</div>
                <div className="text-[10px] text-slate-500 font-mono">Dyn11 Transformer</div>
                <div className={`text-[10px] font-bold mt-1 ${sc.transformerLoad > 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {sc.transformerLoad}% Loading
                </div>
              </div>
            </div>

            {/* Central Bus Distribution Bar */}
            <div className="my-5 relative flex items-center justify-center">
              <div className="h-2 w-full bg-slate-800 rounded-full relative overflow-hidden flex items-center justify-center">
                {/* Simulated Energy Pulse particles */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-blue-500 to-amber-400 opacity-60 animate-pulse"></div>
              </div>
              <span className="absolute bg-[#0a192f] text-white font-mono text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold shadow-xs">
                415V Low Voltage 3-Phase Busbar
              </span>
            </div>

            {/* Bottom Distributed Resources Cluster */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {/* Rooftop PV */}
              <div
                onClick={() => setSelectedAsset('pv')}
                className={`cursor-pointer p-2.5 rounded-lg border text-center transition-all ${
                  selectedAsset === 'pv'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Sun className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                <div className="font-bold text-[11px] text-slate-800">Rooftop PV</div>
                <div className="text-[10px] text-slate-600 font-mono font-semibold">{sc.pv} kW</div>
                <div className="text-[9px] text-emerald-600 font-medium">● 100 kWp</div>
              </div>

              {/* Shared BESS */}
              <div
                onClick={() => setSelectedAsset('bess')}
                className={`cursor-pointer p-2.5 rounded-lg border text-center transition-all ${
                  selectedAsset === 'bess'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <BatteryCharging className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                <div className="font-bold text-[11px] text-slate-800">Shared BESS</div>
                <div className="text-[10px] text-slate-600 font-mono font-semibold">SOC {sc.bessSoc}%</div>
                <div className="text-[9px] text-blue-600 font-medium">● 50kW/100kWh</div>
              </div>

              {/* EV Fleet */}
              <div
                onClick={() => setSelectedAsset('evs')}
                className={`cursor-pointer p-2.5 rounded-lg border text-center transition-all ${
                  selectedAsset === 'evs'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Car className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
                <div className="font-bold text-[11px] text-slate-800">10 EVs</div>
                <div className="text-[10px] text-slate-600 font-mono font-semibold">{sc.evLoad} kW</div>
                <div className="text-[9px] text-indigo-600 font-medium">● Flex: 8kW</div>
              </div>

              {/* 220 Homes */}
              <div
                onClick={() => setSelectedAsset('homes')}
                className={`cursor-pointer p-2.5 rounded-lg border text-center transition-all ${
                  selectedAsset === 'homes'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Home className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                <div className="font-bold text-[11px] text-slate-800">220 Homes</div>
                <div className="text-[10px] text-slate-600 font-mono font-semibold">{sc.grossLoad} kW</div>
                <div className="text-[9px] text-emerald-600 font-medium">● Flex: 4.5kW</div>
              </div>

              {/* Community Pump */}
              <div
                onClick={() => setSelectedAsset('pump')}
                className={`cursor-pointer p-2.5 rounded-lg border text-center transition-all ${
                  selectedAsset === 'pump'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Activity className="w-5 h-5 mx-auto text-cyan-600 mb-1" />
                <div className="font-bold text-[11px] text-slate-800">3.7kW Pump</div>
                <div className="text-[10px] text-slate-600 font-mono font-semibold">3.7 kW</div>
                <div className="text-[9px] text-cyan-600 font-medium">● Deferrable</div>
              </div>

              {/* Small Industry */}
              <div
                onClick={() => setSelectedAsset('industry')}
                className={`cursor-pointer p-2.5 rounded-lg border text-center transition-all ${
                  selectedAsset === 'industry'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Factory className="w-5 h-5 mx-auto text-slate-700 mb-1" />
                <div className="font-bold text-[11px] text-slate-800">Small Ind.</div>
                <div className="text-[10px] text-slate-600 font-mono font-semibold">22 kW</div>
                <div className="text-[9px] text-slate-600 font-medium">● Flex: 3.5kW</div>
              </div>
            </div>
          </div>

          {/* Active Flow Notification Bar */}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-slate-700 font-medium">
                {sc.alertMsg}
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              Response Cycle: <strong className="text-slate-800">Closed-Loop Active</strong>
            </span>
          </div>
        </div>

        {/* Right Column: Asset Telemetry Inspector Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Asset Telemetry Inspector
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Live Data Link
              </span>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-bold text-slate-900">{active.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{active.type}</p>
            </div>

            {/* Inspector Telemetry Metrics */}
            <div className="mt-5 space-y-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500 uppercase font-semibold">Operating State / Power</div>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{active.power}</div>
              </div>

              {active.soc && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">State of Charge (SOC)</div>
                  <div className="text-base font-bold font-mono text-blue-600 mt-0.5">{active.soc}</div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: active.soc }}></div>
                  </div>
                </div>
              )}

              {active.availableFlex && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Flex Capacity</div>
                    <div className="text-sm font-bold font-mono text-emerald-600">{active.availableFlex}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Response Speed</div>
                    <div className="text-sm font-bold font-mono text-indigo-600">{active.responseTime || '< 2 min'}</div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="text-[11px] font-semibold text-slate-600 uppercase mb-1">Engineering Specification</div>
                <div className="text-slate-700 font-mono text-[11px] leading-relaxed">{active.specs}</div>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed bg-blue-50/40 p-3 rounded-lg border border-blue-100">
                <div className="font-semibold text-blue-900 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Dispatch Constraint & Logic
                </div>
                {active.details}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>Protocol: IEC 61850 / Modbus</span>
            <span>Latency: 28 ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeederOperationsView({ sc }) {
  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Feeder & Transformer Operational Telemetry
        </h2>
        <p className="text-xs text-slate-500">
          Distribution-level active power balance, voltage compliance, and transformer safe operating envelope.
        </p>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Transformer Loading', val: `${sc.transformerLoad}%`, sub: 'Safe Band < 80%', color: sc.transformerLoad > 75 ? 'text-amber-600' : 'text-slate-800' },
          { label: 'Feeder Voltage', val: `${sc.voltage} V`, sub: 'Nominal 415 V ±6%', color: 'text-blue-600' },
          { label: 'Active Power (P)', val: '132 kW', sub: 'LV side aggregate', color: 'text-slate-800' },
          { label: 'Reactive Power (Q)', val: '41 kVAr', sub: '0.95 pf power factor', color: 'text-slate-700' },
          { label: 'Apparent Power (S)', val: '138 kVA', sub: 'Rating 315 kVA', color: 'text-slate-800' },
          { label: 'Thermal Headroom', val: '51.1%', sub: 'Dynamic Feeder Rating', color: 'text-emerald-600' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider truncate">{kpi.label}</div>
            <div className={`text-xl font-bold font-mono mt-1 ${kpi.color}`}>{kpi.val}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart 1: 24-Hour Gross Load vs PV Generation vs Net Load */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              24-Hour Diurnal Power Profile: Gross Load vs Solar vs Net Load
            </h3>
            <p className="text-xs text-slate-500">
              Note the severe midday dip (duck curve ramp) caused by 100 kWp rooftop solar and the 19:00 evening peak.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-600"></span> Gross Load</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-500"></span> PV Gen</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-600"></span> Net Feeder Load</span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={FEEDER_24HR_PROFILE} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="kW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="grossLoad" name="Gross Load" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorGross)" />
              <Area type="monotone" dataKey="pv" name="Rooftop PV" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPv)" />
              <Area type="monotone" dataKey="netLoad" name="Net Feeder Load" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNet)" />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="2 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Auxiliary Monitoring Panels: Transformer Loading Band & Feeder Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Safe Operating Band Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              315 kVA Transformer Thermal Envelope
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              SAFE BAND: 30% - 75%
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Dynamic ratings prevent hotspot insulation degradation during sudden intermittent swings.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span>Current Loading ({sc.transformerLoad}%)</span>
                <span className="text-slate-500">Continuous Rating 315 kVA</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-500 ${
                    sc.transformerLoad > 75 ? 'bg-amber-500' : 'bg-[#0084ff]'
                  }`}
                  style={{ width: `${sc.transformerLoad}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-2">
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <div className="text-[10px] text-slate-400">Peak Today</div>
                <div className="font-bold text-slate-800">68.4%</div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <div className="text-[10px] text-slate-400">Oil Temp (Calc)</div>
                <div className="font-bold text-slate-800">54.2 °C</div>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-100">
                <div className="text-[10px] text-slate-400">Reverse Inflow</div>
                <div className="font-bold text-emerald-600">{sc.reverseFlow ? 'Active (9 kW)' : 'Zero'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feeder Status & Protection Constraints */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Distribution Protection & Constraint Checker
              </h4>
              <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Limits Cleared
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Voltage Margin at Tail End:</span>
                <span className="font-mono font-bold text-slate-900">+4.8% (Nominal 415V compliant)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Reverse Power Protection Trip:</span>
                <span className="font-mono font-bold text-emerald-600">UNBLOCKED (Orchestration in range)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Phase Unbalance Indicator:</span>
                <span className="font-mono font-bold text-slate-900">1.4% (Permissible &lt; 3.0%)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-blue-50/60 rounded border border-blue-100 text-[11px] text-blue-900 leading-snug">
            <strong>Engineering Guardrail:</strong> GridFlex continuously validates local thermal and voltage margins before dispatching flexibility signals to prevent secondary circuit violations.
          </div>
        </div>
      </div>
    </div>
  );
}

function DistributedDERsView({ sc }) {
  const resourceRegistry = [
    { asset: 'Shared Community BESS', type: 'Storage', kw: '35.0 kW', kwh: '67.0 kWh', resp: '< 1 sec', dur: '1.8 hrs', avail: 'Ready', consent: 'Utility Owned', constraint: 'Min SOC 20%', priority: 'P4' },
    { asset: 'EV Cluster (10 Cars)', type: 'Transport', kw: '8.0 kW', kwh: '24.0 kWh', resp: '1 min', dur: '45 mins', avail: 'Flexible', consent: 'Opt-in App', constraint: 'Departure 07:30', priority: 'P1' },
    { asset: 'Water Heaters (Geysers)', type: 'Thermal', kw: '4.5 kW', kwh: '6.2 kWh', resp: '2 min', dur: '60 mins', avail: 'Available', consent: 'Dynamic Tariff', constraint: 'Temp >= 52°C', priority: 'P2' },
    { asset: 'Community Water Pump', type: 'Inductive', kw: '1.2 kW', kwh: '2.4 kWh', resp: '5 min', dur: '120 mins', avail: 'Available', consent: 'Municipal SLA', constraint: 'OHT Level > 60%', priority: 'P3' },
    { asset: 'Small Industry (Cold Buffer)', type: 'Industrial', kw: '3.5 kW', kwh: '4.8 kWh', resp: '5 min', dur: '30 mins', avail: 'Scheduled', consent: 'ESCO Contract', constraint: 'Temp <= -16°C', priority: 'P5' },
    { asset: 'Commercial HVAC Setpoint', type: 'HVAC', kw: '2.8 kW', kwh: '3.5 kWh', resp: '3 min', dur: '40 mins', avail: 'Standby', consent: 'BTM Agreement', constraint: 'Max 1.5°C delta', priority: 'P2' },
    { asset: 'Rooftop Smart Inverter PV', type: 'Solar PV', kw: '12.0 kW (Curtail)', kwh: '-', resp: '< 5 sec', dur: 'Continuous', avail: 'Reserve Only', consent: 'Grid Code Clause 9', constraint: 'Last Resort', priority: 'P6' },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Distributed Energy Resources (DER) Registry
        </h2>
        <p className="text-xs text-slate-500">
          Continuous bottom-up inventory of flexible assets, customer constraints, and dispatch priorities across N-01.
        </p>
      </div>

      {/* Top Asset Category Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Rooftop Solar PV</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">100 kWp</div>
          <div className="text-xs text-slate-500 mt-1 flex justify-between">
            <span>Current: <strong>{sc.pv} kW</strong></span>
            <span>Forecast: <strong>91 kW</strong></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Community BESS</span>
            <BatteryCharging className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600">50 kW / 100 kWh</div>
          <div className="text-xs text-slate-500 mt-1 flex justify-between">
            <span>SOC: <strong>{sc.bessSoc}%</strong></span>
            <span>Available Flex: <strong>35 kW</strong></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">EV Smart Chargers</span>
            <Car className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600">10 Connected EVs</div>
          <div className="text-xs text-slate-500 mt-1 flex justify-between">
            <span>Current: <strong>{sc.evLoad} kW</strong></span>
            <span>Modulatable: <strong>8.0 kW</strong></span>
          </div>
        </div>
      </div>

      {/* Structured Resource Flexibility Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Live Flexibility Inventory & Customer Guardrails</h3>
            <p className="text-xs text-slate-500">Every resource registers dynamic response, state constraints, and consent state.</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold self-start sm:self-auto">
            Total Available Flex Pool: 18.4 kW
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Resource / Asset</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Available kW</th>
                <th className="py-3 px-3">Energy (kWh)</th>
                <th className="py-3 px-3">Response</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Consent Model</th>
                <th className="py-3 px-4">Customer Constraint</th>
                <th className="py-3 px-3">Dispatch Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {resourceRegistry.map((res, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-800 font-sans">{res.asset}</td>
                  <td className="py-3 px-3 text-slate-500">{res.type}</td>
                  <td className="py-3 px-3 font-bold text-blue-600">{res.kw}</td>
                  <td className="py-3 px-3 text-slate-700">{res.kwh}</td>
                  <td className="py-3 px-3 text-slate-700">{res.resp}</td>
                  <td className="py-3 px-3 text-slate-700">{res.dur}</td>
                  <td className="py-3 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans">
                      {res.avail}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-sans">{res.consent}</td>
                  <td className="py-3 px-4 text-slate-600 font-sans">{res.constraint}</td>
                  <td className="py-3 px-3 font-bold text-slate-700">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      res.priority === 'P1' ? 'bg-blue-100 text-blue-800' :
                      res.priority === 'P2' ? 'bg-indigo-100 text-indigo-800' :
                      res.priority === 'P4' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {res.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FlexibilityEngineView({ sc }) {
  const flexHeadroom = (sc.availableFlex - sc.requiredFlex).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Flexibility Orchestration Engine
        </h2>
        <p className="text-xs text-slate-500">
          The core closed-loop engine matching instantaneous grid flexibility need against least-disruptive distributed capacity.
        </p>
      </div>

      {/* Top Three Giant Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Required Flexibility</div>
          <div className="text-3xl font-black font-mono text-blue-600 mt-2">{sc.requiredFlex} kW</div>
          <div className="text-xs text-slate-500 mt-1">Calculated net-load shortfall / surge</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Flexibility</div>
          <div className="text-3xl font-black font-mono text-emerald-600 mt-2">{sc.availableFlex} kW</div>
          <div className="text-xs text-slate-500 mt-1">Verified online capacity under consent</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flexibility Gap</div>
          <div className="text-3xl font-black font-mono text-slate-800 mt-2">0.0 kW</div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">✓ Completely covered</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Reserve Headroom</div>
          <div className="text-3xl font-black font-mono text-indigo-600 mt-2">+{flexHeadroom} kW</div>
          <div className="text-xs text-slate-500 mt-1">Buffer remaining for secondary swings</div>
        </div>
      </div>

      {/* Visual Capacity Horizontal Progress Comparison */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-bold text-sm text-slate-900 mb-1">Flexibility Balance Bar</h3>
        <p className="text-xs text-slate-500 mb-5">Horizontal capacity representation of instantaneous grid absorption.</p>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-mono mb-1 font-semibold">
              <span className="text-blue-700">Required Flexibility: {sc.requiredFlex} kW</span>
              <span className="text-slate-400">Target Envelope</span>
            </div>
            <div className="w-full bg-slate-100 rounded-lg h-5 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-lg" style={{ width: `${(sc.requiredFlex / 25) * 100}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1 font-semibold">
              <span className="text-emerald-700">Available Flexibility Pool: {sc.availableFlex} kW</span>
              <span className="text-emerald-600 font-bold">100% Demand Solved</span>
            </div>
            <div className="w-full bg-slate-100 rounded-lg h-5 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-lg" style={{ width: `${(sc.availableFlex / 25) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch Logic Rationale: "Why These Resources?" */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">
            Dispatch Hierarchy: Least-Disruption, Least-Cost Prioritization
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            <strong>The battery is NOT automatically the first resource.</strong> GridFlex prioritizes low-impact thermal deferral and smart EV modulation before cycling electrochemistry.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              rank: 1,
              name: 'EV Smart Throttling (OcPP 2.0.1)',
              dispatch: '4.0 kW',
              resp: '1 min',
              impact: 'LOW',
              impactBg: 'bg-emerald-100 text-emerald-800',
              rationale: 'Slows charging speed by 30% for 35 mins without affecting 07:30 AM departure SOC goal.'
            },
            {
              rank: 2,
              name: 'Smart Residential Water Heating',
              dispatch: '2.0 kW',
              resp: '2 min',
              impact: 'LOW',
              impactBg: 'bg-emerald-100 text-emerald-800',
              rationale: 'Capitalizes on water thermal inertia. Temperature drops < 0.8°C, invisible to resident.'
            },
            {
              rank: 3,
              name: 'Community Water Pump Deferral',
              dispatch: '1.2 kW',
              resp: '5 min',
              impact: 'LOW',
              impactBg: 'bg-emerald-100 text-emerald-800',
              rationale: 'Overhead tank level at 82%. Pumping scheduled back once solar generation recovers.'
            },
            {
              rank: 4,
              name: 'Shared Community BESS Discharge',
              dispatch: '7.0 kW',
              resp: '< 1 sec',
              impact: 'NONE (Hardware Degr. Cost)',
              impactBg: 'bg-blue-100 text-blue-800',
              rationale: 'Bridges instantaneous transient edge while flexible loads ramp up to steady-state.'
            },
            {
              rank: 5,
              name: 'Small Industry Compressor Shift',
              dispatch: '3.5 kW',
              resp: '5 min',
              impact: 'MEDIUM (Paid Incentive)',
              impactBg: 'bg-amber-100 text-amber-800',
              rationale: 'Only invoked during severe or prolonged deficit conditions with contractual compensation.'
            }
          ].map((item) => (
            <div key={item.rank} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {item.rank}
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">{item.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.rationale}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono self-end md:self-auto flex-shrink-0">
                <span className="text-slate-600">Dispatched: <strong className="text-blue-600">{item.dispatch}</strong></span>
                <span className="text-slate-600">Resp: <strong>{item.resp}</strong></span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${item.impactBg}`}>
                  {item.impact}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventSimulatorView({ sc, currentScenario, simStep, isSimulating, triggerSimulation, resetSimulation }) {
  const steps = [
    { title: 'Step 1: Cloud Ramp Detected', desc: 'Solar PV drops abruptly from 92 kW to 38 kW (-54 kW swing)', badge: 'PV Swing' },
    { title: 'Step 2: Net-Load Ramp Detected', desc: 'Transformer net loading spikes toward limit; required flex calculated at 14.2 kW', badge: 'Risk Check' },
    { title: 'Step 3: Flexibility Gap Analysis', desc: 'Discovered verified online pool of 18.4 kW. Gap resolved to 0.0 kW', badge: 'Gap = 0' },
    { title: 'Step 4: Least-Cost Multi-Asset Dispatch', desc: 'EV throttling (-4kW) + Geyser (-2kW) + Pump (-1.2kW) + BESS (-7kW)', badge: 'Dispatch' },
    { title: 'Step 5: Grid Equilibrium Stabilized', desc: 'Transformer loading preserved at 48.9%, voltage held steady at 418.2 V', badge: 'Closed Loop' }
  ];

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Interactive Closed-Loop Event Simulator
        </h2>
        <p className="text-xs text-slate-500">
          Simulate high-probability distribution grid disruptions and observe real-time automated orchestration.
        </p>
      </div>

      {/* Scenario Trigger Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'CLOUD_RAMP', name: 'Simulate Cloud Ramp', sub: 'PV drops 92kW → 38kW', icon: CloudSun, color: 'border-amber-400 bg-amber-50 text-amber-800' },
          { id: 'PV_SURGE', name: 'Simulate Solar Surge', sub: 'Reverse flow & Overvoltage', icon: Sun, color: 'border-blue-400 bg-blue-50 text-blue-800' },
          { id: 'EVENING_PEAK', name: 'Simulate Evening Peak', sub: 'Zero PV + 142kW Demand', icon: Activity, color: 'border-indigo-400 bg-indigo-50 text-indigo-800' },
          { id: 'NORMAL', name: 'Reset to Baseline', sub: 'Normal operating band', icon: RotateCcw, color: 'border-slate-300 bg-white text-slate-700' }
        ].map(item => {
          const Icon = item.icon;
          const isSelected = currentScenario === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'NORMAL') {
                  resetSimulation();
                } else {
                  triggerSimulation(item.id);
                }
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected ? 'ring-2 ring-blue-500 shadow-xs' : 'hover:border-slate-300'
              } ${item.color}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">{item.name}</span>
                <Icon className="w-4 h-4 opacity-80" />
              </div>
              <div className="text-[10px] opacity-80">{item.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Step by Step Execution Timeline */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Automated Mitigation Pipeline (15-Second Cycle)</h3>
            <p className="text-xs text-slate-500">Real-time closed-loop progression during active scenario event.</p>
          </div>
          {isSimulating && (
            <span className="text-xs font-mono text-blue-600 animate-pulse font-bold flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Executing Closed Loop...
            </span>
          )}
        </div>

        <div className="space-y-4 relative">
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200"></div>

          {steps.map((st, idx) => {
            const isCompleted = simStep > idx + 1 || (simStep === 0 && currentScenario === 'NORMAL');
            const isCurrent = simStep === idx + 1;
            return (
              <div key={idx} className="relative flex items-start gap-4 pl-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold z-10 ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <div className={`flex-1 p-3.5 rounded-lg border ${
                  isCurrent ? 'bg-blue-50/60 border-blue-200 shadow-2xs' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-xs text-slate-900">{st.title}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                      {st.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{st.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verified Success State Result */}
      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-wide">
              Closed-Loop Reliability Verification Succeeded
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-emerald-800 mt-1 font-mono">
              <span>✓ Ramp Absorbed</span>
              <span>✓ Zero Outage Trips</span>
              <span>✓ Voltage in Limits (418V)</span>
              <span>✓ Gap Closed to 0 kW</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => triggerSimulation('CLOUD_RAMP')}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded shadow-2xs transition-colors self-start sm:self-auto"
        >
          Re-run Event
        </button>
      </div>
    </div>
  );
}

function DiscomCommandCentreView({ sc }) {
  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          DISCOM Flexibility Command Centre
        </h2>
        <p className="text-xs text-slate-500">
          Supervisory fleet view across 24 distribution transformers in urban Bengaluru (BESCOM division proxy).
        </p>
      </div>

      {/* System Fleet KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Neighbourhoods Monitored', val: '24', sub: '11 kV urban feeders' },
          { label: 'Total Available Flex', val: '312 kW', sub: 'Pool across all feeders' },
          { label: 'Total Required Flex', val: '247 kW', sub: 'Current net demand' },
          { label: 'Feeders at Risk', val: '2', sub: 'N-02 & N-06 under watch', alert: true },
          { label: 'Active Control Events', val: '1', sub: 'N-01 cloud ramp ongoing' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider truncate">{kpi.label}</div>
            <div className={`text-xl font-bold font-mono mt-1 ${kpi.alert ? 'text-amber-600' : 'text-slate-900'}`}>{kpi.val}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Schematic Network Map (No External Map API Dependencies) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">City Distribution Cluster Schematic Topology</h3>
            <p className="text-xs text-slate-500">Logical connectivity to 33/11 kV Grid Master Substation.</p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">DISCOM SCADA Link Active</span>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-around gap-4 min-h-[140px]">
          <div className="p-3 bg-white rounded-lg border border-slate-300 text-center shadow-2xs">
            <Building2 className="w-6 h-6 mx-auto text-blue-600 mb-1" />
            <div className="font-bold text-xs text-slate-800">Master Substation</div>
            <div className="text-[10px] text-slate-400 font-mono">66/11 kV Hub</div>
          </div>

          <div className="hidden md:flex flex-1 items-center justify-center relative">
            <div className="h-0.5 w-full bg-slate-300"></div>
            <span className="absolute bg-white px-2 text-[10px] font-mono text-slate-400 border border-slate-200 rounded">
              11 kV Primary Backbone (F-01 to F-06)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-bold">
              Zone 1 (South): Stable
            </div>
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 font-bold">
              Zone 2 (East): 1 Watch
            </div>
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-bold">
              Zone 3 (Central): Stable
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Neighbourhood Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DISCOM_NEIGHBOURHOODS.map(nh => {
          const isCurrent = nh.id === 'N-01';
          return (
            <div
              key={nh.id}
              className={`p-4 rounded-xl border bg-white shadow-2xs transition-all ${
                isCurrent ? 'ring-2 ring-blue-500 border-blue-300' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <div>
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    {nh.id}: {nh.name}
                    {isCurrent && <span className="text-[9px] bg-blue-600 text-white font-mono px-1 rounded">Active</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">{nh.pvh} kWp Solar | {nh.evs} EVs</div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  nh.status === 'NORMAL' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {nh.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Available Flex:</span>
                  <strong className="text-emerald-600">{nh.flexAvail} kW</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Required Flex:</span>
                  <strong className="text-blue-600">{nh.flexReq} kW</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Flex Gap:</span>
                  <strong className={nh.gap > 0 ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                    {nh.gap} kW
                  </strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500">Tx Loading:</span>
                  <span className="text-slate-700">{nh.txLoad}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReliabilityImpactView() {
  const compData = [
    { metric: 'Availability', b0: '99.31%', b1: '99.70%', gain: '+0.39%' },
    { metric: 'Energy Not Served (ENS)', b0: '3,000 kWh/yr', b1: '1,300 kWh/yr', gain: '-56.7%' },
    { metric: 'Renewable Energy Lost', b0: '945 kWh', b1: '390 kWh', gain: '-58.7%' },
    { metric: 'Peak Net-Load Ramp', b0: '128 kW', b1: '82 kW', gain: '-35.9%' },
    { metric: 'Flexibility Gap Events', b0: '18 / yr', b1: '6 / yr', gain: '-66.7%' },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Reliability Benchmark: Synthetic Baseline (B0) vs GridFlex (B1)
        </h2>
        <p className="text-xs text-slate-500">
          Quantifiable reliability enhancements evaluated under identical intermittent weather events and random seeds.
        </p>
      </div>

      {/* Mandatory Illustrative Disclaimer Box */}
      <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
        <strong>Methodology Note (Illustrative Simulation Results):</strong> GridFlex impact is evaluated against the same synthetic baseline scenarios using identical random seeds. Values are illustrative and intended to demonstrate the evaluation methodology; real deployment requires calibration with DISCOM feeder, outage, AMI and DER data.
      </div>

      {/* Comparative Metrics Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 font-mono text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Reliability & Grid Metric</th>
              <th className="py-3 px-4">B0 — Uncoordinated Baseline</th>
              <th className="py-3 px-4 text-blue-700">GridFlex B1 — Orchestrated</th>
              <th className="py-3 px-4 text-emerald-700">Net Improvement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {compData.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-800">{row.metric}</td>
                <td className="py-3 px-4 text-slate-500">{row.b0}</td>
                <td className="py-3 px-4 font-bold text-blue-600">{row.b1}</td>
                <td className="py-3 px-4 font-bold text-emerald-600">{row.gain}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Side-by-Side Visual Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h4 className="font-bold text-sm text-slate-900 mb-2">Energy Not Served (ENS) Reduction</h4>
          <p className="text-xs text-slate-500 mb-4">Unserved kWh due to localized feeder trips and solar ramp disconnects.</p>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span>B0 Baseline: 3,000 kWh/yr</span>
                <span className="text-slate-400">100%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div className="bg-slate-400 h-3 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 text-emerald-700 font-bold">
                <span>GridFlex B1: 1,300 kWh/yr</span>
                <span>-56.7% Improvement</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '43.3%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h4 className="font-bold text-sm text-slate-900 mb-2">Renewable Energy Lost / Curtailed</h4>
          <p className="text-xs text-slate-500 mb-4">Clean solar generation lost during uncoordinated over-voltage curtailment.</p>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span>B0 Baseline: 945 kWh</span>
                <span className="text-slate-400">100%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div className="bg-slate-400 h-3 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 text-blue-700 font-bold">
                <span>GridFlex B1: 390 kWh</span>
                <span>-58.7% Curtailment Avoided</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: '41.3%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The Closed-Loop Reliability Cycle */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <h4 className="font-bold text-sm text-slate-900 mb-4">The Continuous Reliability Loop</h4>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700">
          <div className="px-3 py-2 bg-slate-100 rounded border border-slate-200">1. Forecast</div>
          <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
          <div className="px-3 py-2 bg-amber-50 rounded border border-amber-200 text-amber-800">2. Risk Detection</div>
          <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
          <div className="px-3 py-2 bg-blue-50 rounded border border-blue-200 text-blue-800">3. Flexibility Gap</div>
          <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
          <div className="px-3 py-2 bg-indigo-50 rounded border border-indigo-200 text-indigo-800">4. Dispatch</div>
          <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
          <div className="px-3 py-2 bg-cyan-50 rounded border border-cyan-200 text-cyan-800">5. Verification</div>
          <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />
          <div className="px-3 py-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-800">6. Reliability Gain</div>
        </div>
      </div>
    </div>
  );
}

function EconomicsDeploymentView() {
  const ownershipMatrix = [
    { comp: 'Shared Community BESS (50kW/100kWh)', owner: 'DISCOM / ESCO', operator: 'ESCO Aggregator', oAndM: 'Battery Cell Warranty & Routine Inverter O&M' },
    { comp: 'Smart Meters / Edge Gateway', owner: 'DISCOM (RDSS)', operator: 'DISCOM AMI Dept', oAndM: 'Field Meter Testing & Firmware Patching' },
    { comp: 'GridFlex Orchestration SaaS Platform', owner: 'ESCO / Software Vendor', operator: 'GridFlex Operations', oAndM: 'Continuous Model Training & Cloud SLA' },
    { comp: 'Flexible Smart Loads (Geysers/EVSE)', owner: 'Consumer / Prosumer', operator: 'Consumer (Auto-Consent)', oAndM: 'Consumer OEM Warranty + Aggregator Telemetry' }
  ];

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Economics & Indian DISCOM Deployment Model
        </h2>
        <p className="text-xs text-slate-500">
          Affordable, non-asset-heavy rollout model tailored for Indian state distribution utilities (All figures in ₹ Indian Rupees).
        </p>
      </div>

      {/* Illustrative Disclaimer Notice */}
      <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono">
        <strong>NOTE:</strong> ALL FIGURES ARE ILLUSTRATIVE BENCHMARKS — NOT BINDING VENDOR PRICING.
      </div>

      {/* Financial KPIs in ₹ Lakhs & ₹ Crores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs uppercase font-mono font-semibold text-slate-400">Total Pilot CAPEX</div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-2">₹35.3 Lakh</div>
          <div className="text-xs text-slate-500 mt-1">Includes 100kWh BESS + Edge gateways</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs uppercase font-mono font-semibold text-slate-400">Annual O&M / SaaS</div>
          <div className="text-2xl font-black font-mono text-blue-600 mt-2">₹6.8 Lakh / yr</div>
          <div className="text-xs text-slate-500 mt-1">Platform operations, updates & field check</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs uppercase font-mono font-semibold text-slate-400">Enrolled Households</div>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-2">220 Homes</div>
          <div className="text-xs text-slate-500 mt-1">100 kWp rooftop solar, 10 EVs</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs uppercase font-mono font-semibold text-slate-400">Service Cost Proxy</div>
          <div className="text-2xl font-black font-mono text-indigo-600 mt-2">₹257 / home / mo</div>
          <div className="text-xs text-slate-500 mt-1">Funded via deferred DT augmentation savings</div>
        </div>
      </div>

      {/* Tripartite Deployment Ecosystem Model */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold uppercase text-blue-600 mb-1">Role 01</div>
            <h4 className="font-bold text-sm text-slate-900">DISCOM (Distribution Co.)</h4>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Provides supervisory access to 11kV / 415V distribution grid telemetry. Approves flexibility dispatch envelope and validates reliability gains against regulatory norms (SERC).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Benefit: Defers ₹1.2 Crore substation transformer upgrades.
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold uppercase text-emerald-600 mb-1">Role 02</div>
            <h4 className="font-bold text-sm text-slate-900">ESCO / Aggregator</h4>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Deploys and operates the GridFlex software platform. Aggregates consumer flexibility, manages local storage O&M, and guarantees feeder SLA performance to the DISCOM.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Benefit: Monetizes flexibility pool via performance incentives.
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono font-bold uppercase text-indigo-600 mb-1">Role 03</div>
            <h4 className="font-bold text-sm text-slate-900">Consumers / Prosumers</h4>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Provide flexible demand (water heating, EV charging pauses) under strict opt-in consent. Maintain override control through a smartphone app at all times.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Benefit: Receive ₹120 - ₹350/mo bill rebates for participation.
          </div>
        </div>
      </div>

      {/* Institutional Ownership & Maintenance Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h4 className="font-bold text-sm text-slate-900">Operational Ownership & Maintenance Matrix</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-mono text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4">Asset Owner</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Maintenance Responsibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {ownershipMatrix.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-sans font-semibold text-slate-800">{item.comp}</td>
                  <td className="py-3 px-4 text-slate-700">{item.owner}</td>
                  <td className="py-3 px-4 text-blue-600 font-semibold">{item.operator}</td>
                  <td className="py-3 px-4 font-sans text-slate-600">{item.oAndM}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ArchitectureEcosystemView() {
  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Schneider Electric Ecosystem Integration & Privacy Architecture
        </h2>
        <p className="text-xs text-slate-500">
          Architectural placement of GridFlex as an interoperable edge orchestration layer respecting customer privacy.
        </p>
      </div>

      {/* Ecosystem Positioning Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3 border border-blue-200">
          Strategic Interoperability
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Designed to Integrate with Existing Utility-Grade Distribution Ecosystems
        </h3>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          <strong>GridFlex does not replace Schneider Electric distribution products.</strong> Rather, GridFlex acts as a high-resolution, neighbourhood-scale flexibility orchestration layer that feeds actionable edge intelligence directly into existing utility platforms.
        </p>

        {/* Integration Stack Diagram */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-bold text-xs text-slate-800">EcoStruxure™ ADMS</div>
            <div className="text-[11px] text-slate-500 mt-1">Wide-area distribution management, SCADA & fault localization</div>
          </div>
          <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-50/50 shadow-xs">
            <div className="font-bold text-xs text-blue-800">GRIDFLEX (Neighbourhood Layer)</div>
            <div className="text-[11px] text-blue-700 mt-1">15-sec closed-loop gap detection & distributed DER dispatch</div>
          </div>
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
            <div className="font-bold text-xs text-slate-800">EcoStruxure™ DERMS / RTU</div>
            <div className="text-[11px] text-slate-500 mt-1">Feeder automation, power quality meters & substation RTUs</div>
          </div>
        </div>
      </div>

      {/* AI vs Deterministic Grid Optimization Demystified */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-2">
            <Cpu className="w-4 h-4" /> AI-Assisted Forecasting & Pattern Detection
          </div>
          <p className="text-xs text-slate-500 mb-3">Probabilistic edge intelligence handling variable inputs.</p>
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Ultra-short-term (15-min) rooftop solar irradiance prediction
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Non-intrusive EV departure time probability modeling
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Household net-demand ramp anomaly detection
            </li>
          </ul>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-2">
            <ShieldCheck className="w-4 h-4" /> Deterministic Grid-Aware Optimization
          </div>
          <p className="text-xs text-slate-500 mb-3">Hard electrical engineering boundaries that AI cannot violate.</p>
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Transformer 315 kVA thermal limit enforcement
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Voltage bounds compliance (nominal 415 V ±6%)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Strict customer consent rules (e.g. Min 80% EV SOC by 07:00)
            </li>
          </ul>
        </div>
      </div>

      {/* Customer First Privacy & Consent Controls */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
          <Lock className="w-4 h-4" /> Customer First: Privacy & Opt-In Governance
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          GridFlex never takes direct autonomous control of domestic consumer appliances without authenticated opt-in parameters. All consumer endpoints retain explicit override control via mobile interface.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-bold">AVAILABLE</div>
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 font-bold">PAUSED</div>
          <div className="p-2 bg-slate-100 border border-slate-300 rounded text-slate-700 font-bold">OPTED OUT</div>
          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 font-bold">UNAVAILABLE</div>
          <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 font-bold">FAULT ISOLATED</div>
        </div>
      </div>
    </div>
  );
}