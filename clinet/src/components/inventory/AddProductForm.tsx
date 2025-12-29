import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { FormValues, formSchema } from "./forms/formTypes";
import { Form } from "@/components/ui/form";
import FormActions from "./forms/FormActions";
import { generateId } from "@/data/productData";
import { AlertCircle, Zap, Settings } from "lucide-react";
import ProductFormTabs from "./ProductFormTabs";
import { useDispatch, useSelector } from "react-redux";
import { getAllCategoriesAPI } from "@/services2/operations/category";
import { createProductAPI ,updateProductAPI} from "@/services2/operations/product";
import { RootState } from "@/redux/store";
import {getSingleProductAPI} from "@/services2/operations/product"
import { Button } from "@/components/ui/button";
import { TextField, SelectField } from "./forms/FormFields";
import { SalesModeSelector } from "./forms/SalesModeSelector";

interface AddProductFormProps {
  onSuccess: () => void;
  onAddProduct?: (product: any) => void;
  editProduct?:string
  isEditProduct?:boolean
}

const AddProductForm: React.FC<AddProductFormProps> = ({
  onSuccess,
  onAddProduct,
  editProduct,
  isEditProduct
}) => {
  const [quickAddMode, setQuickAddMode] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      quantity: 0,
      unit: "lb",
      price: 0,
      totalPurchase: 0,
      threshold: 5,
      description: "",
      enablePromotions: false,
      palette: undefined,
      image: "",
      weightVariation: 0,
      expiryDate: undefined,
      batchInfo: "",
      origin: "",
      organic: false,
      storageInstructions: "",
      boxSize: 0,
      pricePerBox: 0,
      shippinCost: 0,
      // New fields
      salesMode: "both",
      caseDimensions: { length: 0, width: 0, height: 0 },
      caseWeight: 0,
      // Pallet input mode
      palletInputMode: "auto",
      manualCasesPerPallet: 0,
    },
  });

  const[loading,setLoading] = useState(false)
console.log(isEditProduct)

  const fetchProductDetails = async () => {
    if (!isEditProduct || !editProduct) return;
    setLoading(true);
  
    try {
      const response = await getSingleProductAPI(editProduct);
      if (response) {
        console.log(response);
  
        form.reset({
          name: response.name || "",
          category: response.category || "",
          quantity: response.quantity || 0,
          totalPurchase: response.totalPurchase || 0,
          unit: response.unit || "lb",
          price: response.price || 0,
          threshold: response.threshold || 5,
          description: response.description || "",
          enablePromotions: response.enablePromotions || false,
          palette: response.palette || "",
          image: response.image || "",
          weightVariation: response.weightVariation || 0,
          expiryDate: response.expiryDate ? new Date(response.expiryDate).toISOString() : "",
          batchInfo: response.batchInfo || "",
          origin: response.origin || "",
          organic: response.organic || false,
          storageInstructions: response.storageInstructions || "",
          boxSize: response.boxSize || 0,
          pricePerBox: response.pricePerBox || 0,
          shippinCost: response.shippinCost || 0,
          // New fields
          salesMode: response.salesMode || "both",
          caseDimensions: response.caseDimensions || { length: 0, width: 0, height: 0 },
          caseWeight: response.caseWeight || 0,
          // Pallet input mode
          palletInputMode: response.palletInputMode || "auto",
          manualCasesPerPallet: response.manualCasesPerPallet || 0,
        });
      }
    } catch (error) {
      console.log("Error fetching product details:", error);
    }
    
    setLoading(false);
  };
  

  useEffect(()=>{
    fetchProductDetails()

  },[isEditProduct,editProduct])


  const [categories, setCategories] = useState([]);
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth?.token ?? null);

  const getAllCategories = async () => {
    const response = await dispatch(getAllCategoriesAPI());
    console.log(response);
    setCategories(response || []);
  };

  useEffect(() => {
    getAllCategories();
  }, []);
  const onSubmit = async (data: FormValues) => {
console.log(data)
    if(isEditProduct){
      await updateProductAPI(editProduct,data, token);
      onSuccess();
      form.reset();
    }else{

     const res =  await createProductAPI(data, token);
     console.log(res)
     if(res){
      
    onSuccess();
    form.reset();
     }
    }
    

  };

  const units = ["lb", "oz", "units", "boxes", "bunches", "cases", "pallets","ml"];

  const hasErrors = Object.keys(form.formState.errors).length > 0;

  // Quick Add Form - only essential fields
  const QuickAddForm = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-primary">
          <Zap className="h-4 w-4" />
          <span className="font-medium text-sm">Quick Add Mode</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setQuickAddMode(false)}
          className="text-xs"
        >
          <Settings className="h-3 w-3 mr-1" />
          Advanced
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          control={form.control}
          name="name"
          label="Product Name *"
          placeholder="Enter product name"
        />
        <SelectField
          control={form.control}
          name="category"
          label="Category *"
          options={categories}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TextField
          control={form.control}
          name="price"
          label="Unit Price *"
          type="number"
          placeholder="0.00"
        />
        <TextField
          control={form.control}
          name="pricePerBox"
          label="Price Per Case"
          type="number"
          placeholder="0.00"
        />
        <TextField
          control={form.control}
          name="boxSize"
          label="Units Per Case"
          type="number"
          placeholder="0"
        />
      </div>

      <SalesModeSelector control={form.control} />
    </div>
  );

  return (
    <FormProvider {...form}>
      <Form {...form}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Mode Toggle - only show for new products */}
            {!isEditProduct && (
              <div className="flex justify-end mb-2">
                <Button
                  type="button"
                  variant={quickAddMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickAddMode(!quickAddMode)}
                  className="text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {quickAddMode ? "Quick Add" : "Enable Quick Add"}
                </Button>
              </div>
            )}

            {quickAddMode && !isEditProduct ? (
              <QuickAddForm />
            ) : (
              <ProductFormTabs 
                control={form.control} 
                categories={categories} 
                units={units} 
                isEditProduct={isEditProduct} 
              />
            )}
  
            {hasErrors && (
              <div className="flex items-center gap-2 text-destructive text-sm mt-2 mb-0 px-2 py-1 bg-destructive/10 rounded">
                <AlertCircle size={16} />
                <span>Please fix the errors before submitting.</span>
              </div>
            )}
  
            <FormActions 
              onCancel={onSuccess} 
              isProcessing={form.formState.isSubmitting}  
              submitText={isEditProduct ? "Edit Product" : "Add Product"} 
            />
          </form>
        )}
      </Form>
    </FormProvider>
  );
}
  

export default AddProductForm;
