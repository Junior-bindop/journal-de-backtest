import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Plus,
  Settings,
  Trash2,
  RotateCcw,
  Image as ImageIcon,
  Edit2,
  Lock,
  Download,
  MoreVertical,
  Check,
  ChevronDown,
} from 'lucide-react';
import { db } from '@/lib/db';
import { formatR, calculateTradeStats } from '@/utils/statistics';
import { FilterBar } from './FilterBar';
import { ColumnManagerModal } from './ColumnManagerModal';
import { NewTradeModal } from './NewTradeModal';
import { EditTradeModal } from './EditTradeModal';
import { ImageViewerModal } from '../images/ImageViewerModal';
import { PdfExportModal } from '@/features/backup/PdfExportModal';
import { ProtectedActionModal } from '@/components/common/ProtectedActionModal';
import { useAuth } from '@/features/auth/authContext';
import { BackupService } from '@/features/backup/backupService';
import type {
  Trade,
  CustomColumn,
  SelectOption,
  TradeCustomValue,
  TradeImage,
  FilterCondition,
  SortConfig,
  PositionType,
  ResultType,
} from '@/types';

interface TradesTableProps {
  trades: Trade[];
  customColumns: CustomColumn[];
  selectOptions: SelectOption[];
  customValues: TradeCustomValue[];
  images: TradeImage[];
  onDataRefresh: () => void;
}

