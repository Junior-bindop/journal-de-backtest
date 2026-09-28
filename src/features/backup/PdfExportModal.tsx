import React, { useRef } from 'react';
import { Printer, Download, X, FileText, CheckCircle } from 'lucide-react';
import { formatR } from '@/utils/statistics';
import type { Trade, TradeStats } from '@/types';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  stats: TradeStats;
  associateName: string;
  activeFiltersDescription: string;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  trades,
  stats,
  associateName,
  activeFiltersDescription,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les fenêtres pop-up pour générer le PDF.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rapport Backtest — ${associateName}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 12mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #111827;
              background: #fff;
              margin: 0;
              padding: 0;
              font-size: 11px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #10b981;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .title {
              font-size: 18px;
              font-weight: bold;
              color: #065f46;
            }
            .meta {
              font-size: 10px;
              color: #4b5563;
              text-align: right;
            }
            .kpis {
              display: flex;
              gap: 10px;
              margin-bottom: 14px;
            }
            .kpi-card {
              flex: 1;
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 8px 10px;
              text-align: center;
            }
            .kpi-label {
              font-size: 9px;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: 600;
            }
            .kpi-value {
              font-size: 15px;
              font-weight: bold;
              font-family: monospace;
              margin-top: 2px;
            }
            .text-green { color: #059669; }
            .text-red { color: #dc2626; }
            .text-gray { color: #4b5563; }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            th {
              background: #f3f4f6;
              border-bottom: 1.5px solid #d1d5db;
              text-align: left;
              padding: 6px 8px;
              font-weight: 700;
              color: #374151;
            }
            td {
              padding: 5px 8px;
              border-bottom: 1px solid #e5e7eb;
            }
            tr:nth-child(even) td {
              background: #fafafa;
            }
            .badge {
              display: inline-block;
              padding: 2px 5px;
              border-radius: 4px;
              font-size: 9px;
              font-weight: 700;
            }
            .badge-tp { background: #d1fae5; color: #065f46; }
            .badge-sl { background: #fee2e2; color: #991b1b; }
            .badge-be { background: #f3f4f6; color: #4b5563; }
            .badge-buy { background: #dcfce7; color: #166534; }
            .badge-sell { background: #ffe4e6; color: #9f1239; }
            .footer {
              margin-top: 15px;
              text-align: center;
              font-size: 9px;
              color: #9ca3af;
              border-top: 1px solid #e5e7eb;
              padding-top: 6px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#181818]">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Export PDF Professionnel des Trades
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / Enregistrer en PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Preview Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-100 dark:bg-[#121212]">
          <div
            ref={printAreaRef}
            className="bg-white text-gray-900 p-8 rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto"
          >
            {/* Header Document */}
            <div className="flex justify-between items-center border-b-2 border-emerald-500 pb-3 mb-4">
              <div>
                <h1 className="text-xl font-bold text-emerald-800">
                  Journal de Backtest — Rapport Officiel
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Espace Associé : <strong>{associateName}</strong> • Filtres : {activeFiltersDescription}
                </p>
              </div>
              <div className="text-right text-[11px] text-gray-500">
                <div>Généré le : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <div className="font-semibold text-emerald-700">{trades.length} trades sélectionnés</div>
              </div>
            </div>

            {/* KPI Summary Banner */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Total Trades</div>
                <div className="text-lg font-bold font-mono text-gray-900">{stats.totalTrades}</div>
                <div className="text-[9px] text-gray-400 font-bold mt-0.5">
                  <span className="text-emerald-600">{stats.totalTP} TP</span> •{' '}
                  <span className="text-red-600">{stats.totalSL} SL</span> •{' '}
                  <span>{stats.totalBE} BE</span>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Winrate</div>
                <div className="text-lg font-bold font-mono text-blue-600">{stats.winrate}%</div>
                <div className="text-[9px] text-gray-400 mt-0.5">Ratio de réussite</div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Total R</div>
                <div className={`text-lg font-bold font-mono ${stats.totalR >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatR(stats.totalR)}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5">Gain cumulé</div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Profit Factor</div>
                <div className="text-lg font-bold font-mono text-amber-600">{stats.profitFactor}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">Gains R / Pertes R</div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Max Drawdown</div>
                <div className="text-lg font-bold font-mono text-red-600">-{stats.maxDrawdownR.toFixed(2)}R</div>
                <div className="text-[9px] text-gray-400 mt-0.5">Pertes du sommet</div>
              </div>
            </div>

            {/* Trades Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 text-gray-700">
                    <th className="py-2 px-2.5 text-center">N°</th>
                    <th className="py-2 px-2.5">Date</th>
                    <th className="py-2 px-2.5">Actif</th>
                    <th className="py-2 px-2.5">Pos.</th>
                    <th className="py-2 px-2.5">Résultat</th>
                    <th className="py-2 px-2.5 text-right">RR</th>
                    <th className="py-2 px-2.5">Session</th>
                    <th className="py-2 px-2.5">Durée</th>
                    <th className="py-2 px-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {trades.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-gray-600">
                        #{t.trade_number}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono text-gray-800">{t.date}</td>
                      <td className="py-1.5 px-2.5 font-bold text-gray-900">{t.asset}</td>
                      <td className="py-1.5 px-2.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.position === 'BUY'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {t.position}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.result === 'TP'
                              ? 'bg-emerald-500 text-white'
                              : t.result === 'SL'
                              ? 'bg-red-700 text-white'
                              : 'bg-gray-500 text-white'
                          }`}
                        >
                          {t.result}
                        </span>
                      </td>
                      <td className={`py-1.5 px-2.5 text-right font-mono font-bold ${
                        t.result === 'SL' ? 'text-red-600' : t.result === 'BE' ? 'text-gray-500' : 'text-emerald-600'
                      }`}>
                        {formatR(t.rr)}
                      </td>
                      <td className="py-1.5 px-2.5 text-gray-700">{t.session}</td>
                      <td className="py-1.5 px-2.5 font-mono text-gray-500">{t.duration}m</td>
                      <td className="py-1.5 px-2.5 text-gray-600 max-w-xs truncate">{t.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-gray-200 text-center text-[10px] text-gray-400">
              Rapport généré par le Journal de Backtest & Archivage Long Terme • {trades.length} trades documentés
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
