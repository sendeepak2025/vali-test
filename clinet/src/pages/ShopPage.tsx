import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Grid, List, Percent, Truck, Clock, ShieldCheck, Star, ArrowRight, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NavigationHeader, MobileMenu, SocialMediaLinks, NewsletterSignup } from '@/components/landing';
import { PRODUCT_CATEGORIES, NAV_LINKS, COMPANY_INFO } from '@/data/landingPageData';

// Special offers data
const SPECIAL_OFFERS = [
  {
    id: '1',
    title: 'Bulk Order Discount',
    description: 'Get 15% off on orders over $500',
    code: 'BULK15',
    bgColor: 'from-orange-500 to-red-500',
    icon: Percent,
  },
  {
    id: '2',
    title: 'Free Delivery',
    description: 'Free delivery on first order',
    code: 'FIRSTFREE',
    bgColor: 'from-blue-500 to-purple-500',
    icon: Truck,
  },
  {
    id: '3',
    title: 'Early Bird Special',
    description: '10% off orders placed before 8 AM',
    code: 'EARLY10',
    bgColor: 'from-green-500 to-teal-500',
    icon: Clock,
  },
];

const ShopPage: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter categories based on search and selection
  const filteredCategories = PRODUCT_CATEGORIES.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || category.slug === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavigationHeader
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Spacer for fixed header */}
      {/* <div className="h-[72px]" /> */}

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-700 via-green-600 to-green-500 text-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge className="bg-yellow-500 text-black mb-4 px-3 py-1">
              🌿 Fresh Daily
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Premium Fresh Produce
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-6">
              Discover our wide selection of farm-fresh fruits and vegetables, 
              delivered directly to your business.
            </p>
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-yellow-400" />
                <span>Quality Guaranteed</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-yellow-400" />
                <span>Same Day Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" />
                <span>500+ Happy Clients</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Special Offers Banner */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 bg-white border-b">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              🔥 Special Offers
            </h2>
            <Link to="/auth" className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SPECIAL_OFFERS.map((offer) => (
              <div
                key={offer.id}
                className={`bg-gradient-to-r ${offer.bgColor} rounded-xl p-5 text-white relative overflow-hidden group hover:shadow-lg transition-shadow`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <offer.icon className="h-8 w-8 mb-3 opacity-90" />
                  <h3 className="font-bold text-lg mb-1">{offer.title}</h3>
                  <p className="text-white/90 text-sm mb-3">{offer.description}</p>
                  <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-mono">
                    Code: {offer.code}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50 sticky top-[72px] z-30 border-b shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-200"
              />
            </div>

            {/* Category Filter Dropdown */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px] bg-white">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 hidden sm:inline">View:</span>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-green-600 hover:bg-green-700' : 'bg-white'}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-green-600 hover:bg-green-700' : 'bg-white'}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 flex-1">
        <div className="max-w-7xl mx-auto">
          {/* Results count */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredCategories.length}</span> categories
            </p>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search or filter criteria</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }>
              {filteredCategories.map((category) => (
                viewMode === 'grid' ? (
                  <Card 
                    key={category.id} 
                    className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-white group"
                  >
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Badge className="absolute top-3 right-3 bg-green-600 shadow-lg">
                        Fresh
                      </Badge>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{category.name}</h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{category.description}</p>
                      <Button className="w-full bg-green-600 hover:bg-green-700 font-medium" asChild>
                        <Link to="/auth">Sign In to Order</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card 
                    key={category.id} 
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 border-0 bg-white"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="w-full sm:w-56 h-48 sm:h-40 flex-shrink-0 overflow-hidden">
                        <img
                          src={category.image}
                          alt={category.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      </div>
                      <CardContent className="p-5 flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{category.name}</h3>
                            <Badge className="bg-green-100 text-green-700">Fresh</Badge>
                          </div>
                          <p className="text-gray-600 text-sm">{category.description}</p>
                        </div>
                        <Button className="bg-green-600 hover:bg-green-700 whitespace-nowrap" asChild>
                          <Link to="/auth">Sign In to Order</Link>
                        </Button>
                      </CardContent>
                    </div>
                  </Card>
                )
              ))}
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-8 md:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10 text-center max-w-2xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to Order Fresh Produce?
              </h3>
              <p className="text-white/90 mb-8 text-lg">
                Create a free business account to access our full catalog with wholesale pricing, 
                bulk discounts, and same-day delivery options.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-8"
                  asChild
                >
                  <Link to="/auth">Create Free Account</Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-black hover:bg-white/10"
                  asChild
                >
                  <Link to="/contact">Contact Sales</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">
            Why Businesses Choose Vali Produce
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Quality Assured</h3>
              <p className="text-gray-600 text-sm">Every item inspected for freshness and quality</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Fast Delivery</h3>
              <p className="text-gray-600 text-sm">Same-day delivery for orders before 10 AM</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Percent className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Best Prices</h3>
              <p className="text-gray-600 text-sm">Competitive wholesale pricing with bulk discounts</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">5-Star Service</h3>
              <p className="text-gray-600 text-sm">Dedicated support for all your needs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Vali Produce</h3>
              <p className="mb-4 text-green-300">
                Delivering fresh produce to businesses since {COMPANY_INFO.foundedYear}.
              </p>
              <SocialMediaLinks />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-green-300 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <div className="space-y-2 text-green-300">
                <p>{COMPANY_INFO.address.street}</p>
                <p>{COMPANY_INFO.address.city}, {COMPANY_INFO.address.state}</p>
                <p>{COMPANY_INFO.contact.phone}</p>
                <p>{COMPANY_INFO.contact.email}</p>
              </div>
            </div>
            <div>
              <NewsletterSignup />
            </div>
          </div>
          <div className="border-t border-green-800 mt-8 pt-8 text-center text-green-400">
            <p>© {new Date().getFullYear()} Vali Produce. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ShopPage;