export const TradesTable: React.FC<TradesTableProps> = ({
  trades,
  customColumns,
  selectOptions,
  customValues,
  images,
  onDataRefresh,
}) => {
  const { isOwner, hasUnlockedCrossEdit, activeAssociate, currentUser } = useAuth();
  const canEdit = isOwner || hasUnlockedCrossEdit;

  // Modals state
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isProtectedModalOpen, setIsProtectedModalOpen] = useState(false);
  const [protectedActionCallback, setProtectedActionCallback] = useState<(() => void) | null>(null);

  // Edit Trade Modal state
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Image Viewer state
  const [viewerImages, setViewerImages] = useState<TradeImage[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerTrade, setViewerTrade] = useState<Trade | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Inline editing state for active cell
  const [inlineEditingCell, setInlineEditingCell] = useState<{ tradeId: string; field: string } | null>(null);

  // Filters & Search & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([
    { columnKey: 'date', direction: 'desc' },
  ]);
  const [showTrash, setShowTrash] = useState(false);

  // Check protection before any mutating action
  const executeWithProtection = useCallback((action: () => void) => {
    if (canEdit) {
      action();
    } else {
      setProtectedActionCallback(() => action);
      setIsProtectedModalOpen(true);
    }
  }, [canEdit]);

  // Robust Filter Evaluation including dates, numbers, assets
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // Trash filter
      if (showTrash ? !t.deleted_at : t.deleted_at) {
        return false;
      }

      // Search query filter (trade number, asset, notes, session)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = String(t.trade_number).includes(q);
        const matchAsset = t.asset?.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        const matchSession = t.session?.toLowerCase().includes(q);

        if (!matchNum && !matchAsset && !matchNotes && !matchSession) {
          return false;
        }
      }

      // Compound AND/OR conditions
      if (conditions.length === 0) return true;

      const evalCondition = (cond: FilterCondition) => {
        // Skip empty conditions
        if (cond.value === '' || cond.value === undefined || cond.value === null) return true;

        let val: any = (t as any)[cond.columnKey];

        // Check if custom column
        if (val === undefined) {
          const cv = customValues.find(v => v.trade_id === t.id && v.column_id === cond.columnKey);
          val = cv?.value_text || cv?.value_number || cv?.value_date || '';
        }

        const targetVal = cond.value;

        // Specific handling for Date column
        if (cond.columnKey === 'date') {
          const tradeDate = t.date || '';
          if (cond.operator === 'year') {
            return tradeDate.startsWith(targetVal);
          }
          if (cond.operator === 'month') {
            return tradeDate.startsWith(targetVal);
          }
          if (cond.operator === 'range') {
            const [start, end] = targetVal.split(';');
            if (start && tradeDate < start) return false;
            if (end && tradeDate > end) return false;
            return true;
          }
          if (cond.operator === 'greater_than') {
            return tradeDate >= targetVal;
          }
          if (cond.operator === 'less_than') {
            return tradeDate <= targetVal;
          }
          return tradeDate === targetVal;
        }

        // Specific handling for RR and numbers
        if (cond.columnKey === 'rr') {
          const numVal = Number(val);
          const numTarget = Number(targetVal);
          if (cond.operator === 'greater_than') return numVal > numTarget;
          if (cond.operator === 'less_than') return numVal < numTarget;
          if (cond.operator === 'not_equals') return numVal !== numTarget;
          return numVal === numTarget;
        }

        // String / Select values
        const strVal = String(val || '').toLowerCase().trim();
        const strTarget = String(targetVal || '').toLowerCase().trim();

        switch (cond.operator) {
          case 'equals':
            return strVal === strTarget;
          case 'not_equals':
            return strVal !== strTarget;
          case 'contains':
            return strVal.includes(strTarget);
          case 'greater_than':
            return Number(val) > Number(targetVal);
          case 'less_than':
            return Number(val) < Number(targetVal);
          default:
            return strVal === strTarget;
        }
      };

      if (filterLogic === 'AND') {
        return conditions.every(evalCondition);
      } else {
        return conditions.some(evalCondition);
      }
    });
  }, [trades, showTrash, searchQuery, conditions, filterLogic, customValues]);

  // Sort trades
  const sortedTrades = useMemo(() => {
    const list = [...filteredTrades];
    if (sortConfig.length === 0) return list;

    const primary = sortConfig[0];
    list.sort((a, b) => {
      let valA = (a as any)[primary.columnKey];
      let valB = (b as any)[primary.columnKey];

      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      let comp = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comp = valA - valB;
      } else {
        comp = String(valA).localeCompare(String(valB));
      }

      return primary.direction === 'asc' ? comp : -comp;
    });

    return list;
  }, [filteredTrades, sortConfig]);

  // Stats for filtered trades (used in PDF export)
  const currentFilteredStats = useMemo(() => {
    return calculateTradeStats(sortedTrades);
  }, [sortedTrades]);

  // Trash count
  const trashCount = trades.filter(t => t.deleted_at).length;

  // Soft delete trade
  const handleSoftDelete = (tradeId: string) => {
    executeWithProtection(async () => {
      await db.trades.update(tradeId, {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      onDataRefresh();
    });
  };

  // Restore trade from trash
  const handleRestore = (tradeId: string) => {
    executeWithProtection(async () => {
      await db.trades.update(tradeId, {
        deleted_at: null,
        updated_at: new Date().toISOString(),
      });
      onDataRefresh();
    });
  };

  // Permanent delete from trash
  const handlePermanentDelete = (tradeId: string) => {
    executeWithProtection(async () => {
      if (!window.confirm('Supprimer définitivement ce trade et ses données ?')) return;
      await db.trades.delete(tradeId);
      await db.trade_custom_values.where('trade_id').equals(tradeId).delete();
      await db.trade_images.where('trade_id').equals(tradeId).delete();
      onDataRefresh();
    });
  };

  // Direct Column Delete from Header
  const handleDeleteColumn = (colId: string, colName: string) => {
    executeWithProtection(async () => {
      if (!window.confirm(`Supprimer définitivement la colonne "${colName}" et toutes ses valeurs ?`)) return;
      await db.custom_columns.delete(colId);
      await db.select_options.where('column_id').equals(colId).delete();
      await db.trade_custom_values.where('column_id').equals(colId).delete();
      onDataRefresh();
    });
  };

  // Notion-Style Inline Cell Updates
  const handleInlineUpdate = async (tradeId: string, updates: Partial<Trade>) => {
    executeWithProtection(async () => {
      // Enforce Section 16 RR rules if result changed
      if (updates.result === 'SL') {
        updates.rr = -1.0;
      } else if (updates.result === 'BE') {
        updates.rr = 0.0;
      } else if (updates.result === 'TP' && (updates.rr === undefined || updates.rr <= 0)) {
        updates.rr = 2.0;
      }

      await db.trades.update(tradeId, {
        ...updates,
        updated_at: new Date().toISOString(),
        version: (trades.find(t => t.id === tradeId)?.version || 1) + 1,
      });
      setInlineEditingCell(null);
      onDataRefresh();
    });
  };

  // Open Image Viewer
  const handleOpenImageViewer = (trade: Trade, initialImgIndex = 0) => {
    const tradeImgs = images.filter(img => img.trade_id === trade.id && !img.deleted_at);
    if (tradeImgs.length === 0) return;

    setViewerTrade(trade);
    setViewerImages(tradeImgs);
    setViewerIndex(initialImgIndex);
    setIsViewerOpen(true);
  };

  // Virtualizer setup
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: sortedTrades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  // Helpers for badge colors
  const getOptionColor = (key: string, label: string) => {
    const opt = selectOptions.find(o => o.system_column_key === key && o.label === label);
    return opt?.color || '#6b7280';
  };

  const assetOptions = Array.from(new Set(selectOptions.filter(o => o.system_column_key === 'asset').map(o => o.label)));
  const sessionOptions = Array.from(new Set(selectOptions.filter(o => o.system_column_key === 'session').map(o => o.label)));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#141414]">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#181818]">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => executeWithProtection(() => setIsNewTradeOpen(true))}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Trade</span>
          </button>

          <button
            onClick={() => executeWithProtection(() => setIsColumnManagerOpen(true))}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#222222] border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-gray-500" />
            <span>Gérer Colonnes</span>
          </button>

          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors"
            title="Exporter les trades filtrés en PDF imprimable"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => activeAssociate && BackupService.exportCSV(activeAssociate.id, activeAssociate.username)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-[#222222] border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            title="Export CSV brut"
          >
            <span>CSV</span>
          </button>
        </div>

        {!canEdit && (
          <div className="flex items-center space-x-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
            <Lock className="w-3.5 h-3.5" />
            <span>Mode Consultation ({activeAssociate?.username})</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterLogic={filterLogic}
        onFilterLogicChange={setFilterLogic}
        conditions={conditions}
        onAddCondition={() => setConditions([...conditions, { id: Date.now().toString(), columnKey: 'asset', operator: 'equals', value: '' }])}
        onRemoveCondition={(id) => setConditions(conditions.filter(c => c.id !== id))}
        onUpdateCondition={(id, updates) => setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c))}
        onResetFilters={() => {
          setSearchQuery('');
          setConditions([]);
        }}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        customColumns={customColumns}
        selectOptions={selectOptions}
        showTrash={showTrash}
        onToggleTrash={() => setShowTrash(!showTrash)}
        trashCount={trashCount}
        totalFilteredCount={sortedTrades.length}
        onOpenPdfExport={() => setIsPdfModalOpen(true)}
      />

      {/* FIXED TABLE HEADER (Completely outside virtualizer so rows NEVER hide behind it) */}
      <div className="w-full border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-[#1a1a1a] font-semibold text-gray-600 dark:text-gray-400 select-none text-xs flex">
        <div className="w-16 px-3 py-2.5 text-center shrink-0 border-r border-gray-200 dark:border-gray-800">N°</div>
        <div className="w-28 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Date</div>
        <div className="w-28 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Actif</div>
        <div className="w-24 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Position</div>
        <div className="w-24 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Résultat</div>
        <div className="w-24 px-3 py-2.5 text-right shrink-0 border-r border-gray-200 dark:border-gray-800">RR</div>
        <div className="w-28 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Session</div>
        <div className="w-24 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Durée</div>
        <div className="w-48 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Captures</div>

        {/* Dynamic Custom Columns Headers with Notion-like Delete/Option Menu */}
        {customColumns.map(col => (
          <div
            key={col.id}
            className="w-32 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800 flex items-center justify-between group"
          >
            <span className="truncate">{col.name}</span>
            <button
              onClick={() => handleDeleteColumn(col.id, col.name)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
              title={`Supprimer la colonne "${col.name}"`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        <div className="flex-1 min-w-[200px] px-3 py-2.5">Notes</div>
        <div className="w-24 px-2 py-2.5 text-center shrink-0">Actions</div>
      </div>

      {/* VIRTUALIZED TABLE BODY (Rows start at Y=0 directly beneath header) */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto relative font-sans text-xs select-none"
        style={{ height: 'calc(100vh - 250px)' }}
      >
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const trade = sortedTrades[virtualRow.index];
            if (!trade) return null;

            const tradeImgs = images.filter(img => img.trade_id === trade.id && !img.deleted_at);

            return (
              <div
                key={trade.id}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`flex items-center border-b border-gray-100 dark:border-gray-800/80 hover:bg-gray-50/80 dark:hover:bg-[#1a1a1a] transition-colors ${
                  trade.deleted_at ? 'opacity-60 bg-red-500/5' : ''
                }`}
              >
                {/* 1. N° */}
                <div className="w-16 px-3 py-2 text-center shrink-0 font-mono text-gray-500 border-r border-gray-100 dark:border-gray-800/60 font-bold">
                  #{trade.trade_number}
                </div>

                {/* 2. Date (Click to edit inline) */}
                <div className="w-28 px-2 py-1.5 shrink-0 font-mono border-r border-gray-100 dark:border-gray-800/60">
                  <input
                    type="date"
                    value={trade.date}
                    disabled={!canEdit}
                    onChange={(e) => handleInlineUpdate(trade.id, { date: e.target.value })}
                    className="w-full bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 py-0.5 cursor-pointer font-mono"
                  />
                </div>

                {/* 3. Actif (Click to select) */}
                <div className="w-28 px-2 py-1.5 shrink-0 border-r border-gray-100 dark:border-gray-800/60">
                  <select
                    value={trade.asset}
                    disabled={!canEdit}
                    onChange={(e) => handleInlineUpdate(trade.id, { asset: e.target.value })}
                    style={{
                      backgroundColor: `${getOptionColor('asset', trade.asset)}20`,
                      borderColor: `${getOptionColor('asset', trade.asset)}50`,
                      color: getOptionColor('asset', trade.asset),
                    }}
                    className="w-full px-2 py-0.5 rounded font-bold border text-[11px] focus:outline-none cursor-pointer"
                  >
                    {assetOptions.map(a => <option key={a} value={a} className="bg-white dark:bg-[#222] text-gray-900 dark:text-white">{a}</option>)}
                    {!assetOptions.includes(trade.asset) && <option value={trade.asset}>{trade.asset}</option>}
                  </select>
                </div>

                {/* 4. Position (Click to toggle or select) */}
                <div className="w-24 px-2 py-1.5 shrink-0 border-r border-gray-100 dark:border-gray-800/60">
                  <button
                    disabled={!canEdit}
                    onClick={() => handleInlineUpdate(trade.id, { position: trade.position === 'BUY' ? 'SELL' : 'BUY' })}
                    className={`w-full py-0.5 rounded font-bold text-[11px] border transition-all text-center ${
                      trade.position === 'BUY'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/25'
                    }`}
                  >
                    {trade.position}
                  </button>
                </div>

                {/* 5. Résultat (TP / SL / BE selector) */}
                <div className="w-24 px-2 py-1.5 shrink-0 border-r border-gray-100 dark:border-gray-800/60">
                  <select
                    value={trade.result}
                    disabled={!canEdit}
                    onChange={(e) => handleInlineUpdate(trade.id, { result: e.target.value as ResultType })}
                    className={`w-full px-2 py-0.5 rounded font-bold text-[11px] cursor-pointer focus:outline-none text-white ${
                      trade.result === 'TP'
                        ? 'bg-emerald-600'
                        : trade.result === 'SL'
                        ? 'bg-red-700'
                        : 'bg-gray-500'
                    }`}
                  >
                    <option value="TP" className="bg-emerald-600 text-white">TP</option>
                    <option value="SL" className="bg-red-700 text-white">SL</option>
                    <option value="BE" className="bg-gray-500 text-white">BE</option>
                  </select>
                </div>

                {/* 6. RR (Section 16: -1.00R rouge bordeaux, 0.00R gris, +2.50R vert) */}
                <div className="w-24 px-2 py-1.5 text-right shrink-0 border-r border-gray-100 dark:border-gray-800/60 font-mono font-bold">
                  {trade.result === 'SL' ? (
                    <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400">
                      -1.00R
                    </span>
                  ) : trade.result === 'BE' ? (
                    <span className="px-2 py-0.5 rounded bg-gray-500/15 text-gray-500 dark:text-gray-400">
                      0.00R
                    </span>
                  ) : (
                    <input
                      type="number"
                      step="0.05"
                      value={trade.rr}
                      disabled={!canEdit}
                      onChange={(e) => handleInlineUpdate(trade.id, { rr: parseFloat(e.target.value) || 0 })}
                      className="w-full text-right bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5 font-bold font-mono focus:outline-none"
                    />
                  )}
                </div>

                {/* 7. Session */}
                <div className="w-28 px-2 py-1.5 shrink-0 border-r border-gray-100 dark:border-gray-800/60">
                  <select
                    value={trade.session}
                    disabled={!canEdit}
                    onChange={(e) => handleInlineUpdate(trade.id, { session: e.target.value })}
                    className="w-full px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 focus:outline-none cursor-pointer"
                  >
                    {sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    {!sessionOptions.includes(trade.session) && <option value={trade.session}>{trade.session}</option>}
                  </select>
                </div>

                {/* 8. Durée */}
                <div className="w-24 px-3 py-2 shrink-0 border-r border-gray-100 dark:border-gray-800/60 font-mono text-gray-600 dark:text-gray-400">
                  {trade.duration}m
                </div>

                {/* 9. Captures Thumbnails */}
                <div className="w-48 px-2 py-1.5 shrink-0 border-r border-gray-100 dark:border-gray-800/60 flex items-center space-x-1.5 overflow-hidden">
                  {tradeImgs.length > 0 ? (
                    tradeImgs.slice(0, 3).map((img, idx) => (
                      <div
                        key={img.id}
                        onClick={() => handleOpenImageViewer(trade, idx)}
                        className="relative w-8 h-8 rounded border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity shrink-0 bg-black/10"
                        title={img.comment || `Capture ${idx + 1}`}
                      >
                        <img
                          src={img.thumbnail_data_url || img.data_url || img.storage_path}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))
                  ) : (
                    <button
                      onClick={() => setEditingTrade(trade)}
                      className="text-gray-400 text-[11px] italic hover:text-emerald-500"
                    >
                      + Ajouter
                    </button>
                  )}
                  {tradeImgs.length > 3 && (
                    <span
                      onClick={() => handleOpenImageViewer(trade, 3)}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer"
                    >
                      +{tradeImgs.length - 3}
                    </span>
                  )}
                </div>

                {/* Dynamic Custom Column values */}
                {customColumns.map(col => {
                  const val = customValues.find(v => v.trade_id === trade.id && v.column_id === col.id);
                  let display = '-';
                  if (val) {
                    if (col.type === 'SELECT') {
                      const opt = selectOptions.find(o => o.id === val.value_text);
                      display = opt ? opt.label : val.value_text || '-';
                    } else if (col.type === 'CHECKBOX') {
                      display = val.value_boolean ? '✓' : '✗';
                    } else {
                      display = String(val.value_text || val.value_number || val.value_date || '-');
                    }
                  }

                  return (
                    <div key={col.id} className="w-32 px-3 py-2 shrink-0 border-r border-gray-100 dark:border-gray-800/60 truncate text-gray-700 dark:text-gray-300">
                      {display}
                    </div>
                  );
                })}

                {/* Notes (Click to edit inline) */}
                <div className="flex-1 min-w-[200px] px-2 py-1">
                  <input
                    type="text"
                    value={trade.notes || ''}
                    disabled={!canEdit}
                    placeholder="Ajouter une note..."
                    onChange={(e) => handleInlineUpdate(trade.id, { notes: e.target.value })}
                    className="w-full px-2 py-1 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 rounded text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-[#202020] border border-transparent focus:border-emerald-500"
                  />
                </div>

                {/* Actions: Edit row & Delete/Restore */}
                <div className="w-24 px-2 py-2 text-center shrink-0 flex items-center justify-center space-x-1.5">
                  <button
                    onClick={() => setEditingTrade(trade)}
                    className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-500/10 rounded transition-colors"
                    title="Modifier tout le trade (Propriétés et captures)"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {trade.deleted_at ? (
                    <>
                      <button
                        onClick={() => handleRestore(trade.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded"
                        title="Restaurer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(trade.id)}
                        className="p-1 text-red-600 hover:bg-red-500/10 rounded"
                        title="Supprimer définitivement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleSoftDelete(trade.id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                      title="Mettre à la corbeille"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {sortedTrades.length === 0 && (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <p className="text-sm font-medium">Aucun trade ne correspond à vos filtres.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setConditions([]);
                  setShowTrash(false);
                }}
                className="mt-2 text-xs text-emerald-600 hover:underline"
              >
                Réinitialiser la recherche et les filtres
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Trade Modal */}
      {isNewTradeOpen && activeAssociate && (
        <NewTradeModal
          isOpen={isNewTradeOpen}
          onClose={() => setIsNewTradeOpen(false)}
          userId={activeAssociate.id}
          associateName={activeAssociate.username}
          customColumns={customColumns}
          selectOptions={selectOptions}
          onTradeCreated={onDataRefresh}
        />
      )}

      {/* Edit Trade Modal */}
      {editingTrade && activeAssociate && (
        <EditTradeModal
          isOpen={Boolean(editingTrade)}
          onClose={() => setEditingTrade(null)}
          trade={editingTrade}
          userId={activeAssociate.id}
          associateName={activeAssociate.username}
          customColumns={customColumns}
          selectOptions={selectOptions}
          customValues={customValues}
          images={images}
          onTradeUpdated={onDataRefresh}
          onOpenImageViewer={handleOpenImageViewer}
        />
      )}

      {/* Column Manager Modal */}
      {isColumnManagerOpen && activeAssociate && (
        <ColumnManagerModal
          isOpen={isColumnManagerOpen}
          onClose={() => setIsColumnManagerOpen(false)}
          userId={activeAssociate.id}
          customColumns={customColumns}
          selectOptions={selectOptions}
          onColumnsChanged={onDataRefresh}
        />
      )}

      {/* Full Screen Image Viewer Modal */}
      {isViewerOpen && viewerTrade && activeAssociate && (
        <ImageViewerModal
          isOpen={isViewerOpen}
          images={viewerImages}
          initialIndex={viewerIndex}
          onClose={() => setIsViewerOpen(false)}
          canEdit={canEdit}
          associateName={activeAssociate.username}
          tradeDate={viewerTrade.date}
          tradeNumber={viewerTrade.trade_number}
          onImagesUpdated={onDataRefresh}
        />
      )}

      {/* PDF Export Modal */}
      {isPdfModalOpen && activeAssociate && (
        <PdfExportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          trades={sortedTrades}
          stats={currentFilteredStats}
          associateName={activeAssociate.username}
          activeFiltersDescription={
            conditions.length > 0
              ? conditions.map(c => `${c.columnKey}: ${c.value}`).join(', ')
              : 'Tous les trades'
          }
        />
      )}

      {/* Protected Action Modal for Cross-Associate Edit */}
      {isProtectedModalOpen && (
        <ProtectedActionModal
          isOpen={isProtectedModalOpen}
          onClose={() => {
            setIsProtectedModalOpen(false);
            setProtectedActionCallback(null);
          }}
          onSuccess={() => {
            if (protectedActionCallback) {
              protectedActionCallback();
              setProtectedActionCallback(null);
            }
          }}
        />
      )}
    </div>
  );
};
