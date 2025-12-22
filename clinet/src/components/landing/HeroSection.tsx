import React, { useState, useEffect, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Vegetable/Fruit images configuration - Replace these URLs with your own images
// Place your images in /public/hero/ folder and update the paths
const HERO_IMAGES = {
  // Main showcase images (larger, prominent)
  main: [
    { id: 'tomato', src: '/hero/tomato.png', alt: 'Fresh Tomatoes', fallback: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=200&h=200&fit=crop' },
    { id: 'lettuce', src: '/hero/lettuce.png', alt: 'Fresh Lettuce', fallback: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=200&h=200&fit=crop' },
    { id: 'carrot', src: '/hero/carrot.png', alt: 'Fresh Carrots', fallback: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=200&h=200&fit=crop' },
  ],
  // Floating accent images (smaller, decorative)
  floating: [
    { id: 'apple', src: '/hero/apple.png', alt: 'Apple', fallback: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=100&h=100&fit=crop' },
    { id: 'pepper', src: '/hero/pepper.png', alt: 'Bell Pepper', fallback: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=100&h=100&fit=crop' },
    { id: 'broccoli', src: '/hero/broccoli.png', alt: 'Broccoli', fallback: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=100&h=100&fit=crop' },
    { id: 'orange', src: '/hero/orange.png', alt: 'Orange', fallback: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=100&h=100&fit=crop' },
    { id: 'avocado', src: '/hero/avocado.png', alt: 'Avocado', fallback: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=100&h=100&fit=crop' },
    { id: 'lemon', src: '/hero/lemon.png', alt: 'Lemon', fallback: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=100&h=100&fit=crop' },
  ],
};

// Memoized image component with lazy loading and caching
const OptimizedImage = memo(({ 
  src, 
  fallback, 
  alt, 
  className,
  onLoad,
}: { 
  src: string; 
  fallback: string; 
  alt: string; 
  className?: string;
  onLoad?: () => void;
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = useCallback(() => {
    if (imgSrc !== fallback) {
      setImgSrc(fallback);
    }
  }, [imgSrc, fallback]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={cn(
        'transition-opacity duration-500',
        isLoaded ? 'opacity-100' : 'opacity-0',
        className
      )}
      onError={handleError}
      onLoad={handleLoad}
      loading="lazy"
      decoding="async"
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Floating vegetable component with animation
const FloatingVegetable = memo(({ 
  image, 
  delay, 
  position,
  size = 'md',
}: { 
  image: typeof HERO_IMAGES.floating[0];
  delay: number;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12 md:w-16 md:h-16',
    md: 'w-16 h-16 md:w-20 md:h-20',
    lg: 'w-20 h-20 md:w-24 md:h-24',
  };

  return (
    <div
      className={cn(
        'absolute rounded-full overflow-hidden shadow-lg',
        'animate-float',
        sizeClasses[size]
      )}
      style={{
        ...position,
        animationDelay: `${delay}s`,
        animationDuration: `${3 + Math.random() * 2}s`,
      }}
    >
      <OptimizedImage
        src={image.src}
        fallback={image.fallback}
        alt={image.alt}
        className="w-full h-full object-cover"
      />
    </div>
  );
});

FloatingVegetable.displayName = 'FloatingVegetable';

const HeroSection: React.FC = () => {
  const [currentMainImage, setCurrentMainImage] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Rotate main images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMainImage((prev) => (prev + 1) % HERO_IMAGES.main.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-[90vh] bg-gradient-to-br from-green-800 via-green-700 to-green-600 overflow-hidden pt-20">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] animate-pulse" />
      </div>

      {/* Floating vegetables - positioned around the hero */}
      <div className="absolute inset-0 pointer-events-none">
        <FloatingVegetable
          image={HERO_IMAGES.floating[0]}
          delay={0}
          position={{ top: '15%', left: '5%' }}
          size="md"
        />
        <FloatingVegetable
          image={HERO_IMAGES.floating[1]}
          delay={0.5}
          position={{ top: '25%', right: '8%' }}
          size="lg"
        />
        <FloatingVegetable
          image={HERO_IMAGES.floating[2]}
          delay={1}
          position={{ bottom: '30%', left: '10%' }}
          size="sm"
        />
        <FloatingVegetable
          image={HERO_IMAGES.floating[3]}
          delay={1.5}
          position={{ bottom: '20%', right: '5%' }}
          size="md"
        />
        <FloatingVegetable
          image={HERO_IMAGES.floating[4]}
          delay={2}
          position={{ top: '60%', left: '3%' }}
          size="sm"
        />
        <FloatingVegetable
          image={HERO_IMAGES.floating[5]}
          delay={2.5}
          position={{ top: '40%', right: '3%' }}
          size="sm"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content - Text */}
          <div 
            className={cn(
              'text-white text-center lg:text-left transition-all duration-1000',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            )}
          >
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 animate-fade-in">
              <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse" />
              <span className="text-sm font-medium">Fresh Daily Deliveries</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              <span className="block animate-slide-up" style={{ animationDelay: '0.2s' }}>
                Fresh Produce,
              </span>
              <span 
                className="block text-yellow-300 animate-slide-up" 
                style={{ animationDelay: '0.4s' }}
              >
                Direct to You
              </span>
            </h1>

            <p 
              className="text-lg md:text-xl text-white/90 mb-8 max-w-xl animate-fade-in"
              style={{ animationDelay: '0.6s' }}
            >
              Vali Produce delivers the freshest fruits and vegetables from farm
              to your shop, ensuring quality and sustainability at every step.
            </p>

            {/* Stats */}
            <div 
              className="flex flex-wrap justify-center lg:justify-start gap-8 mb-8 animate-fade-in"
              style={{ animationDelay: '0.8s' }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300">500+</div>
                <div className="text-sm text-white/70">Happy Clients</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300">50+</div>
                <div className="text-sm text-white/70">Local Farms</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300">99%</div>
                <div className="text-sm text-white/70">On-Time Delivery</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in"
              style={{ animationDelay: '1s' }}
            >
              <Button
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                asChild
              >
                <Link to="/shop">
                  Shop Now
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-green-700 font-semibold text-lg px-8 py-6 rounded-full transition-all duration-300"
                asChild
              >
                <Link to="/auth">Create Account</Link>
              </Button>
            </div>
          </div>

          {/* Right Content - Image Showcase */}
          <div 
            className={cn(
              'relative flex justify-center lg:justify-end transition-all duration-1000 delay-300',
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            )}
          >
            {/* Main rotating image */}
            <div className="relative w-80 h-80 md:w-96 md:h-96 lg:w-[450px] lg:h-[450px]">
              {/* Decorative circles */}
              <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-spin-slow" />
              <div className="absolute inset-4 rounded-full border-2 border-yellow-300/30 animate-spin-reverse" />
              
              {/* Main image container */}
              <div className="absolute inset-8 rounded-full bg-white/10 backdrop-blur-sm overflow-hidden shadow-2xl">
                {HERO_IMAGES.main.map((image, index) => (
                  <div
                    key={image.id}
                    className={cn(
                      'absolute inset-0 transition-all duration-700',
                      index === currentMainImage 
                        ? 'opacity-100 scale-100' 
                        : 'opacity-0 scale-95'
                    )}
                  >
                    <OptimizedImage
                      src={image.src}
                      fallback={image.fallback}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>

              {/* Image indicators */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
                {HERO_IMAGES.main.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMainImage(index)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all duration-300',
                      index === currentMainImage 
                        ? 'bg-yellow-400 w-6' 
                        : 'bg-white/50 hover:bg-white/70'
                    )}
                    aria-label={`View image ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Floating product cards */}
            <div className="absolute -left-4 top-1/4 bg-white rounded-xl shadow-xl p-3 animate-bounce-slow hidden md:block">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg overflow-hidden">
                  <OptimizedImage
                    src={HERO_IMAGES.floating[0].src}
                    fallback={HERO_IMAGES.floating[0].fallback}
                    alt="Fresh"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-800">100% Fresh</div>
                  <div className="text-xs text-green-600">Farm Direct</div>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 bottom-1/4 bg-white rounded-xl shadow-xl p-3 animate-bounce-slow hidden md:block" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-800">Quality</div>
                  <div className="text-xs text-green-600">Guaranteed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path 
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
