import React, { useState } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Building2, Receipt, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { StoreRegistrationValues } from './types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface DocumentsSectionProps {
  form: UseFormReturn<StoreRegistrationValues>;
}

const BUSINESS_TYPES = [
  { value: "sole_proprietor", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "other", label: "Other" },
];

const DocumentsSection: React.FC<DocumentsSectionProps> = ({ form }) => {
  const { toast } = useToast();
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingTax, setUploadingTax] = useState(false);

  // Simple file upload handler - in production, this would upload to Cloudinary/S3
  const handleFileUpload = async (
    file: File, 
    fieldName: 'businessLicenseUrl' | 'taxCertificateUrl',
    setUploading: (val: boolean) => void
  ) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or PDF file"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload a file smaller than 5MB"
      });
      return;
    }

    setUploading(true);
    
    try {
      // For now, create a local URL - in production, upload to cloud storage
      // This is a placeholder - you would integrate with your image upload API
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulating upload - replace with actual API call
      // const response = await fetch('/api/v1/image/upload', { method: 'POST', body: formData });
      // const data = await response.json();
      // form.setValue(fieldName, data.url);
      
      // For demo, just store the file name to indicate upload
      form.setValue(fieldName, `uploaded:${file.name}`);
      
      toast({
        title: "File selected",
        description: `${file.name} ready for upload`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Please try again"
      });
    } finally {
      setUploading(false);
    }
  };

  const businessLicenseUrl = form.watch('businessLicenseUrl');
  const taxCertificateUrl = form.watch('taxCertificateUrl');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-purple-100 p-2 rounded-lg">
          <FileText className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Business Documents</h2>
          <p className="text-sm text-gray-500">Legal information for your account</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Why we need this information:</p>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>To verify your business is legally registered</li>
              <li>For tax compliance and invoicing purposes</li>
              <li>To establish credit terms for your account</li>
              <li>Required for wholesale produce transactions</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Legal Business Name */}
      <FormField
        control={form.control}
        name="legalBusinessName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold text-gray-700">Legal Business Name</FormLabel>
            <FormControl>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <Input 
                  placeholder="As registered with the state" 
                  className="pl-10 h-11 border-2 focus:border-purple-500 transition-colors" 
                  {...field} 
                />
              </div>
            </FormControl>
            <FormDescription className="text-xs">
              Leave blank if same as store name
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Business Type */}
      <FormField
        control={form.control}
        name="businessType"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold text-gray-700">Business Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="h-11 border-2 focus:border-purple-500">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {BUSINESS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Tax ID / EIN */}
      <FormField
        control={form.control}
        name="taxId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold text-gray-700">Tax ID / EIN</FormLabel>
            <FormControl>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Receipt className="h-5 w-5 text-gray-400" />
                </div>
                <Input 
                  placeholder="XX-XXXXXXX" 
                  className="pl-10 h-11 border-2 focus:border-purple-500 transition-colors" 
                  {...field} 
                />
              </div>
            </FormControl>
            <FormDescription className="text-xs">
              Federal Employer Identification Number
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Document Uploads */}
      <div className="border-t pt-6 mt-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Document Uploads
          <span className="text-xs font-normal text-gray-500">(Optional - can be added later)</span>
        </h3>

        {/* Business License Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business License
          </label>
          <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            businessLicenseUrl ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-purple-400'
          }`}>
            {businessLicenseUrl ? (
              <div className="flex items-center justify-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Document selected</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => form.setValue('businessLicenseUrl', '')}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'businessLicenseUrl', setUploadingLicense);
                  }}
                  disabled={uploadingLicense}
                />
                {uploadingLicense ? (
                  <Loader2 className="h-8 w-8 mx-auto text-purple-500 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload business license</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF (max 5MB)</p>
                  </>
                )}
              </label>
            )}
          </div>
        </div>

        {/* Tax Certificate / Resale Permit Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tax Certificate / Resale Permit
          </label>
          <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            taxCertificateUrl ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-purple-400'
          }`}>
            {taxCertificateUrl ? (
              <div className="flex items-center justify-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Document selected</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => form.setValue('taxCertificateUrl', '')}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'taxCertificateUrl', setUploadingTax);
                  }}
                  disabled={uploadingTax}
                />
                {uploadingTax ? (
                  <Loader2 className="h-8 w-8 mx-auto text-purple-500 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload tax certificate</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF (max 5MB)</p>
                  </>
                )}
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Note about additional documents */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Additional documents (W-9, ID verification, etc.) may be requested 
          after registration to complete your account setup and establish credit terms.
        </p>
      </div>
    </div>
  );
};

export default DocumentsSection;
