import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { Overlay } from './DocumentManager';
import toast from 'react-hot-toast';
import { openAikey } from '../../services/openAikey';


export default function APIKeyModal() {
    const [apiKey, setApiKey] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { getToken } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!apiKey.trim()) {
            setError('Please enter a valid API key');
            return;
        }

        setIsLoading(true);

        try {
            //console.log(apiKey)
            const response = await openAikey.setOpenAiKey(apiKey, getToken)
            const data = await response.json();

            if (response.ok) {
                toast.success('API Key added successfully');
                setIsOpen(false);
                setApiKey('');
            } else {
                setApiKey('');
                setError(data.message || 'Failed to add API key');
            }
        } catch (error) {
            setError('An unexpected error occurred');
            console.error('API Key update error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-md hover:from-purple-700 hover:to-cyan-700 transition-all duration-300"
                >
                    Api key
                </button>
            ) : (
                <Overlay onClose={() => setIsOpen(false)}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-600">
                                Add OpenAI API Key
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 hover:text-red-500 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                type="password"
                                placeholder="Enter your OpenAI API Key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-2 rounded-md hover:from-purple-700 hover:to-cyan-700 transition-all duration-300 disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Save API Key'}
                            </button>
                        </form>

                        <div className="text-sm text-gray-500 mt-4 text-center">
                            Your API key is securely stored and encrypted.
                        </div>
                    </div>
                </Overlay>
            )}
        </>
    );
};
