import React, { useState, useEffect } from 'react';
import { FiSearch, FiPlus, FiFilter, FiCalendar, FiUser, FiCheckCircle, FiCircle, FiClock, FiUsers } from 'react-icons/fi';
import { TaskCard } from './TasksPage/TaskCard';
import { TaskForm } from './TasksPage/TaskForm';
import { useUserContext } from '../Data/UserData';
import API_BASE_URL from '../config';

const TaskDashboard = () => {
  interface Task {
    task_id: string;
    task_name: string;
    status: string;
    priority: string;
    due_date: string;
    assigned_to: string;
    assigned_to_id: number | string;
    group_id: string;
    real_group_id?: number;
  }

  import { PaginationControls } from '../components/PaginationControls';

  interface PaginationState {
    currentPage: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useUserContext();
  const [userGroupIds, setUserGroupIds] = useState<number[]>([]);
  
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    if (currentUser?.role === 'employee') {
      fetch(`${API_BASE_URL}/chats/groups?user_id=${currentUser.user_id}`)
        .then(res => res.json())
        .then(data => {
          const ids = data.map((g: any) => g.group_id);
          setUserGroupIds(ids);
        })
        .catch(err => console.error('Error fetching user groups:', err));
    }
  }, [currentUser]);

  const fetchTasks = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/tasks?page=${page}&limit=20`);
      const responseData = await response.json();
      
      // Handle both backwards compatibility (array) and paginated response (object)
      let data = [];
      let newPagination = { currentPage: 1, pageSize: 20, total: 0, totalPages: 0 };
      
      if (Array.isArray(responseData)) {
        data = responseData;
        newPagination.total = data.length;
        newPagination.totalPages = 1;
      } else {
        data = responseData.data;
        newPagination = responseData.pagination;
      }

      const transformedTasks = data.map((task: any) => {
        const assignedFullName = `${task.assigned_to_first_name || ''} ${task.assigned_to_last_name || ''}`.trim();
        return {
          task_id: task.task_id?.toString() || '',
          task_name: task.task_name || 'Unnamed Task',
          status: task.status || 'pending',
          due_date: task.due_date || '',
          priority: task.priority || 'Medium',
          assigned_to: assignedFullName || 'Unassigned',
          assigned_to_id: task.assigned_to || '',
          group_id: task.group_name || 'No Group',
          real_group_id: task.group_id
        };
      });

      const finalTasks = transformedTasks.map((task: any) => ({
        ...task,
        assigned_to:
          currentUser &&
            (task.assigned_to_id === currentUser.user_id ||
              task.assigned_to === `${currentUser.first_name} ${currentUser.last_name}`)
            ? 'You'
            : task.assigned_to
      }));

      setTasks(finalTasks);
      setPagination(newPagination);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTasks(1);
    }
  }, [currentUser]);

  const handlePageChange = (newPage: number) => {
    fetchTasks(newPage);
  };

  const handleDeleteTask = React.useCallback(async (taskId) => {
    try {
      // Make DELETE request to the API
      await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE'
      });

      // Update local state by removing the deleted task
      setTasks(prevTasks => prevTasks.filter(task => task.task_id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      // You might want to add user feedback here (e.g., toast notification)
    }
  }, []);

  const filteredTasks = React.useMemo(() => tasks.filter(task => {
    const taskName = task.task_name || '';
    const assignedTo = task.assigned_to || '';

    const matchesSearch =
      taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignedTo.toLowerCase().includes(searchTerm.toLowerCase());

    // Base visibility check
    let isVisible = true;
    if (currentUser?.role === 'employee') {
      const isAssignedToMe =
        (task.assigned_to_id === currentUser.user_id) ||
        (task.assigned_to === "You") ||
        (task.assigned_to === `${currentUser.first_name} ${currentUser.last_name}`);

      const isMyGroupTask = task.real_group_id !== undefined && userGroupIds.includes(task.real_group_id);

      isVisible = isAssignedToMe || isMyGroupTask;
    }

    if (!isVisible) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const dueDate = task.due_date ? new Date(task.due_date) : null;

    if (filter === 'my' && currentUser) {
      const isAssignedToMe =
        task.assigned_to_id === currentUser.user_id ||
        task.assigned_to === "You" ||
        task.assigned_to === `${currentUser.first_name} ${currentUser.last_name}`;
      return matchesSearch && isAssignedToMe;
    }

    if (filter === 'group') {
      return matchesSearch && task.group_id && task.group_id !== 'No Group';
    }

    if (filter === 'upcoming') {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return matchesSearch && dueDate && dueDate >= today && dueDate <= nextWeek;
    }

    if (filter === 'overdue') {
      return matchesSearch && dueDate && dueDate < today;
    }

    if (filter === 'completed') {
      return matchesSearch && task.status === 'Completed';
    }

    return matchesSearch;
  }), [tasks, searchTerm, filter, currentUser, userGroupIds]);


  const handleStatusChange = React.useCallback(async (taskId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      const updatedTask = await response.json();

      setTasks(prevTasks => prevTasks.map(task =>
        task.task_id === taskId ? { ...task, status: newStatus, priority: updatedTask.priority } : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }, []);

  const handleAddTask = async (newTask) => {
    if (!currentUser) {
      console.error('No user is currently logged in');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_name: newTask.task_name,
          assigned_by: currentUser.user_id,
          assigned_to: newTask.assigned_to_id || null,
          group_id: newTask.group_id || null,
          due_date: newTask.due_date,
          status: newTask.status || 'Pending',
          priority: newTask.priority || 'Medium'
        })
      });

      const createdTask = await response.json();

      // Refetch all tasks to get the updated list
      const tasksResponse = await fetch(`${API_BASE_URL}/tasks`);
      // Refetch current page to get the updated list
      await fetchTasks(pagination.currentPage);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-100 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-blue-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">Task Management</h1>
            <p className="text-sm sm:text-base text-gray-500">Track and manage all your tasks in one place</p>
          </div>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              <FiPlus className="text-lg" />
              <span className="text-sm sm:text-base">New Task</span>
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-2 text-sm rounded-lg flex items-center gap-1 transition-colors ${filter === 'all'
                  ? 'bg-blue-600 text-white shadow-inner'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <FiFilter size={14} />
                <span>All</span>
              </button>
              <button
                onClick={() => setFilter('my')}
                className={`px-3 py-2 text-sm rounded-lg flex items-center gap-1 transition-colors ${filter === 'my'
                  ? 'bg-blue-600 text-white shadow-inner'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <FiUser size={14} />
                <span>My Tasks</span>
                {currentUser && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    {tasks.filter(t =>
                      t.assigned_to_id === currentUser.user_id ||
                      t.assigned_to === "You" ||
                      t.assigned_to === `${currentUser.first_name} ${currentUser.last_name}`
                    ).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('group')}
                className={`px-3 py-2 text-sm rounded-lg flex items-center gap-1 transition-colors ${filter === 'group'
                  ? 'bg-blue-600 text-white shadow-inner'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <FiUsers size={14} />
                <span>Group Tasks</span>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {tasks.filter(t => {
                    const isGroupTask = t.group_id && t.group_id !== 'No Group';
                    if (!isGroupTask) return false;

                    if (currentUser?.role === 'employee') {
                      const isMyGroup = t.real_group_id !== undefined && userGroupIds.includes(t.real_group_id);
                      const isAssignedToMe = t.assigned_to_id === currentUser.user_id || t.assigned_to === "You";
                      // Show if it's a group task AND (I'm in the group OR assigned to me)
                      // The prompt said "employees can see the my tasks only, and the group task, where they are member of"
                      // So for "Group Tasks" tab/count, we should strictly show group tasks visible to them.
                      return isMyGroup || isAssignedToMe;
                    }
                    return true;
                  }).length}
                </span>
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-3 py-2 text-sm rounded-lg flex items-center gap-1 transition-colors ${filter === 'upcoming'
                  ? 'bg-blue-600 text-white shadow-inner'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <FiCalendar size={14} />
                <span>Upcoming</span>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {tasks.filter(t => {
                    const dueDate = t.due_date ? new Date(t.due_date) : null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const nextWeek = new Date(today);
                    nextWeek.setDate(today.getDate() + 7);

                    const isUpcoming = dueDate && dueDate >= today && dueDate <= nextWeek;

                    if (!isUpcoming) return false;

                    if (currentUser?.role === 'employee') {
                      const isMyGroup = t.real_group_id !== undefined && userGroupIds.includes(t.real_group_id);
                      const isAssignedToMe = t.assigned_to_id === currentUser.user_id || t.assigned_to === "You";
                      return isMyGroup || isAssignedToMe;
                    }
                    return true;
                  }).length}
                </span>
              </button>
              <button
                onClick={() => setFilter('overdue')}
                className={`px-3 py-2 text-sm rounded-lg flex items-center gap-1 transition-colors ${filter === 'overdue'
                  ? 'bg-red-600 text-white shadow-inner'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <FiClock size={14} />
                <span>Overdue</span>
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {tasks.filter(t => {
                    const dueDate = t.due_date ? new Date(t.due_date) : null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isOverdue = dueDate && dueDate < today;
                    if (!isOverdue) return false;

                    if (currentUser?.role === 'employee') {
                      const isMyGroup = t.real_group_id !== undefined && userGroupIds.includes(t.real_group_id);
                      const isAssignedToMe = t.assigned_to_id === currentUser.user_id || t.assigned_to === "You";
                      return isMyGroup || isAssignedToMe;
                    }
                    return true;
                  }).length}
                </span>
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-2 text-sm rounded-lg flex items-center gap-1 transition-colors ${filter === 'completed'
                  ? 'bg-green-600 text-white shadow-inner'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <FiCheckCircle size={14} />
                <span>Completed</span>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {tasks.filter(t => {
                    if (t.status !== 'Completed') return false;
                    if (currentUser?.role === 'employee') {
                      const isMyGroup = t.real_group_id !== undefined && userGroupIds.includes(t.real_group_id);
                      const isAssignedToMe = t.assigned_to_id === currentUser.user_id || t.assigned_to === "You";
                      return isMyGroup || isAssignedToMe;
                    }
                    return true;
                  }).length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Task Grid */}
        {filteredTasks.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.task_id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
            
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              isLoading={loading}
            />
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl bg-white border border-gray-200 shadow-sm">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiSearch className="text-gray-400 text-xl" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">No tasks found</h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">Try adjusting your search or filter criteria</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm text-sm"
            >
              <FiPlus />
              <span>Create New Task</span>
            </button>
          </div>
        )}
      </div>

      {/* Task Form Modal */}
      {showForm && (
        <TaskForm
          onClose={() => setShowForm(false)}
          onSubmit={handleAddTask}
        />
      )}
    </div>
  );
};

export default TaskDashboard;