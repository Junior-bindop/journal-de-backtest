/**
 * High-performance browser-side image processing, compression to WebP,
 * thumbnail generation, and strict folder hierarchy naming.
 */

export interface ProcessedImage {
  originalBlob: Blob;
  thumbnailBlob: Blob;
  originalDataUrl: string;
  thumbnailDataUrl: string;
  fileName: string;
  storagePath: string;
  thumbnailPath: string;
  fileSize: number;
}

/**
 * Generate formatted trade folder path:
 * {ASSOCIATE}/{YYYY-MM-DD}/TRADE_{000125}/{filename}
 */
export function generateImagePath(
  associateName: string,
  tradeDate: string,
  tradeNumber: number,
  index: number
): { storagePath: string; thumbnailPath: string; fileName: string } {
  const cleanAssociate = associateName.trim().replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
  const cleanDate = tradeDate || new Date().toISOString().split('T')[0];
  const paddedTradeNum = String(tradeNumber).padStart(6, '0');
  const paddedImgIndex = String(index).padStart(2, '0');

  const fileName = `image_${paddedImgIndex}.webp`;
  const thumbName = `thumb_${paddedImgIndex}.webp`;

  const folder = `${cleanAssociate}/${cleanDate}/TRADE_${paddedTradeNum}`;
  return {
    storagePath: `${folder}/${fileName}`,
    thumbnailPath: `${folder}/${thumbName}`,
    fileName,
  };
}

/**
 * Compresses an image File or Blob to WebP with target max dimensions and quality
 */
export async function compressImageToWebP(
  source: Blob | File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.85
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(source);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      // Smooth downsampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('WebP compression failed'));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              blob,
              dataUrl: reader.result as string,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for processing'));
    };

    img.src = url;
  });
}

/**
 * Generates both high-res WebP and lightweight thumbnail
 */
export async function processTradeImage(
  fileOrBlob: File | Blob,
  associateName: string,
  tradeDate: string,
  tradeNumber: number,
  index: number
): Promise<ProcessedImage> {
  const { storagePath, thumbnailPath, fileName } = generateImagePath(
    associateName,
    tradeDate,
    tradeNumber,
    index
  );

  // Original high-res WebP (1920px max)
  const original = await compressImageToWebP(fileOrBlob, 1920, 1080, 0.85);

  // Thumbnail WebP (240px max)
  const thumbnail = await compressImageToWebP(fileOrBlob, 240, 240, 0.75);

  return {
    originalBlob: original.blob,
    thumbnailBlob: thumbnail.blob,
    originalDataUrl: original.dataUrl,
    thumbnailDataUrl: thumbnail.dataUrl,
    fileName,
    storagePath,
    thumbnailPath,
    fileSize: original.blob.size,
  };
}
