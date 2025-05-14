"use client"
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type MessageType = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  status?: 'loading' | 'complete' | 'error';
};

type ChatContextType = {
  messages: MessageType[];
  currentChatSessionId: string | null;
  setCurrentChatSessionId: (id: string | null) => void;
  addMessage: (message: Omit<MessageType, 'id'> & { timestamp?: Date }) => string;
  updateMessage: (id: string, updates: Partial<MessageType>) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  clearMessages: () => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm here to help you explore and understand your organization's documents. What would you like to ask?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatSessionId, setCurrentChatSessionId] = useState<string | null>(null);

  const addMessage = (message: Omit<MessageType, 'id'> & { timestamp?: Date }): string => {
    const newMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: message.timestamp || new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, updates: Partial<MessageType>) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, ...updates } : message
      )
    );
  };

  const clearMessages = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm here to help you explore and understand your organization's documents. What would you like to ask?",
        timestamp: new Date(),
      },
    ]);
    setCurrentChatSessionId(null);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        currentChatSessionId,
        setCurrentChatSessionId,
        addMessage,
        updateMessage,
        isLoading,
        setIsLoading,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};