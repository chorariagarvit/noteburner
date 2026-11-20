import { useState, useEffect } from 'react';
import { API_BASE } from '../utils/apiBase';

const API_URL = API_BASE;

export function useStats(refreshInterval = 30000) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_URL}/api/stats`);
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status}`);
        }
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
    
    // Refresh stats periodically
    const interval = setInterval(fetchStats, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { stats, loading, error };
}
