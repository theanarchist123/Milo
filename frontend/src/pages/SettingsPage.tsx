import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, CheckCircle2, XCircle, Server, Key, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { AnimatedPage } from '@/components/animated';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { apiClient } from '@/lib/apiClient';

export function SettingsPage() {
  const { user, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  // Connection status state — fetched from backend when APIs tab is opened
  const [connStatus, setConnStatus] = useState<null | {
    hasToken: boolean;
    gmail: { connected: boolean; error: string | null };
    classroom: { connected: boolean; error: string | null };
    drive: { connected: boolean; error: string | null };
  }>(null);
  const [connLoading, setConnLoading] = useState(false);

  const fetchConnStatus = async () => {
    setConnLoading(true);
    try {
      const res = await apiClient.get('/auth/connection-status');
      setConnStatus(res.data);
    } catch (e) {
      console.error('Could not fetch connection status:', e);
    } finally {
      setConnLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      useAuthStore.getState().logout();
      navigate('/');
    }
  };

  const tabs = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'preferences', icon: Server, label: 'Preferences' },
    { id: 'apis', icon: Key, label: 'Connected APIs' },
    { id: 'privacy', icon: Shield, label: 'Privacy' },
  ];

  return (
    <AnimatedPage>
      <PageWrapper headerTitle="Settings">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
          
          {/* Settings Sidebar */}
          <div className="w-full md:w-56 flex-shrink-0">
            <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    activeTab === tab.id 
                      ? 'bg-elevated text-amber' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="flex-1 min-w-0 pb-12">
            
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-white mb-6">Profile Information</h3>
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full overflow-hidden shadow-xl border-4 border-surface flex-shrink-0">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-indigo flex items-center justify-center text-2xl font-bold text-white">
                          {user?.displayName?.charAt(0) ?? 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">{user?.displayName ?? 'Student User'}</h4>
                      <p className="text-text-secondary">{user?.email ?? 'student@university.edu'}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-6 border-t border-white/[0.06]">
                    <button onClick={handleSignOut} className="btn btn-danger">
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'preferences' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="card p-6 divide-y divide-white/[0.06]">
                  <div className="py-4 first:pt-0 pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-white">Auto Sync</h4>
                        <p className="text-xs text-text-tertiary mt-1">Automatically fetch emails and classroom updates</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-elevated rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber"></div>
                      </label>
                    </div>
                  </div>

                  <div className="py-6 border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-white">Sync Frequency</h4>
                        <p className="text-xs text-text-tertiary mt-1">How often Miro checks for new documents</p>
                      </div>
                      <select className="bg-elevated border border-white/10 text-sm rounded-lg px-3 py-2 text-white outline-none focus:border-amber cursor-pointer">
                        <option>Every hour</option>
                        <option>Twice a day</option>
                        <option>Daily</option>
                      </select>
                    </div>
                  </div>

                  <div className="py-6 border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-white">Default Output Format</h4>
                        <p className="text-xs text-text-tertiary mt-1">Which file types to generate</p>
                      </div>
                      <select className="bg-elevated border border-white/10 text-sm rounded-lg px-3 py-2 text-white outline-none focus:border-amber cursor-pointer">
                        <option>Both (DOCX + PDF)</option>
                        <option>PDF only</option>
                        <option>DOCX only</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'apis' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                {/* Status banner */}
                {!accessToken && (
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
                    ⚠️ No Google OAuth token found. Sign out and sign in again to grant Gmail/Classroom access.
                  </div>
                )}

                {/* Test connection button */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-tertiary">Test if your connected Google account can reach each API.</p>
                  <button
                    onClick={fetchConnStatus}
                    disabled={connLoading}
                    className="btn btn-secondary py-1.5 px-3 text-xs"
                  >
                    {connLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    {connLoading ? 'Testing…' : 'Test Connection'}
                  </button>
                </div>

                {/* Services */}
                {[
                  {
                    name: 'Gmail API',
                    desc: 'Read access to fetch academic emails',
                    status: connStatus?.gmail,
                  },
                  {
                    name: 'Google Classroom API',
                    desc: 'Read courses, coursework & materials',
                    status: connStatus?.classroom,
                  },
                  {
                    name: 'Google Drive API',
                    desc: 'Download assignment attachments',
                    status: connStatus?.drive,
                  },
                ].map((svc, i) => (
                  <div key={i} className="card p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          !connStatus ? 'bg-elevated' :
                          svc.status?.connected ? 'bg-success/10' : 'bg-danger/10'
                        )}>
                          {!connStatus ? (
                            <Key size={16} className="text-text-tertiary" />
                          ) : svc.status?.connected ? (
                            <CheckCircle2 size={16} className="text-success" />
                          ) : (
                            <XCircle size={16} className="text-danger" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-white">{svc.name}</h4>
                          <p className="text-xs text-text-tertiary">{svc.desc}</p>
                        </div>
                      </div>
                      <span className={cn(
                        'badge text-xs',
                        !connStatus ? 'bg-elevated text-text-secondary' :
                        svc.status?.connected ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      )}>
                        {!connStatus ? 'Not tested' : svc.status?.connected ? 'Connected ✓' : 'Error'}
                      </span>
                    </div>
                    {svc.status?.error && (
                      <p className="text-xs text-danger mt-2 pl-11 font-mono leading-relaxed">
                        {svc.status.error}
                      </p>
                    )}
                  </div>
                ))}

                <p className="text-xs text-text-tertiary text-center pt-2">
                  Token expires 1 hour after sign-in. If tests fail, sign out and sign in again.
                </p>
              </motion.div>
            )}

            {activeTab === 'privacy' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="card p-6 border-danger/20 bg-red-500/5">
                  <h3 className="text-lg font-semibold text-danger mb-2">Danger Zone</h3>
                  <p className="text-sm text-text-secondary mb-6">Irreversible actions regarding your data.</p>
                  
                  <div className="flex items-center justify-between py-4 border-t border-danger/10">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Delete All Processed Data</h4>
                      <p className="text-xs text-text-tertiary mt-1">Clears all cached emails, files, and outputs.</p>
                    </div>
                    <button className="btn bg-danger/20 text-danger hover:bg-danger hover:text-white border border-danger/30">
                      Delete Data
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between py-4 border-t border-danger/10">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Delete Account</h4>
                      <p className="text-xs text-text-tertiary mt-1">Permanently remove your account and revoke all API access.</p>
                    </div>
                    <button className="btn bg-danger hover:bg-red-600 text-white">
                      Delete Account
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </PageWrapper>
    </AnimatedPage>
  );
}
