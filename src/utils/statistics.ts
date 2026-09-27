import type { Trade, TradeStats } from '@/types';

export function calculateTradeStats(trades: Trade[]): TradeStats {
  const activeTrades = trades.filter(t => !t.deleted_at);

  if (activeTrades.length === 0) {
    return {
      totalTrades: 0,
      totalTP: 0,
      totalSL: 0,
      totalBE: 0,
      winrate: 0,
      maxWinningStreak: 0,
      maxLosingStreak: 0,
      maxDrawdownR: 0,
      profitFactor: 0,
      expectancy: 0,
      averageWinR: 0,
      averageLossR: 0,
      averageRetentionTime: 'N/A',
      totalR: 0,
      averageRR: 0,
    };
  }

  // Sort trades chronologically for streaks and equity curve
  const sorted = [...activeTrades].sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return a.trade_number - b.trade_number;
  });

  let totalTP = 0;
  let totalSL = 0;
  let totalBE = 0;

  let totalWinR = 0;
  let totalLossR = 0; // absolute sum of losses
  let totalR = 0;

  let currentWinStreak = 0;
  let maxWinStreak = 0;
  let currentLossStreak = 0;
  let maxLossStreak = 0;

  let peakEquity = 0;
  let currentEquity = 0;
  let maxDrawdownR = 0;

  const durationCounts: Record<string, number> = {};

  for (const trade of sorted) {
    const rr = Number(trade.rr) || 0;
    totalR += rr;
    currentEquity += rr;

    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const currentDrawdown = peakEquity - currentEquity;
    if (currentDrawdown > maxDrawdownR) {
      maxDrawdownR = currentDrawdown;
    }

    if (trade.result === 'TP') {
      totalTP++;
      totalWinR += rr > 0 ? rr : 0;
      currentWinStreak++;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      currentLossStreak = 0;
    } else if (trade.result === 'SL') {
      totalSL++;
      totalLossR += Math.abs(rr);
      currentLossStreak++;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      currentWinStreak = 0;
    } else if (trade.result === 'BE') {
      totalBE++;
      // BE resets or continues streak? Standard practice: BE breaks loss streak and win streak
      currentWinStreak = 0;
      currentLossStreak = 0;
    }

    if (trade.duration) {
      durationCounts[trade.duration] = (durationCounts[trade.duration] || 0) + 1;
    }
  }

  const totalTrades = activeTrades.length;
  const winrate = totalTrades > 0 ? (totalTP / totalTrades) * 100 : 0;

  const averageWinR = totalTP > 0 ? totalWinR / totalTP : 0;
  const averageLossR = totalSL > 0 ? totalLossR / totalSL : 0;

  const profitFactor = totalLossR > 0 
    ? totalWinR / totalLossR 
    : totalWinR > 0 ? 99.99 : 0;

  const winRateRatio = totalTP / totalTrades;
  const lossRateRatio = totalSL / totalTrades;
  const expectancy = (winRateRatio * averageWinR) - (lossRateRatio * averageLossR);

  // Most frequent duration
  let mostFrequentDuration = 'N/A';
  let maxDurationCount = 0;
  for (const [dur, count] of Object.entries(durationCounts)) {
    if (count > maxDurationCount) {
      maxDurationCount = count;
      mostFrequentDuration = dur + ' min';
    }
  }

  const averageRR = totalTP > 0 ? totalWinR / totalTP : 0;

  return {
    totalTrades,
    totalTP,
    totalSL,
    totalBE,
    winrate: Number(winrate.toFixed(2)),
    maxWinningStreak: maxWinStreak,
    maxLosingStreak: maxLossStreak,
    maxDrawdownR: Number(maxDrawdownR.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    expectancy: Number(expectancy.toFixed(2)),
    averageWinR: Number(averageWinR.toFixed(2)),
    averageLossR: Number(averageLossR.toFixed(2)),
    averageRetentionTime: mostFrequentDuration,
    totalR: Number(totalR.toFixed(2)),
    averageRR: Number(averageRR.toFixed(2)),
  };
}

export function formatR(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}R`;
  if (value < 0) return `${value.toFixed(2)}R`;
  return `0.00R`;
}
