
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
import { Package, Ruler, Calculator, Edit3 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FormField, FormItem, FormControl } from "@/components/ui/form";

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

// Manual Pallet Input Component - Now includes case dimensions for validation
const ManualPalletInput: React.FC<{ control: Control<FormValues> }> = ({ control }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4" />
          Manual Pallet Configuration
        </CardTitle>
        <CardDescription className="text-xs">
          Enter cases per pallet and case dimensions for validation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TextField
          control={control}
          name="manualCasesPerPallet"
          label="Cases Per Pallet"
          type="number"
          placeholder="e.g., 60"
          description="Total number of cases that fit on one standard pallet"
        />
        
     
      </CardContent>
    </Card>
  );
};

// Pallet Input Mode Selector
const PalletInputModeSelector: React.FC<{ control: Control<FormValues> }> = ({ control }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Pallet Calculation Method
        </CardTitle>
        <CardDescription className="text-xs">
          Choose how to determine pallet capacity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={control}
          name="palletInputMode"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value || 'auto'}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto" id="auto" />
                    <Label htmlFor="auto" className="flex items-center gap-2 cursor-pointer">
                      <Calculator className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Auto Calculate</div>
                        <div className="text-xs text-muted-foreground">From case dimensions</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="flex items-center gap-2 cursor-pointer">
                      <Edit3 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Manual Entry</div>
                        <div className="text-xs text-muted-foreground">I know cases/pallet</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

// Sales & Shipping Tab Content
const SalesShippingTab: React.FC<{ control: Control<FormValues> }> = ({ control }) => {
  // Watch case dimensions and pallet input mode for live pallet estimate
  const caseDimensions = useWatch({ control, name: "caseDimensions" });
  const caseWeight = useWatch({ control, name: "caseWeight" });
  const palletInputMode = useWatch({ control, name: "palletInputMode" }) || 'auto';
  const manualCasesPerPallet = useWatch({ control, name: "manualCasesPerPallet" });

  return (
    <div className="space-y-6">
      <SalesModeSelector control={control} />
      
      <PalletInputModeSelector control={control} />
      
      {palletInputMode === 'auto' ? (
        <>
          <CaseDimensionsInput control={control} />
          {/* Live Pallet Estimate Preview - Auto Mode */}
          <PalletEstimateDisplay
            caseDimensions={caseDimensions}
            caseWeight={caseWeight || 0}
            showBreakdown={true}
          />
        </>
      ) : (
        <>
          <ManualPalletInput control={control} />
          {/* Live Pallet Estimate Preview - Manual Mode with Validation */}
          <PalletEstimateDisplay
            manualCasesPerPallet={manualCasesPerPallet || 0}
            caseDimensions={caseDimensions}
            caseWeight={caseWeight || 0}
            showBreakdown={true}
          />
        </>
      )}
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
