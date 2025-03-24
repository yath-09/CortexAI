import { BASE_URL } from '../../config';

export const uploadDocument = async (formData: FormData, getToken: () => Promise<string>) => {
  try {
    // Verify formData contents before upload
    if (!formData || Array.from(formData.keys()).length === 0) {
      throw new Error('No file selected for upload');
    }

    // Get authentication token
    const token = await getToken();
    
    if (!token) {
      throw new Error('Authentication failed. Unable to get token.');
    }

    // Perform file upload
    const response = await fetch(`${BASE_URL}/api/documents/upload-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    // if (!response.ok) {
    //   const errorText = await response.text();
    //   throw new Error(errorText || 'Upload failed');
    // }

    return response;
  } catch (error) {
    console.error('Document upload error:', error);
    throw error;
  }
};

export const simulateUploadProgress = (
  setUploadProgress: (update: (prev: number) => number) => void
) => {
  return setInterval(() => {
    setUploadProgress(prev => {
      const increment = Math.random() * 10;
      const newProgress = Math.min(prev + increment, 95);
      return newProgress;
    });
  }, 400);
};