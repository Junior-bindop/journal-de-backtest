import React, { useState, useRef } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ShieldAlert,
  Archive,
  Info,
} from 'lucide-react';
import { useAuth } from '@/features/auth/authContext';
import { BackupService, type RestorationAnalysis } from './backupService';
import { ImageService } from '@/lib/storage/imageService';

interface BackupViewProps {
  onDataRefresh: () => void;
}

export const BackupView: React.FC<BackupViewProps> = ({ onDataRefresh }) => {
  const { currentUser, activeAssociate } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Restore state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<RestorationAnalysis | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStatus, setRestoreStatus] = useState('');
  const [restoreReport, setRestoreReport] = useState<string | null>(null);

  // Orphan files state
  const [orphans, setOrphans] = useState<string[] | null>(null);
  const [isScanningOrphans, setIsScanningOrphans] = useState(false);

  // 1. Full Export
  const handleFullExport = async () => {
    if (!activeAssociate) return;
    setIsExporting(true);
    setExportSuccessMessage(null);

    try {
      await BackupService.exportFullBackup(
        activeAssociate.id,
        activeAssociate.username,
        (percent, status) => {
          setExportProgress(percent);
          setExportStatus(status);
        }
      );
      setExportSuccessMessage(`Archive BACKUP_${activeAssociate.username} générée et téléchargée sur votre PC !`);
    } catch (err: any) {
      alert(`Erreur d'exportation: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. CSV Export
  const handleCsvExport = async () => {
    if (!activeAssociate) return;
    await BackupService.exportCSV(activeAssociate.id, activeAssociate.username);
  };

  // 3. JSON Export
  const handleJsonExport = async () => {
    if (!activeAssociate) return;
    await BackupService.exportJSON(activeAssociate.id, activeAssociate.username);
  };

  // 4. File selected for restore
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysis(null);
    setRestoreReport(null);

    try {
      const result = await BackupService.analyzeBackupFile(file);
      setAnalysis(result);
    } catch (err: any) {
      alert(`Erreur d'analyse: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 5. Execute Restore
  const handleExecuteRestore = async () => {
    if (!analysis || !activeAssociate) return;
    if (restoreMode === 'replace') {
      const confirmed = window.confirm(
        'ATTENTION : Le mode "Remplacement Complet" va effacer vos données actuelles et les remplacer par le contenu de la sauvegarde. Une sauvegarde de sécurité automatique préalable sera effectuée sur votre PC. Continuer ?'
      );
      if (!confirmed) return;
    }

    setIsRestoring(true);
    try {
      const result = await BackupService.executeRestoration(
        activeAssociate.id,
        activeAssociate.username,
        analysis,
        restoreMode,
        (percent, status) => {
          setRestoreProgress(percent);
          setRestoreStatus(status);
        }
      );

      setRestoreReport(result.message);
      setAnalysis(null);
      onDataRefresh();
    } catch (err: any) {
      alert(`Erreur lors de la restauration: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // 6. Scan for orphans
  const handleScanOrphans = async () => {
    setIsScanningOrphans(true);
    try {
      const found = await ImageService.findOrphanFiles();
      setOrphans(found);
    } finally {
      setIsScanningOrphans(false);
    }
  };

  // 7. Clean orphans
  const handleCleanOrphans = async () => {
    if (!orphans || orphans.length === 0) return;
    if (!window.confirm(`Supprimer définitivement ${orphans.length} fichiers orphelins ?`)) return;

    await ImageService.cleanOrphanFiles(orphans);
    alert(`${orphans.length} fichiers orphelins ont été nettoyés avec succès.`);
    setOrphans([]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
          <HardDrive className="w-6 h-6 text-emerald-500" />
          <span>Conservation Long Terme, Sauvegardes & Restauration</span>
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Règle d'or : Vos données vous appartiennent. Téléchargez des archives autonomes exploitables sur votre PC sans dépendance à l'hébergeur.
        </p>
      </div>

      {/* Grid: Export vs Restore */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* EXPORT PANEL */}
        <div className="p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs space-y-5">
          <div className="flex items-center space-x-2 text-base font-bold text-gray-900 dark:text-white">
            <Download className="w-5 h-5 text-emerald-500" />
            <span>Exporter mes Données sur mon PC</span>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Génère une archive ZIP complète comprenant l'intégralité de la base de données (JSON/CSV) ainsi que toutes les captures d'écran WebP classées par Date et N° de Trade.
          </p>

          {/* Progress bar during export */}
          {isExporting && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span>{exportStatus}</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="w-full bg-emerald-200 dark:bg-emerald-950 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {exportSuccessMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{exportSuccessMessage}</span>
            </div>
          )}

          {/* Main Full Export Button */}
          <button
            onClick={handleFullExport}
            disabled={isExporting}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <Archive className="w-4 h-4" />
            <span>
              {isExporting ? 'Génération de l\'archive ZIP...' : 'TÉLÉCHARGER L\'ARCHIVE COMPLÈTE (.ZIP)'}
            </span>
          </button>

          {/* Lightweight Secondary Exports */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Exports légers autonomes (sans images)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCsvExport}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-semibold bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleJsonExport}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-semibold bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-500" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* RESTORE PANEL */}
        <div className="p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs space-y-5">
          <div className="flex items-center space-x-2 text-base font-bold text-gray-900 dark:text-white">
            <Upload className="w-5 h-5 text-blue-500" />
            <span>Restaurer une Sauvegarde</span>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Processus en 8 étapes avec contrôle d'intégrité, prévisualisation du contenu et sauvegarde de sécurité automatique préalable.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!analysis && !isRestoring && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>{isAnalyzing ? 'Analyse de l\'archive...' : 'SÉLECTIONNER UN FICHIER DE SAUVEGARDE (.ZIP)'}</span>
            </button>
          )}

          {/* Analysis Result Modal / Card (Section 5: 8-step flow) */}
          {analysis && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">
                  Résumé de la Sauvegarde
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded font-bold">
                  Intégrité Validée
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-white/50 dark:bg-black/20 rounded">
                  <div className="text-gray-400 text-[10px]">Trades</div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white font-mono">{analysis.tradesCount}</div>
                </div>
                <div className="p-2 bg-white/50 dark:bg-black/20 rounded">
                  <div className="text-gray-400 text-[10px]">Captures</div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white font-mono">{analysis.imagesCount}</div>
                </div>
                <div className="p-2 bg-white/50 dark:bg-black/20 rounded">
                  <div className="text-gray-400 text-[10px]">Colonnes</div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white font-mono">{analysis.customColumnsCount}</div>
                </div>
              </div>

              {analysis.dateStart && (
                <div className="text-[11px] text-gray-600 dark:text-gray-300">
                  Période couverte : <strong>{analysis.dateStart}</strong> à <strong>{analysis.dateEnd}</strong>
                </div>
              )}

              {/* Mode choice */}
              <div className="space-y-1.5 pt-2 border-t border-blue-500/20">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Mode de restauration :</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRestoreMode('merge')}
                    className={`py-1.5 px-2 rounded-lg border font-medium ${
                      restoreMode === 'merge'
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white dark:bg-[#202020] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Fusion (Ajouter)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestoreMode('replace')}
                    className={`py-1.5 px-2 rounded-lg border font-medium ${
                      restoreMode === 'replace'
                        ? 'bg-red-600 text-white border-red-700'
                        : 'bg-white dark:bg-[#202020] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Remplacer tout
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAnalysis(null)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow"
                >
                  Confirmer la Restauration
                </button>
              </div>
            </div>
          )}

          {/* Restoration Progress */}
          {isRestoring && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-semibold text-blue-700 dark:text-blue-300">
                <span>{restoreStatus}</span>
                <span>{restoreProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-950 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${restoreProgress}%` }}
                />
              </div>
            </div>
          )}

          {restoreReport && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{restoreReport}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 51: Orphan Files Scanner */}
      <div className="p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trash2 className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Détecteur & Nettoyeur de Fichiers Orphelins
            </h3>
          </div>
          <button
            onClick={handleScanOrphans}
            disabled={isScanningOrphans}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-[#252525] text-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanningOrphans ? 'animate-spin' : ''}`} />
            <span>Analyser le stockage</span>
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Recherche les images résiduelles présentes dans le stockage qui ne sont plus rattachées à aucun trade actif.
        </p>

        {orphans !== null && (
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#151515] border border-gray-200 dark:border-gray-800 space-y-3">
            {orphans.length === 0 ? (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Aucun fichier orphelin détecté. Votre stockage est parfaitement propre.</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {orphans.length} fichier(s) orphelin(s) trouvé(s)
                  </span>
                  <button
                    onClick={handleCleanOrphans}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-sm"
                  >
                    Nettoyer définitivement
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-[11px] text-gray-400">
                  {orphans.map(o => <div key={o} className="truncate">{o}</div>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
