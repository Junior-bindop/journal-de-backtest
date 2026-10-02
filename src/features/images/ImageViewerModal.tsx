import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Trash2,
  RefreshCw,
  MessageSquare,
  Save,
  Check,
} from 'lucide-react';
import type { TradeImage } from '@/types';
import { ImageService } from '@/lib/storage/imageService';

interface ImageViewerModalProps {
  isOpen: boolean;
  images: TradeImage[];
  initialIndex: number;
  onClose: () => void;
  canEdit: boolean;
  associateName: string;
  tradeDate: string;
  tradeNumber: number;
  onImagesUpdated: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  images,
  initialIndex,
  onClose,
  canEdit,
  associateName,
  tradeDate,
  tradeNumber,
  onImagesUpdated,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [commentText, setCommentText] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [initialIndex, isOpen]);

  const currentImage = images[currentIndex];

  useEffect(() => {
    if (currentImage) {
      setCommentText(currentImage.comment || '');
    }
  }, [currentImage]);

  // Keyboard navigation & ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  if (!isOpen || !currentImage) return null;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.4, 4));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.4, 0.5));
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      handleResetZoom();
    } else {
      setScale(2);
    }
  };

  // Pan / Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Save comment
  const handleSaveComment = async () => {
    if (!currentImage) return;
    setIsSavingComment(true);
    try {
      await ImageService.updateComment(currentImage.id, commentText);
      setCommentSaved(true);
      setTimeout(() => setCommentSaved(false), 2000);
      onImagesUpdated();
    } finally {
      setIsSavingComment(false);
    }
  };

  // Safe Image Replacement
  const handleTriggerReplace = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentImage) return;

    setIsReplacing(true);
    try {
      await ImageService.replaceImage(
        currentImage.id,
        file,
        associateName,
        tradeDate,
        tradeNumber
      );
      onImagesUpdated();
    } catch (err: any) {
      alert(`Erreur de remplacement: ${err.message}`);
    } finally {
      setIsReplacing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete image
  const handleDeleteImage = async () => {
    if (!currentImage) return;
    if (!window.confirm('Voulez-vous supprimer définitivement cette capture ?')) return;

    await ImageService.deleteImage(currentImage.id);
    onImagesUpdated();
    if (images.length <= 1) {
      onClose();
    } else {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const imageSrc = ImageService.getImageUrl(currentImage, 'full');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md select-none">
      {/* Hidden file input for replacement */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Bar Controls */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-10 text-white">
        <div className="flex items-center space-x-3 text-sm">
          <span className="font-semibold text-emerald-400">
            Trade #{tradeNumber}
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-300">
            Image {currentIndex + 1} / {images.length}
          </span>
          <span className="text-xs text-gray-500 hidden sm:inline">
            ({currentImage.file_name})
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Zoom avant (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Zoom arrière (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Réinitialiser zoom"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {canEdit && (
            <>
              {/* Replace Image Button (Absolute Rule) */}
              <button
                onClick={handleTriggerReplace}
                disabled={isReplacing}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-gray-200 transition-colors"
                title="Remplacer l'image en toute sécurité (Upload vérifié avant suppression)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReplacing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Remplacer</span>
              </button>

              {/* Delete Image */}
              <button
                onClick={handleDeleteImage}
                className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                title="Supprimer cette capture"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors ml-2"
            title="Fermer (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Chevrons */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white transition-all z-20"
          title="Image précédente (Flèche gauche)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white transition-all z-20"
          title="Image suivante (Flèche droite)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Image Stage */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-12"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={imageSrc}
          alt={`Capture ${currentImage.file_name}`}
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            maxHeight: '80vh',
            maxWidth: '85vw',
            objectFit: 'contain',
          }}
          className="rounded shadow-2xl"
        />
      </div>

      {/* Bottom Bar: Per-Image Extensible Comment (Section 24) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
        <div className="bg-[#181818]/95 border border-gray-800 rounded-xl p-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <div className="flex items-center space-x-1.5 font-medium">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Commentaire de l'image</span>
            </div>
            {canEdit && (
              <button
                onClick={handleSaveComment}
                disabled={isSavingComment}
                className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-medium"
              >
                {commentSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Enregistré</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingComment ? 'Enregistrement...' : 'Enregistrer'}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={!canEdit}
            placeholder={canEdit ? "Ajoutez une analyse ou une note spécifique pour cette capture..." : "Aucun commentaire"}
            rows={2}
            className="w-full bg-[#111111] border border-gray-800 rounded-lg p-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 resize-y"
          />
        </div>
      </div>
    </div>
  );
};
