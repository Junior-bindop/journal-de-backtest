import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { Trade } from '@/types';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
  canEdit: boolean;
  onSave: (tradeId: string, notes: string) => void;
}

export const NotesModal: React.FC<NotesModalProps> = ({ isOpen, onClose, trade, canEdit, onSave }) => {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (trade) {
      setNotes(trade.notes || '');
    }
  }, [trade]);

  if (!isOpen || !trade) return null;

  const handleSave = () => {
    if (canEdit) {
      onSave(trade.id, notes);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-gray-900 dark:text-white font-semibold text-base">Notes - Trade #{trade.trade_number}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canEdit}
            placeholder="Écrivez vos notes et confluences ici..."
            className="w-full h-64 p-4 text-sm bg-gray-50 dark:bg-[#141414] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white resize-y focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#181818]">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 mr-2">
            Fermer
          </button>
          {canEdit && (
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
