import { db } from '@/lib/db';
import { processTradeImage, type ProcessedImage } from '@/utils/imageProcessor';
import { generateUUID } from '@/utils/crypto';
import type { TradeImage } from '@/types';

/**
 * Service managing image storage, ensuring the ABSOLUTE RULE for safe replacement:
 * NEVER delete an old image before the new one is successfully processed and committed.
 */
export class ImageService {
  /**
   * Adds one or multiple images to a trade
   */
  static async addImagesToTrade(
    tradeId: string,
    userId: string,
    associateName: string,
    tradeDate: string,
    tradeNumber: number,
    files: (File | Blob)[],
    comments: string[] = []
  ): Promise<TradeImage[]> {
    const existingImages = await db.trade_images
      .where('trade_id')
      .equals(tradeId)
      .and(img => !img.deleted_at)
      .toArray();

    let startIndex = existingImages.length + 1;
    const addedRecords: TradeImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const comment = comments[i] || '';

      // 1. Compress to WebP & generate paths
      const processed: ProcessedImage = await processTradeImage(
        file,
        associateName,
        tradeDate,
        tradeNumber,
        startIndex + i
      );

      // 2. Save blobs into local offline storage
      await db.offline_blobs.bulkPut([
        {
          id: processed.storagePath,
          data: processed.originalBlob,
          mime_type: 'image/webp',
          updated_at: new Date().toISOString(),
        },
        {
          id: processed.thumbnailPath,
          data: processed.thumbnailBlob,
          mime_type: 'image/webp',
          updated_at: new Date().toISOString(),
        },
      ]);

      // 3. Create metadata record
      const imageRecord: TradeImage = {
        id: generateUUID(),
        trade_id: tradeId,
        user_id: userId,
        file_name: processed.fileName,
        storage_path: processed.storagePath,
        thumbnail_path: processed.thumbnailPath,
        mime_type: 'image/webp',
        file_size: processed.fileSize,
        comment,
        sort_order: startIndex + i,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        data_url: processed.originalDataUrl,
        thumbnail_data_url: processed.thumbnailDataUrl,
      };

      await db.trade_images.add(imageRecord);

      // Queue sync operation for cloud push
      await db.sync_queue.add({
        id: generateUUID(),
        user_id: userId,
        entity_type: 'trade_image',
        entity_id: imageRecord.id,
        operation: 'INSERT',
        payload: {
          ...imageRecord,
          data_url: undefined, // don't bloat sync log with data url
          thumbnail_data_url: undefined,
        },
        client_timestamp: new Date().toISOString(),
        status: 'pending',
      });

      addedRecords.push(imageRecord);
    }

