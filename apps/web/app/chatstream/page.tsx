// app/page.tsx
import ChatInterface from '../components/ChatInterface';
import { ChatProvider } from '../../lib/context/ChatContext';

export default function Chatstream() {
  return (
    <ChatProvider>
      <main className="min-h-screen bg-gradient-to-b from-slate-800 to-slate-400 text-white p-12">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-400">Document Chat Assistant</h1>
          <p className="text-slate-300 mb-8">Ask questions about your documents and get instant answers</p>
          <ChatInterface />
        </div>
      </main>
    </ChatProvider>
  );
}