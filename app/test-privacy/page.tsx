"use client";

import { useState, useEffect } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { apiClient } from '../../lib/api-client';
import { dataPersistence } from '../../lib/data-persistence';
import { ConnectWallet, Wallet, WalletDropdown } from '@coinbase/onchainkit/wallet';
import { Identity, Avatar, Name, Address } from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';

interface PrivacySettings {
  anonymousRatings: boolean;
  hideFromSearch: boolean;
  privateProfile: boolean;
  allowEvidenceUploads: boolean;
  showRealName: boolean;
  allowDirectMessages: boolean;
  shareLocation: boolean;
  publicBodycount: boolean;
}

const defaultSettings: PrivacySettings = {
  anonymousRatings: false,
  hideFromSearch: false,
  privateProfile: false,
  allowEvidenceUploads: true,
  showRealName: true,
  allowDirectMessages: true,
  shareLocation: false,
  publicBodycount: true
};

export default function PrivacyTestPage() {
  const { userId, walletAddress, isAuthenticated } = useCurrentUser();
  const { isConnected } = useAccount();
  const [localSettings, setLocalSettings] = useState<PrivacySettings>(defaultSettings);
  const [remoteSettings, setRemoteSettings] = useState<PrivacySettings | null>(null);
  const [testSettings, setTestSettings] = useState<PrivacySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local-only' | 'out-of-sync'>('local-only');

  // Load settings on component mount
  useEffect(() => {
    loadLocalSettings();
    if (isAuthenticated && walletAddress) {
      loadRemoteSettings();
    }
  }, [isAuthenticated, walletAddress]);

  // Compare local and remote settings to determine sync status
  useEffect(() => {
    if (!remoteSettings) {
      setSyncStatus('local-only');
    } else if (JSON.stringify(localSettings) === JSON.stringify(remoteSettings)) {
      setSyncStatus('synced');
    } else {
      setSyncStatus('out-of-sync');
    }
  }, [localSettings, remoteSettings]);

  const loadLocalSettings = () => {
    try {
      const loadedSettings = dataPersistence.getPrivacySettings() as Record<string, unknown>;
      const settings: PrivacySettings = {
        anonymousRatings: Boolean(loadedSettings.anonymousRatings),
        hideFromSearch: Boolean(loadedSettings.hideFromSearch),
        privateProfile: Boolean(loadedSettings.privateProfile),
        allowEvidenceUploads: loadedSettings.allowEvidenceUploads !== false,
        showRealName: loadedSettings.showRealName !== false,
        allowDirectMessages: loadedSettings.allowDirectMessages !== false,
        shareLocation: Boolean(loadedSettings.shareLocation),
        publicBodycount: loadedSettings.publicBodycount !== false
      };
      setLocalSettings(settings);
      setTestSettings(settings);
    } catch (error) {
      console.error('Error loading local settings:', error);
      setError('Failed to load local settings');
    }
  };

  const loadRemoteSettings = async () => {
    if (!walletAddress) return;
    
    try {
      setIsLoading(true);
      const response = await apiClient.getUserSettings(walletAddress);
      
      if (response.success && (response as any).data) {
        setRemoteSettings((response as any).data.privacySettings);
      } else {
        setError('Failed to load remote settings: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading remote settings:', error);
      setError('Error loading remote settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const saveLocalSettings = (settings: PrivacySettings) => {
    try {
      dataPersistence.setPrivacySettings(settings as unknown as Record<string, unknown>);
      setLocalSettings(settings);
      setSuccessMessage('Local settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving local settings:', error);
      setError('Failed to save local settings');
    }
  };

  const saveRemoteSettings = async (settings: PrivacySettings) => {
    if (!walletAddress) {
      setError('Wallet address required for remote settings');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      const response = await apiClient.updateUserSettings(walletAddress, settings);
      
      if (response.success) {
        setRemoteSettings(settings);
        setSuccessMessage('Remote settings saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError('Failed to save remote settings: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving remote settings:', error);
      setError('Error saving remote settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const syncSettings = async (direction: 'local-to-remote' | 'remote-to-local') => {
    if (direction === 'local-to-remote') {
      await saveRemoteSettings(localSettings);
    } else {
      if (remoteSettings) {
        saveLocalSettings(remoteSettings);
        setTestSettings(remoteSettings);
      }
    }
  };

  const handleTestSettingChange = (key: keyof PrivacySettings) => {
    setTestSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const applyTestSettings = () => {
    saveLocalSettings(testSettings);
  };

  const resetTestSettings = () => {
    setTestSettings(localSettings);
  };

  const testAnonymousRating = async () => {
    if (!isAuthenticated) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // Test submitting an anonymous rating
      const testRating = {
        raterId: `test_${Date.now()}`,
        profileId: 'test_profile_id',
        ratingType: 'hookup' as const,
        isAnonymous: testSettings.anonymousRatings
      };
      
      console.log('Testing anonymous rating with settings:', {
        anonymousRatings: testSettings.anonymousRatings,
        ratingData: testRating
      });
      
      setSuccessMessage(`Anonymous rating test completed! Rating would be ${testRating.isAnonymous ? 'anonymous' : 'public'}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error testing anonymous rating:', error);
      setError('Error testing anonymous rating: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const getPrivacyLevel = (settings: PrivacySettings) => {
    const privateSettings = [
      settings.privateProfile,
      settings.hideFromSearch,
      settings.anonymousRatings,
      !settings.publicBodycount,
      !settings.allowDirectMessages,
      !settings.shareLocation
    ];
    
    const privateCount = privateSettings.filter(Boolean).length;
    
    if (privateCount >= 5) return { level: 'High', color: 'text-green-600', bgColor: 'bg-green-100', icon: '🔒' };
    if (privateCount >= 3) return { level: 'Medium', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: '🔐' };
    return { level: 'Low', color: 'text-red-600', bgColor: 'bg-red-100', icon: '🔓' };
  };

  const ToggleSwitch = ({ 
    enabled, 
    onToggle, 
    label, 
    description, 
    icon, 
    disabled = false 
  }: {
    enabled: boolean;
    onToggle: () => void;
    label: string;
    description: string;
    icon: string;
    disabled?: boolean;
  }) => {
    return (
      <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{icon}</div>
          <div>
            <div className="font-medium text-gray-800">{label}</div>
            <div className="text-sm text-gray-600">{description}</div>
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            enabled ? 'bg-purple-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    );
  };

  const privacyLevel = getPrivacyLevel(testSettings);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔒 Privacy Settings Test</h1>
        
        {/* Wallet Connection Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
          {isConnected ? (
            <div className="space-y-4">
              <Wallet>
                <Identity address={walletAddress as `0x${string}`} schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9">
                  <Avatar />
                  <Name />
                  <Address />
                </Identity>
                <WalletDropdown>
                  <Identity address={walletAddress as `0x${string}`} schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9">
                    <Avatar />
                    <Name />
                    <Address />
                  </Identity>
                </WalletDropdown>
              </Wallet>
              <p className="text-green-600">✅ Wallet Connected: {walletAddress}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <ConnectWallet />
              <p className="text-red-600">❌ No wallet connected</p>
            </div>
          )}
        </div>

        {/* Sync Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Settings Sync Status</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                syncStatus === 'synced' ? 'bg-green-500' : 
                syncStatus === 'out-of-sync' ? 'bg-orange-500' : 'bg-gray-500'
              }`}></div>
              <span className="font-medium">
                {syncStatus === 'synced' && '✅ Settings Synced'}
                {syncStatus === 'out-of-sync' && '⚠️ Settings Out of Sync'}
                {syncStatus === 'local-only' && '📱 Local Only'}
              </span>
            </div>
            
            {isAuthenticated && syncStatus !== 'synced' && (
              <div className="space-x-2">
                <button
                  onClick={() => syncSettings('local-to-remote')}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  Sync to Server
                </button>
                {remoteSettings && (
                  <button
                    onClick={() => syncSettings('remote-to-local')}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    Sync from Server
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Privacy Level Indicator */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Privacy Level</h2>
          <div className={`flex items-center space-x-3 p-4 rounded-xl ${privacyLevel.bgColor}`}>
            <div className="text-3xl">{privacyLevel.icon}</div>
            <div>
              <div className={`text-xl font-bold ${privacyLevel.color}`}>{privacyLevel.level} Privacy</div>
              <div className="text-sm text-gray-600">
                {privacyLevel.level === 'High' && 'Your privacy is well protected'}
                {privacyLevel.level === 'Medium' && 'Good privacy with some public visibility'}
                {privacyLevel.level === 'Low' && 'Most information is public'}
              </div>
            </div>
          </div>
        </div>

        {/* Test Settings */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Test Privacy Settings</h2>
            <div className="space-x-2">
              <button
                onClick={resetTestSettings}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Reset
              </button>
              <button
                onClick={applyTestSettings}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Apply Settings
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Profile Visibility */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">👤 Profile Visibility</h3>
              
              <ToggleSwitch
                enabled={testSettings.privateProfile}
                onToggle={() => handleTestSettingChange('privateProfile')}
                label="Private Profile"
                description="Only approved followers can see your profile"
                icon="🔐"
              />
              
              <ToggleSwitch
                enabled={testSettings.hideFromSearch}
                onToggle={() => handleTestSettingChange('hideFromSearch')}
                label="Hide from Search"
                description="Don't appear in search results or suggestions"
                icon="🙈"
              />
              
              <ToggleSwitch
                enabled={testSettings.showRealName}
                onToggle={() => handleTestSettingChange('showRealName')}
                label="Show Real Name"
                description="Display your real name instead of username"
                icon="📛"
              />
            </div>

            {/* Rating Privacy */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">⭐ Rating Privacy</h3>
              
              <ToggleSwitch
                enabled={testSettings.anonymousRatings}
                onToggle={() => handleTestSettingChange('anonymousRatings')}
                label="Anonymous Ratings"
                description="Hide your identity when rating others"
                icon="🎭"
              />
              
              <ToggleSwitch
                enabled={testSettings.publicBodycount}
                onToggle={() => handleTestSettingChange('publicBodycount')}
                label="Public Bodycount"
                description="Allow others to see your bodycount score"
                icon="📊"
              />
              
              <ToggleSwitch
                enabled={testSettings.allowEvidenceUploads}
                onToggle={() => handleTestSettingChange('allowEvidenceUploads')}
                label="Allow Evidence Uploads"
                description="Let others upload evidence when rating you"
                icon="📎"
              />
            </div>

            {/* Communication */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">💬 Communication</h3>
              
              <ToggleSwitch
                enabled={testSettings.allowDirectMessages}
                onToggle={() => handleTestSettingChange('allowDirectMessages')}
                label="Direct Messages"
                description="Allow others to send you direct messages"
                icon="📨"
              />
              
              <ToggleSwitch
                enabled={testSettings.shareLocation}
                onToggle={() => handleTestSettingChange('shareLocation')}
                label="Share Location"
                description="Show your approximate location to others"
                icon="📍"
              />
            </div>
          </div>
        </div>

        {/* Test Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Privacy Tests</h2>
          <div className="space-y-4">
            <button
              onClick={testAnonymousRating}
              disabled={isLoading || !isAuthenticated}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-indigo-700 transition-all"
            >
              {isLoading ? 'Testing...' : '🎭 Test Anonymous Rating'}
            </button>
            
            <button
              onClick={loadRemoteSettings}
              disabled={isLoading || !isAuthenticated}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-cyan-700 transition-all"
            >
              {isLoading ? 'Loading...' : '🔄 Reload Remote Settings'}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">❌ Error</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError('')}
              className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-green-800 font-semibold mb-2">✅ Success</h3>
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Settings Comparison */}
        {remoteSettings && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📊 Settings Comparison</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">📱 Local Settings</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(localSettings).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span className={value ? 'text-green-600' : 'text-red-600'}>
                        {value ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">☁️ Remote Settings</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(remoteSettings).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span className={value ? 'text-green-600' : 'text-red-600'}>
                        {value ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Test Instructions</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div><strong>1. Connect Wallet:</strong> Connect your wallet to test remote settings sync</div>
            <div><strong>2. Modify Settings:</strong> Toggle privacy settings and observe the privacy level changes</div>
            <div><strong>3. Test Sync:</strong> Apply settings locally and sync with the server</div>
            <div><strong>4. Anonymous Ratings:</strong> Test how anonymous rating setting affects rating submissions</div>
            <div><strong>5. Compare Settings:</strong> View differences between local and remote settings</div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <strong>Note:</strong> Privacy settings control how your data is displayed and shared.
              Anonymous ratings hide your identity when rating others.
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="inline-block bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg mr-4"
          >
            Back to Main App
          </a>
          <a
            href="/test-rating"
            className="inline-block bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg"
          >
            Test Rating System
          </a>
        </div>
      </div>
    </div>
  );
}