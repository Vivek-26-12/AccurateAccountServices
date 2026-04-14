import React from 'react';

export const TaskSkeleton = () => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 animate-pulse mb-4">
    <div className="flex justify-between items-start mb-4">
      <div className="w-2/3">
        <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-3"></div>
        <div className="flex items-center gap-2">
          <div className="h-4 bg-gray-100 rounded w-20"></div>
          <div className="h-4 bg-gray-100 rounded w-24"></div>
        </div>
      </div>
      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
    </div>
    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
      <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
      <div className="h-4 bg-gray-100 rounded w-1/3"></div>
    </div>
  </div>
);

export const UserListSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-100 rounded w-1/3"></div>
        </div>
      </div>
    ))}
  </div>
);

export const DocumentCardSkeleton = () => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
      <div className="flex-1">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
      </div>
    </div>
    <div className="h-20 bg-gray-50 rounded-lg mb-4"></div>
    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
      <div className="h-4 bg-gray-100 rounded w-1/3"></div>
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </div>
  </div>
);
