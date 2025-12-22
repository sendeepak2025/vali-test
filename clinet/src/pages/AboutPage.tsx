import React, { useState, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Leaf, 
  Users, 
  Award, 
  Heart, 
  CheckCircle, 
  Truck,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NavigationHeader, MobileMenu } from '@/components/landing';
import { COMPANY_INFO } from '@/data/landingPageData';
import { cn } from '@/lib/utils';

// Vegetable images for timeline decoration
const TIMELINE_VEGGIES = [
  { id: 'carrot', src: '/hero/carrot.png', alt: 'Carrot', fallback: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=80&h=80&fit=crop' },
  { id: 'tomato', src: '/hero/tomato.png', alt: 'Tomato', fallback: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=80&h=80&fit=crop' },
  { id: 'apple', src: '/hero/apple.png', alt: 'Apple', fallback: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=80&h=80&fit=crop' },
  { id: 'pepper', src: '/hero/pepper.png', alt: 'Bell Pepper', fallback: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=80&h=80&fit=crop' },
  { id: 'broccoli', src: '/hero/broccoli.png', alt: 'Broccoli', fallback: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=80&h=80&fit=crop' },
  { id: 'orange', src: '/hero/orange.png', alt: 'Orange', fallback: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=80&h=80&fit=crop' },
];

// Optimized image component with fallback
const VeggieImage = memo(({ 
  src, 
  fallback, 
  alt, 
  className 
}: { 
  src: string; 
  fallback: string; 
  alt: string; 
  className?: string;
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = useCallback(() => {
    if (imgSrc !== fallback) {
      setImgSrc(fallback);
    }
  }, [imgSrc, fallback]);

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
      onLoad={() => setIsLoaded(true)}
      loading="lazy"
      decoding="async"
    />
  );
});

VeggieImage.displayName = 'VeggieImage';

// Floating vegetable component
const FloatingVeggie = memo(({ 
  veggie, 
  position, 
  delay, 
  size = 'md' 
}: { 
  veggie: typeof TIMELINE_VEGGIES[0];
  position: { top?: string; bottom?: string; left?: string; right?: string };
  delay: number;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10 md:w-12 md:h-12',
    md: 'w-12 h-12 md:w-16 md:h-16',
    lg: 'w-16 h-16 md:w-20 md:h-20',
  };

  return (
    <div
      className={cn(
        'absolute rounded-full overflow-hidden shadow-lg animate-float z-10',
        sizeClasses[size]
      )}
      style={{
        ...position,
        animationDelay: `${delay}s`,
        animationDuration: `${3 + Math.random() * 2}s`,
      }}
    >
      <VeggieImage
        src={veggie.src}
        fallback={veggie.fallback}
        alt={veggie.alt}
        className="w-full h-full object-cover"
      />
    </div>
  );
});

FloatingVeggie.displayName = 'FloatingVeggie';

const AboutPage: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const values = [
    {
      icon: Leaf,
      title: 'Sustainability',
      description: 'We prioritize eco-friendly practices and support sustainable farming methods.',
    },
    {
      icon: ShieldCheck,
      title: 'Quality',
      description: 'Every product is carefully inspected to meet our high quality standards.',
    },
    {
      icon: Heart,
      title: 'Community',
      description: 'We support local farmers and contribute to our community\'s growth.',
    },
    {
      icon: Globe,
      title: 'Transparency',
      description: 'We believe in honest, open relationships with our partners and customers.',
    },
  ];

  const milestones = [
    { year: '2010', event: 'Vali Produce founded in Atlanta, GA' },
    { year: '2013', event: 'Expanded to serve 100+ local businesses' },
    { year: '2016', event: 'Launched organic produce line' },
    { year: '2019', event: 'Opened new distribution center' },
    { year: '2022', event: 'Reached 500+ business partners' },
    { year: '2024', event: 'Launched online ordering platform' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <NavigationHeader
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Spacer for fixed header */}
      <div className="h-20" />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-700 to-green-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About Vali Produce</h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Connecting farms to businesses with fresh, quality produce since {COMPANY_INFO.foundedYear}
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <p className="text-lg text-gray-700 mb-4">
                Vali Produce was founded with a simple mission: to bridge the gap between 
                local farmers and businesses that need fresh, quality produce. What started 
                as a small operation in Atlanta has grown into a trusted partner for hundreds 
                of restaurants, grocery stores, and food service businesses.
              </p>
              <p className="text-lg text-gray-700 mb-4">
                Our founder recognized that many businesses struggled to find reliable sources 
                of fresh produce. By building direct relationships with farmers and implementing 
                rigorous quality control, we've created a supply chain that benefits everyone.
              </p>
              <p className="text-lg text-gray-700">
                Today, we continue to grow while staying true to our roots: quality, reliability, 
                and community.
              </p>
            </div>
            <div className="bg-green-50 p-8 rounded-2xl">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">500+</div>
                  <div className="text-gray-600">Business Partners</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">50+</div>
                  <div className="text-gray-600">Local Farms</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">14+</div>
                  <div className="text-gray-600">Years Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">99%</div>
                  <div className="text-gray-600">On-Time Delivery</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600">The principles that guide everything we do</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="border-none shadow-lg">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
                    <value.icon className="h-7 w-7 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline with Floating Vegetables */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-green-50 relative overflow-hidden">
        {/* Floating vegetables around the timeline */}
        <div className="absolute inset-0 pointer-events-none">
          <FloatingVeggie
            veggie={TIMELINE_VEGGIES[0]}
            position={{ top: '10%', left: '5%' }}
            delay={0}
            size="md"
          />
          <FloatingVeggie
            veggie={TIMELINE_VEGGIES[1]}
            position={{ top: '25%', right: '8%' }}
            delay={0.5}
            size="lg"
          />
          <FloatingVeggie
            veggie={TIMELINE_VEGGIES[2]}
            position={{ top: '45%', left: '3%' }}
            delay={1}
            size="sm"
          />
          <FloatingVeggie
            veggie={TIMELINE_VEGGIES[3]}
            position={{ top: '60%', right: '5%' }}
            delay={1.5}
            size="md"
          />
          <FloatingVeggie
            veggie={TIMELINE_VEGGIES[4]}
            position={{ bottom: '20%', left: '8%' }}
            delay={2}
            size="sm"
          />
          <FloatingVeggie
            veggie={TIMELINE_VEGGIES[5]}
            position={{ bottom: '15%', right: '10%' }}
            delay={2.5}
            size="md"
          />
        </div>

        <div className="max-w-4xl mx-auto relative z-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Journey</h2>
            <p className="text-gray-600">Growing together since {COMPANY_INFO.foundedYear}</p>
          </div>
          
          {/* Timeline with animated line */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[88px] md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-300 via-green-500 to-green-700 transform md:-translate-x-1/2" />
            
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div 
                  key={index} 
                  className={cn(
                    'relative flex items-center gap-4 md:gap-8 animate-fade-in',
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  )}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  {/* Year badge - always on left for mobile */}
                  <div className={cn(
                    'flex-shrink-0 w-20 md:w-auto md:flex-1',
                    index % 2 === 0 ? 'md:text-right' : 'md:text-left'
                  )}>
                    <span className="inline-block px-4 py-2 bg-green-600 text-white font-bold rounded-full shadow-lg text-sm md:text-base">
                      {milestone.year}
                    </span>
                  </div>
                  
                  {/* Center dot with pulse animation */}
                  <div className="relative flex-shrink-0">
                    <div className="w-5 h-5 rounded-full bg-green-600 border-4 border-white shadow-lg z-10 relative" />
                    <div className="absolute inset-0 w-5 h-5 rounded-full bg-green-400 animate-ping opacity-30" />
                  </div>
                  
                  {/* Event card */}
                  <div className={cn(
                    'flex-1 bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-green-100',
                    index % 2 === 0 ? 'md:text-left' : 'md:text-right'
                  )}>
                    <p className="text-gray-700 font-medium">{milestone.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-green-700 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Partner With Us?</h2>
          <p className="text-xl mb-8 text-white/90">
            Join hundreds of businesses that trust Vali Produce for their fresh produce needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black" asChild>
              <Link to="/shop">Browse Products</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-900 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p>© {new Date().getFullYear()} Vali Produce. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
