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
  BarChart3,
  Columns,
} from 'lucide-react';
import { calculateTradeStats, formatR } from '@/utils/statistics';
import type { Trade, CustomColumn, TradeCustomValue, SelectOption } from '@/types';

interface StatisticsViewProps {
  trades: Trade[];
  customColumns: CustomColumn[];
  customValues: TradeCustomValue[];
  selectOptions: SelectOption[];
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({ trades, customColumns, customValues, selectOptions }) => {
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

      {/* ─── Dynamic Custom Column Statistics ───────────────────────── */}
      {customColumns.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 pt-2">
            <Columns className="w-5 h-5 text-purple-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Statistiques par colonnes personnalisées
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {customColumns.map(col => {
              // Get all values for this column, matched to filtered trades
              const filteredTradeIds = new Set(filteredTrades.map(t => t.id));
              const colValues = customValues.filter(
                cv => cv.column_id === col.id && filteredTradeIds.has(cv.trade_id)
              );

              // ── CHECKBOX column ──
              if (col.type === 'CHECKBOX') {
                const checked = colValues.filter(v => v.value_boolean === true).length;
                const unchecked = filteredTrades.length - checked;
                const checkedPct = filteredTrades.length > 0 ? ((checked / filteredTrades.length) * 100).toFixed(1) : '0.0';

                // Performance when checked vs unchecked
                const checkedTradeIds = new Set(colValues.filter(v => v.value_boolean === true).map(v => v.trade_id));
                const checkedTrades = filteredTrades.filter(t => checkedTradeIds.has(t.id));
                const uncheckedTrades = filteredTrades.filter(t => !checkedTradeIds.has(t.id));
                const checkedStats = calculateTradeStats(checkedTrades);
                const uncheckedStats = calculateTradeStats(uncheckedTrades);

                return (
                  <div key={col.id} className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-500" />
                      <span>{col.name}</span>
                      <span className="text-[10px] font-normal text-gray-400 ml-1">(Checkbox)</span>
                    </h3>

                    {/* Summary bar */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${checkedPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-emerald-600">{checkedPct}%</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">✓ Coché ({checked})</div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between"><span className="text-gray-500">Trades</span><span className="font-bold">{checkedStats.totalTrades}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Winrate</span><span className="font-bold">{checkedStats.winrate}%</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Total R</span><span className={`font-bold ${checkedStats.totalR >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatR(checkedStats.totalR)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Profit F.</span><span className="font-bold">{checkedStats.profitFactor}</span></div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <div className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">✗ Non coché ({unchecked})</div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between"><span className="text-gray-500">Trades</span><span className="font-bold">{uncheckedStats.totalTrades}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Winrate</span><span className="font-bold">{uncheckedStats.winrate}%</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Total R</span><span className={`font-bold ${uncheckedStats.totalR >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatR(uncheckedStats.totalR)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Profit F.</span><span className="font-bold">{uncheckedStats.profitFactor}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // ── SELECT column ──
              if (col.type === 'SELECT') {
                const colOpts = selectOptions.filter(o => o.column_id === col.id);
                const breakdown = colOpts.map(opt => {
                  const matchingTradeIds = new Set(
                    colValues.filter(v => v.value_text === opt.id).map(v => v.trade_id)
                  );
                  const matchTrades = filteredTrades.filter(t => matchingTradeIds.has(t.id));
                  const s = calculateTradeStats(matchTrades);
                  return { label: opt.label, color: opt.color, count: matchTrades.length, stats: s };
                }).filter(b => b.count > 0);

                if (breakdown.length === 0) return null;

                return (
                  <div key={col.id} className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      <span>{col.name}</span>
                      <span className="text-[10px] font-normal text-gray-400 ml-1">(Select)</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-400">
                            <th className="py-2">Valeur</th>
                            <th className="py-2 text-center">Trades</th>
                            <th className="py-2 text-center">Winrate</th>
                            <th className="py-2 text-center">Espérance</th>
                            <th className="py-2 text-right">Total R</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {breakdown.map(row => (
                            <tr key={row.label} className="hover:bg-gray-50 dark:hover:bg-[#202020]">
                              <td className="py-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: row.color }}>
                                  {row.label}
                                </span>
                              </td>
                              <td className="py-2 text-center font-mono">{row.count}</td>
                              <td className="py-2 text-center font-mono">{row.stats.winrate}%</td>
                              <td className={`py-2 text-center font-mono ${row.stats.expectancy >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {row.stats.expectancy > 0 ? '+' : ''}{row.stats.expectancy}R
                              </td>
                              <td className={`py-2 text-right font-mono font-bold ${row.stats.totalR >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {formatR(row.stats.totalR)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              // ── NUMBER column ──
              if (col.type === 'NUMBER') {
                const numValues = colValues
                  .filter(v => v.value_number != null)
                  .map(v => ({ tradeId: v.trade_id, num: Number(v.value_number) }));

                if (numValues.length === 0) return null;

                const nums = numValues.map(v => v.num);
                const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
                const min = Math.min(...nums);
                const max = Math.max(...nums);
                const median = (() => {
                  const sorted = [...nums].sort((a, b) => a - b);
                  const mid = Math.floor(sorted.length / 2);
                  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
                })();

                // Split into above/below median for performance comparison
                const aboveMedianIds = new Set(numValues.filter(v => v.num >= median).map(v => v.tradeId));
                const belowMedianIds = new Set(numValues.filter(v => v.num < median).map(v => v.tradeId));
                const aboveStats = calculateTradeStats(filteredTrades.filter(t => aboveMedianIds.has(t.id)));
                const belowStats = calculateTradeStats(filteredTrades.filter(t => belowMedianIds.has(t.id)));

                return (
                  <div key={col.id} className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                      <Target className="w-4 h-4 text-amber-500" />
                      <span>{col.name}</span>
                      <span className="text-[10px] font-normal text-gray-400 ml-1">(Nombre)</span>
                    </h3>

                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-50 dark:bg-[#151515] rounded-lg">
                        <div className="text-[10px] text-gray-400">Moyenne</div>
                        <div className="text-sm font-bold font-mono text-gray-900 dark:text-white">{avg.toFixed(2)}</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-[#151515] rounded-lg">
                        <div className="text-[10px] text-gray-400">Médiane</div>
                        <div className="text-sm font-bold font-mono text-gray-900 dark:text-white">{median.toFixed(2)}</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-[#151515] rounded-lg">
                        <div className="text-[10px] text-gray-400">Min</div>
                        <div className="text-sm font-bold font-mono text-blue-500">{min.toFixed(2)}</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-[#151515] rounded-lg">
                        <div className="text-[10px] text-gray-400">Max</div>
                        <div className="text-sm font-bold font-mono text-purple-500">{max.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">≥ Médiane ({aboveStats.totalTrades})</div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between"><span className="text-gray-500">Winrate</span><span className="font-bold">{aboveStats.winrate}%</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Total R</span><span className={`font-bold ${aboveStats.totalR >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatR(aboveStats.totalR)}</span></div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <div className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-2">&lt; Médiane ({belowStats.totalTrades})</div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between"><span className="text-gray-500">Winrate</span><span className="font-bold">{belowStats.winrate}%</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Total R</span><span className={`font-bold ${belowStats.totalR >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatR(belowStats.totalR)}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // ── TEXT column ──
              if (col.type === 'TEXT') {
                // Group by distinct text values
                const textMap: Record<string, string[]> = {};
                for (const cv of colValues) {
                  const txt = (cv.value_text || '').trim();
                  if (!txt) continue;
                  if (!textMap[txt]) textMap[txt] = [];
                  textMap[txt].push(cv.trade_id);
                }

                const textBreakdown = Object.entries(textMap)
                  .map(([label, tradeIds]) => {
                    const matchTrades = filteredTrades.filter(t => tradeIds.includes(t.id));
                    return { label, count: matchTrades.length, stats: calculateTradeStats(matchTrades) };
                  })
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10); // Top 10

                if (textBreakdown.length === 0) return null;

                return (
                  <div key={col.id} className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                      <Columns className="w-4 h-4 text-cyan-500" />
                      <span>{col.name}</span>
                      <span className="text-[10px] font-normal text-gray-400 ml-1">(Texte)</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-400">
                            <th className="py-2">Valeur</th>
                            <th className="py-2 text-center">Trades</th>
                            <th className="py-2 text-center">Winrate</th>
                            <th className="py-2 text-right">Total R</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {textBreakdown.map(row => (
                            <tr key={row.label} className="hover:bg-gray-50 dark:hover:bg-[#202020]">
                              <td className="py-2 font-bold truncate max-w-[150px]">{row.label}</td>
                              <td className="py-2 text-center font-mono">{row.count}</td>
                              <td className="py-2 text-center font-mono">{row.stats.winrate}%</td>
                              <td className={`py-2 text-right font-mono font-bold ${row.stats.totalR >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {formatR(row.stats.totalR)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              // ── DATE column ──
              if (col.type === 'DATE') {
                // Group by month
                const monthMap: Record<string, string[]> = {};
                for (const cv of colValues) {
                  const d = cv.value_date || cv.value_text || '';
                  if (!d) continue;
                  const month = d.substring(0, 7); // YYYY-MM
                  if (!monthMap[month]) monthMap[month] = [];
                  monthMap[month].push(cv.trade_id);
                }

                const dateBreakdown = Object.entries(monthMap)
                  .map(([month, tradeIds]) => {
                    const matchTrades = filteredTrades.filter(t => tradeIds.includes(t.id));
                    return { month, count: matchTrades.length, stats: calculateTradeStats(matchTrades) };
                  })
                  .sort((a, b) => b.month.localeCompare(a.month));

                if (dateBreakdown.length === 0) return null;

                return (
                  <div key={col.id} className="p-5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      <span>{col.name}</span>
                      <span className="text-[10px] font-normal text-gray-400 ml-1">(Date)</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-400">
                            <th className="py-2">Mois</th>
                            <th className="py-2 text-center">Trades</th>
                            <th className="py-2 text-center">Winrate</th>
                            <th className="py-2 text-right">Total R</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {dateBreakdown.map(row => (
                            <tr key={row.month} className="hover:bg-gray-50 dark:hover:bg-[#202020]">
                              <td className="py-2 font-bold">{row.month}</td>
                              <td className="py-2 text-center font-mono">{row.count}</td>
                              <td className="py-2 text-center font-mono">{row.stats.winrate}%</td>
                              <td className={`py-2 text-right font-mono font-bold ${row.stats.totalR >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {formatR(row.stats.totalR)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};
