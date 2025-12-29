
import { optional, z } from 'zod';
import { BulkDiscount } from '@/types';

// Sales mode type for product configuration
export type SalesMode = 'unit' | 'case' | 'both';

// Case dimensions schema for pallet calculation
export const caseDimensionsSchema = z.object({
  length: z.coerce.number().min(0, { message: 'Length must be 0 or greater' }).default(0),
  width: z.coerce.number().min(0, { message: 'Width must be 0 or greater' }).default(0),
  height: z.coerce.number().min(0, { message: 'Height must be 0 or greater' }).default(0),
});

// Pallet input mode - either calculate from dimensions or manual entry
export type PalletInputMode = 'auto' | 'manual';

export const formSchema = z.object({
  name: z.string().min(1, { message: 'Product name is required' }),
  category: z.string().min(1, { message: 'Category is required' }),
  quantity: z.coerce.number().min(0, { message: 'Quantity must be 0 or greater' }),
  totalPurchase: z.coerce.number().optional(),
  unit: z.string().min(1, { message: 'Unit is required' }),
  price: z.coerce.number().min(0, { message: 'Price must be 0 or greater' }),
  threshold: z.coerce.number().min(0, { message: 'Threshold must be 0 or greater' }),
  description: z.string().optional(),
  enablePromotions: z.boolean().default(false),
  palette: z.string().optional(),
  image: z.string().optional(),
  bulkDiscounts: z.array(
    z.object({
      minQuantity: z.coerce.number().min(2, { message: 'Minimum quantity must be at least 2' }),
      discountPercent: z.coerce.number().min(1, { message: 'Discount must be at least 1%' }).max(100, { message: 'Discount cannot exceed 100%' })
    })
  ).optional(),
  weightVariation: z.coerce.number().min(0).max(100).optional(),
  expiryDate: z.string().optional(),
  batchInfo: z.string().optional(),
  shippinCost: z.number().optional(),
  origin: z.string().optional(),
  organic: z.boolean().default(false).optional(),
  storageInstructions: z.string().optional(),
  boxSize: z.coerce.number().min(0).optional(),
  pricePerBox: z.coerce.number().min(0).optional(),
  notifyOnLowStock: z.boolean().default(true).optional(),
  notifyClients: z.boolean().default(false).optional(),
  emailNotificationThreshold: z.coerce.number().min(0).optional(),
  // New fields for sales mode and pallet tracking
  salesMode: z.enum(['unit', 'case', 'both']).default('both').optional(),
  caseDimensions: caseDimensionsSchema.optional(),
  caseWeight: z.coerce.number().min(0, { message: 'Case weight must be 0 or greater' }).default(0).optional(),
  // Manual pallet input - user can directly specify cases per pallet
  palletInputMode: z.enum(['auto', 'manual']).default('auto').optional(),
  manualCasesPerPallet: z.coerce.number().min(0, { message: 'Cases per pallet must be 0 or greater' }).default(0).optional(),
});

export type FormValues = z.infer<typeof formSchema>;

// Price List related types
export interface PriceListProduct {
  id: string;
  productId: string;
  productName: string;
  name?: string;
  quantity?: number;
  shippinCost?: number;
  category: string;
  unit: string;
  price: string;
  aPrice?: string;        
  bPrice?: string;        
  cPrice?: string;        
  restaurantPrice?: string;        
  shortCode?: string;

  bulkDiscounts?: BulkDiscount[];
  image?: string;
  boxSize?: number;
  pricePerBox?: number;
}

export interface PriceListTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  status: 'draft' | 'active' | 'archived';
  products: PriceListProduct[];
  emailDistributionGroups?: string[];
  lastSent?: string;
  emailSubject?: string;
  emailBody?: string;
}

export interface PriceListOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  boxCount?: number;
  boxPrice?: number;
}

// Email notification types for inventory
export interface InventoryEmailSettings {
  enableLowStockAlerts: boolean;
  lowStockThreshold: number;
  alertRecipients: string[];
  alertFrequency: 'daily' | 'weekly' | 'immediately';
  includePriceChanges: boolean;
  includeNewProducts: boolean;
}

// Product email template types
export interface ProductEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  attachPriceList: boolean;
  attachProductImage: boolean;
}

// Interface for email sending options
export interface EmailSendOptions {
  webhookUrl: string;
  fromName: string;
  showNotifications: boolean;
  attachments?: Array<{
    filename: string;
    data: string;
  }>;
}

// Interface for invoice data
export interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  items: Array<{
    productName: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  total: number;
  shippinCost?: number;
  date: string;
  
}

// Interface for PriceListTemplateForm props
export interface PriceListTemplateFormProps {
  template?: PriceListTemplate | null;
  onSave: (template: PriceListTemplate) => void;
  onCancel: () => void;
}

// Case dimensions interface
export interface CaseDimensions {
  length: number;
  width: number;
  height: number;
}

// Pallet capacity interface (calculated from case dimensions or manual)
export interface PalletCapacity {
  casesPerLayer: number;
  layersPerPallet: number;
  totalCasesPerPallet: number;
  isManual?: boolean; // true if manually entered, false if auto-calculated
}

// Pallet estimate interface
export interface PalletEstimate {
  estimatedPallets: number;
  fullPallets?: number;
  partialPalletCases?: number;
  utilizationPercent?: number;
  isEstimate: boolean;
}

// Extended product interface with new fields
export interface ProductWithPalletInfo {
  _id: string;
  name: string;
  category: string;
  price: number;
  pricePerBox?: number;
  boxSize?: number;
  salesMode: SalesMode;
  caseDimensions?: CaseDimensions;
  caseWeight?: number;
  palletCapacity?: PalletCapacity;
  palletEstimate?: PalletEstimate;
  remaining?: number;
  unitRemaining?: number;
}
