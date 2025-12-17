import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

export function AnimatedCounter({ value, duration = 1000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value === null || value === undefined) return;
    
    const start = count;
    const end = value;
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (end - start) * easeOut);
      
      setCount(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration, count]);

  return <span className="tabular-nums">{count.toLocaleString()}</span>;
}

AnimatedCounter.propTypes = {
  value: PropTypes.number,
  duration: PropTypes.number
};
