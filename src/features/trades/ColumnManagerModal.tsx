import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings, Tag, Palette } from 'lucide-react';
import { db } from '@/lib/db';
import { generateUUID } from '@/utils/crypto';
import { SyncService } from '@/lib/sync/syncService';
import type { CustomColumn, SelectOption, ColumnDataType } from '@/types';

interface ColumnManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  customColumns: CustomColumn[];
  selectOptions: SelectOption[];
  onColumnsChanged: () => void;
}

const PRESET_COLORS = [
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#F59E0B', // amber
  '#EF4444', // red
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#64748B', // slate
];

export const ColumnManagerModal: React.FC<ColumnManagerModalProps> = ({
  isOpen,
  onClose,
  userId,
  customColumns,
  selectOptions,
  onColumnsChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'columns' | 'system_options'>('columns');

  // New column state
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<ColumnDataType>('SELECT');

  // Selected column for option management
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);

  // New option state
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionColor, setNewOptionColor] = useState(PRESET_COLORS[0]);

  // System options category
  const [selectedSystemKey, setSelectedSystemKey] = useState<string>('asset');

  // Optimistic local state for instantaneous responsiveness
  const [localCols, setLocalCols] = useState<CustomColumn[]>(customColumns);
  const [localOpts, setLocalOpts] = useState<SelectOption[]>(selectOptions);

  useEffect(() => {
    setLocalCols(customColumns);
  }, [customColumns]);

  useEffect(() => {
    setLocalOpts(selectOptions);
  }, [selectOptions]);

  if (!isOpen) return null;

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const newCol: CustomColumn = {
      id: generateUUID(),
      user_id: userId,
      name: newColName.trim(),
      type: newColType,
      sort_order: localCols.length + 1,
      is_visible: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Instant optimistic update
    setLocalCols(prev => [...prev, newCol]);
    setNewColName('');
    if (newColType === 'SELECT' || newColType === 'MULTI-SELECT') {
      setSelectedColumnId(newCol.id);
    }

    // Persist async
    await db.custom_columns.add(newCol);
    SyncService.pushCustomColumn(newCol).catch(console.error);
    onColumnsChanged();
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!window.confirm('Voulez-vous supprimer cette colonne et toutes ses valeurs associées ?')) return;

    // Instant optimistic update
    setLocalCols(prev => prev.filter(c => c.id !== columnId));
    setLocalOpts(prev => prev.filter(o => o.column_id !== columnId));
    if (selectedColumnId === columnId) setSelectedColumnId(null);

    // Persist async
    await db.custom_columns.delete(columnId);
    await db.select_options.where('column_id').equals(columnId).delete();
    await db.trade_custom_values.where('column_id').equals(columnId).delete();
    SyncService.deleteFromCloud('custom_columns', columnId).catch(console.error);
    onColumnsChanged();
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptionLabel.trim()) return;

    const isSystem = activeTab === 'system_options';
    const newOpt: SelectOption = {
      id: generateUUID(),
      column_id: isSystem ? null : selectedColumnId,
      system_column_key: isSystem ? selectedSystemKey : null,
      user_id: userId,
      label: newOptionLabel.trim(),
      color: newOptionColor,
      sort_order: localOpts.length + 1,
      created_at: new Date().toISOString(),
    };

    // Instant optimistic update
    setLocalOpts(prev => [...prev, newOpt]);
    setNewOptionLabel('');

    // Persist async
    await db.select_options.add(newOpt);
    SyncService.pushSelectOption(newOpt).catch(console.error);
    onColumnsChanged();
  };

  const handleDeleteOption = async (optionId: string) => {
    // Instant optimistic update
    setLocalOpts(prev => prev.filter(o => o.id !== optionId));

    // Persist async
    await db.select_options.delete(optionId);
    SyncService.deleteFromCloud('select_options', optionId).catch(console.error);
    onColumnsChanged();
  };

  // Filter options for current view
  const currentOptions = localOpts.filter((opt) => {
    if (activeTab === 'columns') {
      return opt.column_id === selectedColumnId;
    } else {
      return opt.system_column_key === selectedSystemKey && opt.user_id === userId;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-2 text-gray-900 dark:text-white font-semibold text-base">
            <Settings className="w-5 h-5 text-emerald-500" />
            <span>Gestion des Colonnes & Propriétés Notion</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-6 bg-gray-50 dark:bg-[#181818]">
          <button
            onClick={() => setActiveTab('columns')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'columns'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Colonnes Personnalisées ({localCols.length})
          </button>
          <button
            onClick={() => setActiveTab('system_options')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'system_options'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Options Système (Actifs, Sessions, Durées)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'columns' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Column list & creation */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Créer une nouvelle colonne
                </h3>
                <form onSubmit={handleAddColumn} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nom de la colonne</label>
                    <input
                      type="text"
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      placeholder="Ex: Setup, Émotion, Confluence..."
                      className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type de donnée</label>
                    <select
                      value={newColType}
                      onChange={(e) => setNewColType(e.target.value as ColumnDataType)}
                      className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                    >
                      <option value="SELECT">SELECT (Choix unique avec badges)</option>
                      <option value="MULTI-SELECT">MULTI-SELECT (Choix multiples)</option>
                      <option value="TEXT">TEXT (Texte libre)</option>
                      <option value="NUMBER">NUMBER (Nombre)</option>
                      <option value="DATE">DATE (Calendrier)</option>
                      <option value="CHECKBOX">CHECKBOX (Case à cocher)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter la colonne</span>
                  </button>
                </form>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">
                    Colonnes existantes
                  </h4>
                  {localCols.length === 0 ? (
                    <p className="text-xs text-gray-500">Aucune colonne personnalisée créée.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {localCols.map((col) => {
                        const isSelect = col.type === 'SELECT' || col.type === 'MULTI-SELECT';
                        return (
                          <div
                            key={col.id}
                            onClick={() => isSelect && setSelectedColumnId(col.id)}
                            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              selectedColumnId === col.id
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                                : 'bg-gray-50 dark:bg-[#222222] border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <Tag className="w-3.5 h-3.5" />
                              <span>{col.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {col.type}
                              </span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteColumn(col.id);
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              title="Supprimer la colonne"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Manage Options for Select/Multi-Select */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 md:pl-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {selectedColumnId
                    ? `Options pour "${localCols.find(c => c.id === selectedColumnId)?.name}"`
                    : "Sélectionnez une colonne Select"}
                </h3>

                {selectedColumnId ? (
                  <>
                    <form onSubmit={handleAddOption} className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Nom de l'option</label>
                        <input
                          type="text"
                          value={newOptionLabel}
                          onChange={(e) => setNewOptionLabel(e.target.value)}
                          placeholder="Ex: Confirmation M15, Liquidity grab..."
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Couleur du badge</label>
                        <div className="flex items-center space-x-2">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewOptionColor(c)}
                              style={{ backgroundColor: c }}
                              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                                newOptionColor === c ? 'scale-125 border-white shadow' : 'border-transparent'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter l'option</span>
                      </button>
                    </form>

                    <div className="space-y-1 pt-3">
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase">Options configurées</h4>
                      {currentOptions.length === 0 ? (
                        <p className="text-xs text-gray-500">Aucune option définie.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {currentOptions.map((opt) => (
                            <span
                              key={opt.id}
                              style={{ backgroundColor: `${opt.color}20`, borderColor: `${opt.color}60`, color: opt.color }}
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border"
                            >
                              <span>{opt.label}</span>
                              <button
                                onClick={() => handleDeleteOption(opt.id)}
                                className="hover:opacity-75 font-bold"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    Sélectionnez une colonne de type SELECT ou MULTI-SELECT à gauche pour configurer ses étiquettes et couleurs.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* System Options: Assets, Sessions, Durations */
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-gray-500">Catégorie :</span>
                {['asset', 'session', 'duration'].map((catKey) => (
                  <button
                    key={catKey}
                    onClick={() => setSelectedSystemKey(catKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-colors ${
                      selectedSystemKey === catKey
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {catKey === 'asset' ? 'Actifs (EURUSD, XAUUSD...)' : catKey === 'session' ? 'Sessions' : 'Durées'}
                  </button>
                ))}
              </div>

              {/* Add system option */}
              <form onSubmit={handleAddOption} className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  placeholder={`Ajouter un ${selectedSystemKey}...`}
                  className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white min-w-[200px]"
                  required
                />

                <div className="flex items-center space-x-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewOptionColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-full border-2 ${
                        newOptionColor === c ? 'scale-125 border-white shadow' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </form>

              {/* List of current options */}
              <div className="pt-2">
                <div className="flex flex-wrap gap-2">
                  {currentOptions.map((opt) => (
                    <span
                      key={opt.id}
                      style={{ backgroundColor: `${opt.color}25`, borderColor: `${opt.color}70`, color: opt.color }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-bold border"
                    >
                      <span>{opt.label}</span>
                      <button
                        onClick={() => handleDeleteOption(opt.id)}
                        className="hover:opacity-75 font-bold ml-1"
                        title="Supprimer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
