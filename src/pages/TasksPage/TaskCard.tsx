import React, { useState } from 'react';
import {
  FiCalendar,
  FiUser,
  FiCircle,
  FiClock,
  FiCheckCircle,
  FiTrash2,
  FiTag,
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiUsers
} from 'react-icons/fi';

export const TaskCard = React.memo(({ task, onStatusChange, onDelete }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const statusColors = {
    Pending: 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800',
    'In Progress': 'bg-gradient-to-r from-blue-200 to-blue-300 text-blue-800',
    Completed: 'bg-gradient-to-r from-green-200 to-green-300 text-green-800'
  };

  const statusIcons = {
    Pending: <FiCircle className="text-gray-500" size={16} />,
    'In Progress': <FiClock className="text-blue-500" size={16} />,
    Completed: <FiCheckCircle className="text-green-500" size={16} />
  };

  const priorityColors = {
    High: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800',
    Medium: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800',
    Low: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
  };

  const priorityIcons = {
    High: <FiAlertCircle className="text-red-500" size={16} />,
    Medium: <FiAlertTriangle className="text-yellow-500" size={16} />,
    Low: <FiInfo className="text-green-500" size={16} />
  };

  const formatDate = (dateString) => {
    try {
      const options = { month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch {
      return 'Invalid date';
    }
  };

  const isOverdue = () => {
    try {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today && task.status !== 'Completed';
    } catch {
      return false;
    }
  };

  const confirmDelete = () => setShowConfirmModal(true);
  const cancelDelete = () => setShowConfirmModal(false);
  const handleDelete = () => {
    // console.log(task);
    onDelete(task.task_id);
    setShowConfirmModal(false);
  };

  return (
    <>
      <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:scale-[1.02] flex flex-col group relative">
        {/* Priority ribbon */}
        {task.priority === 'High' && (
          <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">
            High Priority
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-semibold text-gray-800 text-xl sm:text-2xl line-clamp-2 pr-2">
            {task.task_name}
          </h3>
          <button
            onClick={confirmDelete}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Delete task"
          >
            <FiTrash2 size={18} />
          </button>
        </div>

        {/* Status and Priority badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className={`px-3 py-1 rounded-full text-xs flex items-center gap-2 ${statusColors[task.status]} bg-opacity-90`}>
            {statusIcons[task.status]}
            <span className="font-semibold">{task.status}</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs flex items-center gap-2 ${priorityColors[task.priority]} bg-opacity-90`}>
            {priorityIcons[task.priority]}
            <span className="font-semibold">{task.priority} Priority</span>
          </div>
        </div>

        {/* Task details */}
        <div className="space-y-2 mb-4">
          {/* Conditionally show assigned_to or group_id */}
          {task.assigned_to && task.assigned_to !== "Unassigned" ? (
            <div className="flex items-center text-sm text-gray-600">
              <FiUser className="mr-2 text-gray-400" size={14} />
              <span className="truncate font-medium text-gray-700">{task.assigned_to}</span>
            </div>
          ) : task.group_id ? (
            <div className="flex items-center text-sm text-gray-600">
              <FiUsers className="mr-2 text-gray-400" size={14} />
              <span className="truncate font-medium text-gray-700">{task.group_id}</span>
            </div>
          ) : (
            <div className="flex items-center text-sm text-gray-600">
              <FiUser className="mr-2 text-gray-400" size={14} />
              <span className="truncate font-medium text-gray-700">Unassigned</span>
            </div>
          )}

          <div className="flex items-center text-sm text-gray-600">
            <FiCalendar className="mr-2 text-gray-400" size={14} />
            <span className={isOverdue() ? 'text-red-600 font-semibold' : 'text-gray-600'}>
              {formatDate(task.due_date)}
              {isOverdue() && ' • Overdue'}
            </span>
          </div>
        </div>

        {/* Footer - Status change buttons */}
        <div className="mt-auto pt-4 border-t border-gray-200">
          <div className="flex justify-between gap-2">
            {['Pending', 'In Progress', 'Completed'].map(status => (
              <button
                key={status}
                onClick={() => onStatusChange(task.task_id, status)}
                className={`text-xs px-4 py-2 rounded-lg flex-1 text-center transition-all duration-200 ease-in-out transform ${task.status === status
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <FiTrash2 className="text-red-500" size={24} />
              <h2 className="text-lg font-semibold text-gray-800">Delete Task</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-800">"{task.task_name}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm bg-red-500 hover:bg-red-600 text-white shadow-sm transition-transform transform hover:scale-105"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
