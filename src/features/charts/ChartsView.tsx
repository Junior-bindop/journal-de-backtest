import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Filter, TrendingUp, BarChart2, PieChart, Calendar } from 'lucide-react';
import type { Trade } from '@/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartsViewProps {
  trades: Trade[];
}

export const ChartsView: React.FC<ChartsViewProps> = ({ trades }) => {
  // Chart filters
  const [selectedAsset, setSelectedAsset] = useState<string>('ALL');
  const [selectedSession, setSelectedSession] = useState<string>('ALL');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Extract unique filters
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    trades.forEach(t => {
      if (t.date) years.add(t.date.split('-')[0]);
    });
    return Array.from(years).sort().reverse();
  }, [trades]);

  const availableAssets = useMemo(() => {
    const assets = new Set<string>();
    trades.forEach(t => {
      if (t.asset) assets.add(t.asset);
    });
    return Array.from(assets).sort();
  }, [trades]);

  const availableSessions = useMemo(() => {
    const sessions = new Set<string>();
    trades.forEach(t => {
      if (t.session) sessions.add(t.session);
    });
    return Array.from(sessions).sort();
  }, [trades]);

  // Filtered trades
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (t.deleted_at) return false;
      if (selectedAsset !== 'ALL' && t.asset !== selectedAsset) return false;
      if (selectedSession !== 'ALL' && t.session !== selectedSession) return false;
      if (selectedPosition !== 'ALL' && t.position !== selectedPosition) return false;
      if (selectedYear !== 'ALL' && !t.date?.startsWith(selectedYear)) return false;
      return true;
    });
  }, [trades, selectedAsset, selectedSession, selectedPosition, selectedYear]);

  // Chronologically sorted for time-series charts
  const sortedTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => {
      const c = a.date.localeCompare(b.date);
      if (c !== 0) return c;
      return a.trade_number - b.trade_number;
    });
  }, [filteredTrades]);

  // 1. Equity Curve Data (Evolution cumulative du R)
  const equityData = useMemo(() => {
    let runningR = 0;
    const labels: string[] = ['Départ'];
    const dataPoints: number[] = [0];

    sortedTrades.forEach((t) => {
      runningR += Number(t.rr) || 0;
      labels.push(`#${t.trade_number} (${t.date})`);
      dataPoints.push(Number(runningR.toFixed(2)));
    });

    return {
      labels,
      datasets: [
        {
          label: 'Equity Curve (R)',
          data: dataPoints,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.2,
          pointRadius: sortedTrades.length > 50 ? 0 : 3,
        },
      ],
    };
  }, [sortedTrades]);

  // 2. Drawdown Curve Data
  const drawdownData = useMemo(() => {
    let runningR = 0;
    let peakR = 0;
    const labels: string[] = ['Départ'];
    const ddPoints: number[] = [0];

    sortedTrades.forEach((t) => {
      runningR += Number(t.rr) || 0;
      if (runningR > peakR) peakR = runningR;
      const dd = peakR - runningR;
      labels.push(`#${t.trade_number}`);
      ddPoints.push(Number((-dd).toFixed(2)));
    });

    return {
      labels,
      datasets: [
        {
          label: 'Drawdown (R)',
          data: ddPoints,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          fill: true,
          tension: 0.2,
          pointRadius: 0,
        },
      ],
    };
  }, [sortedTrades]);

  // 3. Result Distribution (TP / SL / BE)
  const resultDistributionData = useMemo(() => {
    let tp = 0;
    let sl = 0;
    let be = 0;

    filteredTrades.forEach((t) => {
      if (t.result === 'TP') tp++;
      else if (t.result === 'SL') sl++;
      else if (t.result === 'BE') be++;
    });

    return {
      labels: ['TP (Gains)', 'SL (Pertes)', 'BE (Neutre)'],
      datasets: [
        {
          data: [tp, sl, be],
          backgroundColor: ['#10b981', '#ef4444', '#6b7280'],
          borderWidth: 0,
        },
      ],
    };
  }, [filteredTrades]);

  // 4. Distribution des RR
  const rrDistributionData = useMemo(() => {
    const bins = {
      'SL (-1R)': 0,
      'BE (0R)': 0,
      '0 < R <= 1': 0,
      '1 < R <= 2': 0,
      '2 < R <= 3': 0,
      'R > 3': 0,
    };

    filteredTrades.forEach((t) => {
      const rr = Number(t.rr) || 0;
      if (t.result === 'SL' || rr <= -1) bins['SL (-1R)']++;
      else if (t.result === 'BE' || rr === 0) bins['BE (0R)']++;
      else if (rr > 0 && rr <= 1) bins['0 < R <= 1']++;
      else if (rr > 1 && rr <= 2) bins['1 < R <= 2']++;
      else if (rr > 2 && rr <= 3) bins['2 < R <= 3']++;
      else if (rr > 3) bins['R > 3']++;
    });

    return {
      labels: Object.keys(bins),
      datasets: [
        {
          label: 'Nombre de trades',
          data: Object.values(bins),
          backgroundColor: ['#ef4444', '#6b7280', '#3b82f6', '#10b981', '#059669', '#047857'],
          borderRadius: 6,
        },
      ],
    };
  }, [filteredTrades]);

  // 5. Monthly & Yearly Performance
  const monthlyPerfData = useMemo(() => {
    const monthsMap: Record<string, number> = {};
    filteredTrades.forEach((t) => {
      if (t.date) {
        const ym = t.date.slice(0, 7); // YYYY-MM
        monthsMap[ym] = (monthsMap[ym] || 0) + (Number(t.rr) || 0);
      }
    });

    const sortedMonths = Object.keys(monthsMap).sort();
    const data = sortedMonths.map(m => Number(monthsMap[m].toFixed(2)));

    return {
      labels: sortedMonths,
      datasets: [
        {
          label: 'Performance Mensuelle (R)',
          data,
          backgroundColor: data.map(v => v >= 0 ? '#10b981' : '#ef4444'),
          borderRadius: 4,
        },
      ],
    };
  }, [filteredTrades]);

  // 6. Day of Week Performance (Lundi -> Vendredi)
  const dayOfWeekData = useMemo(() => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const rByDay = [0, 0, 0, 0, 0, 0, 0];

    filteredTrades.forEach((t) => {
      if (t.date) {
        const d = new Date(t.date).getDay();
        rByDay[d] += Number(t.rr) || 0;
      }
    });

    // Trading days Mon-Fri
    const tradingDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const data = [rByDay[1], rByDay[2], rByDay[3], rByDay[4], rByDay[5]].map(v => Number(v.toFixed(2)));

    return {
      labels: tradingDays,
      datasets: [
        {
          label: 'Performance par jour (R)',
          data,
          backgroundColor: data.map(v => v >= 0 ? '#3b82f6' : '#f87171'),
          borderRadius: 6,
        },
      ],
    };
  }, [filteredTrades]);

  // 7. Performance by Session
  const sessionPerfData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTrades.forEach((t) => {
      if (t.session) {
        map[t.session] = (map[t.session] || 0) + (Number(t.rr) || 0);
      }
    });

    const labels = Object.keys(map);
    const data = labels.map(l => Number(map[l].toFixed(2)));

    return {
      labels,
      datasets: [
        {
          label: 'R par Session',
          data,
          backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b'],
          borderRadius: 6,
        },
      ],
    };
  }, [filteredTrades]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Chart Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-emerald-500" />
          <span>Filtres Graphiques :</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2.5 py-1 text-xs bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 font-medium"
          >
            <option value="ALL">Toutes les années</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Asset selector */}
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="px-2.5 py-1 text-xs bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 font-medium"
          >
            <option value="ALL">Tous les actifs</option>
            {availableAssets.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Session selector */}
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="px-2.5 py-1 text-xs bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 font-medium"
          >
            <option value="ALL">Toutes les sessions</option>
            {availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Position selector */}
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="px-2.5 py-1 text-xs bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 font-medium"
          >
            <option value="ALL">BUY & SELL</option>
            <option value="BUY">BUY uniquement</option>
            <option value="SELL">SELL uniquement</option>
          </select>
        </div>
      </div>

      {/* Main Equity Curve */}
      <div className="p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Equity Curve — Évolution Cumulative du R
            </h3>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {sortedTrades.length} trades tracés
          </span>
        </div>
        <div className="h-72">
          <Line
            data={equityData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false },
              },
              scales: {
                x: { display: sortedTrades.length < 30, grid: { display: false } },
                y: { grid: { color: 'rgba(156, 163, 175, 0.1)' } },
              },
            }}
          />
        </div>
      </div>

      {/* Drawdown Curve */}
      <div className="p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Courbe de Drawdown (Pertes depuis le sommet)
          </h3>
        </div>
        <div className="h-48">
          <Line
            data={drawdownData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { display: false },
                y: { grid: { color: 'rgba(239, 68, 68, 0.1)' } },
              },
            }}
          />
        </div>
      </div>

      {/* Grid of Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* TP / SL / BE Donut */}
        <div className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center space-x-1.5">
            <PieChart className="w-4 h-4 text-emerald-500" />
            <span>Répartition TP / SL / BE</span>
          </h4>
          <div className="h-56 flex items-center justify-center">
            <Doughnut
              data={resultDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
              }}
            />
          </div>
        </div>

        {/* RR Distribution */}
        <div className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center space-x-1.5">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            <span>Distribution des R</span>
          </h4>
          <div className="h-56">
            <Bar
              data={rrDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: 'rgba(156, 163, 175, 0.1)' } },
                },
              }}
            />
          </div>
        </div>

        {/* Day of Week Performance */}
        <div className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-purple-500" />
            <span>Performance par Jour</span>
          </h4>
          <div className="h-56">
            <Bar
              data={dayOfWeekData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: 'rgba(156, 163, 175, 0.1)' } },
                },
              }}
            />
          </div>
        </div>

        {/* Session Performance */}
        <div className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs md:col-span-2 lg:col-span-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            Performance Mensuelle Historique (R)
          </h4>
          <div className="h-56">
            <Bar
              data={monthlyPerfData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: 'rgba(156, 163, 175, 0.1)' } },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
