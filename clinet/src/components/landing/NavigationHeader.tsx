import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NAV_LINKS } from '@/data/landingPageData';
import { cn } from '@/lib/utils';

interface NavigationHeaderProps {
  onMobileMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  onMobileMenuToggle,
  isMobileMenuOpen,
}) => {
  const [isSticky, setIsSticky] = useState(false);
  const navigate = useNavigate();

  // Handle scroll detection for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsSticky(scrollPosition > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check initial scroll position
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogin = () => {
    navigate('/auth');
  };

  const handleSignUp = () => {
    navigate('/auth?tab=signup');
  };

  return (
    <header
      className={cn(
        'w-full z-50 transition-all duration-300',
        isSticky
          ? 'fixed top-0 left-0 right-0 bg-white shadow-md'
          : 'bg-white shadow-sm'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img
              src="/logobg.png"
              alt="Vali Produce Logo"
              className="h-14 md:h-16 transition-transform duration-300 hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-gray-700 hover:text-green-600 font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Contact Info - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-4">
            {/* WhatsApp */}
            <a
              href="https://wa.me/15014002406"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-medium hidden xl:inline">+1 501 400 2406</span>
            </a>

            {/* Phone */}
            <a
              href="tel:+15015590123"
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium hidden xl:inline">+1 501 559 0123</span>
            </a>
          </div>

          {/* Auth Buttons - Desktop */}
          <div className="hidden lg:flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogin}
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              Login
            </Button>
            <Button
              size="sm"
              onClick={handleSignUp}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Sign Up
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-md text-gray-700 hover:text-green-600 hover:bg-gray-100 transition-colors"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default NavigationHeader;
