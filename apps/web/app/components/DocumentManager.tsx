"use client";

import { useState, useEffect, ReactNode } from 'react';
import {
    Search,
    FileText,
    Trash2,
    Download,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Info,
    X,
    Loader
} from 'lucide-react';
import { documentService } from '../../services/documentService';
import { useAuth } from '@clerk/nextjs';

// Document type definition
interface Document {
    id: string;
    title: string;
    filename: string;
    createdAt: string;
    s3Url: string,
}

// Document detail type
interface DocumentDetail {
    id: string;
    title: string;
    filename: string;
    s3Url: string;
}

// Pagination type
interface Pagination {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
}

export default function DocumentManager() {
    // State for documents and pagination
    const [documents, setDocuments] = useState<Document[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
        hasMore: false
    });
    const { getToken } = useAuth()

    // State for loading and error handling
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State for search and sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // State for document details modal
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    // State for delete confirmation
    const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch documents on component mount and when dependencies change
    useEffect(() => {
        fetchDocuments();
    }, [pagination.page, pagination.pageSize, sortBy, sortOrder, searchTerm]);

    // Function to fetch documents with pagination and sorting
    const fetchDocuments = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams({
                page: pagination.page.toString(),
                pageSize: pagination.pageSize.toString(),
                sortBy,
                sortOrder,
                ...(searchTerm && { search: searchTerm })
            });

            //const response = await fetch(`${BASE_URL}/api/documents/documents?${queryParams.toString()}`);
            const response = await documentService.getDocuments(
                new URLSearchParams({ page: '1', limit: '10' }),
                getToken
            );
            if (!response.ok) {
                throw new Error('Failed to fetch documents');
            }

            const data = await response.json();
            setDocuments(data.documents);
            setPagination(data.pagination);
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching documents');
            console.error('Error fetching documents:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to handle sorting
    const handleSort = (column: string) => {
        if (sortBy === column) {
            // Toggle sort order if already sorting by this column
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new sort column and default to descending
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    // Function to view document details
    const viewDocumentDetails = (documentId: string) => {
        const document = documents.find(doc => doc.id === documentId);
        if (document) {
            setSelectedDocument(document);
            setIsDetailModalOpen(true);
        }
    };

    // Function to delete document
    const deleteDocument = async () => {
        if (!documentToDelete) return;

        setIsDeleting(true);
        setError(null);

        try {
            const response = await documentService.deleteDocument(
                documentToDelete,
                getToken
            );

            if (!response.ok) {
                throw new Error('Failed to delete document');
            }

            // Remove document from state
            setDocuments(documents.filter(doc => doc.id !== documentToDelete));

            // Close modal
            setIsDeleteModalOpen(false);
            setDocumentToDelete(null);

            // Refresh documents if this was the last item on the page
            if (documents.length === 1 && pagination.page > 1) {
                setPagination({
                    ...pagination,
                    page: pagination.page - 1
                });
            } else {
                fetchDocuments();
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while deleting the document');
            console.error('Error deleting document:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    // Function to format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="w-full max-w-7xl mx-auto mt-8 px-4">
            <div className="bg-slate-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-6 shadow-xl border border-slate-700">
                <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-400">Document Library</h1>

                {/* Search and filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full px-4 py-2 bg-slate-700 text-slate-200 rounded-md border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            value={pagination.pageSize}
                            onChange={(e) => setPagination({ ...pagination, page: 1, pageSize: Number(e.target.value) })}
                            className="px-3 py-2 bg-slate-700 text-slate-200 rounded-md border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                            <option value="5">5 per page</option>
                            <option value="10">10 per page</option>
                            <option value="25">25 per page</option>
                            <option value="50">50 per page</option>
                        </select>
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-900 bg-opacity-20 text-red-200 rounded-md flex items-start">
                        <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Documents table */}
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-800">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                    <button
                                        onClick={() => handleSort('title')}
                                        className="flex items-center space-x-1 hover:text-white"
                                    >
                                        <span>Document</span>
                                        {sortBy === 'title' ? (
                                            sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                        ) : (
                                            <ArrowUpDown className="h-4 w-4 text-slate-500" />
                                        )}
                                    </button>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                    <button
                                        onClick={() => handleSort('filename')}
                                        className="flex items-center space-x-1 hover:text-white"
                                    >
                                        <span>Filename</span>
                                        {sortBy === 'filename' ? (
                                            sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                        ) : (
                                            <ArrowUpDown className="h-4 w-4 text-slate-500" />
                                        )}
                                    </button>
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                    <button
                                        onClick={() => handleSort('createdAt')}
                                        className="flex items-center space-x-1 hover:text-white"
                                    >
                                        <span>Date Added</span>
                                        {sortBy === 'createdAt' ? (
                                            sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                        ) : (
                                            <ArrowUpDown className="h-4 w-4 text-slate-500" />
                                        )}
                                    </button>
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-800 bg-opacity-50 divide-y divide-slate-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center">
                                            <Loader className="h-8 w-8 animate-spin mb-2" />
                                            <p>Loading documents...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : documents.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-40" />
                                        <p className="text-lg font-medium">No documents found</p>
                                        {searchTerm && <p className="mt-1">Try adjusting your search criteria</p>}
                                    </td>
                                </tr>
                            ) : (
                                documents.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-700">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => viewDocumentDetails(doc.id)}
                                                className="flex items-center text-left hover:text-cyan-400 transition-colors"
                                            >
                                                <FileText className="h-5 w-5 mr-2 text-slate-400" />
                                                <span className="font-medium">{doc.title || 'Untitled Document'}</span>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                                            {doc.filename}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                                            {doc.createdAt ? formatDate(doc.createdAt) : 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => viewDocumentDetails(doc.id)}
                                                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                                    title="View details"
                                                >
                                                    <Info className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDocumentToDelete(doc.id);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="text-red-400 hover:text-red-300 transition-colors"
                                                    title="Delete document"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!isLoading && documents.length > 0 && (
                    <div className="flex items-center justify-between mt-6">
                        <div className="text-sm text-slate-400">
                            Showing {((pagination.page - 1) * pagination.pageSize) + 1}-
                            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} documents
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                disabled={pagination.page === 1}
                                className="p-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                // Show pages around the current page
                                let pageNum;
                                if (pagination.totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (pagination.page <= 3) {
                                    pageNum = i + 1;
                                } else if (pagination.page >= pagination.totalPages - 2) {
                                    pageNum = pagination.totalPages - 4 + i;
                                } else {
                                    pageNum = pagination.page - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPagination({ ...pagination, page: pageNum })}
                                        className={`h-9 w-9 rounded-md ${pagination.page === pageNum
                                            ? 'bg-cyan-600 text-white'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                disabled={!pagination.hasMore}
                                className="p-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Document Detail Modal */}
            {isDetailModalOpen && (
                <Overlay onClose={() => setIsDetailModalOpen(false)}>

                    <div className="absolute top-4 right-4">
                        <button
                            onClick={() => setIsDetailModalOpen(false)}
                            className="text-slate-400 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6">
                        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-400 mb-4">Document Details</h3>

                        {isDetailLoading ? (
                            <div className="py-12 flex justify-center">
                                <Loader className="h-8 w-8 animate-spin text-cyan-400" />
                            </div>
                        ) : selectedDocument ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-slate-400">Title</p>
                                    <p className="text-lg font-medium text-white">{selectedDocument.title || 'Untitled Document'}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-slate-400">Filename</p>
                                    <p className="text-white">{selectedDocument.filename}</p>
                                </div>

                                <div className="pt-4">
                                    <a
                                        href={selectedDocument.s3Url}
                                        download={selectedDocument.filename}
                                        className="flex items-center justify-center w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
                                    >
                                        <Download className="h-5 w-5 mr-2" />
                                        Download Document
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <p className="text-red-400 py-4">Error loading document details</p>
                        )}
                    </div>
                </Overlay>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <Overlay onClose={() => setIsDeleteModalOpen(false)}>

                    <div className="p-6">
                        <h3 className="text-xl font-bold text-red-400 mb-4">Confirm Deletion</h3>

                        <p className="text-slate-300 mb-6">
                            Are you sure you want to delete this document? This action will remove the document and all associated data from the database and storage.
                        </p>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteDocument}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader className="h-4 w-4 animate-spin mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Overlay>
            )}
        </div>
    );
}

interface OverlayProps {
    children: ReactNode;
    onClose: () => void;
}

export function Overlay({ children, onClose }: OverlayProps) {
    useEffect(() => {
        // Disable scrolling on mount
        document.body.style.overflow = "hidden";

        return () => {
            // Re-enable scrolling when unmounted
            document.body.style.overflow = "";
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center min-h-screen p-4">
            {/* Background Overlay with Blur */}
            <div
                className="fixed inset-0 bg-opacity-50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-slate-800 rounded-lg max-w-md w-full mx-auto shadow-xl border border-slate-700">
                {children}
            </div>
        </div>
    );
}