
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Store, UserRound, Mail, Phone } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { StoreRegistrationValues } from './types';

interface BusinessInfoSectionProps {
  form: UseFormReturn<StoreRegistrationValues>;
}

const BusinessInfoSection: React.FC<BusinessInfoSectionProps> = ({ form }) => {
  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Store className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Business Information</h2>
          <p className="text-sm text-gray-500">Tell us about your store</p>
        </div>
      </div>
      
      <FormField
        control={form.control}
        name="storeName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold text-gray-700">Store Name *</FormLabel>
            <FormControl>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Store className="h-5 w-5 text-gray-400" />
                </div>
                <Input 
                  placeholder="e.g., Fresh Market Downtown" 
                  className="pl-10 h-11 border-2 focus:border-blue-500 transition-colors" 
                  {...field} 
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="ownerName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold text-gray-700">Owner Name *</FormLabel>
            <FormControl>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserRound className="h-5 w-5 text-gray-400" />
                </div>
                <Input 
                  placeholder="e.g., John Smith" 
                  className="pl-10 h-11 border-2 focus:border-blue-500 transition-colors" 
                  {...field} 
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold text-gray-700">Email Address *</FormLabel>
            <FormControl>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input 
                  type="email" 
                  placeholder="contact@yourstore.com" 
                  className="pl-10 h-11 border-2 focus:border-blue-500 transition-colors" 
                  {...field} 
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold text-gray-700">Phone Number *</FormLabel>
            <FormControl>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <Input 
                  placeholder="(555) 123-4567" 
                  className="pl-10 h-11 border-2 focus:border-blue-500 transition-colors" 
                  {...field} 
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="businessDescription"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold text-gray-700">Business Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Tell us about your business, products, and services..." 
                className="min-h-[120px] border-2 focus:border-blue-500 transition-colors resize-none"
                {...field} 
              />
            </FormControl>
            <p className="text-xs text-gray-500 mt-1">Optional: Help us understand your business better</p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default BusinessInfoSection;
