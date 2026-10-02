import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Calendar, Upload, Image as ImageIcon } from 'lucide-react';
import { db } from '@/lib/db';
import { ImageService } from '@/lib/storage/imageService';
import { SyncService } from '@/lib/sync/syncService';
import type { Trade, CustomColumn, SelectOption, PositionType, ResultType, TradeCustomValue, TradeImage } from '@/types';

interface EditTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade;
  userId: string;
  associateName: string;
  customColumns: CustomColumn[];
  selectOptions: SelectOption[];
  customValues: TradeCustomValue[];
  images: TradeImage[];
  onTradeUpdated: () => void;
  onOpenImageViewer: (trade: Trade, index: number) => void;
}

export const EditTradeModal: React.FC<EditTradeModalProps> = ({
  isOpen,
  onClose,
  trade,
  userId,
  associateName,
  customColumns,
  selectOptions,
  customValues,
  images,
  onTradeUpdated,
  onOpenImageViewer,
}) => {
  const [date, setDate] = useState(trade.date);
  const [asset, setAsset] = useState(trade.asset);
  const [position, setPosition] = useState<PositionType>(trade.position);
  const [result, setResult] = useState<ResultType>(trade.result);
  const [rrInput, setRrInput] = useState(String(trade.rr));
  const [session, setSession] = useState(trade.session);
  const [duration, setDuration] = useState(trade.duration);
  const [notes, setNotes] = useState(trade.notes || '');

  // Custom values
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize custom field values for this trade
  useEffect(() => {
    const map: Record<string, any> = {};
    for (const col of customColumns) {
      const v = customValues.find(cv => cv.trade_id === trade.id && cv.column_id === col.id);
      if (v) {
        if (col.type === 'CHECKBOX') map[col.id] = v.value_boolean;
        else if (col.type === 'NUMBER') map[col.id] = v.value_number;
        else if (col.type === 'MULTI-SELECT') map[col.id] = v.value_json || [];
        else map[col.id] = v.value_text || v.value_date || '';
      } else {
        if (col.type === 'CHECKBOX') map[col.id] = false;
        else if (col.type === 'MULTI-SELECT') map[col.id] = [];
        else map[col.id] = '';
      }
    }
    setCustomFieldValues(map);
  }, [trade, customColumns, customValues]);

  // Enforce Section 16 RR Rule
  useEffect(() => {
    if (result === 'SL') {
      setRrInput('-1.00');
    } else if (result === 'BE') {
      setRrInput('0.00');
    } else if (result === 'TP' && (rrInput === '-1.00' || rrInput === '0.00')) {
      setRrInput('2.00');
    }
  }, [result]);

  // Clipboard paste listener
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) setAttachedFiles(prev => [...prev, file]);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const assetOptions = selectOptions.filter(o => o.system_column_key === 'asset' && o.user_id === userId);
  const sessionOptions = selectOptions.filter(o => o.system_column_key === 'session' && o.user_id === userId);
  const durationOptions = selectOptions.filter(o => o.system_column_key === 'duration' && o.user_id === userId);

  const tradeImages = images.filter(img => img.trade_id === trade.id && !img.deleted_at);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const numRR = parseFloat(rrInput) || 0;
      const finalRR = result === 'SL' ? -1.0 : result === 'BE' ? 0.0 : numRR;

      // Update trade in DB
      await db.trades.update(trade.id, {
        date,
        asset,
        position,
        result,
        rr: finalRR,
        session,
        duration,
        notes: notes.trim(),
        updated_at: new Date().toISOString(),
        version: (trade.version || 1) + 1,
        sync_status: 'pending_update',
      });

      // Update custom values
      for (const [colId, val] of Object.entries(customFieldValues)) {
        const colDef = customColumns.find(c => c.id === colId);
        const existing = customValues.find(v => v.trade_id === trade.id && v.column_id === colId);

        const record: TradeCustomValue = {
          id: existing?.id || crypto.randomUUID(),
          trade_id: trade.id,
          column_id: colId,
          value_text: colDef?.type === 'TEXT' || colDef?.type === 'SELECT' ? String(val || '') : undefined,
          value_number: colDef?.type === 'NUMBER' ? Number(val) : undefined,
          value_date: colDef?.type === 'DATE' ? String(val || '') : undefined,
          value_boolean: colDef?.type === 'CHECKBOX' ? Boolean(val) : undefined,
          value_json: colDef?.type === 'MULTI-SELECT' ? (val as string[]) : undefined,
          updated_at: new Date().toISOString(),
        };
        await db.trade_custom_values.put(record);
        SyncService.pushTradeCustomValue(record).catch(console.error);
      }

      const updatedTrade = await db.trades.get(trade.id);
      if (updatedTrade) {
        SyncService.pushTrade(updatedTrade).catch(console.error);
      }

      // Upload newly attached images
      if (attachedFiles.length > 0) {
        await ImageService.addImagesToTrade(
          trade.id,
          userId,
          associateName,
          date,
          trade.trade_number,
          attachedFiles
        );
      }

      onTradeUpdated();
      onClose();
    } catch (err: any) {
      alert(`Erreur de modification: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-2.5">
            <span className="font-mono text-sm px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              Trade #{trade.trade_number}
            </span>
            <span className="text-gray-900 dark:text-white font-semibold text-base">
              Modifier le Trade
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Row 1: Date & Asset */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                min="2000-01-01"
                max="2040-12-31"
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Actif</label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-bold"
              >
                {assetOptions.map(o => (
                  <option key={o.id} value={o.label}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Position, Result, RR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Position</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPosition('BUY')}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    position === 'BUY'
                      ? 'bg-emerald-500 text-white border-emerald-600'
                      : 'bg-gray-50 dark:bg-[#141414] text-gray-700 dark:text-gray-300'
                  }`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setPosition('SELL')}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    position === 'SELL'
                      ? 'bg-red-500 text-white border-red-600'
                      : 'bg-gray-50 dark:bg-[#141414] text-gray-700 dark:text-gray-300'
                  }`}
                >
                  SELL
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Résultat</label>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as ResultType)}
                className={`w-full px-3 py-2 text-xs font-bold rounded-lg border ${
                  result === 'TP'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                    : result === 'SL'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/40'
                    : 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/40'
                }`}
              >
                <option value="TP">TP (Take Profit)</option>
                <option value="SL">SL (Stop Loss)</option>
                <option value="BE">BE (Break Even)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                RR {result === 'SL' && '(-1.00R)'} {result === 'BE' && '(0.00R)'}
              </label>
              <input
                type="number"
                step="0.01"
                disabled={result === 'SL' || result === 'BE'}
                value={rrInput}
                onChange={(e) => setRrInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border bg-gray-50 dark:bg-[#141414] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Row 3: Session & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Session</label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              >
                {sessionOptions.map(o => (
                  <option key={o.id} value={o.label}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Durée (minutes)</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              >
                {durationOptions.map(o => (
                  <option key={o.id} value={o.label}>{o.label} min</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Custom Columns if defined */}
          {customColumns.length > 0 && (
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Colonnes Personnalisées
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customColumns.map((col) => {
                  const colOptions = selectOptions.filter(o => o.column_id === col.id);

                  if (col.type === 'SELECT') {
                    return (
                      <div key={col.id}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{col.name}</label>
                        <select
                          value={customFieldValues[col.id] || ''}
                          onChange={(e) => setCustomFieldValues({ ...customFieldValues, [col.id]: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                        >
                          <option value="">Sélectionner...</option>
                          {colOptions.map(o => (
                            <option key={o.id} value={o.id}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (col.type === 'CHECKBOX') {
                    return (
                      <div key={col.id} className="flex items-center space-x-2 pt-4">
                        <input
                          type="checkbox"
                          id={`col_${col.id}`}
                          checked={Boolean(customFieldValues[col.id])}
                          onChange={(e) => setCustomFieldValues({ ...customFieldValues, [col.id]: e.target.checked })}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <label htmlFor={`col_${col.id}`} className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {col.name}
                        </label>
                      </div>
                    );
                  }

                  return (
                    <div key={col.id}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{col.name}</label>
                      <input
                        type={col.type === 'NUMBER' ? 'number' : col.type === 'DATE' ? 'date' : 'text'}
                        value={customFieldValues[col.id] || ''}
                        onChange={(e) => setCustomFieldValues({ ...customFieldValues, [col.id]: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white resize-y"
            />
          </div>

          {/* Existing Captures Preview */}
          {tradeImages.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Captures existantes ({tradeImages.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {tradeImages.map((img, idx) => (
                  <div
                    key={img.id}
                    onClick={() => {
                      onOpenImageViewer(trade, idx);
                      onClose();
                    }}
                    className="relative w-16 h-16 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-black/10 group"
                  >
                    <img
                      src={ImageService.getImageUrl(img, 'thumbnail')}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold">
                      Voir
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add more images */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Ajouter d'autres captures (Ctrl+V ou sélectionner)
            </label>
            <label className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-[#141414] border border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
              <Upload className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {attachedFiles.length > 0 ? `${attachedFiles.length} nouvelle(s) image(s) prête(s)` : 'Sélectionner des images'}
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-md transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer les Modifications'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
