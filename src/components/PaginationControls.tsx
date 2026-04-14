import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading
}: PaginationControlsProps) => {
  // If total pages is 0 or 1, don't show pagination
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-8 p-4 bg-white rounded-xl shadow-sm border border-gray-100 gap-4">
      <div className="text-gray-500 text-sm hidden sm:block">
        Showing Page <span className="font-semibold text-gray-700">{currentPage}</span> of <span className="font-semibold text-gray-700">{totalPages}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="flex items-center gap-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <ChevronLeft size={18} /> <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-1 mx-2">
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            // Logic to center the current page
            let pageNum = currentPage - 2 + i;
            if (currentPage <= 2) pageNum = i + 1;
            else if (currentPage >= totalPages - 1) pageNum = totalPages - 4 + i;
            
            // Boundary checks
            if (pageNum < 1 || pageNum > totalPages) return null;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  pageNum === currentPage
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="flex items-center gap-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <span className="hidden sm:inline">Next</span> <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};
