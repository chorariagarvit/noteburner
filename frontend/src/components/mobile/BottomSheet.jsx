import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * BottomSheet Component - Mobile-optimized modal that slides up from bottom
 * 
 * Features:
 * - Smooth slide-up animation
 * - Backdrop with tap-to-close
 * - Drag-to-close gesture
 * - Safe area support for notched devices
 * - Keyboard-aware (adjusts height)
 */
const BottomSheet = ({ 
  isOpen, 
  onClose, 
  children, 
  title,
  height = 'auto',
  showHandle = true,
  closeOnBackdrop = true 
}) => {
  const sheetRef = useRef(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Touch handlers for drag-to-close
  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = 0;
  };

  const handleTouchMove = (e) => {
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) { // Only allow downward drag
      currentYRef.current = delta;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${delta}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    if (currentYRef.current > 100) { // Drag threshold
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    startYRef.current = 0;
    currentYRef.current = 0;
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full bg-slate-800 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out"
        style={{ 
          maxHeight: height === 'auto' ? '90vh' : height,
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
          </div>
        )}
        
        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 id="bottom-sheet-title" className="text-xl font-bold text-white">
              {title}
            </h2>
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BottomSheet;
