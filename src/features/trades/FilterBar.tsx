import React, { useMemo } from 'react';
import { Search, Plus, Filter, ArrowUpDown, Trash2, RotateCcw, FileText, Download } from 'lucide-react';
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
  onOpenPdfExport: () => void;
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
  onOpenPdfExport,
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

  // Distinct options
  const assetOptions = useMemo(() => {
    return Array.from(new Set(selectOptions.filter(o => o.system_column_key === 'asset').map(o => o.label)));
  }, [selectOptions]);

  const sessionOptions = useMemo(() => {
    return Array.from(new Set(selectOptions.filter(o => o.system_column_key === 'session').map(o => o.label)));
  }, [selectOptions]);

  const durationOptions = useMemo(() => {
    return Array.from(new Set(selectOptions.filter(o => o.system_column_key === 'duration').map(o => o.label)));
  }, [selectOptions]);

  // Available years from 2000 to 2030
  const yearsList = useMemo(() => {
    const years: number[] = [];
    for (let y = 2026; y >= 2000; y--) years.push(y);
    return years;
  }, []);

  return (
    <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 p-4 space-y-3">
      {/* Top row: Search, Filter toggle, PDF Export, Trash toggle */}
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
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-[#252525] dark:hover:bg-[#303030] rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
          >
            <Filter className="w-3.5 h-3.5 text-emerald-500" />
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
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-[#252525] dark:hover:bg-[#303030] rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
            title="Modifier le tri"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
            <span>
              {sortConfig[0]
                ? `${sortConfig[0].columnKey === 'date' ? 'Date' : 'N°'} ${sortConfig[0].direction === 'asc' ? '↑' : '↓'}`
                : 'Trier'}
            </span>
          </button>

          {/* PDF Export Button */}
          <button
            onClick={onOpenPdfExport}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/30"
            title="Exporter les trades filtrés en PDF imprimable"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
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
          <div className="text-xs text-gray-500 dark:text-gray-400 font-bold pl-2 font-mono">
            {totalFilteredCount} {totalFilteredCount > 1 ? 'trades' : 'trade'}
          </div>
        </div>
      </div>

      {/* Filter Conditions row with Specific Inputs */}
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
            const isCustom = customColumns.some(c => c.id === cond.columnKey);
            const customCol = customColumns.find(c => c.id === cond.columnKey);

            return (
              <div
                key={cond.id}
                className="flex items-center space-x-1.5 bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-gray-700/80 px-2 py-1 rounded-lg text-xs"
              >
                {/* 1. Column Selector */}
                <select
                  value={cond.columnKey}
                  onChange={(e) => onUpdateCondition(cond.id, { columnKey: e.target.value, operator: 'equals', value: '' })}
                  className="bg-transparent font-bold text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer"
                >
                  {columnOptions.map(c => (
                    <option key={c.key} value={c.key} className="bg-white dark:bg-[#222]">
                      {c.label}
                    </option>
                  ))}
                </select>

                {/* 2. Specific Operators depending on column type */}
                {cond.columnKey === 'rr' || currentCol?.type === 'NUMBER' ? (
                  <select
                    value={cond.operator}
                    onChange={(e) => onUpdateCondition(cond.id, { operator: e.target.value as any })}
                    className="bg-transparent text-gray-600 dark:text-gray-300 font-medium focus:outline-none"
                  >
                    <option value="equals" className="bg-white dark:bg-[#222]">= égal à</option>
                    <option value="greater_than" className="bg-white dark:bg-[#222]">&gt; supérieur à</option>
                    <option value="less_than" className="bg-white dark:bg-[#222]">&lt; inférieur à</option>
                    <option value="not_equals" className="bg-white dark:bg-[#222]">!= différent de</option>
                  </select>
                ) : cond.columnKey === 'date' ? (
                  <select
                    value={cond.operator}
                    onChange={(e) => onUpdateCondition(cond.id, { operator: e.target.value as any, value: '' })}
                    className="bg-transparent text-gray-600 dark:text-gray-300 font-medium focus:outline-none"
                  >
                    <option value="year" className="bg-white dark:bg-[#222]">Par Année</option>
                    <option value="month" className="bg-white dark:bg-[#222]">Par Mois</option>
                    <option value="equals" className="bg-white dark:bg-[#222]">Jour exact</option>
                    <option value="range" className="bg-white dark:bg-[#222]">Période (Du ... Au ...)</option>
                    <option value="greater_than" className="bg-white dark:bg-[#222]">Après le</option>
                    <option value="less_than" className="bg-white dark:bg-[#222]">Avant le</option>
                  </select>
                ) : (
                  <select
                    value={cond.operator}
                    onChange={(e) => onUpdateCondition(cond.id, { operator: e.target.value as any })}
                    className="bg-transparent text-gray-600 dark:text-gray-300 font-medium focus:outline-none"
                  >
                    <option value="equals" className="bg-white dark:bg-[#222]">est</option>
                    <option value="not_equals" className="bg-white dark:bg-[#222]">n'est pas</option>
                    <option value="contains" className="bg-white dark:bg-[#222]">contient</option>
                  </select>
                )}

                {/* 3. Specific Value Input depending on column */}
                {cond.columnKey === 'asset' ? (
                  <select
                    value={cond.value}
                    onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                    className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5 text-xs text-gray-900 dark:text-gray-100 font-bold"
                  >
                    <option value="">Choisir un actif...</option>
                    {assetOptions.map(a => <option key={a} value={a}>{a}</option>)}
                    {!assetOptions.includes('XAUUSD') && <option value="XAUUSD">XAUUSD</option>}
                    {!assetOptions.includes('EURUSD') && <option value="EURUSD">EURUSD</option>}
                  </select>
                ) : cond.columnKey === 'position' ? (
                  <select
                    value={cond.value}
                    onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                    className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5 text-xs font-bold"
                  >
                    <option value="">Choisir...</option>
                    <option value="BUY" className="text-emerald-600">BUY</option>
                    <option value="SELL" className="text-red-600">SELL</option>
                  </select>
                ) : cond.columnKey === 'result' ? (
                  <select
                    value={cond.value}
                    onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                    className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5 text-xs font-bold"
                  >
                    <option value="">Choisir...</option>
                    <option value="TP" className="text-emerald-600">TP</option>
                    <option value="SL" className="text-red-600">SL</option>
                    <option value="BE" className="text-gray-500">BE</option>
                  </select>
                ) : cond.columnKey === 'session' ? (
                  <select
                    value={cond.value}
                    onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                    className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5 text-xs font-medium"
                  >
                    <option value="">Choisir session...</option>
                    {sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    {!sessionOptions.includes('LONDON') && <option value="LONDON">LONDON</option>}
                    {!sessionOptions.includes('NEW YORK') && <option value="NEW YORK">NEW YORK</option>}
                  </select>
                ) : cond.columnKey === 'duration' ? (
                  <select
                    value={cond.value}
                    onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                    className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5 text-xs font-medium"
                  >
                    <option value="">Choisir durée...</option>
                    {durationOptions.map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                ) : cond.columnKey === 'date' ? (
                  /* Date inputs based on date filter operator */
                  cond.operator === 'year' ? (
                    <select
                      value={cond.value}
                      onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                      className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5 text-xs font-mono font-bold"
                    >
                      <option value="">Sélectionner l'année...</option>
                      {yearsList.map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                  ) : cond.operator === 'month' ? (
                    <input
                      type="month"
                      value={cond.value}
                      onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                      className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5 text-xs font-mono"
                    />
                  ) : cond.operator === 'range' ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="date"
                        value={(cond.value || '').split(';')[0] || ''}
                        onChange={(e) => {
                          const currentEnd = (cond.value || '').split(';')[1] || '';
                          onUpdateCondition(cond.id, { value: `${e.target.value};${currentEnd}` });
                        }}
                        className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs font-mono w-28"
                      />
                      <span className="text-gray-400 text-[10px]">au</span>
                      <input
                        type="date"
                        value={(cond.value || '').split(';')[1] || ''}
                        onChange={(e) => {
                          const currentStart = (cond.value || '').split(';')[0] || '';
                          onUpdateCondition(cond.id, { value: `${currentStart};${e.target.value}` });
                        }}
                        className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs font-mono w-28"
                      />
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={cond.value}
                      onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                      className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5 text-xs font-mono"
                    />
                  )
                ) : isCustom && customCol?.type === 'SELECT' ? (
                  <select
                    value={cond.value}
                    onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                    className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5 text-xs font-medium"
                  >
                    <option value="">Sélectionner...</option>
                    {selectOptions.filter(o => o.column_id === customCol.id).map(o => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={currentCol?.type === 'NUMBER' ? 'number' : 'text'}
                    value={cond.value}
                    onChange={(e) => onUpdateCondition(cond.id, { value: e.target.value })}
                    placeholder="Valeur..."
                    className="w-28 px-2 py-0.5 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-gray-100 focus:outline-none"
                  />
                )}

                {/* Remove Condition */}
                <button
                  onClick={() => onRemoveCondition(cond.id)}
                  className="text-gray-400 hover:text-red-500 font-bold ml-1"
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
