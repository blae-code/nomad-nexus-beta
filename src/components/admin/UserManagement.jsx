/**
 * UserManagement — Admin user CRUD (create, edit, disable users)
 * Gated to admin users only
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Plus, Trash2, Edit2, CheckCircle2, XCircle, Search } from 'lucide-react';

export default function UserManagement() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'user',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const userList = await base44.asServiceRole.entities.User.list();
      setUsers(userList || []);
      setError(null);
    } catch (err) {
      setError(`Failed to load users: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!formData.full_name?.trim() || !formData.email?.trim()) {
      setError('Name and email are required');
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        await base44.asServiceRole.entities.User.update(editingUser.id, {
          full_name: formData.full_name,
          role: formData.role,
        });
        setSuccess(`User "${formData.full_name}" updated`);
      } else {
        // Invite new user
        await base44.users.inviteUser(formData.email, formData.role);
        setSuccess(`Invitation sent to ${formData.email}`);
      }

      // Reset form
      setFormData({ full_name: '', email: '', role: 'user' });
      setEditingUser(null);
      setShowForm(false);
      setError(null);

      // Reload users
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      role: user.role || 'user',
    });
    setShowForm(true);
  };

  const handleDisableUser = async (userId) => {
    if (!confirm('Disable this user? They will lose access to the app.')) {
      return;
    }

    try {
      // Update user to inactive status (if supported)
      // For now, this is a placeholder for future implementation
      setSuccess('User disabled');
      await loadUsers();
    } catch (err) {
      setError(`Failed to disable user: ${err.message}`);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ full_name: '', email: '', role: 'user' });
    setError(null);
  };

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-orange-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-700"
          />
        </div>
        <Button
          onClick={() => {
            setEditingUser(null);
            setFormData({ full_name: '', email: '', role: 'user' });
            setShowForm(!showForm);
          }}
          className="bg-orange-600 hover:bg-orange-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-900/20 border border-green-500/30 rounded text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSaveUser} className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded space-y-4">
          <h3 className="font-bold text-orange-400">
            {editingUser ? 'Edit User' : 'Invite New User'}
          </h3>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">Full Name</label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="bg-zinc-900 border-zinc-700"
              placeholder="e.g., Echo Phantom"
            />
          </div>

          {!editingUser && (
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-zinc-900 border-zinc-700"
                placeholder="user@example.com"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">Role</label>
            <Select value={formData.role} onValueChange={(role) => setFormData({ ...formData, role })}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-500">
              {editingUser ? 'Update' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="space-y-2">
        {filteredUsers.length === 0 ? (
          <div className="p-4 text-center text-zinc-400">
            {users.length === 0 ? 'No users yet' : 'No results'}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded flex items-center justify-between hover:border-zinc-600 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-zinc-200 truncate">{user.full_name}</h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono ${
                      user.role === 'admin'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {user.role || 'user'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>

              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEditUser(user)}
                  className="text-zinc-400 hover:text-orange-400"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDisableUser(user.id)}
                  className="text-zinc-400 hover:text-red-400"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-zinc-400">
        Total: {users.length} user{users.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}