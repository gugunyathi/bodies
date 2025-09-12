'use client';

import React, { useState, useEffect } from 'react';
import { EvidenceSearch } from '../components/EvidenceSearch';
import { EvidenceUpload } from '../components/EvidenceUpload';
import { EvidenceAnalytics } from '../components/EvidenceAnalytics';
import { EvidenceBackupRecovery } from '../components/EvidenceBackupRecovery';
import { apiClient } from '../../lib/api-client';
import { Evidence } from '../../lib/models';

interface EvidenceStats {
  total: number;
  verified: number;
  pending: number;
  flagged: number;
  rejected: number;
  byType: {
    image: number;
    video: number;
    link: number;
  };
}

export default function EvidencePage() {
  // Mock user for now - replace with actual auth when available
  const user = { id: 'mock-user-id', name: 'Mock User' };
  const isAuthenticated = true;
  const [activeTab, setActiveTab] = useState<'search' | 'upload' | 'stats' | 'analytics' | 'backup'>('search');
  const [stats, setStats] = useState<EvidenceStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [analyticsFilters, setAnalyticsFilters] = useState<{
    dateFrom?: string;
    dateTo?: string;
    uploaderId?: string;
    ratingId?: string;
  }>({});

  // Fetch evidence statistics
  const fetchStats = async () => {
    if (!isAuthenticated) return;
    
    setIsLoadingStats(true);
    try {
      // Fetch different types of evidence to calculate stats
      const [allEvidence, verifiedEvidence, pendingEvidence, flaggedEvidence, rejectedEvidence] = await Promise.all([
        apiClient.searchEvidence({ limit: 1000 }),
        apiClient.searchEvidence({ status: 'verified', limit: 1000 }),
        apiClient.searchEvidence({ status: 'pending', limit: 1000 }),
        apiClient.searchEvidence({ status: 'flagged', limit: 1000 }),
        apiClient.searchEvidence({ status: 'rejected', limit: 1000 })
      ]);

      const allEvidenceData = allEvidence.success ? (allEvidence.data as Evidence[]) : [];
      
      const calculatedStats: EvidenceStats = {
        total: allEvidenceData.length,
        verified: verifiedEvidence.success ? (verifiedEvidence.data as Evidence[]).length : 0,
        pending: pendingEvidence.success ? (pendingEvidence.data as Evidence[]).length : 0,
        flagged: flaggedEvidence.success ? (flaggedEvidence.data as Evidence[]).length : 0,
        rejected: rejectedEvidence.success ? (rejectedEvidence.data as Evidence[]).length : 0,
        byType: {
          image: allEvidenceData.filter((e: Evidence) => e.type === 'image').length,
          video: allEvidenceData.filter((e: Evidence) => e.type === 'video').length,
          link: allEvidenceData.filter((e: Evidence) => e.type === 'link').length,
        }
      };
      
      setStats(calculatedStats);
    } catch (error) {
      console.error('Failed to fetch evidence statistics:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [isAuthenticated]);

  const handleEvidenceAdd = (evidence: Evidence) => {
    // Refresh stats when new evidence is added
    fetchStats();
    setShowUploadModal(false);
  };

  const handleEvidenceRemove = (evidenceId: string) => {
    // Refresh stats when evidence is removed
    fetchStats();
  };

  // Authentication check removed for demo purposes
  // if (!isAuthenticated) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
  //         <p className="text-gray-600">Please log in to access the evidence management system.</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Evidence Management</h1>
              <p className="text-gray-600 mt-1">Search, upload, and manage evidence files</p>
            </div>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Upload Evidence</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('search')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Search & Browse
            </button>
            
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statistics
            </button>
            
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
            
            <button
              onClick={() => setActiveTab('backup')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'backup'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Backup & Recovery
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'search' && (
          <EvidenceSearch />
        )}
        
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Analytics Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Analytics Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={analyticsFilters.dateFrom || ''}
                    onChange={(e) => setAnalyticsFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={analyticsFilters.dateTo || ''}
                    onChange={(e) => setAnalyticsFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Uploader ID
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by uploader"
                    value={analyticsFilters.uploaderId || ''}
                    onChange={(e) => setAnalyticsFilters(prev => ({ ...prev, uploaderId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rating ID
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by rating"
                    value={analyticsFilters.ratingId || ''}
                    onChange={(e) => setAnalyticsFilters(prev => ({ ...prev, ratingId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setAnalyticsFilters({})}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
            
            {/* Analytics Dashboard */}
            <EvidenceAnalytics
              dateFrom={analyticsFilters.dateFrom}
              dateTo={analyticsFilters.dateTo}
              uploaderId={analyticsFilters.uploaderId}
              ratingId={analyticsFilters.ratingId}
            />
          </div>
        )}
        
        {activeTab === 'backup' && (
          <EvidenceBackupRecovery
            onBackupComplete={(backupInfo) => {
              console.log('Backup completed:', backupInfo);
              // Optionally refresh evidence list or show notification
            }}
            onRecoveryComplete={(recoveryInfo) => {
              console.log('Recovery completed:', recoveryInfo);
              // Optionally refresh evidence list or show notification
            }}
          />
        )}
        
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Evidence Statistics</h2>
              
              {isLoadingStats ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Evidence */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Evidence</p>
                        <p className="text-3xl font-bold">{stats.total}</p>
                      </div>
                      <svg className="w-8 h-8 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Verified Evidence */}
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Verified</p>
                        <p className="text-3xl font-bold">{stats.verified}</p>
                        <p className="text-green-200 text-xs">
                          {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}% of total
                        </p>
                      </div>
                      <svg className="w-8 h-8 text-green-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Pending Evidence */}
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-100 text-sm font-medium">Pending</p>
                        <p className="text-3xl font-bold">{stats.pending}</p>
                        <p className="text-yellow-200 text-xs">
                          {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}% of total
                        </p>
                      </div>
                      <svg className="w-8 h-8 text-yellow-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Flagged Evidence */}
                  <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-100 text-sm font-medium">Flagged</p>
                        <p className="text-3xl font-bold">{stats.flagged}</p>
                        <p className="text-red-200 text-xs">
                          {stats.total > 0 ? Math.round((stats.flagged / stats.total) * 100) : 0}% of total
                        </p>
                      </div>
                      <svg className="w-8 h-8 text-red-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Failed to load statistics
                </div>
              )}
              
              {/* Evidence by Type */}
              {stats && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Evidence by Type</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-600 font-medium">Images</p>
                          <p className="text-2xl font-bold text-purple-900">{stats.byType.image}</p>
                        </div>
                        <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-indigo-600 font-medium">Videos</p>
                          <p className="text-2xl font-bold text-indigo-900">{stats.byType.video}</p>
                        </div>
                        <svg className="w-6 h-6 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-teal-600 font-medium">Links</p>
                          <p className="text-2xl font-bold text-teal-900">{stats.byType.link}</p>
                        </div>
                        <svg className="w-6 h-6 text-teal-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Upload Evidence</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <EvidenceUpload
                ratingId="general" // This could be dynamic based on context
                onEvidenceAdd={handleEvidenceAdd}
                onClose={() => setShowUploadModal(false)}
                profileName="General"
                ratingType="dated"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}