    return addedRecords;
  }

  /**
   * ABSOLUTE RULE FOR REPLACEMENT:
   * 1. Process new image
   * 2. Store new file in storage/blobs
   * 3. Verify success
   * 4. Update DB reference
   * 5. ONLY THEN delete the old image files
   */
  static async replaceImage(
    oldImageId: string,
    newFile: File | Blob,
    associateName: string,
    tradeDate: string,
    tradeNumber: number
  ): Promise<TradeImage> {
    // Fetch existing image
    const oldImage = await db.trade_images.get(oldImageId);
    if (!oldImage) {
      throw new Error(`Image ${oldImageId} not found`);
    }

    const oldStoragePath = oldImage.storage_path;
    const oldThumbPath = oldImage.thumbnail_path;

    // Step 1 & 2: Process and prepare the NEW image
    const processed = await processTradeImage(
      newFile,
      associateName,
      tradeDate,
      tradeNumber,
      oldImage.sort_order
    );

    // Step 3: Put new blobs in storage FIRST
    await db.offline_blobs.bulkPut([
      {
        id: processed.storagePath,
        data: processed.originalBlob,
        mime_type: 'image/webp',
        updated_at: new Date().toISOString(),
      },
      {
        id: processed.thumbnailPath,
        data: processed.thumbnailBlob,
        mime_type: 'image/webp',
        updated_at: new Date().toISOString(),
      },
    ]);

    // Step 4: Atomically update DB record
    const updatedRecord: TradeImage = {
      ...oldImage,
      file_name: processed.fileName,
      storage_path: processed.storagePath,
      thumbnail_path: processed.thumbnailPath,
      file_size: processed.fileSize,
      data_url: processed.originalDataUrl,
      thumbnail_data_url: processed.thumbnailDataUrl,
      updated_at: new Date().toISOString(),
    };

    await db.trade_images.put(updatedRecord);

    // Queue sync operation for update
    await db.sync_queue.add({
      id: generateUUID(),
      user_id: oldImage.user_id,
      entity_type: 'trade_image',
      entity_id: oldImage.id,
      operation: 'UPDATE',
      payload: {
        id: oldImage.id,
        storage_path: processed.storagePath,
        thumbnail_path: processed.thumbnailPath,
        file_size: processed.fileSize,
      },
      client_timestamp: new Date().toISOString(),
      status: 'pending',
    });

    // Step 5: SUCCESS CONFIRMED. Now safely delete old blobs
    if (oldStoragePath !== processed.storagePath) {
      await db.offline_blobs.delete(oldStoragePath);
    }
    if (oldThumbPath && oldThumbPath !== processed.thumbnailPath) {
      await db.offline_blobs.delete(oldThumbPath);
    }

    return updatedRecord;
  }

  /**
   * Deletes an image reference and removes associated storage blobs
   */
  static async deleteImage(imageId: string): Promise<void> {
    const img = await db.trade_images.get(imageId);
    if (!img) return;

    // Soft delete or remove from DB
    await db.trade_images.delete(imageId);

    // Remove blobs
    if (img.storage_path) {
      await db.offline_blobs.delete(img.storage_path);
    }
    if (img.thumbnail_path) {
      await db.offline_blobs.delete(img.thumbnail_path);
    }

    // Queue delete operation
    await db.sync_queue.add({
      id: generateUUID(),
      user_id: img.user_id,
      entity_type: 'trade_image',
      entity_id: imageId,
      operation: 'DELETE',
      payload: { id: imageId, storage_path: img.storage_path },
      client_timestamp: new Date().toISOString(),
      status: 'pending',
    });
  }

  /**
   * Updates an image comment
   */
  static async updateComment(imageId: string, comment: string): Promise<void> {
    const img = await db.trade_images.get(imageId);
    if (!img) return;

    await db.trade_images.update(imageId, {
      comment,
      updated_at: new Date().toISOString(),
    });

    await db.sync_queue.add({
      id: generateUUID(),
      user_id: img.user_id,
      entity_type: 'trade_image',
      entity_id: imageId,
      operation: 'UPDATE',
      payload: { id: imageId, comment },
      client_timestamp: new Date().toISOString(),
      status: 'pending',
    });
  }

  /**
   * Scans for orphaned storage files (files not linked to any active trade_image)
   */
  static async findOrphanFiles(): Promise<string[]> {
    const allBlobs = await db.offline_blobs.toArray();
    const activeImages = await db.trade_images.filter(img => !img.deleted_at).toArray();

    const referencedPaths = new Set<string>();
    for (const img of activeImages) {
      if (img.storage_path) referencedPaths.add(img.storage_path);
      if (img.thumbnail_path) referencedPaths.add(img.thumbnail_path);
    }

    const orphans: string[] = [];
    for (const blob of allBlobs) {
      if (!referencedPaths.has(blob.id)) {
        orphans.push(blob.id);
      }
    }

    return orphans;
  }

  /**
   * Cleans confirmed orphan files
   */
  static async cleanOrphanFiles(orphanPaths: string[]): Promise<number> {
    await db.offline_blobs.bulkDelete(orphanPaths);
    return orphanPaths.length;
  }
}
