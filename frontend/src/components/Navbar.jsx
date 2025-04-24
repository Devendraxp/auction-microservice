import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Container from './ui/Container';

const Navbar = () => {
  const location = useLocation();
  
  // Function to check if a link is active
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-blue-600 py-4 shadow-md">
      <Container>
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white">
            DAA Platform
          </Link>
          <nav>
            <ul className="flex items-center space-x-6">
              <li>
                <Link 
                  to="/" 
                  className={`${isActive('/') ? 'text-white font-medium' : 'text-blue-100'} hover:text-white transition-colors`}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/auctions" 
                  className={`${isActive('/auctions') ? 'text-white font-medium' : 'text-blue-100'} hover:text-white transition-colors`}
                >
                  Auctions
                </Link>
              </li>
              <li>
                <Link 
                  to="/create-auction" 
                  className={`${isActive('/create-auction') ? 'text-white font-medium' : 'text-blue-100'} hover:text-white transition-colors`}
                >
                  Create Auction
                </Link>
              </li>
              <li>
                <Link 
                  to="/simulation" 
                  className={`${isActive('/simulation') ? 'text-white font-medium' : 'text-blue-100'} hover:text-white transition-colors`}
                >
                  Simulation
                </Link>
              </li>
              <li>
                <Link 
                  to="/about" 
                  className={`${isActive('/about') ? 'text-white font-medium' : 'text-blue-100'} hover:text-white transition-colors`}
                >
                  About
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </Container>
    </header>
  );
};

export default Navbar;
