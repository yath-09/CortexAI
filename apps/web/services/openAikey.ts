import { BASE_URL } from '../config';

export const openAikey = {
    setOpenAiKey: async (apiKey: string, getToken: () => Promise<string | null>) => {
        try {
          const token = await getToken();
    
          if (!token) {
            throw new Error('Please login to ccreate the open AI key');
          }
    
          const response = await fetch(`${BASE_URL}/api/chat/updateApiKey`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ apiKey }),
          });
    
          return response;
        } catch (error) {
          console.error('Chat stream error:', error);
          throw error;
        }
      }
  
};