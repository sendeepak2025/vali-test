import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { validateNewsletterEmail } from '@/utils/validation';

interface NewsletterSignupProps {
  onSubscribe?: (email: string) => Promise<void>;
}

const NewsletterSignup: React.FC<NewsletterSignupProps> = ({ onSubscribe }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const validation = validateNewsletterEmail(email);
    if (!validation.isValid) {
      setStatus('error');
      setErrorMessage(validation.error || 'Invalid email');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      if (onSubscribe) {
        await onSubscribe(email);
      } else {
        // Simulate API call if no handler provided
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      
      setStatus('success');
      setEmail('');
      
      // Reset to idle after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      setStatus('error');
      setErrorMessage('Failed to subscribe. Please try again.');
    }
  };

  return (
    <div className="w-full">
      <h4 className="text-lg font-semibold text-white mb-3">
        Subscribe to Our Newsletter
      </h4>
      <p className="text-green-300 text-sm mb-4">
        Get updates on new products and special offers
      </p>

      {status === 'success' ? (
        <div className="flex items-center space-x-2 text-green-300 bg-green-800/50 p-3 rounded-lg">
          <CheckCircle className="h-5 w-5" />
          <span>Thank you for subscribing!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') {
                    setStatus('idle');
                    setErrorMessage('');
                  }
                }}
                className="pl-10 bg-white/10 border-green-700 text-white placeholder:text-green-300/70 focus:border-green-500"
                disabled={status === 'loading'}
              />
            </div>
            <Button
              type="submit"
              disabled={status === 'loading'}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subscribing...
                </>
              ) : (
                'Subscribe'
              )}
            </Button>
          </div>

          {status === 'error' && errorMessage && (
            <div className="flex items-center space-x-2 text-red-300 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default NewsletterSignup;
