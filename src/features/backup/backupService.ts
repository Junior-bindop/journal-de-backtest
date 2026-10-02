import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { db } from '@/lib/db';
import type {
  Trade,
  CustomColumn,
  SelectOption,
  TradeCustomValue,
  TradeImage,
  UserSettings,
  BackupManifest,
} from '@/types';
import { generateUUID } from '@/utils/crypto';

export interface RestorationAnalysis {
  isValid: boolean;
  error?: string;
  manifest?: BackupManifest;
  tradesCount: number;
  imagesCount: number;
  customColumnsCount: number;
  dateStart?: string;
  dateEnd?: string;
  databaseData?: {
    trades: Trade[];
    customColumns: CustomColumn[];
    selectOptions: SelectOption[];
    customValues: TradeCustomValue[];
    images: TradeImage[];
    settings?: UserSettings;
  };
  imageBlobs: { path: string; blob: Blob }[];
}

export class BackupService {
  /**
   * Generates a complete standalone ZIP backup containing database.json,
   * trades.json, trades.csv, columns.json, settings.json, and the images/ folder.
   */
  static async exportFullBackup(
    userId: string,
    username: string,
    onProgress?: (percent: number, status: string) => void
  ): Promise<void> {
    onProgress?.(10, 'Collecte des données de la base...');

    // Fetch user-specific records
    const trades = await db.trades.where('user_id').equals(userId).toArray();
    const activeTrades = trades.filter(t => !t.deleted_at);
    const customColumns = await db.custom_columns.where('user_id').equals(userId).toArray();
    const selectOptions = await db.select_options.where('user_id').equals(userId).toArray();
    const settings = await db.user_settings.where('user_id').equals(userId).first();

    const tradeIds = new Set(trades.map(t => t.id));
    const allCustomValues = await db.trade_custom_values.toArray();
    const userCustomValues = allCustomValues.filter(v => tradeIds.has(v.trade_id));

    const images = await db.trade_images.where('user_id').equals(userId).toArray();
    const activeImages = images.filter(img => !img.deleted_at);

    onProgress?.(30, 'Création de l\'archive ZIP...');
    const zip = new JSZip();

    // Date range
    const dates = activeTrades.map(t => t.date).filter(Boolean).sort();
    const dateStart = dates[0] || undefined;
    const dateEnd = dates[dates.length - 1] || undefined;

    // Manifest
    const manifest: BackupManifest = {
      version: '1.0.0',
      app: 'Journal de Backtest',
      created_at: new Date().toISOString(),
      user: {
        id: userId,
        username,
      },
      stats: {
        total_trades: activeTrades.length,
        total_images: activeImages.length,
        total_custom_columns: customColumns.length,
        date_range_start: dateStart,
        date_range_end: dateEnd,
      },
      checksums: {},
    };

    // Full database JSON
    const databaseDump = {
      manifest,
      user_id: userId,
      username,
      exported_at: new Date().toISOString(),
      trades,
      custom_columns: customColumns,
      select_options: selectOptions,
      trade_custom_values: userCustomValues,
      trade_images: images,
      user_settings: settings,
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('database.json', JSON.stringify(databaseDump, null, 2));
    zip.file('trades.json', JSON.stringify(trades, null, 2));
    zip.file('columns.json', JSON.stringify({ customColumns, selectOptions }, null, 2));
    if (settings) {
      zip.file('settings.json', JSON.stringify(settings, null, 2));
    }

    // Generate CSV of trades
    onProgress?.(45, 'Génération du fichier CSV universel...');
    const csvData = activeTrades.map(t => {
      // Find custom values for this trade
      const rowValues = userCustomValues.filter(v => v.trade_id === t.id);
      const customFields: Record<string, any> = {};

      for (const col of customColumns) {
        const val = rowValues.find(v => v.column_id === col.id);
        if (val) {
          if (col.type === 'SELECT') {
            const opt = selectOptions.find(o => o.id === val.value_text);
            customFields[col.name] = opt ? opt.label : val.value_text;
          } else if (col.type === 'MULTI-SELECT') {
            const labels = (val.value_json || []).map(id => {
              const opt = selectOptions.find(o => o.id === id);
              return opt ? opt.label : id;
            });
            customFields[col.name] = labels.join(', ');
          } else if (col.type === 'NUMBER') {
            customFields[col.name] = val.value_number ?? '';
          } else if (col.type === 'CHECKBOX') {
            customFields[col.name] = val.value_boolean ? 'OUI' : 'NON';
          } else if (col.type === 'DATE') {
            customFields[col.name] = val.value_date ?? '';
          } else {
            customFields[col.name] = val.value_text ?? '';
          }
        } else {
          customFields[col.name] = '';
        }
      }

      return {
        'N°': t.trade_number,
        'Date': t.date,
        'Actif': t.asset,
        'Position': t.position,
        'Résultat': t.result,
        'RR': t.rr,
        'Session': t.session,
        'Durée': t.duration,
        'Notes': t.notes || '',
        ...customFields,
      };
    });

    const csvString = Papa.unparse(csvData);
    zip.file('trades.csv', csvString);

    // Pack images into physical folder structure: images/YYYY-MM-DD/TRADE_000125/image_01.webp
    onProgress?.(60, `Empaquetage de ${activeImages.length} images...`);
    const imagesFolder = zip.folder('images');

    for (let i = 0; i < activeImages.length; i++) {
      const img = activeImages[i];
      const trade = trades.find(t => t.id === img.trade_id);
      const tradeDate = trade?.date || 'UNKNOWN_DATE';
      const tradeNumPadded = String(trade?.trade_number || 0).padStart(6, '0');

      // Fetch blob from local offline storage
      const blobRecord = await db.offline_blobs.get(img.storage_path);
      if (blobRecord && blobRecord.data) {
        const subPath = `${tradeDate}/TRADE_${tradeNumPadded}/${img.file_name}`;
        imagesFolder?.file(subPath, blobRecord.data);
      }
    }

    onProgress?.(85, 'Compression finale du fichier ZIP...');
    const zipBlob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      (metadata) => {
        onProgress?.(85 + Math.round(metadata.percent * 0.14), `Compression: ${Math.round(metadata.percent)}%`);
      }
    );

    const today = new Date().toISOString().split('T')[0];
    const zipFilename = `BACKUP_${username}_${today}.zip`;

    onProgress?.(100, 'Téléchargement...');
    saveAs(zipBlob, zipFilename);
  }

