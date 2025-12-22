
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductDetails from './forms/ProductDetails';
import ProductSettings from './forms/ProductSettings';
import ProductPalette from './forms/ProductPalette';
import { Control, useWatch } from 'react-hook-form';
import { FormValues } from './forms/formTypes';
import { SalesModeSelector } from './forms/SalesModeSelector';
import { PalletEstimateDisplay } from './forms/PalletEstimate';
import { TextField } from './forms/FormFields';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Ruler } from "lucide-react";

interface ProductFormTabsProps {
  control: Control<FormValues>;
  categories: string[];
  units: string[];
  isEditProduct?: boolean;
}

// Case Dimensions Input Component
const CaseDimensionsInput: React.FC<{ control: Control<FormValues> }> = ({ control }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Ruler className="h-4 w-4" />
          Case Dimensions (inches)
        </CardTitle>
        <CardDescription className="text-xs">
          Enter case dimensions for pallet capacity calculation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <TextField
            control={control}
            name="caseDimensions.length"
            label="Length"
            type="number"
            placeholder="0"
          />
          <TextField
            control={control}
            name="caseDimensions.width"
            label="Width"
            type="number"
            placeholder="0"
          />
          <TextField
            control={control}
            name="caseDimensions.height"
            label="Height"
            type="number"
            placeholder="0"
          />
        </div>
        <div className="mt-4">
          <TextField
            control={control}
            name="caseWeight"
            label="Case Weight (lbs)"
            type="number"
            placeholder="0"
            description="Weight per case for pallet weight limit calculation"
          />
        </div>
      </CardContent>
    </Card>
  );
};

// Sales & Shipping Tab Content
const SalesShippingTab: React.FC<{ control: Control<FormValues> }> = ({ control }) => {
  // Watch case dimensions for live pallet estimate
  const caseDimensions = useWatch({ control, name: "caseDimensions" });
  const caseWeight = useWatch({ control, name: "caseWeight" });

  return (
    <div className="space-y-6">
      <SalesModeSelector control={control} />
      
      <CaseDimensionsInput control={control} />
      
      {/* Live Pallet Estimate Preview */}
      <PalletEstimateDisplay
        caseDimensions={caseDimensions}
        caseWeight={caseWeight || 0}
        showBreakdown={true}
      />
    </div>
  );
};

const ProductFormTabs: React.FC<ProductFormTabsProps> = ({ 
  control, 
  categories, 
  units ,
  isEditProduct
}) => {
  console.log(isEditProduct)
  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-4">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="sales">Sales & Shipping</TabsTrigger>
        <TabsTrigger value="settings">Appearance</TabsTrigger>
      </TabsList>
      
      <TabsContent value="basic" className="space-y-4">
        <ProductDetails 
          control={control}
          categories={categories}
          units={units}
          simplified={true}
          isEditProduct={isEditProduct}

        />
      </TabsContent>
      
      <TabsContent value="details" className="space-y-4">
        <ProductDetails 
          control={control}
          categories={categories}
          units={units}
          simplified={false}
          isEditProduct={isEditProduct}
        />
      </TabsContent>

      <TabsContent value="sales" className="space-y-4">
        <SalesShippingTab control={control} />
      </TabsContent>
      
      <TabsContent value="settings" className="space-y-4">
        <ProductSettings control={control} />
        <ProductPalette />
      </TabsContent>
    </Tabs>
  );
};

export default ProductFormTabs;
