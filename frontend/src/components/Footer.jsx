import React from 'react';
import { Github, Shield } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Shield className="w-4 h-4" />
            <span>End-to-end encrypted. Zero knowledge.</span>
          </div>
          
          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} NoteBurner. All messages self-destruct.
          </div>
          
          <div className="flex gap-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-primary-600 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
