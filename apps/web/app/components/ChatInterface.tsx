// components/ChatInterface.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../lib/context/ChatContext';
import MessageItem from './MessageItem';
import { cn } from '../../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { MdDelete } from "react-icons/md";
import { IoSend } from "react-icons/io5";
import { IoIosRefresh } from "react-icons/io";
import { BASE_URL } from '../../config';

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
  </svg>
);

export default function ChatInterface() {
  const { messages, addMessage, updateMessage, isLoading, setIsLoading, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await streamChatResponse(userMessage, assistantMsgId);
    } catch (error) {
      console.error('Error fetching chat response:', error);
      updateMessage(assistantMsgId, {
        content: 'Sorry, there was an error processing your request. Please try again.',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Improved stream chat response function for better speed and reliability
  const streamChatResponse = async (query: string, messageId: string) => {
    try {
      // Create an AbortController to be able to cancel the fetch if needed
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Set a timeout to abort if taking too long
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        signal: signal
      });

      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
    } catch (error) {
      console.error('Error in streamChatResponse:', error);
      if (error.name === 'AbortError') {
        updateMessage(messageId, {
          content: 'Request timed out. Please try again.',
          status: 'error',
        });
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

  return (
    <div className="flex flex-col h-[80vh] bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
      {/* Chat header */}
      <div className="bg-slate-800 py-3 px-4 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-cyan-400"><SparklesIcon /></span>
          <h2 className="font-medium">Document Assistant</h2>
        </div>
        <button 
          onClick={clearMessages}
          className="text-slate-400 hover:text-white transition p-1 rounded hover:bg-slate-700"
          aria-label="Clear chat"
        >
          <MdDelete />
        </button>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
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
    </div>
  );
}