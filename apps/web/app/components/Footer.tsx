import Link from "next/link";
import { FileText, MessageSquare, Upload, Github } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-white backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-8 w-8 text-cyan-400" />
              <span className="font-bold text-xl bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                ChatPDFX
              </span>
            </div>
            <p className="text-gray-400 mb-4">
              Intelligent document analysis and conversation platform. Upload PDFs and chat with their content.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://github.com/yath-09"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-cyan-400 transition-colors"
              >
                <Github className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/documentmanager"
                  className="text-gray-400 hover:text-cyan-400 transition-colors flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4 text-cyan-400" />
                  <span>Browse Documents</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/chatstream"
                  className="text-gray-400 hover:text-cyan-400 transition-colors flex items-center space-x-2"
                >
                  <MessageSquare className="h-4 w-4 text-purple-400" />
                  <span>Chat Interface</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/pdfupload"
                  className="text-gray-400 hover:text-cyan-400 transition-colors flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4 text-cyan-400" />
                  <span>Upload PDF</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Contact
            </h3>
            <ul className="space-y-2 text-gray-400">
              <li className="hover:text-cyan-400 transition-colors">support@chatpdfx.com</li>
              <li className="hover:text-cyan-400 transition-colors">Privacy Policy</li>
              <li className="hover:text-cyan-400 transition-colors">Terms of Service</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
          <p>&copy; {currentYear} ChatPDFX. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
