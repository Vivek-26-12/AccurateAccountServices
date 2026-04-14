import axios from "axios";
import API_BASE_URL from "../config";

// Update your interfaces to match the database schema
export interface Folder {
  folder_id: number;
  folder_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ImportantDocument {
  doc_id: number;
  doc_type: 'Balance Sheet' | 'Profit and Loss' | 'Capital Account' | 'Aadhar Card' | 'PAN Card';
  doc_data: string | null;
  client_id: number;
  folder_id: number | null;
  created_at?: string;
}

export interface OtherDocument {
  doc_id: number;
  doc_name: string;
  doc_data: string | null;
  client_id: number;
  folder_id: number | null;
  created_at?: string;
}

export interface Client {
  client_id: number;
  auth_id: number;
  company_name: string;
  contact_person: string;
  email?: string;
  gstin?: string;
  pan_number?: string;
  profile_pic?: string;
  isFavorite?: boolean;
  isRecent?: boolean;
  folders: Folder[];
  importantDocuments: ImportantDocument[];
  otherDocuments: OtherDocument[];
  created_at?: string;
  updated_at?: string;
}


export const fetchClients = async (userId: number, page?: number, limit?: number): Promise<{ data: Client[], pagination?: any } | Client[]> => {
  try {
    const url = page && limit 
      ? `${API_BASE_URL}/clientDataRoutes?page=${page}&limit=${limit}`
      : `${API_BASE_URL}/clientDataRoutes`;
      
    // Fetch clients data and relations in parallel
    const [clientsResponse, relationsResponse] = await Promise.all([
      axios.get(url),
      axios.get(`${API_BASE_URL}/client-relations/${userId}`)
    ]);

    // Create a map of favorite client IDs for quick lookup
    const favoriteClientIds = new Set(
      relationsResponse.data
        .filter((relation: any) => relation.relation_type === 'Favourite')
        .map((relation: any) => relation.client_id)
    );

    const recentClientIds = new Set(
      relationsResponse.data
        .filter((relation: any) => relation.relation_type === 'Recent')
        .map((relation: any) => relation.client_id)
    );

    const isPaginated = !!clientsResponse.data.pagination;
    const clientDataList = isPaginated ? clientsResponse.data.data : clientsResponse.data;

    const clients: Client[] = await Promise.all(
      clientDataList.map(async (client: any) => {
        const {
          client_id,
          auth_id,
          company_name,
          contact_person,
          email,
          gstin,
          pan_number,
          profile_pic,
          folders,
          importantDocuments,
          created_at,
          updated_at,
        } = client;

        // Fetch OtherDocuments for each client
        let otherDocuments: OtherDocument[] = [];
        try {
          const otherDocsRes = await axios.get(`${API_BASE_URL}/other/getByClient/${client_id}`);
          otherDocuments = otherDocsRes.data.documents.map((doc: any): OtherDocument => ({
            doc_id: doc.doc_id,
            doc_name: doc.doc_name || 'Untitled Document',
            doc_data: doc.doc_data ?? null,
            client_id: doc.client_id,
            folder_id: doc.folder_id ?? null,
            created_at: doc.created_at,
          }));
        } catch (err) {
          console.error(`Error fetching other documents for client ${client_id}:`, err);
        }

        return {
          client_id,
          auth_id,
          company_name: company_name || '',
          contact_person: contact_person || '',
          email: email || '',
          gstin: gstin || '',
          pan_number: pan_number || '',
          profile_pic: profile_pic || '',
          isFavorite: favoriteClientIds.has(client_id), // Set favorite status
          isRecent: recentClientIds.has(client_id),
          folders: folders || [],
          importantDocuments: importantDocuments?.map((doc: any): ImportantDocument => ({
            doc_id: doc.doc_id,
            doc_type: doc.doc_type,
            doc_data: doc.doc_data ?? null,
            client_id: doc.client_id,
            folder_id: doc.folder_id ?? null,
            created_at: doc.created_at,
          })) || [],
          otherDocuments,
          created_at,
          updated_at,
        };
      })
    );

    if (isPaginated) {
      return { data: clients, pagination: clientsResponse.data.pagination };
    }
    return clients;
  } catch (error) {
    console.error("Failed to fetch client data:", error);
    return [];
  }
};

