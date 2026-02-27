import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Plus, Crown, Shield, Eye, UserCheck } from 'lucide-react';
import { getAuthHeaders } from '../utils/session';

export default function MyTeamsPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load teams');
      }

      const data = await response.json();
      setTeams(data.teams || []);
    } catch (err) {
      console.error('Failed to load teams:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4 text-amber-500" />;
      case 'member':
        return <UserCheck className="w-4 h-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300';
      case 'member':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300';
      case 'viewer':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case 'enterprise':
        return 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300';
      case 'team':
        return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300';
      case 'free':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12 text-gray-900 dark:text-gray-100">
            Loading teams...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                My Teams
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your team workspaces and collaborate with others
              </p>
            </div>
            <Link
              to="/teams/new"
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Team
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No teams yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first team to start collaborating and managing messages together
            </p>
            <Link
              to="/teams/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Team
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-600 transition-all p-6 group"
              >
                {/* Team Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors mb-2">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getPlanBadgeColor(team.plan)}`}>
                        {team.plan}
                      </span>
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(team.my_role)}`}>
                        {getRoleIcon(team.my_role)}
                        {team.my_role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Stats */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Members</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {team.member_count} / {team.max_members}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Created</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date(team.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* View Team Button */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-sm text-amber-600 dark:text-amber-400 font-medium group-hover:text-amber-700 dark:group-hover:text-amber-300">
                    View Dashboard →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Info Box */}
        {teams.length > 0 && (
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                  Team Collaboration
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Teams allow you to manage messages together, set custom branding, enforce compliance policies, and control access with role-based permissions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