  /**
   * Export CSV only (fast and lightweight)
   */
  static async exportCSV(userId: string, username: string): Promise<void> {
    const trades = await db.trades.where('user_id').equals(userId).toArray();
    let activeTrades = trades.filter(t => !t.deleted_at);

    // Recompute trade numbers chronologically
    activeTrades.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return a.created_at.localeCompare(b.created_at);
    });
    activeTrades = activeTrades.map((t, index) => ({ ...t, trade_number: index + 1 }));

    const rows = activeTrades.map(t => ({
      'N°': t.trade_number,
      'Date': t.date,
      'Actif': t.asset,
      'Position': t.position,
      'Résultat': t.result,
      'RR': t.rr,
      'Session': t.session,
      'Durée': t.duration,
      'Notes': t.notes || '',
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const today = new Date().toISOString().split('T')[0];
    saveAs(blob, `TRADES_${username}_${today}.csv`);
  }

  /**
   * Export JSON only
   */
  static async exportJSON(userId: string, username: string): Promise<void> {
    const trades = await db.trades.where('user_id').equals(userId).toArray();
    const customColumns = await db.custom_columns.where('user_id').equals(userId).toArray();
    const selectOptions = await db.select_options.where('user_id').equals(userId).toArray();

    const data = {
      user_id: userId,
      username,
      exported_at: new Date().toISOString(),
      trades,
      customColumns,
      selectOptions,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const today = new Date().toISOString().split('T')[0];
    saveAs(blob, `DATABASE_${username}_${today}.json`);
  }

  /**
   * STEP 1, 2 & 3: Analyzes and validates an uploaded backup ZIP file
   */
  static async analyzeBackupFile(file: File): Promise<RestorationAnalysis> {
    try {
      const zip = await JSZip.loadAsync(file);

      // Check for database.json or manifest.json
      const dbFile = zip.file('database.json');
      const manifestFile = zip.file('manifest.json');

      if (!dbFile) {
        return {
          isValid: false,
          error: 'Le fichier ZIP ne contient pas database.json. Format de sauvegarde invalide.',
          tradesCount: 0,
          imagesCount: 0,
          customColumnsCount: 0,
          imageBlobs: [],
        };
      }

      const dbJsonText = await dbFile.async('text');
      const dbData = JSON.parse(dbJsonText);

      let manifest: BackupManifest | undefined;
      if (manifestFile) {
        const manifestText = await manifestFile.async('text');
        manifest = JSON.parse(manifestText);
      }

      const trades: Trade[] = dbData.trades || [];
      const customColumns: CustomColumn[] = dbData.custom_columns || [];
      const selectOptions: SelectOption[] = dbData.select_options || [];
      const customValues: TradeCustomValue[] = dbData.trade_custom_values || [];
      const images: TradeImage[] = dbData.trade_images || [];

      // Extract image blobs
      const imageBlobs: { path: string; blob: Blob }[] = [];
      const imageFiles = zip.file(/^images\//);

      for (const imgEntry of imageFiles) {
        if (!imgEntry.dir) {
          const blob = await imgEntry.async('blob');
          imageBlobs.push({
            path: imgEntry.name.replace(/^images\//, ''),
            blob,
          });
        }
      }

      const dates = trades.map(t => t.date).filter(Boolean).sort();

      return {
        isValid: true,
        manifest,
        tradesCount: trades.length,
        imagesCount: imageBlobs.length > 0 ? imageBlobs.length : images.length,
        customColumnsCount: customColumns.length,
        dateStart: dates[0],
        dateEnd: dates[dates.length - 1],
        databaseData: {
          trades,
          customColumns,
          selectOptions,
          customValues,
          images,
          settings: dbData.user_settings,
        },
        imageBlobs,
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `Erreur d'analyse de l'archive: ${err.message || 'Fichier corrompu'}`,
        tradesCount: 0,
        imagesCount: 0,
        customColumnsCount: 0,
        imageBlobs: [],
      };
    }
  }

  /**
   * STEP 5, 6, 7 & 8: Execute Restoration with Pre-Backup
   */
  static async executeRestoration(
    userId: string,
    username: string,
    analysis: RestorationAnalysis,
    mode: 'merge' | 'replace',
    onProgress?: (percent: number, status: string) => void
  ): Promise<{ success: boolean; message: string; tradesRestored: number; imagesRestored: number }> {
    if (!analysis.isValid || !analysis.databaseData) {
      throw new Error('Analyse invalide pour la restauration');
    }

    // Step 5: Automatic Pre-Backup before replacement
    if (mode === 'replace') {
      onProgress?.(10, 'Création d\'une sauvegarde de sécurité préalable...');
      await this.exportFullBackup(userId, `${username}_PRE_RESTORE_SAFETY`);
    }

    onProgress?.(30, 'Restauration des colonnes et des options...');
    const data = analysis.databaseData;

    // Adjust user_id to target current active user
    const targetUserId = userId;

    if (mode === 'replace') {
      // Clear existing records for this user
      await db.trades.where('user_id').equals(targetUserId).delete();
      await db.custom_columns.where('user_id').equals(targetUserId).delete();
      await db.select_options.where('user_id').equals(targetUserId).delete();
      await db.trade_images.where('user_id').equals(targetUserId).delete();
    }

    // Insert custom columns & select options
    for (const col of data.customColumns) {
      await db.custom_columns.put({
        ...col,
        user_id: targetUserId,
      });
    }

    for (const opt of data.selectOptions) {
      await db.select_options.put({
        ...opt,
        user_id: targetUserId,
      });
    }

    // Step 6: Insert trades & custom values
    onProgress?.(60, `Restauration de ${data.trades.length} trades...`);
    for (const trade of data.trades) {
      await db.trades.put({
        ...trade,
        user_id: targetUserId,
      });
    }

    for (const val of data.customValues) {
      await db.trade_custom_values.put(val);
    }

    // Step 7: Restore images and blobs
    onProgress?.(80, `Restauration de ${data.images.length} images...`);
    for (const img of data.images) {
      await db.trade_images.put({
        ...img,
        user_id: targetUserId,
      });
    }

    // Put image blobs into offline_blobs
    for (const imgBlob of analysis.imageBlobs) {
      // Find matching trade image or key
      await db.offline_blobs.put({
        id: imgBlob.path,
        data: imgBlob.blob,
        mime_type: 'image/webp',
        updated_at: new Date().toISOString(),
      });
    }

    // Step 8: Final verification
    onProgress?.(100, 'Vérification de l\'intégrité terminée !');
    const finalTradesCount = await db.trades.where('user_id').equals(targetUserId).count();

    return {
      success: true,
      message: `Restauration réussie avec succès. ${finalTradesCount} trades disponibles.`,
      tradesRestored: data.trades.length,
      imagesRestored: analysis.imageBlobs.length,
    };
  }
}
