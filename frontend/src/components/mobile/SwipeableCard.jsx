import React, { useRef, useEffect } from 'react';

/**
 * SwipeableCard Component - Card with swipe gestures for mobile
 * 
 * Features:
 * - Swipe left/right with threshold
 * - Visual feedback during swipe
 * - Snap-back animation
 * - Customizable actions
 */
const SwipeableCard = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  threshold = 100,
  className = ''
}) => {
  const cardRef = useRef(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleTouchStart = (e) => {
    isDraggingRef.current = true;
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = 0;
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return;
    
    const delta = e.touches[0].clientX - startXRef.current;
    currentXRef.current = delta;
    
    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${delta}px) rotate(${delta * 0.05}deg)`;
      cardRef.current.style.opacity = 1 - Math.abs(delta) / 500;
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    
    const delta = currentXRef.current;
    
    if (Math.abs(delta) > threshold) {
      // Trigger swipe action
      if (delta > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (delta < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    // Reset position
    if (cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.opacity = '';
    }
    
    startXRef.current = 0;
    currentXRef.current = 0;
  };

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-200 ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

/**
 * useSwipe Hook - Detect swipe gestures on any element
 */
export const useSwipe = (callbacks = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50
  } = callbacks;

  const touchStart = useRef({ x: 0, y: 0, time: 0 });

  const handlers = {
    onTouchStart: (e) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    },
    
    onTouchEnd: (e) => {
      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
        time: Date.now()
      };
      
      const deltaX = touchEnd.x - touchStart.current.x;
      const deltaY = touchEnd.y - touchStart.current.y;
      const deltaTime = touchEnd.time - touchStart.current.time;
      
      // Ignore slow swipes
      if (deltaTime > 500) return;
      
      // Horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        }
      } 
      // Vertical swipe
      else {
        if (Math.abs(deltaY) > threshold) {
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
      }
    }
  };

  return handlers;
};

/**
 * SwipeIndicator Component - Visual feedback for swipe actions
 */
export const SwipeIndicator = ({ direction, icon, color, text }) => {
  const positions = {
    left: '-left-20 top-1/2 -translate-y-1/2',
    right: '-right-20 top-1/2 -translate-y-1/2',
    up: 'left-1/2 -translate-x-1/2 -top-20',
    down: 'left-1/2 -translate-x-1/2 -bottom-20'
  };

  return (
    <div 
      className={`absolute ${positions[direction]} flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}
      style={{ color }}
    >
      <div className="text-3xl">{icon}</div>
      {text && <span className="text-sm font-medium whitespace-nowrap">{text}</span>}
    </div>
  );
};

export default SwipeableCard;
