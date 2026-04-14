import React, { useState, useEffect, useMemo } from 'react';
import { Upload, ChevronRight, FilePlus, FolderPlus, Plus, Trash2 } from 'lucide-react';
import { ClientCard } from './Documents/ClientCard';
import { DocumentButton } from './Documents/DocumentButton';
import { FolderButton } from './Documents/FolderButton';
import { Modal } from './Documents/Modal';
import { SearchBar } from './Documents/SearchBar';
import { FilterTabs } from './Documents/FilterTabs';
import { fetchClients, Client, Folder } from '../Data/Client';
import { useUserContext } from '../Data/UserData';
import API_BASE_URL from '../config';

import { PaginationControls } from '../components/PaginationControls';

function DocumentsMain() {
  interface PaginationState {
    currentPage: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }

  const { currentUser } = useUserContext();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [newFolderName, setNewFolderName] = useState('');
  const [newDocumentName, setNewDocumentName] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [currentFolderIndex, setCurrentFolderIndex] = useState<number | null>(null);
  const [remainingFolders, setRemainingFolders] = useState<Folder[]>([]);
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [folderError, setFolderError] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isConnectingFolder, setIsConnectingFolder] = useState(false);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{ id: number, name: string } | null>(null);

  const loadClients = async (page: number = 1) => {
    if (!currentUser?.user_id) return;
    setLoading(true);
    const response = await fetchClients(currentUser.user_id, page, 20);
    
    if (Array.isArray(response)) {
      setClients(response);
      setPagination({
        currentPage: 1,
        pageSize: 20,
        total: response.length,
        totalPages: 1
      });
    } else {
      setClients(response.data);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClients(1);
  }, [currentUser]);

  const handlePageChange = (newPage: number) => {
    loadClients(newPage);
  };

  const handleFavoriteToggle = async (clientId: number, isFavorite: boolean) => {
    if (!currentUser?.user_id) return;

    try {
      const endpoint = `${API_BASE_URL}/client-relations/favourite`;
      const method = isFavorite ? 'POST' : 'DELETE';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.user_id,
          client_id: clientId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isFavorite ? 'add' : 'remove'} favorite`);
      }

      // Update local state while preserving recent status
      setClients(prevClients =>
        prevClients.map(client => {
          if (client.client_id === clientId) {
            return {
              ...client,
              isFavorite,
              // Preserve the existing isRecent status
              isRecent: client.isRecent
            };
          }
          return client;
        })
      );
    } catch (error) {
      console.error('Error updating favorite:', error);
      throw error;
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const clientName = client?.contact_person || '';
      const companyName = client?.company_name || '';

      const matchesSearch =
        clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        companyName.toLowerCase().includes(searchQuery.toLowerCase());

      if (activeFilter === 'Recent') {
        return matchesSearch && client.isRecent;
      }
      if (activeFilter === 'Favorites') {
        return matchesSearch && client.isFavorite;
      }

      return matchesSearch;
    });
  }, [clients, searchQuery, activeFilter]);

  const handleUploadSuccess = (docId: number, fileUrl: string, type: 'important' | 'other') => {
    setClients(prevClients =>
      prevClients.map(client => ({
        ...client,
        importantDocuments: type === 'important'
          ? client.importantDocuments.map(doc =>
            doc.doc_id === docId ? { ...doc, doc_data: fileUrl } : doc
          )
          : client.importantDocuments,
        otherDocuments: type === 'other'
          ? client.otherDocuments.map(doc =>
            doc.doc_id === docId ? { ...doc, doc_data: fileUrl } : doc
          )
          : client.otherDocuments
      }))
    );
  };

  const fetchRemainingFolders = async (clientId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/folders/remaining/${clientId}`);

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.startsWith('<!DOCTYPE html>') || errorText.startsWith('<')) {
          throw new Error('Server returned HTML instead of JSON. Check your API route.');
        }
        throw new Error(errorText || 'Failed to fetch remaining folders');
      }
      const updatedClient = await fetchClients(currentUser?.user_id!);
      setClients(updatedClient);

      const data = await response.json();
      // Sort remaining folders in descending order
      data.sort((a: Folder, b: Folder) => b.folder_name.localeCompare(a.folder_name));
      setRemainingFolders(data);
      setFolderError('');
    } catch (error) {
      console.error('Error fetching remaining folders:', error);
      setFolderError('Failed to load available folders. Please try again later.');
      setRemainingFolders([]);
    }
  };

  const handleDeleteFolder = async (folderId: number, folderName: string) => {
    if (!selectedClientId) {
      alert('No client selected');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/folders/cleanup`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: selectedClientId,
          folder_id: folderId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete folder');
      }

      // Update local state
      const updatedClients = clients.map(client => {
        if (client.client_id === selectedClientId) {
          return {
            ...client,
            folders: client.folders.filter(folder => folder.folder_id !== folderId),
            importantDocuments: client.importantDocuments.filter(doc => doc.folder_id !== folderId),
            otherDocuments: client.otherDocuments.filter(doc => doc.folder_id !== folderId)
          };
        }
        return client;
      });

      setClients(updatedClients);

      // Close the folder modal if it's open
      if (selectedFolder === folderName) {
        setSelectedFolder(null);
        setCurrentFolderIndex(null);
      }

    } catch (error) {
      console.error('Error deleting folder:', error);
      alert((error as any).message || 'Failed to delete folder');
    }
  };

  const handleDeleteImportantDocument = async (docId: number, docName: string) => {
    if (!window.confirm(`Are you sure you want to delete the document "${docName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/folders/document`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doc_id: docId,
          type: "important",
          only_nullify: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete document');
      }

      // Update local state
      const updatedClients = clients.map(client => {
        if (client.contact_person === selectedClient) {
          return {
            ...client,
            importantDocuments: client.importantDocuments.filter(doc => doc.doc_id !== docId)
          };
        }
        return client;
      });

      setClients(updatedClients);

    } catch (error) {
      console.error('Error deleting document:', error);
      alert((error as any).message || 'Failed to delete document');
    }
  };

  const handleDeleteOtherDocument = async (docId: number, docName: string) => {
    if (!window.confirm(`Are you sure you want to delete the document "${docName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/folders/document`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doc_id: docId,
          type: "other"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete document');
      }

      // Update local state
      const updatedClients = clients.map(client => {
        if (client.contact_person === selectedClient) {
          return {
            ...client,
            otherDocuments: client.otherDocuments.filter(doc => doc.doc_id !== docId)
          };
        }
        return client;
      });

      setClients(updatedClients);

    } catch (error) {
      console.error('Error deleting document:', error);
      alert((error as any).message || 'Failed to delete document');
    }
  };

  const handleNullifyImportantDocument = async (docId: number, docName: string) => {
    if (!window.confirm(`Are you sure you want to remove the file from "${docName}"? The record will be kept but the file will be deleted.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/folders/document`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doc_id: docId,
          type: "important",
          only_nullify: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove document file');
      }

      // Update local state
      const updatedClients = clients.map(client => {
        if (client.contact_person === selectedClient) {
          return {
            ...client,
            importantDocuments: client.importantDocuments.map(doc =>
              doc.doc_id === docId ? { ...doc, doc_data: null } : doc
            )
          };
        }
        return client;
      });

      setClients(updatedClients);

    } catch (error) {
      console.error('Error removing document file:', error);
      alert((error as any).message || 'Failed to remove document file');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setFolderError('Folder name is required');
      return;
    }

    const yearFormat = /^\d{4}-\d{2}$/;
    if (!yearFormat.test(newFolderName)) {
      setFolderError('Folder name must be in YYYY-YY format (e.g. 2024-25)');
      return;
    }

    if (!selectedClientId) {
      setFolderError('No client selected');
      return;
    }
    setIsCreatingFolder(true);
    try {
      const response = await fetch(`${API_BASE_URL}/folders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_name: newFolderName,
          client_id: selectedClientId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create folder');
      }

      const data = await response.json();

      const updatedClients = [...clients];
      const clientIndex = updatedClients.findIndex(c => c.client_id === selectedClientId);

      if (clientIndex !== -1) {
        updatedClients[clientIndex].folders.push({
          folder_id: data.folder_id,
          folder_name: data.folder_name
        });
        setClients(updatedClients);
      }
      const updatedClient = await fetchClients(currentUser?.user_id!);
      setClients(updatedClient);

      setShowFolderModal(false);
      setShowFolderInput(false);
      setNewFolderName('');
      setFolderError('');

    } catch (error) {
      console.error('Error creating folder:', error);
      setFolderError((error as any).message || 'Failed to create folder. Please try again.');
    }
    finally {
      setIsCreatingFolder(false);
    }
  };

  const handleConnectFolder = async (folderId: number, folderName: string) => {
    if (!selectedClientId) {
      setFolderError('No client selected');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/folders/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: selectedClientId,
          folder_id: folderId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to connect folder');
      }

      const data = await response.json();

      const updatedClients = [...clients];
      const clientIndex = updatedClients.findIndex(c => c.client_id === selectedClientId);

      if (clientIndex !== -1) {
        updatedClients[clientIndex].folders.push({
          folder_id: folderId,
          folder_name: folderName
        });
        setClients(updatedClients);
      }
      const updatedClient = await fetchClients(currentUser?.user_id!);
      setClients(updatedClient);

      await fetchRemainingFolders(selectedClientId);

      setShowFolderModal(false);
      setFolderError('');

    } catch (error) {
      console.error('Error connecting folder:', error);
      setFolderError((error as any).message || 'Failed to connect folder. Please try again.');
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocumentName.trim() || !selectedClientId) {
      alert('Document name is required');
      return;
    }

    setIsCreatingDocument(true);
    try {
      let folder_id = null;

      // If a folder is selected, find its ID
      if (selectedFolder) {
        const folder = clients
          .find(c => c.client_id === selectedClientId)
          ?.folders.find(f => f.folder_name === selectedFolder);

        if (folder) {
          folder_id = folder.folder_id;
        }
      }

      const response = await fetch(`${API_BASE_URL}/other/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: selectedClientId,
          folder_id: folder_id, // Can be null if no folder selected
          doc_name: newDocumentName,
          fileUrl: null // File will be uploaded later
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const newDoc = await response.json();

      // Update local state
      setClients(prevClients =>
        prevClients.map(client =>
          client.client_id === selectedClientId
            ? {
              ...client,
              otherDocuments: [
                ...client.otherDocuments,
                {
                  doc_id: newDoc.insertedId,
                  doc_name: newDocumentName,
                  doc_data: null, // No file initially
                  client_id: selectedClientId,
                  folder_id: folder_id
                }
              ]
            }
            : client
        )
      );

      setShowDocumentModal(false);
      setNewDocumentName('');
    } catch (error) {
      console.error('Error creating document:', error);
      alert((error as any).message || 'Failed to create document');
    } finally {
      setIsCreatingDocument(false);
    }
  };

  const getDocumentsForView = (client: Client | undefined, folderName: string | null) => {
    if (!client) return { important: [], other: [] };

    // Safely handle potentially undefined arrays
    const importantDocs = client.importantDocuments || [];
    const otherDocs = client.otherDocuments || [];
    const clientFolders = client.folders || [];

    if (!folderName) {
      // When no folder is selected, show first 2 important docs and other docs without folder
      return {
        important: importantDocs.slice(0, 2),
        other: otherDocs.filter(doc => doc.folder_id === null)
      };
    }

    const folder = clientFolders.find(f => f?.folder_name === folderName);
    if (!folder) return { important: [], other: [] };

    return {
      important: importantDocs.filter(doc => doc?.folder_id === folder.folder_id),
      other: otherDocs.filter(doc => doc?.folder_id === folder.folder_id)
    };
  };

  const markAsRecent = async (clientId: number) => {
    if (!currentUser?.user_id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/client-relations/recent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.user_id,
          client_id: clientId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as recent');
      }

      // Update local state while preserving existing favorite status
      setClients(prevClients =>
        prevClients.map(client => {
          if (client.client_id === clientId) {
            return {
              ...client,
              isRecent: true,
              // Preserve the existing isFavorite status
              isFavorite: client.isFavorite
            };
          }
          // For other clients, maintain their recent status
          return client;
        })
      );
    } catch (error) {
      console.error('Error marking client as recent:', error);
    }
  };


  const handleClientSelect = async (name: string, id: number) => {
    setSelectedClient(name);
    setSelectedClientId(id);
    setSelectedFolder(null);
    setCurrentFolderIndex(null);
    await fetchRemainingFolders(id);
    await markAsRecent(id);

    // Refresh the client list to ensure all statuses are up to date
    if (currentUser?.user_id) {
      const updatedClients = await fetchClients(currentUser.user_id);
      setClients(updatedClients);
    }
  };

  const handleFolderSelect = (folderName: string, folderIndex: number) => {
    setSelectedFolder(folderName);
    setCurrentFolderIndex(folderIndex);
  };

  if (loading) {
    return <div className="p-6 text-center">Loading clients...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Document Management</h1>
            <p className="text-gray-500 mt-1">Manage all client documents in one place</p>
          </div>
          <FilterTabs
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        </div>

        <div className="mb-6">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        <div className="grid gap-5">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.client_id}
              name={client.contact_person}
              company={client.company_name}
              folders={client.folders.map(f => f.folder_name)}
              clientId={client.client_id}
              userId={currentUser?.user_id || 0}
              isFavorite={client.isFavorite}
              isRecent={client.isRecent || false}
              onFavoriteToggle={handleFavoriteToggle}
              onSelect={() => handleClientSelect(client.contact_person, client.client_id)}
            />
          ))}
        </div>
        
        {filteredClients.length > 0 && (
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            isLoading={loading}
          />
        )}

        {filteredClients.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">No clients found</h3>
            <p className="text-gray-500 max-w-md mx-auto">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Client Modal */}
        <Modal
          isOpen={selectedClient !== null && selectedFolder === null}
          onClose={() => {
            setSelectedClient(null);
            setSelectedClientId(null);
            setSelectedFolder(null);
            setCurrentFolderIndex(null);
          }}
          title={selectedClient || ''}
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-800 p-1.5 rounded-lg mr-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                Important Documents
              </h3>
              <div className="space-y-3">
                {getDocumentsForView(
                  clients.find(c => c?.contact_person === selectedClient),
                  null
                ).important.map((doc) => (
                  doc && (
                    <DocumentButton
                      key={doc.doc_id}
                      name={doc.doc_type || 'Important Document'}
                      doc_id={doc.doc_id}
                      doc_data={doc.doc_data}
                      documentType="important"
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={(error) => console.error('Upload failed:', error)}
                      onDelete={() => handleDeleteImportantDocument(doc.doc_id, doc.doc_type || 'Important Document')}
                      onNullify={() => handleNullifyImportantDocument(doc.doc_id, doc.doc_type || 'Important Document')}
                    />
                  )
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <span className="bg-purple-100 text-purple-800 p-1.5 rounded-lg mr-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                Other Documents
              </h3>
              <div className="space-y-3">
                {getDocumentsForView(
                  clients.find(c => c?.contact_person === selectedClient),
                  null
                ).other.map((doc) => (
                  doc && (
                    <DocumentButton
                      key={doc.doc_id}
                      name={doc.doc_name || 'Untitled Document'}
                      doc_id={doc.doc_id}
                      doc_data={doc.doc_data}
                      documentType="other"
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={(error) => console.error('Upload failed:', error)}
                      onDelete={() => handleDeleteOtherDocument(doc.doc_id, doc.doc_name || 'Untitled Document')}
                    />
                  )
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <span className="bg-yellow-100 text-yellow-800 p-1.5 rounded-lg mr-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </span>
                Folders
              </h3>
              <div className="space-y-3">
                {clients
                  .find((client) => client.contact_person === selectedClient)
                  ?.folders
                  .sort((a, b) => b.folder_name.localeCompare(a.folder_name))
                  .map((folder, index) => (
                    <div key={folder.folder_id || folder.folder_name} className="flex items-center justify-between">
                      <FolderButton
                        name={folder.folder_name}
                        onClick={() => handleFolderSelect(folder.folder_name, index)}
                      />
                      {/* NEW VERSION WITH POPUP TRIGGER */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderToDelete({ id: folder.folder_id, name: folder.folder_name });
                        }}
                        className="ml-2 p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <button
              onClick={() => setShowFolderModal(true)}
              className="w-full flex items-center justify-center p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-gray-200 rounded-lg hover:from-green-100 hover:to-blue-100 transition-all duration-300 text-blue-600 font-medium group"
            >
              <span className="bg-white p-2 rounded-lg shadow-sm mr-3 group-hover:shadow-md transition-shadow">
                <FolderPlus className="w-5 h-5" />
              </span>
              Add New Folder
              <ChevronRight className="w-5 h-5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </Modal>

        {/* Add Folder Modal */}
        <Modal
          isOpen={showFolderModal}
          onClose={() => {
            setShowFolderModal(false);
            setShowFolderInput(false);
            setFolderError('');
          }}
          title="Add Folder"
        >
          <div className="space-y-6">
            {!showFolderInput ? (
              <>
                <h3 className="text-lg font-medium text-gray-900">Available Folders</h3>
                {remainingFolders.length > 0 ? (
                  <div className="space-y-2">
                    {remainingFolders.map((folder) => (
                      <button
                        key={folder.folder_id}
                        onClick={() => handleConnectFolder(folder.folder_id, folder.folder_name)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex justify-between items-center"
                      >
                        <span>{folder.folder_name}</span>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No remaining folders available
                  </div>
                )}
                <div className="border-t border-gray-200 pt-4">
                  <button
                    onClick={() => setShowFolderInput(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Create New Folder
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
                    New Folder Name (YYYY-YY format)
                  </label>
                  <input
                    id="folderName"
                    type="text"
                    value={newFolderName}
                    onChange={(e) => {
                      setNewFolderName(e.target.value);
                      setFolderError('');
                    }}
                    placeholder="e.g. '2024-25'"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    autoFocus
                  />
                  {folderError && (
                    <p className="mt-2 text-sm text-red-600">{folderError}</p>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowFolderInput(false);
                      setFolderError('');
                    }}
                    className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || isCreatingFolder}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${newFolderName.trim() && !isCreatingFolder ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-200 text-white cursor-not-allowed'}`}
                  >
                    {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* Folder Modal */}
        <Modal
          isOpen={selectedFolder !== null}
          onClose={() => {
            setSelectedFolder(null);
            setCurrentFolderIndex(null);
          }}
          title={
            <div className="flex items-center">
              <span className="truncate max-w-xs">{selectedClient}</span>
              <ChevronRight className="w-5 h-5 mx-1 text-gray-400" />
              <span className="truncate max-w-xs font-semibold">{selectedFolder}</span>
            </div>
          }
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-800 p-1.5 rounded-lg mr-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                Important Documents
              </h3>
              <div className="space-y-3">
                {getDocumentsForView(
                  clients.find(c => c?.contact_person === selectedClient),
                  selectedFolder
                ).important.map((doc) => (
                  doc && (
                    <DocumentButton
                      key={doc.doc_id}
                      name={doc.doc_type || 'Important Document'}
                      doc_id={doc.doc_id}
                      doc_data={doc.doc_data}
                      documentType="important"
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={(error) => console.error('Upload failed:', error)}
                      onDelete={() => handleDeleteImportantDocument(doc.doc_id, doc.doc_type || 'Important Document')}
                      onNullify={() => handleNullifyImportantDocument(doc.doc_id, doc.doc_type || 'Important Document')}
                    />
                  )
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <span className="bg-purple-100 text-purple-800 p-1.5 rounded-lg mr-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  Other Documents
                </h3>
                <button
                  onClick={() => setShowDocumentModal(true)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <FilePlus className="w-4 h-4 mr-1" />
                  Add Document
                </button>
              </div>
              <div className="space-y-3">
                {getDocumentsForView(
                  clients.find(c => c?.contact_person === selectedClient),
                  selectedFolder
                ).other.map((doc) => (
                  doc && (
                    <DocumentButton
                      key={doc.doc_id}
                      name={doc.doc_name || 'Untitled Document'}
                      doc_id={doc.doc_id}
                      doc_data={doc.doc_data}
                      folder_id={doc.folder_id}
                      documentType="other"
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={(error) => console.error('Upload failed:', error)}
                      onDelete={() => handleDeleteOtherDocument(doc.doc_id, doc.doc_name || 'Untitled Document')}
                    />
                  )
                ))}
              </div>
            </div>
          </div>
        </Modal>

        {/* Add Document Modal */}
        <Modal
          isOpen={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
          title="Add New Document"
        >
          <div className="space-y-6">
            <div>
              <label htmlFor="documentName" className="block text-sm font-medium text-gray-700 mb-2">
                Document Name
              </label>
              <input
                id="documentName"
                type="text"
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                placeholder="e.g. 'Q1 Report.pdf'"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                autoFocus
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDocumentModal(false)}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDocument}
                disabled={!newDocumentName.trim()}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${newDocumentName.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-200 text-white cursor-not-allowed'}`}
              >
                Add Document
              </button>

            </div>
          </div>
        </Modal>
        {/* Folder Delete Confirmation Popup */}
        {folderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-[90%] max-w-sm text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Delete Folder</h3>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete the folder "{folderToDelete.name}" and all its contents?
              </p>
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={() => setFolderToDelete(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleDeleteFolder(folderToDelete.id, folderToDelete.name);
                    setFolderToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentsMain;