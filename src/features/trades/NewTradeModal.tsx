import React, { useState, useEffect } from 'react';
import { X, Plus, Upload, Image as ImageIcon, Calendar, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { generateUUID } from '@/utils/crypto';
import { ImageService } from '@/lib/storage/imageService';
import type { Trade, CustomColumn, SelectOption, PositionType, ResultType, TradeCustomValue } from '@/types';

interface NewTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  associateName: string;
  customColumns: CustomColumn[];
  selectOptions: SelectOption[];
  onTradeCreated: () => void;
}

export const NewTradeModal: React.FC<NewTradeModalProps> = ({
  isOpen,
  onClose,
  userId,
  associateName,
  customColumns,
  selectOptions,
  onTradeCreated,
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [asset, setAsset] = useState('XAUUSD');
  const [position, setPosition] = useState<PositionType>('BUY');
  const [result, setResult] = useState<ResultType>('TP');
  const [rrInput, setRrInput] = useState('2.50');
  const [session, setSession] = useState('LONDON');
  const [duration, setDuration] = useState('30-60');
  const [notes, setNotes] = useState('');

  // Custom values map: columnId -> value
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // Image files to attach
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Enforce Section 16 RR Rule:
  // If result is SL -> RR = -1.00
  // If result is BE -> RR = 0.00
  // If result is TP -> RR is user entered
  useEffect(() => {
    if (result === 'SL') {
      setRrInput('-1.00');
    } else if (result === 'BE') {
      setRrInput('0.00');
    } else if (result === 'TP' && (rrInput === '-1.00' || rrInput === '0.00')) {
      setRrInput('2.00');
    }
  }, [result]);

  // Handle Ctrl+V paste of images directly into the modal!
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            setAttachedFiles(prev => [...prev, file]);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter options
  const assetOptions = selectOptions.filter(o => o.system_column_key === 'asset' && o.user_id === userId);
  const sessionOptions = selectOptions.filter(o => o.system_column_key === 'session' && o.user_id === userId);
  const durationOptions = selectOptions.filter(o => o.system_column_key === 'duration' && o.user_id === userId);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const imageFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      setAttachedFiles(prev => [...prev, ...imageFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Calculate next sequential trade_number for this user
      const existingTrades = await db.trades.where('user_id').equals(userId).toArray();
      const maxNum = existingTrades.reduce((max, t) => Math.max(max, t.trade_number || 0), 0);
      const nextTradeNumber = maxNum + 1;

      const numRR = parseFloat(rrInput) || 0;

      const newTrade: Trade = {
        id: generateUUID(),
        user_id: userId,
        trade_number: nextTradeNumber,
        date,
        asset,
        position,
        result,
        rr: result === 'SL' ? -1.0 : result === 'BE' ? 0.0 : numRR,
        session,
        duration,
        notes: notes.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        version: 1,
        sync_status: 'pending_insert',
      };

      await db.trades.add(newTrade);

      // Queue trade sync operation
      await db.sync_queue.add({
        id: generateUUID(),
        user_id: userId,
        entity_type: 'trade',
        entity_id: newTrade.id,
        operation: 'INSERT',
        payload: newTrade,
        client_timestamp: new Date().toISOString(),
        status: 'pending',
      });

      // Save custom values
      const customValueInserts: TradeCustomValue[] = [];
      for (const [colId, val] of Object.entries(customFieldValues)) {
        if (val !== undefined && val !== null && val !== '') {
          const colDef = customColumns.find(c => c.id === colId);
          customValueInserts.push({
            id: generateUUID(),
            trade_id: newTrade.id,
            column_id: colId,
            value_text: colDef?.type === 'TEXT' || colDef?.type === 'SELECT' ? String(val) : undefined,
            value_number: colDef?.type === 'NUMBER' ? Number(val) : undefined,
            value_date: colDef?.type === 'DATE' ? String(val) : undefined,
            value_boolean: colDef?.type === 'CHECKBOX' ? Boolean(val) : undefined,
            value_json: colDef?.type === 'MULTI-SELECT' ? (val as string[]) : undefined,
            updated_at: new Date().toISOString(),
          });
        }
      }

      if (customValueInserts.length > 0) {
        await db.trade_custom_values.bulkAdd(customValueInserts);
      }

      // Process and attach images if any
      if (attachedFiles.length > 0) {
        await ImageService.addImagesToTrade(
          newTrade.id,
          userId,
          associateName,
          date,
          nextTradeNumber,
          attachedFiles
        );
      }

      onTradeCreated();
      onClose();
    } catch (err: any) {
      alert(`Erreur lors de la création du trade: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-2 text-gray-900 dark:text-white font-semibold text-base">
            <Plus className="w-5 h-5 text-emerald-500" />
            <span>Nouveau Trade de Backtest</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Row 1: Date & Asset */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Date (depuis 2000 et futur)
              </label>
              <div className="relative">
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Actif</label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-medium"
              >
                {assetOptions.length > 0 ? (
                  assetOptions.map(o => (
                    <option key={o.id} value={o.label}>
                      {o.label}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="XAUUSD">XAUUSD</option>
                    <option value="EURUSD">EURUSD</option>
                  </>
                )}
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
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow'
                      : 'bg-gray-50 dark:bg-[#141414] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setPosition('SELL')}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    position === 'SELL'
                      ? 'bg-red-500 text-white border-red-600 shadow'
                      : 'bg-gray-50 dark:bg-[#141414] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
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
                <option value="TP" className="text-emerald-600">TP (Take Profit)</option>
                <option value="SL" className="text-red-600">SL (Stop Loss)</option>
                <option value="BE" className="text-gray-600">BE (Break Even)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                RR {result === 'SL' && '(Auto: -1.00R)'} {result === 'BE' && '(Auto: 0.00R)'}
              </label>
              <input
                type="number"
                step="0.01"
                disabled={result === 'SL' || result === 'BE'}
                value={rrInput}
                onChange={(e) => setRrInput(e.target.value)}
                className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border ${
                  result === 'SL'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 cursor-not-allowed'
                    : result === 'BE'
                    ? 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30 cursor-not-allowed'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                }`}
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
                {sessionOptions.length > 0 ? (
                  sessionOptions.map(o => (
                    <option key={o.id} value={o.label}>{o.label}</option>
                  ))
                ) : (
                  <>
                    <option value="LONDON">LONDON</option>
                    <option value="NEW YORK">NEW YORK</option>
                    <option value="ASIAN">ASIAN</option>
                    <option value="LON-NEW">LON-NEW</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Durée (minutes)</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              >
                {durationOptions.length > 0 ? (
                  durationOptions.map(o => (
                    <option key={o.id} value={o.label}>{o.label}</option>
                  ))
                ) : (
                  <>
                    <option value="0-15">0-15 min</option>
                    <option value="15-30">15-30 min</option>
                    <option value="30-60">30-60 min</option>
                    <option value="60-180">60-180 min</option>
                    <option value="180-360">180-360 min</option>
                  </>
                )}
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
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notes & Confluences</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explications du setup, liquidité balayée, gestion du risque..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white resize-y"
            />
          </div>

          {/* Captures d'écran (Section 19: Glisser-déposer, Ctrl+V coller, sélecteur) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Captures d'écran (Collez Ctrl+V, glissez-déposez ou sélectionnez)
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 text-center hover:border-emerald-500/60 transition-colors bg-gray-50/50 dark:bg-[#161616]"
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <ImageIcon className="w-8 h-8 text-gray-400" />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Collez directement (Ctrl+V)</span> ou déposez vos fichiers ici
                </p>
                <label className="cursor-pointer text-xs px-3 py-1 bg-white dark:bg-[#222] border border-gray-300 dark:border-gray-600 rounded-md font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100">
                  <span>Parcourir mes fichiers</span>
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

              {/* Preview attached files */}
              {attachedFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  {attachedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-1.5 px-2.5 py-1 bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                    >
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-500 font-bold"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-md transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer le Trade'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
