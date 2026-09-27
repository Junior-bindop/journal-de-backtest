import React from 'react';
import { Search, Plus, Filter, ArrowUpDown, Trash2, RotateCcw } from 'lucide-react';
import type { CustomColumn, SelectOption, FilterCondition, SortConfig } from '@/types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterLogic: 'AND' | 'OR';
  onFilterLogicChange: (logic: 'AND' | 'OR') => void;
  conditions: FilterCondition[];
  onAddCondition: () => void;
  onRemoveCondition: (id: string) => void;
  onUpdateCondition: (id: string, updates: Partial<FilterCondition>) => void;
  onResetFilters: () => void;
  sortConfig: SortConfig[];
  onSortChange: (sorts: SortConfig[]) => void;
  customColumns: CustomColumn[];
  selectOptions: SelectOption[];
  showTrash: boolean;
  onToggleTrash: () => void;
  trashCount: number;
  totalFilteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  filterLogic,
  onFilterLogicChange,
  conditions,
  onAddCondition,
  onRemoveCondition,
  onUpdateCondition,
  onResetFilters,
  sortConfig,
  onSortChange,
  customColumns,
  selectOptions,
  showTrash,
  onToggleTrash,
  trashCount,
  totalFilteredCount,
}) => {
  const columnOptions = [
    { key: 'asset', label: 'Actif', type: 'SELECT' },
    { key: 'position', label: 'Position', type: 'SELECT' },
    { key: 'result', label: 'Résultat', type: 'SELECT' },
    { key: 'session', label: 'Session', type: 'SELECT' },
    { key: 'duration', label: 'Durée', type: 'SELECT' },
    { key: 'rr', label: 'RR', type: 'NUMBER' },
    { key: 'date', label: 'Date', type: 'DATE' },
    ...customColumns.map(c => ({ key: c.id, label: c.name, type: c.type })),
  ];

  return (
    <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 p-4 space-y-3">
      {/* Top row: Search, Filter toggle, Trash toggle, Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher (N°, actif, notes, session...)"
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 dark:bg-[#222222] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {/* Add Filter condition button */}
          <button
            onClick={onAddCondition}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-[#252525] dark:hover:bg-[#303030] rounded-lg transition-colors"
          >
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filtrer</span>
            {conditions.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                {conditions.length}
              </span>
            )}
          </button>

          {/* Quick Sort button toggle */}
          <button
            onClick={() => {
              const current = sortConfig[0];
              if (!current || current.columnKey !== 'date') {
                onSortChange([{ columnKey: 'date', direction: 'desc' }]);
              } else if (current.direction === 'desc') {
                onSortChange([{ columnKey: 'date', direction: 'asc' }]);
              } else {
                onSortChange([{ columnKey: 'trade_number', direction: 'desc' }]);
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-[#252525] dark:hover:bg-[#303030] rounded-lg transition-colors"
            title="Modifier le tri"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
            <span>
              {sortConfig[0]
                ? `${sortConfig[0].columnKey === 'date' ? 'Date' : 'N°'} ${sortConfig[0].direction === 'asc' ? '↑' : '↓'}`
                : 'Trier'}
            </span>
          </button>

          {/* Trash Toggle */}
          <button
            onClick={onToggleTrash}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              showTrash
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525]'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Corbeille</span>
            {trashCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-600 dark:text-red-300 text-[10px] font-bold">
                {trashCount}
              </span>
            )}
          </button>

          {/* Count Badge */}
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium pl-2">
            {totalFilteredCount} {totalFilteredCount > 1 ? 'trades' : 'trade'}
          </div>
        </div>
      </div>

      {/* Filter Conditions row */}
      {conditions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center rounded-lg bg-gray-100 dark:bg-[#222222] p-0.5 text-[11px] font-semibold">
            <button
              onClick={() => onFilterLogicChange('AND')}
              className={`px-2 py-0.5 rounded ${
                filterLogic === 'AND'
                  ? 'bg-white dark:bg-[#333333] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              ET (AND)
            </button>
            <button
              onClick={() => onFilterLogicChange('OR')}
              className={`px-2 py-0.5 rounded ${
                filterLogic === 'OR'
                  ? 'bg-white dark:bg-[#333333] text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              OU (OR)
            </button>
          </div>

          {conditions.map((cond) => {
            const currentCol = columnOptions.find(c => c.key === cond.columnKey);

            return (
              <div
                key={cond.id}
                className="flex items-center space-x-1.5 bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-gray-700/80 px-2 py-1 rounded-lg text-xs"
              >
                {/* Column selector */}
                <select
                  value={cond.columnKey}
                  onChange={(e) => onUpdateCondition(cond.id, { columnKey: e.target.value, value: '' })}
                  className="bg-transparent font-medium text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer"
                >
                  {columnOptions.map(c => (
                    <option key={c.key} value={c.key} className="bg-white dark:bg-[#222]">
                      {c.label}
                    </option>
                  ))}
                </select>

                {/* Operator selector */}
                <select
                  value={cond.operator}
                  onChange={(e) => onUpdateCondition(cond.id, { operator: e.target.value as any })}
                  className="bg-transparent text-gray-500 dark:text-gray-400 focus:outline-none cursor-pointer"
                >
                  <option value="equals" className="bg-white dark:bg-[#222]">est égal à</option>
                  <option value="not_equals" className="bg-white dark:bg-[#222]">différent de</option>
                  <option value="contains" className="bg-white dark:bg-[#222]">contient</option>
                  <option value="greater_than" className="bg-white dark:bg-[#222]">&gt; supérieur à</option>
                  <option value="less_than" className="bg-white dark:bg-[#222]">&lt; inférieur à</option>
                </select>

                {/* Value input / select */}
                {cond.columnKey === 'result' ? (
                  <select
                    value={cond.value}
                    onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                    className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="TP">TP</option>
                    <option value="SL">SL</option>
                    <option value="BE">BE</option>
                  </select>
                ) : cond.columnKey === 'position' ? (
                  <select
                    value={cond.value}
                    onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                    className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                ) : (
                  <input
                    type={currentCol?.type === 'NUMBER' ? 'number' : currentCol?.type === 'DATE' ? 'date' : 'text'}
                    value={cond.value}
                    onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                    placeholder="Valeur..."
                    className="w-28 px-2 py-0.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-gray-100 focus:outline-none"
                  />
                )}

                {/* Remove condition */}
                <button
                  onClick={() => onRemoveCondition(cond.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                >
                  &times;
                </button>
              </div>
            );
          })}

          <button
            onClick={onResetFilters}
            className="flex items-center space-x-1 text-[11px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors px-2 py-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Réinitialiser</span>
          </button>
        </div>
      )}
    </div>
  );
};
