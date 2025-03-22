// components/MessageItem.tsx
"use client";

import { MessageType } from '../../lib/context/ChatContext';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { CiUser } from "react-icons/ci";
import { FaRobot } from "react-icons/fa";
import { IoAlertCircleOutline } from "react-icons/io5";

interface MessageItemProps {
  message: MessageType;
}

// Simple function to format time relative to now (replaces date-fns)
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
};

// Basic markdown-like parser (replaces react-markdown)
const SimpleMarkdown = ({ content }: { content: string }) => {
  // Process code blocks
  const processCodeBlocks = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    const parts = [];
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{processInlineFormatting(text.slice(lastIndex, match.index))}</span>);
      }
      
      // Add code block
      const language = match[1] || 'text';
      const code = match[2];
      
      parts.push(
        <div key={`code-${match.index}`} className="rounded-md border border-slate-700 my-4 bg-slate-950 overflow-auto">
          <div className="px-3 py-1 border-b border-slate-700 bg-slate-900 text-xs text-slate-400">
            {language}
          </div>
          <pre className="p-4 text-xs overflow-auto">
            <code>{code}</code>
          </pre>
        </div>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${lastIndex}`}>{processInlineFormatting(text.slice(lastIndex))}</span>);
    }
    
    return parts.length > 0 ? parts : [<span key="empty">{text}</span>];
  };

  // Process inline formatting (bold, italic, code)
  const processInlineFormatting = (text: string) => {
    // Convert line breaks to <br />
    const withLineBreaks = text.split('\n').map((line, i) => (
      i === 0 ? line : [<br key={`br-${i}`} />, line]
    ));
    
    // Process and return as React elements
    return withLineBreaks;
  };

  return <div className="prose prose-invert prose-sm max-w-none">{processCodeBlocks(content || ' ')}</div>;
};

const MessageItem = ({ message }: MessageItemProps) => {
  const isUser = message.role === 'user';
  const isLoading = message.status === 'loading';
  const isError = message.status === 'error';

  return (
    <div className={cn(
      "flex items-start gap-3 group",
      isUser ? "justify-end" : "justify-start",
    )}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
          <FaRobot />
        </div>
      )}

      {/* Message content */}
      <div className={cn(
        "relative max-w-3xl rounded-xl px-4 py-3 text-sm",
        isUser 
          ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white" 
          : isError 
            ? "bg-red-500/10 border border-red-500/20 text-white" 
            : "bg-slate-800 border border-slate-700 text-slate-200"
      )}>
        {/* Loading indicator */}
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -bottom-1 left-4"
          >
            <LoadingDots />
          </motion.div>
        )}

        {/* Error indicator */}
        {isError && (
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <IoAlertCircleOutline />
            <span className="text-xs font-medium">Error occurred</span>
          </div>
        )}

        {/* Message content with basic formatting */}
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <SimpleMarkdown content={message.content} />
        )}

        {/* Timestamp */}
        <div className={cn(
          "text-[10px] opacity-0 group-hover:opacity-90 transition-opacity mt-1",
          isUser ? "text-right text-indigo-200" : "text-left text-slate-400"
        )}>
          {formatTimeAgo(new Date(message.timestamp))}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center flex-shrink-0">
          <CiUser />
        </div>
      )}
    </div>
  );
};

// Loading dots animation component
const LoadingDots = () => {
  return (
    <div className="flex space-x-1">
      {[0, 1, 2].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 rounded-full bg-cyan-400"
          initial={{ y: 0 }}
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatType: "loop",
            delay: dot * 0.1,
          }}
        />
      ))}
    </div>
  );
};

export default MessageItem;