"use client";

import { useState } from 'react';
import { UploadCloud, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

import { documentService } from '../../services/documentService';

export default function PdfUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { getToken } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Check if file is a PDF
      if (selectedFile.type !== 'application/pdf') {
        setUploadStatus({
          message: 'Please select a PDF file',
          isError: true
        });
        return;
      }
      // Check file size (15MB limit)
      if (selectedFile.size > 15 * 1024 * 1024) {
        setUploadStatus({
          message: 'File size exceeds the 15MB limit',
          isError: true
        });
        return;
      }
      setFile(selectedFile);
      setUploadStatus(null);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadStatus({
        message: 'Please select a PDF file first',
        isError: true
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata if provided
    if (metadata.trim()) {
      try {
        // Check if metadata is valid JSON
        JSON.parse(metadata);
        formData.append('metadata', metadata);
      } catch (error) {
        setUploadStatus({
          message: 'Invalid JSON metadata format',
          isError: true
        });
        setIsUploading(false);
        return;
      }
    }
    setUploadStatus(null) //after no error we need to clear error which are present before

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const increment = Math.random() * 10;
          const newProgress = Math.min(prev + increment, 95);
          return newProgress;
        });
      }, 400);

      // Call the API
      const response = await documentService.uploadDocument(formData, getToken);
      // Clear progress interval
      clearInterval(progressInterval);

      if (response.ok) {
        const result = await response.json();
        setUploadProgress(100);
        setUploadStatus({
          message: 'Document uploaded successfully!',
          isError: false
        });

        // Reset form after successful upload
        setTimeout(() => {
          setFile(null);
          setMetadata('');
          setUploadProgress(0);
        }, 2000);
      } else {
        // Try to parse error response, fallback to a generic error
        let errorMessage = 'Failed to upload document';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use default error message
        }

        setUploadStatus({
          message: errorMessage,
          isError: true
        });
      }
    } catch (error) {
      setUploadStatus({
        message: error instanceof Error ? error.message : 'Network error. Please try again.',
        isError: true
      });
      setIsUploading(false);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full md:max-w-2xl mx-auto px-4">
      <div className="bg-slate-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-6 shadow-xl border border-slate-700">
        <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-400">Upload Document</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
              ${file ? 'border-cyan-400 bg-slate-800 bg-opacity-40' : 'border-slate-600 hover:border-slate-400'}
            `}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <FileText className="h-12 w-12 text-cyan-400 mb-2" />
                <p className="text-slate-100 font-medium">{file.name}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-4 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="h-12 w-12 text-slate-400 mb-2" />
                <p className="text-slate-300 font-medium">Drag and drop your PDF here</p>
                <p className="text-slate-400 text-sm mt-1">or click to browse files</p>
                <p className="text-slate-500 text-xs mt-4">Maximum file size: 15MB</p>
              </div>
            )}
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Metadata Section */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Metadata (Optional JSON)
            </label>
            <textarea
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              placeholder='{"title": "My Document", "author": "Jane Doe"}'
              className="w-full h-24 px-3 py-2 bg-slate-700 text-slate-200 rounded-md border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-slate-400 mt-1">
              Enter valid JSON metadata for your document (optional)
            </p>
          </div>

          {/* Upload Status */}
          {uploadStatus && (
            <div className={`flex items-start p-4 rounded-md ${uploadStatus.isError ? 'bg-red-900 bg-opacity-20' : 'bg-green-900 bg-opacity-20'}`}>
              {uploadStatus.isError ? (
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
              )}
              <p className={`text-sm ${uploadStatus.isError ? 'text-red-200' : 'text-green-200'}`}>
                {uploadStatus.message}
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {uploadProgress > 0 && isUploading && (
            <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUploading || !file}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-cyan-500 disabled:hover:to-purple-600"
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </form>
      </div>
    </div>
  );
}