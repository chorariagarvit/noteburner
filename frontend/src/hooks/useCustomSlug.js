import { useState, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { checkSlugAvailability } from '../utils/api';

/**
 * Custom hook for handling custom slug validation
 * @returns {Object} - Slug state and handlers
 */
export function useCustomSlug() {
  const [customSlug, setCustomSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState(''); // 'checking', 'available', 'unavailable', 'invalid'
  const [slugError, setSlugError] = useState('');

  // Debounced slug validation
  const checkSlug = useCallback(
    debounce(async (slug) => {
      if (!slug) {
        setSlugStatus('');
        setSlugError('');
        return;
      }

      setSlugStatus('checking');
      try {
        const result = await checkSlugAvailability(slug);
        if (result.available) {
          setSlugStatus('available');
          setSlugError('');
        } else {
          setSlugStatus('unavailable');
          setSlugError(result.error || 'This custom URL is not available');
        }
      } catch (err) {
        setSlugStatus('invalid');
        setSlugError(err.message || 'Invalid custom URL');
      }
    }, 500),
    []
  );

  const handleCustomSlugChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    setCustomSlug(value);
    checkSlug(value);
  };

  const resetSlug = () => {
    setCustomSlug('');
    setSlugStatus('');
    setSlugError('');
  };

  return {
    customSlug,
    slugStatus,
    slugError,
    handleCustomSlugChange,
    setCustomSlug,
    resetSlug
  };
}
