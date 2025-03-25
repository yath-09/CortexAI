import { BASE_URL } from '../config';

export const chatServicee = {
    chatStream: async (query: string, getToken: () => Promise<string | null>) => {
        try {
          // Create an AbortController to be able to cancel the fetch if needed
          const controller = new AbortController();
          const signal = controller.signal;
    
          // Set a timeout to abort if taking too long
          const timeoutId = setTimeout(() => controller.abort(), 30000);
    
          // Get authentication token
          const token = await getToken();
    
          if (!token) {
            throw new Error('Please login to chat');
          }
    
          const response = await fetch(`${BASE_URL}/api/chat/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ query }),
            signal: signal
          });
    
          // Clear the timeout
          clearTimeout(timeoutId);
    
          return response;
        } catch (error) {
          console.error('Chat stream error:', error);
          throw error;
        }
      }
  
};