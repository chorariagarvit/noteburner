import React from 'react';
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';

function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Flame className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              NoteBurner
            </h1>
          </Link>
          
          <nav className="flex gap-4">
            <Link 
              to="/create" 
              className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
            >
              Create Message
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
