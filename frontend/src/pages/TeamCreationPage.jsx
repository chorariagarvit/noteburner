import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeadersWithJSON } from '../utils/session';

export default function TeamCreationPage() {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: getAuthHeadersWithJSON(),
        body: JSON.stringify({
          name: teamName,
          plan: plan
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Team created successfully!' });
        setTimeout(() => {
          navigate(`/teams/${data.team.id}`);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create team' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error creating team' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Team</h1>

          {message && (
            <div className={`p-4 rounded-md mb-6 ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Name
              </label>
              <input
                type="text"
                id="team-name"
                name="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                placeholder="My Awesome Team"
              />
            </div>

            <div>
              <label htmlFor="plan" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plan
              </label>
              <select
                id="plan"
                name="plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="free">Free (5 members)</option>
                <option value="team">Team (20 members)</option>
                <option value="enterprise">Enterprise (100 members)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !teamName}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
