import { BASE_URL } from '../config';
import { MessageType } from '../lib/context/ChatContext';

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
      //console.log("heheh")
      //console.error('Chat stream error:', error);
      throw error;
    }
  },
  getUserChats: async (getToken: () => Promise<string | null>) => {
    const token = await getToken();
    const response = await fetch(`${BASE_URL}/api/chat/getUserChats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response;
  },
  getUserChatsById: async (chatId: string, getToken: () => Promise<string | null>) => {
    const token = await getToken();
    const response = await fetch(`${BASE_URL}/api/chat/getUserChats/${chatId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response;
  },

  manageChatSession: async (currentChatSessionId: string, chatMessages: MessageType[], getToken: () => Promise<string | null>) => {
    const token = await getToken();
    const url = currentChatSessionId
      ? `${BASE_URL}/api/chat/updateChatSession/${currentChatSessionId}`
      : `${BASE_URL}/api/chat/addChatSession`;
    const method = currentChatSessionId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ chatMessages }),
    });

    return response;
  },
  deleteChatSession: async (currentChatSessionId: string, getToken: () => Promise<string | null>) => {
    const token = await getToken();
    const response = await fetch(`${BASE_URL}/api/chat/deleteChatSession/${currentChatSessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response;
  },
  updateChatTitle: async (chatId:string,editTitle: string, getToken: () => Promise<string | null>) => {
      const token=await getToken()
      const response = await fetch(`${BASE_URL}/api/chat/updateChatTitle/${chatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title:editTitle}),
      });

    return response;
  },



};