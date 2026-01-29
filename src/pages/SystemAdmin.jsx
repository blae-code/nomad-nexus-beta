import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Shield, Users, Key, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AccessKeyManager from '@/components/admin/AccessKeyManager.jsx';
import UserManagement from '@/components/admin/UserManagement.jsx';

export default function SystemAdmin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('access-keys');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser) {
          window.location.href = createPageUrl('AccessGate');
          return;
        }

        // Only admins can access
        if (currentUser.role !== 'admin') {
          window.location.href = createPageUrl('Hub');
          return;
        }

        setUser(currentUser);
      } catch (err) {
        console.error('Auth error:', err);
        window.location.href = createPageUrl('AccessGate');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl font-black uppercase tracking-widest">Initializing...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'access-keys', label: 'Access Keys', icon: Key, component: AccessKeyManager },
    { id: 'users', label: 'User Management', icon: Users, component: UserManagement },
  ];

  const activeTabConfig = tabs.find(t => t.id === activeTab);
  const TabComponent = activeTabConfig?.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-orange-500" />
            <h1 className="text-4xl font-black uppercase tracking-widest text-white">System Admin</h1>
          </div>
          <p className="text-zinc-400 text-sm">Control Panel for Nexus Administrators</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {TabComponent && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <TabComponent />
          </div>
        )}
      </div>
    </div>
  );
}