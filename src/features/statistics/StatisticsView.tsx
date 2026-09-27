import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  Zap,
  Target,
  Clock,
  Percent,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Calendar,
  Filter,
} from 'lucide-react';
import { calculateTradeStats, formatR } from '@/utils/statistics';
import type { Trade } from '@/types';

interface StatisticsViewProps {
  trades: Trade[];
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({ trades }) => {
  // Filter state for statistics
  const [selectedAsset, setSelectedAsset] = useState<string>('ALL');
  const [selectedSession, setSelectedSession] = useState<string>('ALL');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Extract unique available values
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

  // Apply filters
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

  // Compute all 15+ metrics
  const stats = useMemo(() => calculateTradeStats(filteredTrades), [filteredTrades]);

  // Breakdowns
  const assetBreakdown = useMemo(() => {
    const map: Record<string, { total: number; tp: number; sl: number; be: number; r: number }> = {};
    for (const t of filteredTrades) {
      if (!map[t.asset]) map[t.asset] = { total: 0, tp: 0, sl: 0, be: 0, r: 0 };
      map[t.asset].total++;
      if (t.result === 'TP') map[t.asset].tp++;
      if (t.result === 'SL') map[t.asset].sl++;
      if (t.result === 'BE') map[t.asset].be++;
      map[t.asset].r += Number(t.rr) || 0;
    }
    return Object.entries(map).map(([asset, data]) => ({
      asset,
      ...data,
      winrate: data.total > 0 ? (data.tp / data.total) * 100 : 0,
    }));
  }, [filteredTrades]);

  const sessionBreakdown = useMemo(() => {
    const map: Record<string, { total: number; tp: number; sl: number; be: number; r: number }> = {};
    for (const t of filteredTrades) {
      if (!map[t.session]) map[t.session] = { total: 0, tp: 0, sl: 0, be: 0, r: 0 };
      map[t.session].total++;
      if (t.result === 'TP') map[t.session].tp++;
      if (t.result === 'SL') map[t.session].sl++;
      if (t.result === 'BE') map[t.session].be++;
      map[t.session].r += Number(t.rr) || 0;
    }
    return Object.entries(map).map(([session, data]) => ({
      session,
      ...data,
      winrate: data.total > 0 ? (data.tp / data.total) * 100 : 0,
    }));
  }, [filteredTrades]);

  const positionBreakdown = useMemo(() => {
    const buyTrades = filteredTrades.filter(t => t.position === 'BUY');
    const sellTrades = filteredTrades.filter(t => t.position === 'SELL');
    return {
      buy: calculateTradeStats(buyTrades),
      sell: calculateTradeStats(sellTrades),
    };
  }, [filteredTrades]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Filter Bar for Stats (Section 31: Statistiques filtrables) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-emerald-500" />
          <span>Filtres Statistiques :</span>
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

          {/* Direction */}
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

      {/* Primary KPI Cards Grid (Section 30) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total R */}
        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Total R</span>
            <TrendingUp className={`w-4 h-4 ${stats.totalR >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono ${stats.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatR(stats.totalR)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Évolution cumulative</div>
        </div>

        {/* Winrate */}
        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Winrate</span>
            <Percent className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
            {stats.winrate}%
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            {stats.totalTP} TP / {stats.totalTrades} Trades
          </div>
        </div>

        {/* Profit Factor */}
        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Profit Factor</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
            {stats.profitFactor}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Gains R / Pertes R</div>
        </div>

        {/* Max Drawdown */}
        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Max Drawdown</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
            -{stats.maxDrawdownR.toFixed(2)}R
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Creux historique maximal</div>
        </div>

        {/* Expectancy */}
        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Espérance (Expectancy)</span>
            <Zap className="w-4 h-4 text-purple-500" />
          </div>
          <div className={`text-2xl font-bold font-mono ${stats.expectancy >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {stats.expectancy > 0 ? `+${stats.expectancy}` : stats.expectancy}R
          </div>
          <div className="text-[11px] text-gray-400 mt-1">R moyen par trade</div>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Trades Count */}
        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <span className="text-xs text-gray-500">Total Trades</span>
          <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white font-mono">{stats.totalTrades}</div>
          <div className="flex items-center space-x-2 text-[10px] mt-2 font-medium">
            <span className="text-emerald-500 font-bold">{stats.totalTP} TP</span>
            <span className="text-red-500 font-bold">{stats.totalSL} SL</span>
            <span className="text-gray-400 font-bold">{stats.totalBE} BE</span>
          </div>
        </div>

        {/* Average Win */}
        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <span className="text-xs text-gray-500">Gain Moyen (Avg Win)</span>
          <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 font-mono">
            +{stats.averageWinR}R
          </div>
          <div className="text-[11px] text-gray-400 mt-2">Moyenne des TP</div>
        </div>

        {/* Average Loss */}
        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <span className="text-xs text-gray-500">Perte Moyenne (Avg Loss)</span>
          <div className="text-xl font-bold mt-1 text-red-600 dark:text-red-400 font-mono">
            -{stats.averageLossR}R
          </div>
          <div className="text-[11px] text-gray-400 mt-2">Moyenne des SL</div>
        </div>

        {/* Streaks */}
        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <span className="text-xs text-gray-500">Séries Consécutives</span>
          <div className="flex items-center space-x-3 mt-1">
            <span className="text-sm font-bold text-emerald-600 font-mono">+{stats.maxWinningStreak} Win</span>
            <span className="text-sm font-bold text-red-600 font-mono">-{stats.maxLosingStreak} Loss</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-2">Max Winning / Losing streak</div>
        </div>

        {/* Retention Duration */}
        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <span className="text-xs text-gray-500">Durée Fréquente (Retention)</span>
          <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white font-mono">
            {stats.averageRetentionTime}
          </div>
          <div className="text-[11px] text-gray-400 mt-2">Mode de rétention</div>
        </div>
      </div>

      {/* Analytical Breakdown Tables (Section 32) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance by Asset */}
        <div className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
            <span>Analyse par Actif</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-400">
                  <th className="py-2">Actif</th>
                  <th className="py-2 text-center">Trades</th>
                  <th className="py-2 text-center">Winrate</th>
                  <th className="py-2 text-right">Total R</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {assetBreakdown.map((row) => (
                  <tr key={row.asset} className="hover:bg-gray-50 dark:hover:bg-[#202020]">
                    <td className="py-2 font-bold">{row.asset}</td>
                    <td className="py-2 text-center">{row.total}</td>
                    <td className="py-2 text-center font-mono">{row.winrate.toFixed(1)}%</td>
                    <td className={`py-2 text-right font-mono font-bold ${row.r >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatR(row.r)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance by Session */}
        <div className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
            <span>Analyse par Session</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-400">
                  <th className="py-2">Session</th>
                  <th className="py-2 text-center">Trades</th>
                  <th className="py-2 text-center">Winrate</th>
                  <th className="py-2 text-right">Total R</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sessionBreakdown.map((row) => (
                  <tr key={row.session} className="hover:bg-gray-50 dark:hover:bg-[#202020]">
                    <td className="py-2 font-bold">{row.session}</td>
                    <td className="py-2 text-center">{row.total}</td>
                    <td className="py-2 text-center font-mono">{row.winrate.toFixed(1)}%</td>
                    <td className={`py-2 text-right font-mono font-bold ${row.r >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatR(row.r)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BUY vs SELL Analysis */}
        <div className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
            <span>Direction : BUY vs SELL</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">Positions BUY</div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Trades :</span>
                  <span className="font-bold">{positionBreakdown.buy.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Winrate :</span>
                  <span className="font-bold">{positionBreakdown.buy.winrate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total R :</span>
                  <span className="font-bold text-emerald-600">{formatR(positionBreakdown.buy.totalR)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Profit Factor :</span>
                  <span className="font-bold">{positionBreakdown.buy.profitFactor}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <div className="font-bold text-red-600 dark:text-red-400 text-sm">Positions SELL</div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Trades :</span>
                  <span className="font-bold">{positionBreakdown.sell.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Winrate :</span>
                  <span className="font-bold">{positionBreakdown.sell.winrate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total R :</span>
                  <span className={`font-bold ${positionBreakdown.sell.totalR >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatR(positionBreakdown.sell.totalR)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Profit Factor :</span>
                  <span className="font-bold">{positionBreakdown.sell.profitFactor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
