/**
 * Landing page static data and configuration
 */

import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// Navigation Links
export interface NavLink {
  label: string;
  href: string;
  isExternal?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/shop' },
  { label: 'Online Order', href: '/store/mobile' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

// Social Media Links
export interface SocialLink {
  platform: string;
  url: string;
  icon: LucideIcon;
  label: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { 
    platform: 'facebook', 
    url: 'https://facebook.com/valiproduce', 
    icon: Facebook,
    label: 'Follow us on Facebook'
  },
  { 
    platform: 'instagram', 
    url: 'https://instagram.com/valiproduce', 
    icon: Instagram,
    label: 'Follow us on Instagram'
  },
  { 
    platform: 'twitter', 
    url: 'https://twitter.com/valiproduce', 
    icon: Twitter,
    label: 'Follow us on Twitter'
  },
  { 
    platform: 'linkedin', 
    url: 'https://linkedin.com/company/valiproduce', 
    icon: Linkedin,
    label: 'Connect on LinkedIn'
  },
];

// Product Categories
export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  image: string;
  slug: string;
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { 
    id: '1', 
    name: 'Fresh Vegetables', 
    description: 'Farm-fresh vegetables delivered daily to your business', 
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop',
    slug: 'vegetables' 
  },
  { 
    id: '2', 
    name: 'Fresh Fruits', 
    description: 'Seasonal fruits sourced from local and international farms', 
    image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=300&fit=crop',
    slug: 'fruits' 
  },
  { 
    id: '3', 
    name: 'Leafy Greens', 
    description: 'Crisp, organic leafy greens for salads and cooking', 
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=300&fit=crop',
    slug: 'greens' 
  },
  { 
    id: '4', 
    name: 'Root Vegetables', 
    description: 'Potatoes, carrots, onions, and more staple roots', 
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82ber?w=400&h=300&fit=crop',
    slug: 'roots' 
  },
  { 
    id: '5', 
    name: 'Herbs & Spices', 
    description: 'Fresh herbs to elevate your culinary creations', 
    image: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&h=300&fit=crop',
    slug: 'herbs' 
  },
  { 
    id: '6', 
    name: 'Organic Produce', 
    description: 'Certified organic selection for health-conscious businesses', 
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=300&fit=crop',
    slug: 'organic' 
  },
];

// Company Information
export const COMPANY_INFO = {
  name: 'Vali Produce',
  tagline: 'Farm Fresh, Business Ready',
  foundedYear: 2010,
  address: {
    street: '4300 Pleasantdale Rd',
    city: 'Atlanta',
    state: 'GA',
    zipCode: '30340',
    country: 'USA',
  },
  contact: {
    phone: '+1 501 559 0123',
    whatsapp: '+1 501 400 2406',
    email: 'order@valiproduce.shop',
  },
  businessHours: {
    weekdays: '6:00 AM - 6:00 PM',
    saturday: '6:00 AM - 2:00 PM',
    sunday: 'Closed',
  },
  mapCoordinates: {
    lat: 33.8823,
    lng: -84.2838,
  },
};

// Testimonials
export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  business: string;
  businessType: string;
  rating: number;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    quote: "Vali Produce has transformed how we source our ingredients. The quality is consistently exceptional, and their delivery is always on time.",
    author: 'Fresh Bites Cafe',
    business: 'Fresh Bites Cafe',
    businessType: 'Restaurant',
    rating: 5,
  },
  {
    id: '2',
    quote: "As a grocery store owner, I need reliable suppliers. Vali Produce has never let me down - their produce is always fresh and their service is excellent.",
    author: 'Community Market',
    business: 'Community Market',
    businessType: 'Grocery Store',
    rating: 5,
  },
  {
    id: '3',
    quote: "The organic selection at Vali Produce has helped us maintain our commitment to healthy, sustainable food. Their customer service is top-notch.",
    author: 'Green Earth Co-op',
    business: 'Green Earth Co-op',
    businessType: 'Food Cooperative',
    rating: 5,
  },
];

// Features/Benefits
export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const FEATURES: Feature[] = [
  {
    id: '1',
    title: 'Farm Fresh',
    description: 'All our produce comes directly from local farms, ensuring freshness and supporting local agriculture.',
    icon: 'leaf',
  },
  {
    id: '2',
    title: 'Quality Guaranteed',
    description: 'We handpick and inspect every item to ensure only the best quality produce reaches your business.',
    icon: 'shield-check',
  },
  {
    id: '3',
    title: 'Reliable Delivery',
    description: 'Our efficient delivery system ensures your orders arrive on time, every time.',
    icon: 'truck',
  },
];

// How It Works Steps
export interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    step: 1,
    title: 'Create Account',
    description: 'Sign up for a free business account to access our full product catalog',
  },
  {
    step: 2,
    title: 'Browse Products',
    description: 'Explore our extensive range of fresh fruits and vegetables',
  },
  {
    step: 3,
    title: 'Place Order',
    description: 'Select your items, quantities, and preferred delivery options',
  },
  {
    step: 4,
    title: 'Receive Delivery',
    description: 'Get fresh produce delivered right to your business location',
  },
];
