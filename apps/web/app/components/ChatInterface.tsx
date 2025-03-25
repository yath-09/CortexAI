// components/ChatInterface.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { MessageType, useChat } from '../../lib/context/ChatContext';
import MessageItem from './MessageItem';
import { cn } from '../../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { MdDelete } from "react-icons/md";
import { IoSend } from "react-icons/io5";
import { IoIosRefresh } from "react-icons/io";
import { useAuth } from '@clerk/nextjs';
import { chatServicee } from '../../services/chatService';
// Improved stream chat response function for better speed and reliability
import toast from 'react-hot-toast';
import { resolve } from 'path';
import { FaHistory, FaSave } from 'react-icons/fa';
import { BASE_URL } from '../../config';
import { Overlay } from './DocumentManager';

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
  </svg>
);


// Chat session type
interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
}
export default function ChatInterface() {
  const { messages, addMessage, updateMessage, isLoading, setIsLoading, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { getToken } = useAuth()
  const [currentChatSessionId, setCurrentChatSessionId] = useState("")


  // New state for recent chats
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [isRecentChatsModalOpen, setIsRecentChatsModalOpen] = useState(false);
  const [isSavingChat, setIsSavingChat] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  // Auto-scroll only happens within the chat container, not the whole page
  useEffect(() => {
    // Check if we should scroll
    const shouldScroll = messages.length > 0 && messages[messages.length - 1]?.status === 'loading';

    if (shouldScroll && messagesEndRef.current) {
      // Use scrollIntoView but only within the container
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  }, [messages]);

  // Fetch recent chats on component mount
  useEffect(() => {
    fetchRecentChats();
  }, []);
  const fetchRecentChats = async () => {
    try {
      const response = await chatServicee.getUserChats(getToken)
      if (!response.ok) {
        throw new Error('Failed to fetch recent chats');
      }

      const data = await response.json();
      setRecentChats(data.chats);
    } catch (error) {
      console.error('Error fetching recent chats:', error);
      toast.error('Failed to fetch recent chats');
    }
  };

  // Load specific chat session
  const loadChatSession = async (chatId: string) => {
    try {
      //first save the current and then add the other
      //await saveChatHistory()
      const response=await chatServicee.getUserChatsById(chatId,getToken)

      if (!response.ok) {
        throw new Error('Failed to load chat session');
      }

      const data = await response.json();
      if (data.chats && data.chats.length > 0) {
        // Clear current messages
        clearMessages();

        // Add messages from the loaded chat to prevent the default asssitant chat we sliced ho 

        data.chats[0].messages.slice(1).forEach((message: MessageType) => {
          addMessage({
            role: message.role,
            content: message.content,
            status: message.status || 'complete'
            //timestamp: new Date(message.timestamp)
          });
        });

        // Set the current chat session ID
        setCurrentChatSessionId(chatId);

        // Close the modal
        setIsRecentChatsModalOpen(false);
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
      toast.error('Failed to load chat session');
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent scroll to bottom of page when submitting
    if (e.target && 'blur' in e.target) {
      (e.target as HTMLElement).blur();
    }
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
      status: 'complete',
    });

    // Add assistant message with loading status
    const assistantMsgId = addMessage({
      role: 'assistant',
      content: '',
      status: 'loading',
    });

    setIsLoading(true);

    try {
      await streamChatResponse(userMessage, assistantMsgId!);
    } catch (error) {
      console.error('Error fetching chat response:', error);
      updateMessage(assistantMsgId!, {
        content: 'Sorry, there was an error processing your request. Please try again.',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const streamChatResponse = async (query: string, messageId: string) => {
    try {
      const response = await chatServicee.chatStream(query, getToken);

      if (!response.ok) {
        if (response.status == 401) {
          toast.error('Open API key is invalid. Please configure a valid API key.');
        }
        else if (response.status == 403) {
          toast.error('Open API key is missing. Please configure a valid API key.');
          throw new Error('API key missing or invalid');
        }
        //throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create a reader from the response body
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported');
      }

      // Create a text decoder
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let responseContent = '';

      // Process the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Handle any remaining data in the buffer
          if (buffer.trim()) {
            try {
              handleDataChunk(buffer, messageId, responseContent);
            } catch (e) {
              console.error('Error handling final buffer chunk:', e);
            }
          }

          // Final update
          updateMessage(messageId, {
            content: responseContent,
            status: 'complete'
          });
          break;
        }

        // Decode the chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete SSE messages in the buffer
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep the last incomplete chunk in the buffer

        // Process each complete SSE message
        for (const line of lines) {
          try {
            if (line.trim() && line.startsWith('data: ')) {
              const dataContent = line.substring(6).trim();
              const result = handleDataChunk(dataContent, messageId, responseContent);
              if (result !== undefined) {
                responseContent = result;
              }
            }
          } catch (e) {
            console.error('Error processing SSE message:', e, line);
          }
        }
      }

      return responseContent;
    } catch (error: any) {
      console.log("1")
      if (error.status == 401) {
        toast.error('API key is invalid. Please add a valid API key.')
      }
      else if (error.status === 403) {
        toast.error('API key is missing or invalid. Please add a valid API key.')
      }

      else if (error.name === 'AbortError') {
        updateMessage(messageId, {
          content: 'Request timed out. Please try again.',
          status: 'error',
        });

        toast.error('Request timed out. Please try again.');
      }

      throw error;
    }
  };

  // Helper function to process data chunks
  const handleDataChunk = (dataContent: string, messageId: string, currentContent: string): string | undefined => {
    try {
      const jsonData = JSON.parse(dataContent);

      if (jsonData.type === 'token') {
        const newContent = currentContent + jsonData.content;
        // Update UI immediately with each token
        updateMessage(messageId, { content: newContent });
        return newContent;
      } else if (jsonData.type === 'error') {
        updateMessage(messageId, {
          content: 'Error: ' + jsonData.content,
          status: 'error'
        });
        throw new Error(jsonData.content);
      } else if (jsonData.type === 'done') {
        updateMessage(messageId, {
          content: currentContent,
          status: 'complete'
        });
      }
    } catch (e) {
      console.error('Error parsing JSON:', e, dataContent);
      // If it's not valid JSON, just treat it as plain text
      if (dataContent.trim()) {
        const newContent = currentContent + dataContent;
        updateMessage(messageId, { content: newContent });
        return newContent;
      }
    }
    return undefined;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);


  const saveChatHistory = async () => {
    try {
      if (isSavingChat || isLoading || isDeletingChat) return;
      setIsSavingChat(true);
      const chatMessages = messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        // Ensure timestamp is converted to ISO string for consistent serialization
        timestamp: message.timestamp instanceof Date
          ? message.timestamp.toISOString()
          : new Date().toISOString(),
        // Include status
        status: message.status
      }));
      if(chatMessages &&  chatMessages.length <=1){
        toast.error("Please initiate a chat first");
        return;
      }

      const response=await chatServicee.manageChatSession(currentChatSessionId,messages,getToken)

      if (response && response.status === 202) {
        toast.error("Please initiate a chat first");
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // If it's a new chat session, set the chat session ID
      if (!currentChatSessionId) {
        const data = await response.json();
        setCurrentChatSessionId(data.id);
      }
      await fetchRecentChats()
      toast.success('Chat saved successfully!');
    } catch (error) {
      console.error('Error saving chat history:', error);
      toast.error('Failed to save chat. Please try again.');
    }
    finally {
      setIsSavingChat(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (isDeletingChat || isLoading || isSavingChat) return;
      setIsDeletingChat(true);
      // If there's a current chat session, delete it
      if (currentChatSessionId) { //checking here only to prevent backend call and only if the use is there
        
        const response = await chatServicee.deleteChatSession(currentChatSessionId,getToken)

        if (!response.ok) {
          throw new Error('Failed to delete chat session');
        }
        await fetchRecentChats();
        
      }

      setCurrentChatSessionId("") //making new sessions
      clearMessages();
      toast.success("Chat deleted successfully");
     

    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat. Please try again.');
    } finally {
      setIsDeletingChat(false);
    }


  }

  return (
    <div className="flex flex-col h-[80vh] bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl isolate">
      {/* Chat header */}
      <div className="bg-slate-800 py-3 px-4 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-cyan-400"><SparklesIcon /></span>
          <h2 className="font-medium">Document Assistant</h2>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsRecentChatsModalOpen(true)}
            className="text-slate-400 hover:text-white transition p-1 rounded hover:bg-slate-700"
            aria-label="Recent Chats"
          >
            <FaHistory />
          </button>
          <button
            onClick={saveChatHistory}
            disabled={isSavingChat || isLoading || isDeletingChat}
            className={cn(
              "text-slate-400 hover:text-white transition p-1 rounded hover:bg-slate-700",
              (isSavingChat || isLoading || isDeletingChat) && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Save chat"
          >
            {isSavingChat ? <IoIosRefresh className="animate-spin" /> : <FaSave />}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeletingChat || isLoading || isSavingChat}
            className={cn(
              "text-slate-400 hover:text-white transition p-1 rounded hover:bg-slate-700",
              (isDeletingChat || isLoading || isSavingChat) && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Clear chat"
          >
            {isDeletingChat ? <IoIosRefresh className="animate-spin" /> : <MdDelete />}
          </button>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto overscroll-behavior-contain px-4 py-6 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageItem message={message} />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700 bg-slate-800">
        <div
          className={cn(
            "flex items-end bg-slate-700 rounded-lg p-2 transition-all",
            isFocused ? "ring-2 ring-cyan-400" : ""
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none max-h-32 text-white placeholder-slate-400 py-2 px-2"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              "p-2 rounded-md transition-all",
              input.trim() && !isLoading
                ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white"
                : "bg-slate-600 text-slate-400 cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            {isLoading ? (
              <IoIosRefresh className="animate-spin" />
            ) : (
              <IoSend />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          Answers are generated based on your document library
        </p>
      </form>
      {isRecentChatsModalOpen && (
        <Overlay onClose={() => setIsRecentChatsModalOpen(false)}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Recent Chats</h2>
            {recentChats.length === 0 ? (
              <p className="text-slate-400">No recent chats found.</p>
            ) : (
              <div className="space-y-2">
                {recentChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => loadChatSession(chat.id)}
                    className="w-full text-left p-3 bg-slate-700 rounded hover:bg-slate-600 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white">
                        {chat.title.split(" ").slice(0, 10).join(" ") + (chat.title.split(" ").length > 20 ? "..." : "")}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(chat.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Overlay>
      )}
    </div>
  );
}