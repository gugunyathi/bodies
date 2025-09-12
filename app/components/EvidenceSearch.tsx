"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api-client';
import { EvidenceDisplay } from './EvidenceUpload';
import { useCurrentUser } from '../../hooks/useCurrentUser';

interface Evidence {
  _id?: string;
  ratingId: string;
  uploaderId: string;
  type: 'image' | 'video' | 'link' | 'text';
  url?: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  description?: string;
  textContent?: string;
  textTitle?: string;
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  adminNotes?: string;
  isFlagged?: boolean;
  flaggedAt?: Date;
  flaggedBy?: string;
  flagReason?: string;
  isRejected?: boolean;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  unflaggedAt?: Date;
  unflaggedBy?: string;
  lastModeratedBy?: string;
  lastModeratedAt?: Date;
  moderationFlags?: string[];
  moderationConfidence?: number;
  createdAt: Date;
  updatedAt?: Date;
}

interface EvidenceSearchFilters {
  type: 'all' | 'image' | 'video' | 'link' | 'text';
  status: 'all' | 'verified' | 'pending' | 'flagged' | 'rejected';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  sortBy: 'newest' | 'oldest' | 'verified' | 'size';
  searchQuery: string;
}

interface EvidenceSearchProps {
  ratingId?: string;
  showUserEvidenceOnly?: boolean;
  onEvidenceSelect?: (evidence: Evidence) => void;
  className?: string;
}

export const EvidenceSearch = ({ 
  ratingId, 
  showUserEvidenceOnly = false, 
  onEvidenceSelect,
  className = '' 
}: EvidenceSearchProps) => {
  const { userId, isAuthenticated } = useCurrentUser();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [filteredEvidence, setFilteredEvidence] = useState<Evidence[]>([]);
  const [filters, setFilters] = useState<EvidenceSearchFilters>({
    type: 'all',
    status: 'all',
    dateRange: 'all',
    sortBy: 'newest',
    searchQuery: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch evidence based on filters
  const fetchEvidence = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const searchParams = {
        q: filters.searchQuery || undefined,
        type: filters.type !== 'all' ? filters.type : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        ratingId: ratingId || undefined,
        uploaderId: showUserEvidenceOnly ? (userId || undefined) : undefined,
        sortBy: filters.sortBy || undefined,
        page: currentPage,
        limit: 12,
      };
      
      const response = await apiClient.searchEvidence(searchParams);
      
      if (response.success) {
        setEvidence((response.data as any).evidence);
        setTotalPages(Math.ceil((response.data as any).pagination.totalCount / 12));
      } else {
        throw new Error('Failed to fetch evidence');
      }
    } catch (err) {
      console.error('Error fetching evidence:', err);
      setError('Failed to load evidence');
      setEvidence([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [ratingId, showUserEvidenceOnly, userId, isAuthenticated, filters, currentPage]);

  // Handle bulk actions
  const handleBulkAction = async (action: 'verify' | 'flag' | 'delete', selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    
    try {
      switch (action) {
        case 'verify':
          // Note: This would require admin privileges
          await apiClient.bulkVerifyEvidence(selectedIds, userId || '', true);
          break;
        case 'flag':
          // Implement bulk flagging if needed
          console.log('Bulk flagging not yet implemented');
          break;
        case 'delete':
          // Implement bulk deletion if needed
          console.log('Bulk deletion not yet implemented');
          break;
      }
      
      // Refresh evidence after action
      await fetchEvidence();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} evidence`);
    }
  };

  // Update filters
  const updateFilter = (key: keyof EvidenceSearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      type: 'all',
      status: 'all',
      dateRange: 'all',
      sortBy: 'newest',
      searchQuery: ''
    });
  };

  // Get paginated results
  const getPaginatedResults = () => {
    return evidence; // Evidence is already paginated from API
  };

  // Effects
  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  if (!isAuthenticated) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-4xl mb-4">🔒</div>
        <div className="text-gray-600">Please sign in to search evidence</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Evidence Search</h2>
          <p className="text-sm text-gray-600 mt-1">
            {evidence.length} evidence items
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
        >
          <span>🔍</span>
          <span>Filters</span>
          <span className={`transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}>▼</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by description, filename, or file type..."
          value={filters.searchQuery}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
        />
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
          🔍
        </div>
        {filters.searchQuery && (
          <button
            onClick={() => updateFilter('searchQuery', '')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => updateFilter('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="image">📸 Images</option>
                <option value="video">🎥 Videos</option>
                <option value="link">🔗 Links</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="verified">✅ Verified</option>
                <option value="pending">⏳ Pending</option>
                <option value="flagged">🚩 Flagged</option>
                <option value="rejected">❌ Rejected</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">📅 Today</option>
                <option value="week">📅 This Week</option>
                <option value="month">📅 This Month</option>
                <option value="year">📅 This Year</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="newest">🕒 Newest First</option>
                <option value="oldest">🕒 Oldest First</option>
                <option value="verified">✅ Verified First</option>
                <option value="size">📏 Largest First</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Active filters: {Object.values(filters).filter(v => v !== 'all' && v !== 'newest' && v !== '').length}
            </div>
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors duration-200"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading evidence...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={fetchEvidence}
            className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && (
        <>
          {evidence.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <div className="text-gray-600 mb-2">No evidence found</div>
              <div className="text-sm text-gray-500">
                No evidence has been uploaded yet or matches your search criteria
              </div>
            </div>
          ) : (
            <>
              {/* Evidence Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {getPaginatedResults().map((item) => (
                  <div 
                    key={item._id} 
                    className={`cursor-pointer ${onEvidenceSelect ? 'hover:scale-105 transition-transform duration-200' : ''}`}
                    onClick={() => onEvidenceSelect?.(item)}
                  >
                    <EvidenceDisplay evidence={[item]} />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 pt-6">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors duration-200"
                  >
                    ← Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                            currentPage === pageNum
                              ? 'bg-pink-500 text-white'
                              : 'border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors duration-200"
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* Results Summary */}
              <div className="text-center text-sm text-gray-500 pt-4">
                Showing page {currentPage} of {totalPages}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default EvidenceSearch;