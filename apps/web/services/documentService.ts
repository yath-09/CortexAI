import { BASE_URL } from '../config';

export const documentService = {
  uploadDocument: async (formData: FormData, getToken: () => Promise<string | null>) => {
    try {
      // Verify formData contents before upload
      if (!formData || Array.from(formData.keys()).length === 0) {
        throw new Error('No file selected for upload');
      }

      // Get authentication token
      const token = await getToken();
      
      if (!token) {
        throw new Error('Please login to upload the documents');
      }

      // Perform file upload
      const response = await fetch(`${BASE_URL}/api/documents/upload-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      return response;
    } catch (error) {
      console.error('Document upload error:', error);
      throw error;
    }
  },

  getDocuments: async (queryParams: URLSearchParams, getToken: () => Promise<string | null>) => {
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('Please login to view documents');
      }

      const response = await fetch(`${BASE_URL}/api/documents/documents?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return  response;
    } catch (error) {
      console.error('Fetch documents error:', error);
      throw error;
    }
  },

  getDocumentById: async (documentId: string, getToken: () => Promise<string | null>) => {
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('Please login to view document details');
      }

      const response = await fetch(`${BASE_URL}/api/documents/documents/${documentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response;
    } catch (error) {
      console.error('Fetch document details error:', error);
      throw error;
    }
  },

  deleteDocument: async (documentId: string, getToken: () => Promise<string | null>) => {
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('Please login to delete documents');
      }

      const response = await fetch(`${BASE_URL}/api/documents/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response;
    } catch (error) {
      console.error('Delete document error:', error);
      throw error;
    }
  }
};