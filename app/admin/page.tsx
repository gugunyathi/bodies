'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

interface NotificationUser {
  address: string;
  notificationsEnabled: boolean;
}

interface NotificationRecord {
  id: string;
  sentAt: string;
  title: string;
  body: string;
  targetPath?: string;
  recipients: string[];
  sentCount: number;
  failedCount: number;
  broadcast: boolean;
  richId?: string;
}

interface ActionButton {
  label: string;
  url: string;
  style: 'primary' | 'secondary' | 'danger';
}

const APP_SECTIONS = [
  { value: '', label: 'None' },
  { value: 'swap', label: '🔄 Swap' },
  { value: 'token', label: '🪙 Token' },
  { value: 'leaderboard', label: '🏆 Leaderboard' },
  { value: 'profile', label: '👤 Profile' },
  { value: 'claim', label: '🎁 Claim' },
  { value: 'betting', label: '🎲 Betting' },
  { value: 'custom', label: '🔔 Custom' },
];

const ADMIN_WALLETS = (process.env.NEXT_PUBLIC_ADMIN_WALLETS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

function isAdmin(address?: string) {
  if (!address) return false;
  if (ADMIN_WALLETS.length === 0) return true; // open if no restriction set
  return ADMIN_WALLETS.includes(address.toLowerCase());
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const admin = isAdmin(address);

  // Users state
  const [users, setUsers] = useState<NotificationUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersCursor, setUsersCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  // Send form state
  const [sendMode, setSendMode] = useState<'targeted' | 'broadcast'>('targeted');
  const [recipients, setRecipients] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetPath, setTargetPath] = useState('/');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Rich notification state
  const [richMode, setRichMode] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [longBody, setLongBody] = useState('');
  const [appSection, setAppSection] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [actions, setActions] = useState<ActionButton[]>([{ label: '', url: '', style: 'primary' }]);

  function addAction() {
    setActions(prev => [...prev, { label: '', url: '', style: 'primary' }]);
  }
  function updateAction(i: number, field: keyof ActionButton, value: string) {
    setActions(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  }
  function removeAction(i: number) {
    setActions(prev => prev.filter((_, idx) => idx !== i));
  }

  // History state
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchUsers = useCallback(async (cursor?: string) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/notify/users?${params}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => cursor ? [...prev, ...(data.users || [])] : (data.users || []));
        setUsersCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      }
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/notifications/history');
      const data = await res.json();
      if (res.ok) setHistory(data.history || []);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin) {
      fetchUsers();
      fetchHistory();
    }
  }, [admin, fetchUsers, fetchHistory]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    try {
      let recipientList: string[] = [];
      if (sendMode === 'broadcast') {
        recipientList = users.filter(u => u.notificationsEnabled).map(u => u.address);
      } else {
        recipientList = recipients.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      }
      if (!recipientList.length) {
        setSendResult({ ok: false, message: 'No recipients. Fetch users first or enter addresses.' });
        return;
      }

      // If rich mode, store rich payload first and use returned target_path
      let resolvedTargetPath = richMode ? '' : (targetPath || '/');
      let richId: string | undefined;

      if (richMode) {
        const validActions = actions.filter(a => a.label && a.url);
        const richRes = await fetch('/api/admin/notifications/rich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title, message: body,
            imageUrl: imageUrl || undefined,
            body: longBody || undefined,
            appSection: appSection || undefined,
            actions: validActions.length ? validActions : undefined,
            expiresAt: expiresAt || undefined,
          }),
        });
        const richData = await richRes.json();
        if (!richRes.ok) {
          setSendResult({ ok: false, message: `Rich store failed: ${richData.error}` });
          return;
        }
        richId = richData.id;
        resolvedTargetPath = richData.target_path; // /n/<uuid>
      }

      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addresses: recipientList,
          notification: { title, body, targetPath: resolvedTargetPath },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ ok: true, message: `Sent ${data.sentCount}, failed ${data.failedCount}` });
        await fetch('/api/admin/notifications/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title, body, targetPath: resolvedTargetPath, recipients: recipientList,
            sentCount: data.sentCount, failedCount: data.failedCount,
            broadcast: sendMode === 'broadcast', richId,
          }),
        });
        fetchHistory();
      } else {
        setSendResult({ ok: false, message: data.error || 'Send failed' });
      }
    } catch (err) {
      setSendResult({ ok: false, message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setSending(false);
    }
  }

  async function deleteHistoryItem(item: NotificationRecord) {
    if (item.richId) {
      await fetch(`/api/admin/notifications/rich?id=${item.richId}`, { method: 'DELETE' });
    }
    await fetch(`/api/admin/notifications/history?id=${item.id}`, { method: 'DELETE' });
    setHistory(prev => prev.filter(h => h.id !== item.id));
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Admin Panel</h1>
          <p className="text-gray-400">Connect your wallet to continue.</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 text-sm break-all">{address}</p>
          <p className="text-gray-500 mt-2 text-sm">This wallet is not authorised.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Notifications Admin</h1>
          <p className="text-gray-400 text-sm">Manage in-app notifications for Bodies</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* === SEND PANEL === */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-lg font-bold mb-4">Send Notification</h2>

            {/* Mode toggle */}
            <div className="flex rounded-xl overflow-hidden border border-gray-700 mb-5">
              {(['targeted', 'broadcast'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSendMode(mode)}
                  className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                    sendMode === mode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {mode}
                  {mode === 'broadcast' && users.length > 0 && (
                    <span className="ml-1 text-xs text-blue-300">({users.filter(u => u.notificationsEnabled).length})</span>
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              {sendMode === 'targeted' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Wallet Addresses (comma or newline separated)</label>
                  <textarea
                    value={recipients}
                    onChange={e => setRecipients(e.target.value)}
                    rows={3}
                    placeholder="0xAbc..., 0xDef..."
                    className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-400 mb-1">Title <span className="text-gray-600">(max 30 chars)</span></label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value.slice(0, 30))}
                  placeholder="New match found!"
                  className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-blue-500"
                  required
                />
                <div className="text-right text-xs text-gray-600 mt-0.5">{title.length}/30</div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Message <span className="text-gray-600">(max 200 chars)</span></label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value.slice(0, 200))}
                  rows={3}
                  placeholder="Check out who liked your profile..."
                  className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
                  required
                />
                <div className="text-right text-xs text-gray-600 mt-0.5">{body.length}/200</div>
              </div>

              {/* Rich mode toggle */}
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => setRichMode(!richMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${richMode ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${richMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-300 font-medium">Rich notification</span>
                <span className="text-xs text-gray-500">(image, links, actions)</span>
              </div>

              {richMode ? (
                <div className="space-y-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  {/* App section */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">App section</label>
                    <select value={appSection} onChange={e => setAppSection(e.target.value)}
                      className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm text-white border border-gray-700 focus:outline-none focus:border-blue-500">
                      {APP_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>

                  {/* Image / GIF URL */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Hero image / GIF URL</label>
                    <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                      placeholder="https://... (.jpg .png .gif .webp)"
                      className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-blue-500" />
                    {imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="preview" className="mt-2 rounded-xl max-h-28 object-cover border border-gray-700" />
                    )}
                  </div>

                  {/* Long body */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Extended body <span className="text-gray-600">(shown on landing page)</span></label>
                    <textarea value={longBody} onChange={e => setLongBody(e.target.value)}
                      rows={3} placeholder="Full details, instructions, context..."
                      className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-blue-500 resize-none" />
                  </div>

                  {/* Action buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-400">Action buttons</label>
                      <button type="button" onClick={addAction} className="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
                    </div>
                    <div className="space-y-3">
                      {actions.map((action, i) => (
                        <div key={i} className="bg-gray-900/60 rounded-xl p-3 border border-gray-700 space-y-2">
                          {/* Row 1: label + URL */}
                          <div className="flex gap-2">
                            <input value={action.label} onChange={e => updateAction(i, 'label', e.target.value)}
                              placeholder="Button label"
                              className="flex-1 bg-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-blue-500" />
                            <input value={action.url} onChange={e => updateAction(i, 'url', e.target.value)}
                              placeholder="/leaderboard or https://..."
                              className="flex-[2] bg-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-blue-500" />
                          </div>
                          {/* Row 2: style picker + delete */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Style:</span>
                            <div className="flex gap-1.5">
                              {(['primary', 'secondary', 'danger'] as const).map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => updateAction(i, 'style', s)}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                                    action.style === s
                                      ? s === 'primary' ? 'bg-blue-600 text-white'
                                        : s === 'secondary' ? 'bg-gray-500 text-white'
                                        : 'bg-red-600 text-white'
                                      : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                            <button type="button" onClick={() => removeAction(i)}
                              className="ml-auto text-gray-600 hover:text-red-400 transition-colors text-xs">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Use /leaderboard, /betting or full https:// URLs</p>
                  </div>

                  {/* Expiry */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Expires at <span className="text-gray-600">(optional)</span></label>
                    <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                      className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm text-white border border-gray-700 focus:outline-none focus:border-blue-500" />
                  </div>

                  <p className="text-xs text-gray-500">
                    ✨ Users tap the push notification and land on <code className="text-blue-400">/n/&lt;id&gt;</code> showing full rich content.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Target Path</label>
                  <input
                    value={targetPath}
                    onChange={e => setTargetPath(e.target.value)}
                    placeholder="/"
                    className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
              >
                {sending ? 'Sending...' : sendMode === 'broadcast'
                  ? `Broadcast to ${users.filter(u => u.notificationsEnabled).length} users${richMode ? ' (rich)' : ''}`
                  : `Send${richMode ? ' rich' : ''} notification`}
              </button>

              {sendResult && (
                <div className={`text-sm px-3 py-2 rounded-xl ${sendResult.ok ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                  {sendResult.message}
                </div>
              )}
            </form>
          </div>

          {/* === USERS PANEL === */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Opted-In Users</h2>
              <button
                onClick={() => fetchUsers()}
                disabled={usersLoading}
                className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600"
              >
                {usersLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {users.length === 0 && !usersLoading && (
              <p className="text-gray-500 text-sm">No opted-in users found.</p>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {users.map(user => (
                <div key={user.address} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2">
                  <span className="font-mono text-xs text-gray-300">
                    {user.address.slice(0, 6)}...{user.address.slice(-4)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.notificationsEnabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                    {user.notificationsEnabled ? 'On' : 'Off'}
                  </span>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => fetchUsers(usersCursor)}
                disabled={usersLoading}
                className="mt-3 w-full py-1.5 text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600 border border-gray-700 rounded-xl"
              >
                Load more
              </button>
            )}

            <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
              {users.length} users · {users.filter(u => u.notificationsEnabled).length} with notifications on
            </div>
          </div>
        </div>

        {/* === HISTORY PANEL === */}
        <div className="mt-6 bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Notification History</h2>
            <button
              onClick={fetchHistory}
              disabled={historyLoading}
              className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600"
            >
              {historyLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {history.length === 0 && !historyLoading && (
            <p className="text-gray-500 text-sm">No notifications sent yet.</p>
          )}

          <div className="space-y-3">
            {history.map(item => (
              <div key={item.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm text-white truncate">{item.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${item.broadcast ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'}`}>
                        {item.broadcast ? 'Broadcast' : 'Targeted'}
                      </span>                        {item.richId && (
                          <a href={`/n/${item.richId}`} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 py-0.5 rounded-full bg-orange-900/50 text-orange-300 hover:text-orange-200 shrink-0">
                            ✨ Rich ↗
                          </a>
                        )}                    </div>
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">{item.body}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span>{new Date(item.sentAt).toLocaleString()}</span>
                      <span className="text-green-500">✓ {item.sentCount} sent</span>
                      {item.failedCount > 0 && <span className="text-red-400">✗ {item.failedCount} failed</span>}
                      {item.targetPath && <span className="font-mono">{item.targetPath}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteHistoryItem(item)}
                    className="text-gray-600 hover:text-red-400 transition-colors text-xs shrink-0 mt-1"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
