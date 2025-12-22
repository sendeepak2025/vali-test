import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NAV_LINKS } from '@/data/landingPageData';
import { cn } from '@/lib/utils';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleNavClick = (href: string) => {
    navigate(href);
    onClose();
  };

  const handleLogin = () => {
    navigate('/auth');
    onClose();
  };

  const handleSignUp = () => {
    navigate('/auth?tab=signup');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-lg font-semibold text-gray-900">Menu</span>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4">
          <ul className="space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <button
                  onClick={() => handleNavClick(link.href)}
                  className="w-full text-left px-4 py-3 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg font-medium transition-colors"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Auth Buttons */}
        <div className="p-4 border-t space-y-3">
          <Button
            variant="outline"
            className="w-full border-green-600 text-green-600 hover:bg-green-50"
            onClick={handleLogin}
          >
            Login
          </Button>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSignUp}
          >
            Sign Up
          </Button>
        </div>

        {/* Contact Info */}
        <div className="p-4 border-t space-y-3">
          <a
            href="https://wa.me/15014002406"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">+1 501 400 2406</span>
          </a>
          <a
            href="tel:+15015590123"
            className="flex items-center space-x-3 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Phone className="h-5 w-5" />
            <span className="font-medium">+1 501 559 0123</span>
          </a>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
