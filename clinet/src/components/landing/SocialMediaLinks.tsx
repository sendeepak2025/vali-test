import React from 'react';
import { SOCIAL_LINKS } from '@/data/landingPageData';
import { cn } from '@/lib/utils';

interface SocialMediaLinksProps {
  className?: string;
  iconClassName?: string;
  variant?: 'light' | 'dark';
}

const SocialMediaLinks: React.FC<SocialMediaLinksProps> = ({
  className,
  iconClassName,
  variant = 'light',
}) => {
  return (
    <div className={cn('flex items-center space-x-4', className)}>
      {SOCIAL_LINKS.map((social) => {
        const Icon = social.icon;
        return (
          <a
            key={social.platform}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            className={cn(
              'p-2 rounded-full transition-all duration-200 hover:scale-110',
              variant === 'light'
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-green-600',
              iconClassName
            )}
          >
            <Icon className="h-5 w-5" />
          </a>
        );
      })}
    </div>
  );
};

export default SocialMediaLinks;
