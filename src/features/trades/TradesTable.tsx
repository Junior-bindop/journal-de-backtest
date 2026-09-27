import React, { useState, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Plus,
  Settings,
  Trash2,
  RotateCcw,
  Image as ImageIcon,
  ArrowUpDown,
  Lock,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { db } from '@/lib/db';
import { formatR } from '@/utils/statistics';
import { FilterBar } from './FilterBar';
import { ColumnManagerModal } from './ColumnManagerModal';
import { NewTradeModal } from './NewTradeModal';
import { ImageViewerModal } from '../images/ImageViewerModal';
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
  const { isOwner, hasUnlockedCrossEdit, activeAssociate } = useAuth();
  const canEdit = isOwner || hasUnlockedCrossEdit;

  // Modals state
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isProtectedModalOpen, setIsProtectedModalOpen] = useState(false);
  const [protectedActionCallback, setProtectedActionCallback] = useState<(() => void) | null>(null);

  // Image Viewer state
  const [viewerImages, setViewerImages] = useState<TradeImage[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerTrade, setViewerTrade] = useState<Trade | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Filters & Search & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([
    { columnKey: 'date', direction: 'desc' },
  ]);
  const [showTrash, setShowTrash] = useState(false);

  // Check protection before any mutating action
  const executeWithProtection = (action: () => void) => {
    if (canEdit) {
      action();
    } else {
      setProtectedActionCallback(() => action);
      setIsProtectedModalOpen(true);
    }
  };

  // Filtered & Sorted trades
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // Trash filter
      if (showTrash ? !t.deleted_at : t.deleted_at) {
        return false;
      }

      // Search query filter (trade number, asset, notes, session, comments)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
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
        let val: any = (t as any)[cond.columnKey];

        // Check if custom column
        if (val === undefined) {
          const cv = customValues.find(v => v.trade_id === t.id && v.column_id === cond.columnKey);
          val = cv?.value_text || cv?.value_number || cv?.value_date || '';
        }

        const targetVal = cond.value;

        switch (cond.operator) {
          case 'equals':
            return String(val).toLowerCase() === String(targetVal).toLowerCase();
          case 'not_equals':
            return String(val).toLowerCase() !== String(targetVal).toLowerCase();
          case 'contains':
            return String(val).toLowerCase().includes(String(targetVal).toLowerCase());
          case 'greater_than':
            return Number(val) > Number(targetVal);
          case 'less_than':
            return Number(val) < Number(targetVal);
          default:
            return true;
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
            <span>Colonnes</span>
          </button>

          <button
            onClick={() => activeAssociate && BackupService.exportCSV(activeAssociate.id, activeAssociate.username)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#222222] border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            title="Exporter les trades filtrés en CSV"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export CSV</span>
          </button>
        </div>

        {!canEdit && (
          <div className="flex items-center space-x-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
            <Lock className="w-3.5 h-3.5" />
            <span>Mode Consultation (Espace de {activeAssociate?.username})</span>
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
      />

      {/* Virtualized Table Container */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto relative font-sans text-xs select-none"
        style={{ height: 'calc(100vh - 210px)' }}
      >
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {/* Table Header Row */}
          <div className="sticky top-0 z-10 flex border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-[#1a1a1a] font-semibold text-gray-600 dark:text-gray-400 select-none">
            <div className="w-16 px-3 py-2.5 text-center shrink-0 border-r border-gray-200 dark:border-gray-800">N°</div>
            <div className="w-28 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Date</div>
            <div className="w-28 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Actif</div>
            <div className="w-24 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Position</div>
            <div className="w-24 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Résultat</div>
            <div className="w-24 px-3 py-2.5 text-right shrink-0 border-r border-gray-200 dark:border-gray-800">RR</div>
            <div className="w-28 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Session</div>
            <div className="w-24 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Durée</div>
            <div className="w-48 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">Captures</div>

            {/* Dynamic Custom Column Headers */}
            {customColumns.map(col => (
              <div key={col.id} className="w-32 px-3 py-2.5 shrink-0 border-r border-gray-200 dark:border-gray-800">
                {col.name}
              </div>
            ))}

            <div className="flex-1 min-w-[200px] px-3 py-2.5">Notes</div>
            <div className="w-20 px-2 py-2.5 text-center shrink-0">Actions</div>
          </div>

          {/* Virtualized Rows */}
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const trade = sortedTrades[virtualRow.index];
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
                {/* N° */}
                <div className="w-16 px-3 py-2 text-center shrink-0 font-mono text-gray-500 border-r border-gray-100 dark:border-gray-800/60">
                  #{trade.trade_number}
                </div>

                {/* Date */}
                <div className="w-28 px-3 py-2 shrink-0 font-mono text-gray-800 dark:text-gray-200 border-r border-gray-100 dark:border-gray-800/60">
                  {trade.date}
                </div>

                {/* Actif */}
                <div className="w-28 px-3 py-2 shrink-0 border-r border-gray-100 dark:border-gray-800/60">
                  <span
                    style={{
                      backgroundColor: `${getOptionColor('asset', trade.asset)}20`,
                      borderColor: `${getOptionColor('asset', trade.asset)}50`,
                      color: getOptionColor('asset', trade.asset),
                    }}
                    className="inline-block px-2 py-0.5 rounded font-bold border text-[11px]"
                  >
                    {trade.asset}
                  </span>
                </div>

                {/* Position */}
                <div className="w-24 px-3 py-2 shrink-0 border-r border-gray-100 dark:border-gray-800/60">
                  <span
                    className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                      trade.position === 'BUY'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                    }`}
                  >
                    {trade.position}
                  </span>
                </div>

                {/* Résultat */}
                <div className="w-24 px-3 py-2 shrink-0 border-r border-gray-100 dark:border-gray-800/60">
                  <span
                    className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                      trade.result === 'TP'
                        ? 'bg-emerald-500 text-white'
                        : trade.result === 'SL'
                        ? 'bg-red-700 text-white'
                        : 'bg-gray-500 text-white'
                    }`}
                  >
                    {trade.result}
                  </span>
                </div>

                {/* RR (Section 16: -1.00R rouge bordeaux, 0.00R gris, +2.50R vert) */}
                <div className="w-24 px-3 py-2 text-right shrink-0 border-r border-gray-100 dark:border-gray-800/60 font-mono font-bold">
                  <span
                    className={`px-2 py-0.5 rounded ${
                      trade.result === 'SL'
                        ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                        : trade.result === 'BE'
                        ? 'bg-gray-500/15 text-gray-500 dark:text-gray-400'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatR(trade.rr)}
                  </span>
                </div>

                {/* Session */}
                <div className="w-28 px-3 py-2 shrink-0 border-r border-gray-100 dark:border-gray-800/60">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300">
                    {trade.session}
                  </span>
                </div>

                {/* Durée */}
                <div className="w-24 px-3 py-2 shrink-0 border-r border-gray-100 dark:border-gray-800/60 font-mono text-gray-600 dark:text-gray-400">
                  {trade.duration}m
                </div>

                {/* Captures Thumbnails */}
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
                    <span className="text-gray-400 text-[11px] italic">Aucune</span>
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

                {/* Notes */}
                <div className="flex-1 min-w-[200px] px-3 py-2 text-gray-600 dark:text-gray-400 truncate">
                  {trade.notes || '-'}
                </div>

                {/* Actions */}
                <div className="w-20 px-2 py-2 text-center shrink-0 flex items-center justify-center space-x-1">
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
