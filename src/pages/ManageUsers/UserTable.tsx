import React, { useEffect, useState } from 'react';
import { Eye, Trash2, Edit } from 'lucide-react';
import { ViewUserModal } from './ViewUserModal';
import { ViewClientModal } from './ViewClientModal';
import { UserEditForm } from './UserEditForm';
import { useData } from '../../context/DataContext';
import { ClientEditForm } from './ClientEditForm';
import API_BASE_URL from '../../config';

interface User {
  user_id: number;
  auth_id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  profile_pic?: string | null;
  created_at?: string | null;
  type: 'user';
}

interface ClientContact {
  contact_name: string;
  phone: string;
  email: string;
}

interface Client {
  client_id: number;
  auth_id: number;
  company_name?: string | null;
  contact_person?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan_number?: string | null;
  profile_pic?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  contacts?: ClientContact[] | null;
  role?: string | null;
  type: 'client';
}

type Entity = User | Client;

const getRoleColor = (role?: string | null) => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return 'bg-purple-200 text-purple-900';
    case 'employee':
      return 'bg-green-200 text-green-900';
    case 'client':
      return 'bg-orange-200 text-orange-900';
    default:
      return 'bg-gray-200 text-gray-900';
  }
};

const getInitials = (name1?: string | null, name2?: string | null) => {
  const firstInitial = name1?.charAt(0) || '';
  const secondInitial = name2?.charAt(0) || '';
  return `${firstInitial}${secondInitial}` || 'U';
};

export const UserTable = ({ currentTab, searchTerm }: { currentTab?: 'users' | 'clients'; searchTerm: string }) => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    entity: Entity | null;
  }>({ show: false, entity: null });

  const activeTab = currentTab || 'users';
  const { userVersion, clientVersion, refreshUsers, refreshClients } = useData();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let url = activeTab === 'users'
          ? `${API_BASE_URL}/users`
          : `${API_BASE_URL}/clients`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        
        // Handle both raw array and paginated response format { data: [], pagination: {} }
        const dataList = Array.isArray(data) ? data : (data.data || []);
        
        const typedData = dataList.map((item: any) => ({
          ...item,
          type: activeTab === 'users' ? 'user' : 'client',
          contacts: activeTab === 'clients' ? (item.contacts || []) : undefined
        }));

        setEntities(typedData);
        setFilteredEntities(typedData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, userVersion, clientVersion]);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredEntities(entities);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = entities.filter(entity => {
        if (entity.type === 'user') {
          const user = entity as User;
          return (
            user.first_name?.toLowerCase().includes(searchLower) ||
            user.last_name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower)
          );
        } else {
          const client = entity as Client;
          return (
            client.company_name?.toLowerCase().includes(searchLower) ||
            client.contact_person?.toLowerCase().includes(searchLower) ||
            client.email?.toLowerCase().includes(searchLower) ||
            client.contacts?.some(contact =>
              contact.contact_name.toLowerCase().includes(searchLower) ||
              contact.email.toLowerCase().includes(searchLower)
            ));
        }
      });
      setFilteredEntities(filtered);
    }
  }, [searchTerm, entities]);

  const updateUserInDatabase = async (updatedUser: User): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/update/update-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedUser),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      refreshUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const updateClientInDatabase = async (updatedClient: Client): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/update/update-client`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedClient),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      refreshClients();
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  };

  const handleViewEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsViewModalOpen(true);
  };

  const handleEditEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsEditModalOpen(true);
  };

  const handleDeleteEntity = (entity: Entity) => {
    setDeleteConfirmation({ show: true, entity });
  };

  const confirmDeleteEntity = async () => {
    if (!deleteConfirmation.entity) return;

    const { entity } = deleteConfirmation;
    const id = entity.type === 'user' ? entity.user_id : entity.client_id;
    const type = entity.type;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/delete/${type}/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete');
      }

      if (type === 'user') {
        refreshUsers();
      } else {
        refreshClients();
      }
    } catch (err) {
      console.error('Error deleting entity:', err);
      alert(`Error deleting ${type}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setDeleteConfirmation({ show: false, entity: null });
    }
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedEntity(null);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedEntity(null);
  };

  const renderEntityRow = (entity: Entity) => {
    const id = entity.type === 'user' ? entity.user_id : entity.client_id;
    const initials = entity.type === 'user'
      ? getInitials(entity.first_name, entity.last_name)
      : getInitials(entity.company_name, entity.contact_person);

    const contactInfo = entity.type === 'user'
      ? (entity as User).phone || 'N/A'
      : (entity as Client).contact_person || 'N/A';

    return (
      <tr key={id} className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {entity.profile_pic ? (
              <img
                className="h-10 w-10 rounded-full object-cover"
                src={entity.profile_pic}
                alt="Profile"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-600">{initials}</span>
              </div>
            )}
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">
                {entity.type === 'user'
                  ? `${(entity as User).first_name || 'Unknown'} ${(entity as User).last_name || ''}`
                  : (entity as Client).company_name || 'Unknown Company'}
              </div>

            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900">{entity.email || 'N/A'}</div>
          <div className="text-sm text-gray-500">
            {contactInfo}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(entity.role)}`}>
            {entity.role?.toUpperCase() || entity.type.toUpperCase()}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => handleViewEntity(entity)}
              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
              title="View"
            >
              <Eye className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleEditEntity(entity)}
              className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
              title="Edit"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDeleteEntity(entity)}
              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
              title="Delete"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  if (loading) return <div className="text-center py-8">Loading data...</div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error}</div>;

  return (
    <>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-xl overflow-hidden border border-gray-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {activeTab === 'users' ? 'User' : 'Client'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? 'No matching results found' : `No ${activeTab} found`}
                    </td>
                  </tr>
                ) : (
                  filteredEntities.map(renderEntityRow)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedEntity && isViewModalOpen && (
        selectedEntity.type === 'user' ? (
          <ViewUserModal
            isOpen={isViewModalOpen}
            onClose={closeViewModal}
            user={selectedEntity as User}
          />
        ) : (
          <ViewClientModal
            isOpen={isViewModalOpen}
            onClose={closeViewModal}
            client={selectedEntity as Client}
          />
        )
      )}

      {selectedEntity && isEditModalOpen && (
        selectedEntity.type === 'user' &&
          (selectedEntity.role === 'admin' || selectedEntity.role === 'employee') ? (
          <UserEditForm
            isOpen={isEditModalOpen}
            onClose={closeEditModal}
            entity={selectedEntity}
            onSave={updateUserInDatabase}
          />
        ) : (
          <ClientEditForm
            isOpen={isEditModalOpen}
            onClose={closeEditModal}
            client={selectedEntity as Client}
            onSave={updateClientInDatabase}
          />
        )
      )}


      {deleteConfirmation.show && deleteConfirmation.entity && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-red-100">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
            </div>

            <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
              Confirm Deletion
            </h3>

            <div className="text-center mb-4">
              {deleteConfirmation.entity.type === 'user' ? (
                <>
                  <p className="text-gray-700">
                    Are you sure you want to delete user:
                  </p>
                  <p className="font-semibold text-lg mt-1">
                    {(deleteConfirmation.entity as User).first_name} {(deleteConfirmation.entity as User).last_name}
                  </p>
                  <p className="text-gray-600 text-sm">
                    ({(deleteConfirmation.entity as User).email})
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-700">
                    Are you sure you want to delete client:
                  </p>
                  <p className="font-semibold text-lg mt-1">
                    {(deleteConfirmation.entity as Client).company_name}
                  </p>
                  <p className="text-gray-600 text-sm">
                    ({(deleteConfirmation.entity as Client).email})
                  </p>
                </>
              )}
            </div>

            <div className="bg-red-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-red-800 mb-2">⚠️ WARNING: This action cannot be undone</h4>
              <p className="text-sm text-red-700">
                This will permanently delete this {deleteConfirmation.entity.type} and ALL associated data from the database.
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 mt-2 pl-2">
                {deleteConfirmation.entity.type === 'user' ? (
                  <>
                    <li>User profile</li>
                    <li>All assigned tasks</li>
                    <li>All chat messages</li>
                    <li>Authentication data</li>
                  </>
                ) : (
                  <>
                    <li>Client profile</li>
                    <li>All contacts</li>
                    <li>All documents</li>
                    <li>All feedback</li>
                    <li>Authentication data</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setDeleteConfirmation({ show: false, entity: null })}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEntity}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete Permanently'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};