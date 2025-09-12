"use client";

import { useState, useEffect } from 'react';

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

interface PrivacySettingsProps {
  onClose: () => void;
  onSettingsChange: (settings: PrivacySettings) => void;
  currentSettings?: PrivacySettings;
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

export const PrivacySettings = ({ onClose, onSettingsChange, currentSettings }: PrivacySettingsProps) => {
  const [settings, setSettings] = useState<PrivacySettings>(currentSettings || defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const hasChanged = JSON.stringify(settings) !== JSON.stringify(currentSettings || defaultSettings);
    setHasChanges(hasChanged);
  }, [settings, currentSettings]);

  const handleToggle = (key: keyof PrivacySettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    onSettingsChange(settings);
    onClose();
  };

  const handleReset = () => {
    setSettings(currentSettings || defaultSettings);
  };

  const ToggleSwitch = ({ 
    enabled, 
    onToggle, 
    label, 
    description, 
    icon, 
    color = 'pink' 
  }: {
    enabled: boolean;
    onToggle: () => void;
    label: string;
    description: string;
    icon: string;
    color?: 'pink' | 'purple' | 'blue' | 'green' | 'orange';
  }) => {
    const getColorClasses = () => {
      switch (color) {
        case 'purple': return enabled ? 'bg-purple-500' : 'bg-gray-300';
        case 'blue': return enabled ? 'bg-blue-500' : 'bg-gray-300';
        case 'green': return enabled ? 'bg-green-500' : 'bg-gray-300';
        case 'orange': return enabled ? 'bg-orange-500' : 'bg-gray-300';
        default: return enabled ? 'bg-pink-500' : 'bg-gray-300';
      }
    };

    return (
      <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/30 hover:bg-white/60 transition-all duration-300">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-800">{label}</h3>
            <button
              onClick={onToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${getColorClasses()}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl border border-white/30 bounce-in mx-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Privacy Settings</h2>
                <p className="text-sm text-gray-600">Control your privacy and visibility</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors duration-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {/* Profile Visibility */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <span>👤</span>
              <span>Profile Visibility</span>
            </h3>
            
            <ToggleSwitch
              enabled={settings.privateProfile}
              onToggle={() => handleToggle('privateProfile')}
              label="Private Profile"
              description="Only approved followers can see your profile"
              icon="🔐"
              color="purple"
            />
            
            <ToggleSwitch
              enabled={settings.hideFromSearch}
              onToggle={() => handleToggle('hideFromSearch')}
              label="Hide from Search"
              description="Don't appear in search results or suggestions"
              icon="🙈"
              color="blue"
            />
            
            <ToggleSwitch
              enabled={settings.showRealName}
              onToggle={() => handleToggle('showRealName')}
              label="Show Real Name"
              description="Display your real name instead of username"
              icon="📛"
              color="green"
            />
          </div>

          {/* Rating Privacy */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <span>⭐</span>
              <span>Rating Privacy</span>
            </h3>
            
            <ToggleSwitch
              enabled={settings.anonymousRatings}
              onToggle={() => handleToggle('anonymousRatings')}
              label="Anonymous Ratings"
              description="Hide your identity when rating others"
              icon="🎭"
              color="purple"
            />
            
            <ToggleSwitch
              enabled={settings.publicBodycount}
              onToggle={() => handleToggle('publicBodycount')}
              label="Public Bodycount"
              description="Allow others to see your bodycount score"
              icon="📊"
              color="orange"
            />
            
            <ToggleSwitch
              enabled={settings.allowEvidenceUploads}
              onToggle={() => handleToggle('allowEvidenceUploads')}
              label="Allow Evidence Uploads"
              description="Let others upload evidence when rating you"
              icon="📎"
              color="blue"
            />
          </div>

          {/* Communication */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <span>💬</span>
              <span>Communication</span>
            </h3>
            
            <ToggleSwitch
              enabled={settings.allowDirectMessages}
              onToggle={() => handleToggle('allowDirectMessages')}
              label="Direct Messages"
              description="Allow others to send you direct messages"
              icon="📨"
              color="green"
            />
            
            <ToggleSwitch
              enabled={settings.shareLocation}
              onToggle={() => handleToggle('shareLocation')}
              label="Share Location"
              description="Show your approximate location to others"
              icon="📍"
              color="orange"
            />
          </div>

          {/* Privacy Tips */}
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">💡</div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Privacy Tips</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Enable anonymous ratings for more honest feedback</li>
                  <li>• Private profiles give you more control over who sees your content</li>
                  <li>• Consider hiding from search if you want to stay low-key</li>
                  <li>• Evidence uploads can provide context but reduce privacy</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50/50">
          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="flex-1 py-3 px-4 rounded-2xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none"
            >
              {hasChanges ? '💾 Save Changes' : '✅ Saved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Privacy Status Indicator Component
interface PrivacyStatusProps {
  settings: PrivacySettings;
  onClick: () => void;
}

export const PrivacyStatus = ({ settings, onClick }: PrivacyStatusProps) => {
  const getPrivacyLevel = () => {
    const privateSettings = [
      settings.privateProfile,
      settings.hideFromSearch,
      settings.anonymousRatings,
      !settings.publicBodycount,
      !settings.allowDirectMessages,
      !settings.shareLocation
    ];
    
    const privateCount = privateSettings.filter(Boolean).length;
    
    if (privateCount >= 5) return { level: 'High', color: 'green', icon: '🔒' };
    if (privateCount >= 3) return { level: 'Medium', color: 'orange', icon: '🔐' };
    return { level: 'Low', color: 'red', icon: '🔓' };
  };

  const privacy = getPrivacyLevel();

  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-1 px-2 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-white/30 hover:bg-white/90 transition-all duration-300 transform hover:scale-105"
    >
      <span className="text-sm">{privacy.icon}</span>
      <span className="text-xs font-medium text-gray-700">
        Privacy: <span className={`text-${privacy.color}-600`}>{privacy.level}</span>
      </span>
    </button>
  );
};

// Anonymous Mode Toggle (Quick Access)
export const AnonymousToggle = ({ 
  enabled, 
  onToggle 
}: { 
  enabled: boolean; 
  onToggle: () => void; 
}) => {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center space-x-1 px-2 py-1 rounded-full font-medium transition-all duration-300 transform hover:scale-105 ${
        enabled
          ? 'bg-purple-500 text-white shadow-lg'
          : 'bg-white/80 text-gray-700 border border-gray-300'
      }`}
    >
      <span className="text-sm">{enabled ? '🎭' : '👤'}</span>
      <span className="text-xs">
        {enabled ? 'Anonymous' : 'Public'}
      </span>
    </button>
  );
};