import React, { useState, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { NewUserForm, User } from '../Data';
import API_BASE_URL from '../config';
import { Header } from './ManageUsers/Header';
import { UserTable } from './ManageUsers/UserTable';
// import { AddUserModal } from './ManageUsers/AddUserModal';
import { ViewUserModal } from './ManageUsers/ViewUserModal';
import { initialUsers } from '../Data/initialUsers';
import AddUserModal from './ManageUsers/AddUserModal';
import { GroupList } from './ManageUsers/GroupList';
import { ViewGroupModal } from './ManageUsers/ViewGroupModal';
import { useUserContext } from '../Data/UserData';
import { useData } from '../context/DataContext';



function ManageUsersMain() {
  const { currentUser } = useUserContext();
  const { refreshUsers, refreshClients } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isGroupViewModalOpen, setIsGroupViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'Admin' | 'Employee' | 'Client' | 'Group'>('Employee');

  // Set initial tab for employee
  React.useEffect(() => {
    if (currentUser?.role === 'employee') {
      setActiveTab('Client');
    }
  }, [currentUser]);
  // Group State
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [deleteGroupConfirmation, setDeleteGroupConfirmation] = useState<{
    show: boolean;
    group: any | null;
  }>({ show: false, group: null });

  const confirmDeleteGroup = () => {
    if (!deleteGroupConfirmation.group) return;

    const groupId = deleteGroupConfirmation.group.group_id;
    fetch(`${API_BASE_URL}/chats/groups/${groupId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetch(`${API_BASE_URL}/chats/groups/all`).then(r => r.json()).then(setGroups);
        } else {
          alert("Failed to delete group: " + (data.error || 'Unknown error'));
        }
      })
      .catch(err => console.error("Error deleting group:", err))
      .finally(() => {
        setDeleteGroupConfirmation({ show: false, group: null });
      });
  };

  const [newUser, setNewUser] = useState<NewUserForm>({
    name: '',
    email: '',
    phone: '',
    status: 'Active',
    department: '',
    adminLevel: '',
    designation: '',
    employeeId: '',
    joiningDate: '',
    companyName: '',
    gstin: '',
    pan: '',
    address: '',
  });

  const filteredUsers = useMemo(() => {
    if (activeTab === 'Group') return []; // Users filter doesn't apply to groups directly here
    return users.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const roleMap: Record<string, string> = { 'Admin': 'Admin', 'Employee': 'Employee', 'Client': 'Client' };
      const matchesRole = user.role === roleMap[activeTab]; // Simplified as activeTab cannot be 'All'
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, activeTab]);

  // Fetch groups when tab is Group
  React.useEffect(() => {
    if (activeTab === 'Group') {
      fetch(`${API_BASE_URL}/chats/groups/all`)
        .then(res => res.json())
        .then(data => setGroups(data))
        .catch(err => console.error('Error fetching groups:', err));
    }
  }, [activeTab]);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const baseUser = {
      id: Math.random().toString(36).substr(2, 9),
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      status: 'Active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    let user: User;

    switch (activeTab) {
      case 'Admin':
        user = {
          ...baseUser,
          role: 'Admin',
          department: newUser.department,
          adminLevel: newUser.adminLevel,
        };
        break;
      case 'Employee':
        user = {
          ...baseUser,
          role: 'Employee',
          designation: newUser.designation,
          employeeId: newUser.employeeId,
          joiningDate: newUser.joiningDate,
        };
        break;
      case 'Client':
        user = {
          ...baseUser,
          role: 'Client',
          companyName: newUser.companyName,
          gstin: newUser.gstin,
          pan: newUser.pan,
          address: newUser.address,
        };
        break;
    }

    // Handle Group Create/Update - API call moved to AddUserModal onSubmit for clarity or keep here?
    // Kept inside onSubmit prop of AddUserModal to have access to type 'Group'.
    // Removing this block to avoid duplication or confusion, as logic is now in onSubmit prop.

    setUsers([...users, user]);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewUser({
      name: '',
      email: '',
      phone: '',
      status: 'Active',
      department: '',
      adminLevel: '',
      designation: '',
      employeeId: '',
      joiningDate: '',
      companyName: '',
      gstin: '',
      pan: '',
      address: '',
    });
    // setActiveTab('Employee'); 
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(user => user.id !== id));
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTab={activeTab === 'Group' ? 'groups' : activeTab === 'Client' ? 'clients' : 'users'}
        setActiveTab={(tab) => {
          if (tab === 'groups') setActiveTab('Group');
          else if (tab === 'clients') setActiveTab('Client');
          else setActiveTab('Employee');
        }}
        onAddUser={() => {
          setSelectedGroup(null);
          setIsModalOpen(true);
        }}
        userRole={currentUser?.role}
      />

      {activeTab === 'Group' ? (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <GroupList
            groups={groups}
            onDeleteGroup={(id) => {
              const groupToDelete = groups.find(g => g.group_id === id);
              if (groupToDelete) {
                setDeleteGroupConfirmation({ show: true, group: groupToDelete });
              }
            }}
            onEditGroup={(group) => {
              setSelectedGroup(group);
              setIsModalOpen(true);
            }}
            onViewGroup={(group) => {
              setSelectedGroup(group);
              setIsGroupViewModalOpen(true);
            }}
          />
        </div>
      ) : (
        <UserTable
          currentTab={activeTab === 'Client' ? 'clients' : 'users'}
          searchTerm={searchTerm}
        />
      )}

      <AddUserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSubmit={async (data, type) => {
          if (type === 'Group') {
            console.log("Submitting Group Form. SelectedGroup:", selectedGroup);
            console.log("Form Data:", data);
            console.log("Current User:", currentUser);

            if (selectedGroup) {
              // UPDATE
              console.log("Updating group...");
              fetch(`${API_BASE_URL}/chats/groups/${selectedGroup.group_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  group_name: data.group_name,
                  members: data.members // Array of user_ids
                })
              })
                .then(() => {
                  fetch(`${API_BASE_URL}/chats/groups/all`).then(r => r.json()).then(setGroups);
                  setIsModalOpen(false);
                })
                .catch(err => console.error("Error updating group:", err));
            } else {
              // CREATE
              const payload = {
                group_name: data.group_name,
                members: data.members,
                creator_id: currentUser?.user_id
              };
              console.log("Creating group with payload:", payload);

              fetch(`${API_BASE_URL}/chats/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              })
                .then(async (res) => {
                  const responseText = await res.text();
                  console.log("Create Group Response:", res.status, responseText);
                  if (!res.ok) throw new Error(responseText);
                  return JSON.parse(responseText);
                })
                .then(() => {
                  fetch(`${API_BASE_URL}/chats/groups/all`).then(r => r.json()).then(setGroups);
                  setIsModalOpen(false);
                })
                .catch(err => {
                  console.error("Error creating group:", err);
                  alert("Failed to create group: " + err.message);
                });
            }
            return;
          }

          // Handle REAL User/Client Registration
          try {
            const response = await fetch(`${API_BASE_URL}/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Registration failed");

            alert("Successfully registered!");
            setIsModalOpen(false);
            resetForm();
            
            // Force a reload of the UserTable by refreshing context
            if (activeTab === 'Client') refreshClients();
            else refreshUsers();
          } catch (err: any) {
            console.error("Registration error:", err);
            alert(err.message);
          }
        }}
        initialGroupData={selectedGroup} // Pass the selected group
      />

      {selectedUser && (
        <ViewUserModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          user={selectedUser}
        />
      )}

      {selectedGroup && (
        <ViewGroupModal
          isOpen={isGroupViewModalOpen}
          onClose={() => setIsGroupViewModalOpen(false)}
          group={selectedGroup}
        />
      )}

      {deleteGroupConfirmation.show && deleteGroupConfirmation.group && (
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
              <p className="text-gray-700">
                Are you sure you want to delete group:
              </p>
              <p className="font-semibold text-lg mt-1">
                {deleteGroupConfirmation.group.group_name}
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-red-800 mb-2">⚠️ WARNING: This action cannot be undone</h4>
              <p className="text-sm text-red-700">
                This will permanently delete this group and ALL associated data:
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 mt-2 pl-2">
                <li>Group details</li>
                <li>All group memberships</li>
                <li>All group messages</li>
                <li>Message read status</li>
                <li>Task associations (will be unassigned)</li>
              </ul>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setDeleteGroupConfirmation({ show: false, group: null })}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteGroup}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ManageUsersMain;