'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface BackupInfo {
  _id: string;
  evidenceId: string;
  originalUrl: string;
  fileSize: number;
  mimeType: string;
  backupLocations: {
    provider: string;
    url: string;
    status: 'active' | 'pending' | 'failed' | 'archived';
    createdAt: string;
    lastVerified?: string;
  }[];
  retentionPolicy: {
    keepDays: number;
    maxBackups: number;
  };
  priority: string;
  createdAt: string;
  updatedAt: string;
}

interface RecoveryInfo {
  _id: string;
  evidenceId: string;
  originalUrl: string;
  backupSource: string;
  backupUrl: string;
  restoreToOriginal: boolean;
  newUrl?: string;
  verifyIntegrity: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
}

interface EvidenceBackupRecoveryProps {
  evidenceId?: string;
  onBackupComplete?: (backupInfo: BackupInfo) => void;
  onRecoveryComplete?: (recoveryInfo: RecoveryInfo) => void;
}

export const EvidenceBackupRecovery: React.FC<EvidenceBackupRecoveryProps> = ({
  evidenceId,
  onBackupComplete,
  onRecoveryComplete
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'recovery'>('backup');
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [recoveries, setRecoveries] = useState<RecoveryInfo[]>([]);
  const [backupStats, setBackupStats] = useState<any>(null);
  const [recoveryStats, setRecoveryStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showCreateBackup, setShowCreateBackup] = useState(false);
  const [showInitiateRecovery, setShowInitiateRecovery] = useState(false);

  // Backup form state
  const [backupForm, setBackupForm] = useState({
    evidenceIds: [] as string[],
    backupAll: false,
    priority: 'normal' as 'low' | 'normal' | 'high',
    retentionDays: 30
  });

  // Recovery form state
  const [recoveryForm, setRecoveryForm] = useState({
    evidenceId: evidenceId || '',
    backupSource: 'aws-s3' as 'aws-s3' | 'google-cloud' | 'azure-blob' | 'local',
    restoreToOriginal: true,
    newUrl: '',
    verifyIntegrity: true
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [evidenceId, activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (activeTab === 'backup') {
        const response = await apiClient.getBackupStatus({
          evidenceId,
          page: 1,
          limit: 50
        });
        setBackups((response.data as any).backups);
        setBackupStats((response.data as any).stats);
      } else {
        const response = await apiClient.getRecoveryStatus({
          evidenceId,
          page: 1,
          limit: 50
        });
        setRecoveries((response.data as any).recoveries);
        setRecoveryStats((response.data as any).stats);
      }
    } catch (err) {
      setError('Failed to load data');
      console.error('Data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const backupData = {
        ...backupForm,
        evidenceIds: evidenceId ? [evidenceId] : backupForm.evidenceIds
      };
      
      const response = await apiClient.createBackup(backupData);
      setShowCreateBackup(false);
      setBackupForm({
        evidenceIds: [],
        backupAll: false,
        priority: 'normal',
        retentionDays: 30
      });
      fetchData();
      
      if (onBackupComplete) {
        onBackupComplete(response.data as BackupInfo);
      }
    } catch (err) {
      setError('Failed to create backup');
      console.error('Backup creation error:', err);
    }
  };

  const handleInitiateRecovery = async () => {
    try {
      const response = await apiClient.initiateRecovery(recoveryForm);
      setShowInitiateRecovery(false);
      setRecoveryForm({
        evidenceId: evidenceId || '',
        backupSource: 'aws-s3',
        restoreToOriginal: true,
        newUrl: '',
        verifyIntegrity: true
      });
      fetchData();
      
      if (onRecoveryComplete) {
        onRecoveryComplete(response.data as RecoveryInfo);
      }
    } catch (err) {
      setError('Failed to initiate recovery');
      console.error('Recovery initiation error:', err);
    }
  };

  const handleCancelRecovery = async (recoveryId: string) => {
    try {
      await apiClient.cancelRecovery(recoveryId);
      fetchData();
    } catch (err) {
      setError('Failed to cancel recovery');
      console.error('Recovery cancellation error:', err);
    }
  };

  const handleDeleteBackup = async (evidenceId: string, deleteFiles = false) => {
    try {
      await apiClient.deleteBackup(evidenceId, deleteFiles);
      fetchData();
    } catch (err) {
      setError('Failed to delete backup');
      console.error('Backup deletion error:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading && (backups.length === 0 && recoveries.length === 0)) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Backup & Recovery</h2>
        <div className="flex space-x-2">
          {activeTab === 'backup' && (
            <button
              onClick={() => setShowCreateBackup(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Backup
            </button>
          )}
          {activeTab === 'recovery' && (
            <button
              onClick={() => setShowInitiateRecovery(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Initiate Recovery
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('backup')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'backup'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Backups
              {backupStats && (
                <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                  {backupStats.totalBackups}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('recovery')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'recovery'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Recovery
              {recoveryStats && (
                <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                  {recoveryStats.total}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Stats Cards */}
      {activeTab === 'backup' && backupStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600 mb-1">Total Backups</h3>
            <p className="text-2xl font-bold text-blue-900">{backupStats.totalBackups}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600 mb-1">Active</h3>
            <p className="text-2xl font-bold text-green-900">{backupStats.activeBackups}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-600 mb-1">Pending</h3>
            <p className="text-2xl font-bold text-yellow-900">{backupStats.pendingBackups}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-600 mb-1">Failed</h3>
            <p className="text-2xl font-bold text-red-900">{backupStats.failedBackups}</p>
          </div>
        </div>
      )}

      {activeTab === 'recovery' && recoveryStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600 mb-1">Total</h3>
            <p className="text-2xl font-bold text-blue-900">{recoveryStats.total}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-600 mb-1">Pending</h3>
            <p className="text-2xl font-bold text-yellow-900">{recoveryStats.pending}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-orange-600 mb-1">In Progress</h3>
            <p className="text-2xl font-bold text-orange-900">{recoveryStats.inProgress}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600 mb-1">Completed</h3>
            <p className="text-2xl font-bold text-green-900">{recoveryStats.completed}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-600 mb-1">Failed</h3>
            <p className="text-2xl font-bold text-red-900">{recoveryStats.failed}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          {backups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No backup configurations found</p>
              <button
                onClick={() => setShowCreateBackup(true)}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Create your first backup
              </button>
            </div>
          ) : (
            backups.map((backup) => (
              <div key={backup._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Evidence {backup.evidenceId.slice(-8)}</h3>
                    <p className="text-sm text-gray-600">{formatFileSize(backup.fileSize)} • {backup.mimeType}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeleteBackup(backup.evidenceId, false)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete Config
                    </button>
                    <button
                      onClick={() => handleDeleteBackup(backup.evidenceId, true)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete Files
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {backup.backupLocations.map((location, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium">{location.provider}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(location.status)}`}>
                          {location.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {location.lastVerified ? `Verified ${new Date(location.lastVerified).toLocaleDateString()}` : 'Not verified'}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 text-xs text-gray-500">
                  Created: {new Date(backup.createdAt).toLocaleString()} • 
                  Retention: {backup.retentionPolicy.keepDays} days • 
                  Priority: {backup.priority}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'recovery' && (
        <div className="space-y-4">
          {recoveries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No recovery operations found</p>
              <button
                onClick={() => setShowInitiateRecovery(true)}
                className="mt-2 text-green-600 hover:text-green-800"
              >
                Initiate recovery
              </button>
            </div>
          ) : (
            recoveries.map((recovery) => (
              <div key={recovery._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Evidence {recovery.evidenceId.slice(-8)}</h3>
                    <p className="text-sm text-gray-600">From {recovery.backupSource}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(recovery.status)}`}>
                      {recovery.status}
                    </span>
                    {['pending', 'in_progress'].includes(recovery.status) && (
                      <button
                        onClick={() => handleCancelRecovery(recovery._id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                
                {recovery.status === 'in_progress' && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{recovery.currentStep || 'Processing...'}</span>
                      <span>{recovery.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${recovery.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {recovery.error && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-600">{recovery.error}</p>
                  </div>
                )}
                
                <div className="text-xs text-gray-500">
                  Started: {new Date(recovery.createdAt).toLocaleString()}
                  {recovery.completedAt && ` • Completed: ${new Date(recovery.completedAt).toLocaleString()}`}
                  {recovery.failedAt && ` • Failed: ${new Date(recovery.failedAt).toLocaleString()}`}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Backup Modal */}
      {showCreateBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Backup</h3>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={backupForm.backupAll}
                    onChange={(e) => setBackupForm(prev => ({ ...prev, backupAll: e.target.checked }))}
                    className="mr-2"
                  />
                  Backup all evidence files
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={backupForm.priority}
                  onChange={(e) => setBackupForm(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retention Days
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={backupForm.retentionDays}
                  onChange={(e) => setBackupForm(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateBackup(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBackup}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initiate Recovery Modal */}
      {showInitiateRecovery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Initiate Recovery</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evidence ID
                </label>
                <input
                  type="text"
                  value={recoveryForm.evidenceId}
                  onChange={(e) => setRecoveryForm(prev => ({ ...prev, evidenceId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter evidence ID"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Backup Source (Optional)
                </label>
                <select
                  value={recoveryForm.backupSource}
                  onChange={(e) => setRecoveryForm(prev => ({ ...prev, backupSource: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Auto-select best backup</option>
                  <option value="aws-s3">AWS S3</option>
                  <option value="google-cloud">Google Cloud</option>
                  <option value="azure-blob">Azure Blob</option>
                  <option value="local">Local Storage</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={recoveryForm.restoreToOriginal}
                    onChange={(e) => setRecoveryForm(prev => ({ ...prev, restoreToOriginal: e.target.checked }))}
                    className="mr-2"
                  />
                  Restore to original location
                </label>
              </div>
              
              {!recoveryForm.restoreToOriginal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New URL
                  </label>
                  <input
                    type="url"
                    value={recoveryForm.newUrl}
                    onChange={(e) => setRecoveryForm(prev => ({ ...prev, newUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="https://new-location.example.com/file"
                  />
                </div>
              )}
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={recoveryForm.verifyIntegrity}
                    onChange={(e) => setRecoveryForm(prev => ({ ...prev, verifyIntegrity: e.target.checked }))}
                    className="mr-2"
                  />
                  Verify file integrity after recovery
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInitiateRecovery(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleInitiateRecovery}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start Recovery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceBackupRecovery;