'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { FileText, MessageSquare, Upload, Menu, X } from 'lucide-react';
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import APIKeyModal from './ApiKeyModal';
import { useAuth } from '@clerk/nextjs';
import { documentService } from '../../services/documentService';
const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [role, setRole] = useState(false);//false means it is a user not a admin
  const { getToken } = useAuth()
  const getUser = async () => {
    const token = await getToken();
    if (!token) return; 
    const response = await documentService.getRole(
      getToken
    );
    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }

    const data = await response.json();
    if (data?.role == 'admin') {
      setRole(true);
    }

  }
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    getUser();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-350 ${isScrolled ? ' shadow-md py-2 backdrop-blur-xl' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-purple-500" />
            <span className={`font-bold text-xl text-white`}>ChatPDFX</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {role && <><Link href="/documentmanager" className="flex items-center space-x-1 hover:text-purple-500 transition-colors text-white">
              <FileText className="h-5 w-5" />
              <span>Browse</span>
            </Link>
              <Link href="/pdfupload" className="flex items-center space-x-1 text-white hover:text-purple-500 transition-colors">
                <Upload className="h-5 w-5" />
                <span>Upload</span>
              </Link>
            </>}
            <Link href="/chatstream" className="flex items-center space-x-1 text-white hover:text-purple-500 transition-colors">
              <MessageSquare className="h-5 w-5" />
              <span>Chat</span>
            </Link>


            {/* Clerk Authentication Components */}
            <div className="flex items-center space-x-4">
              <SignedOut>
                <div className="flex items-center space-x-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-md transition-colors duration-300 shadow-lg hover:scale-105">
                  <SignInButton />
                </div>
              </SignedOut>
              <SignedIn>
                <APIKeyModal />
                <UserButton />
              </SignedIn>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <SignedOut>
              <div className="flex items-center space-x-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-md transition-colors duration-300 shadow-lg hover:scale-105">
                <SignInButton />
              </div>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <button onClick={toggleMobileMenu} className="text-gray-700 hover:text-blue-600 focus:outline-none">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-400 py-4 shadow-lg w-[50%] ml-auto rounded-xl mr-2 relative">
          <div className="flex flex-col space-y-4 px-4">
            {role && <>
              <Link href="/documentmanager" className="flex items-center space-x-2 py-2 text-gray-700 hover:text-blue-600 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                <FileText className="h-5 w-5" />
                <span>Browse</span>
              </Link>
              <Link href="/pdfupload" className="flex items-center space-x-2 py-2 text-gray-700 hover:text-blue-600 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                <Upload className="h-5 w-5" />
                <span>Upload</span>
              </Link>
            </>}
            <Link href="/chatstream" className="flex items-center space-x-2 py-2 text-gray-700 hover:text-blue-600 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              <MessageSquare className="h-5 w-5" />
              <span>Chat</span>
            </Link>
            <SignedIn>
              <APIKeyModal />
            </SignedIn>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
