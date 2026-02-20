import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function TeamDashboard() {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');

  useEffect(() => {
    if (teamId) {
      loadTeamData();
    }
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const sessionToken = sessionStorage.getItem('sessionToken');
      
      // Load team details
      const teamRes = await fetch(`/api/teams/${teamId}`, {
        headers: { 'X-Session-Token': sessionToken }
      });
      const teamData = await teamRes.json();
      setTeam(teamData.team);

      // Load members
      const membersRes = await fetch(`/api/teams/${teamId}/members`, {
        headers: { 'X-Session-Token': sessionToken }
      });
      const membersData = await membersRes.json();
      setMembers(membersData.members || []);

      // Load messages
      const messagesRes = await fetch(`/api/teams/${teamId}/messages?limit=20`, {
        headers: { 'X-Session-Token': sessionToken }
      });
      const messagesData = await messagesRes.json();
      setMessages(messagesData.messages || []);

      // Load stats
      const statsRes = await fetch(`/api/teams/${teamId}/stats`, {
        headers: { 'X-Session-Token': sessionToken }
      });
      const statsData = await statsRes.json();
      setStats(statsData.stats);

    } catch (err) {
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionStorage.getItem('sessionToken')
        },
        body: JSON.stringify({
          email: newMemberEmail,
          role: newMemberRole
        })
      });

      if (!response.ok) throw new Error('Failed to invite member');

      setNewMemberEmail('');
      setNewMemberRole('member');
      setShowInviteModal(false);
      loadTeamData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member from the team?')) return;

    try {
      await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'X-Session-Token': sessionStorage.getItem('sessionToken') }
      });
      loadTeamData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionStorage.getItem('sessionToken')
        },
        body: JSON.stringify({ role: newRole })
      });
      loadTeamData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading team...</div>;
  }

  if (!team) {
    return <div className="text-center py-12">Team not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Team Header */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
            <div className="flex gap-4 mt-2">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium capitalize">
                {team.plan} Plan
              </span>
              <span className="text-gray-500 text-sm">
                {members.length} / {team.max_members} members
              </span>
            </div>
          </div>
          <Link
            to={`/teams/${teamId}/settings`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Total Messages</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total_messages || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Burned</div>
            <div className="text-2xl font-bold text-red-600">{stats.burned_messages || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Total Views</div>
            <div className="text-2xl font-bold text-blue-600">{stats.total_views || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Active Members</div>
            <div className="text-2xl font-bold text-green-600">{stats.member_count || 0}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-amber-500 text-amber-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 font-medium ${
              activeTab === 'members'
                ? 'border-b-2 border-amber-500 text-amber-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`pb-3 font-medium ${
              activeTab === 'messages'
                ? 'border-b-2 border-amber-500 text-amber-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Messages
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
            {stats?.recent_activity && stats.recent_activity.length > 0 ? (
              <div className="space-y-2">
                {stats.recent_activity.slice(0, 7).map((day) => (
                  <div key={day.date} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">+{day.messages_created} created</span>
                      <span className="text-blue-600">{day.messages_viewed} viewed</span>
                      <span className="text-red-600">{day.messages_burned} burned</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No activity yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold">Team Members</h2>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              + Invite Member
            </button>
          </div>

          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{member.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold">Team Messages</h2>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No messages yet</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {messages.map((msg) => (
                  <tr key={msg.id}>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{msg.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(msg.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(msg.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {msg.view_count} / {msg.max_views}
                    </td>
                    <td className="px-6 py-4">
                      {msg.burned_at ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          Burned
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Invite Team Member</h2>
            <form onSubmit={handleInviteMember}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="viewer">Viewer (read-only)</option>
                  <option value="member">Member (can create)</option>
                  <option value="admin">Admin (full access)</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  Send Invite
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
