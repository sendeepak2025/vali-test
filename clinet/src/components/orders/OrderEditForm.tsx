import React, { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, User, Layers, Info } from "lucide-react";
import { Order } from "@/types";
import { getAllMembersAPI } from "@/services2/operations/auth";
import { getAllProductAPI } from "@/services2/operations/product";
import Select2, { GroupBase, Options } from "react-select";
import { useParams } from "react-router-dom";
import { confirmPreOrderAPI } from "@/services2/operations/preOrder";
import { RootState } from "@/redux/store";
import { useSelector } from "react-redux";
import { SalesModeBadge } from "@/components/inventory/forms/SalesModeSelector";
import { SalesMode } from "@/components/inventory/forms/formTypes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define the OrderItem type with required fields
interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

// Define the order form schema
const formSchema = z.object({
  store: z.string().min(1, "Shop  is required"),
  status: z.string().min(1, "Status is required"),
  items: z.array(
    z.object({
      productId: z.string().min(1, "Product ID is required"),
      productName: z.string().min(1, "Product name is required"),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      unitPrice: z.number().min(0, "Unit price must be at least 0"),
      shippinCost: z.number().optional(),
      pricingType: z.enum(["box", "unit"]),
    })
  ),
});

type OrderFormValues = z.infer<typeof formSchema>;

interface OrderEditFormProps {
  order?: Order;
  onSubmit: (data: OrderFormValues) => void;
  setStoreDetails?: (data: string) => void;
  onCancel: () => void;
  onViewClientProfile?: () => void;
  shippingCost?: number;
  isPreOrder?: Boolean;
}

const OrderEditForm: React.FC<OrderEditFormProps> = ({
  order,
  onSubmit,
  onCancel,
  onViewClientProfile,
  setStoreDetails,
  shippingCost = 0,
  isPreOrder
}) => {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState([]);
  const [products, setProducts] = useState([]);
    const token = useSelector((state: RootState) => state.auth?.token ?? null);

  const { id } = useParams();
  console.log(order);
  // Define default values for the form
  const defaultValues: OrderFormValues = {
    store: order?.store || "",
    status: order?.status || "pending",
    items: (
      order?.items || [
        {
          productId: "",
          productName: "",
          quantity: 1,
          unitPrice: 0,
          pricingType: "box",
          shippinCost: 0,
        },
      ]
    ).map((item) => ({
      ...item,
      pricingType: item.pricingType === "unit" ? "unit" : "box",
      shippinCost: item.shippinCost || 0, // force correct typing
    })),
  };

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Function to add a new item to the order
  const addItem = () => {
    const currentItems = form.getValues("items") || [];
    form.setValue("items", [
      ...currentItems,
      {
        productId: "",
        productName: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues("items");
    if (currentItems.length > 1) {
      form.setValue(
        "items",
        currentItems.filter((_, i) => i !== index)
      );
    }
  };

  // const calculateTotal = () => {
  //   const items = form.getValues("items");
  //   return items.reduce(
  //     (total, item) => total + item.quantity * item.unitPrice,
  //     0
  //   );
  // };

  // const calculateSubtotal = () => {
  //   const items = form.getValues("items");
  //   return items.reduce(
  //     (total, item) => total + item.quantity * item.unitPrice,
  //     0
  //   );
  // };

  // const calculateShipping = () => {
  //   const items = form.getValues("items");
  //   return Math.max(...items.map((item) => item.shippinCost || 0), 0);
  // };

  const calculateSubtotal = () => {
    const items = form.getValues("items");
    return items.reduce(
      (total, item) => total + item.quantity * item.unitPrice,
      0
    );
  };

  const calculateShipping = () => {
    const items = form.getValues("items");
    // return items.reduce(
    //   (total, item) => total + item.quantity * (item.shippinCost || 0),
    //   0
    // );
    return shippingCost;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping();
  };

  const getMaxShippingCost = () => {
    const items = form.getValues("items");
    if (!items || items.length === 0) return 0;

    return Math.max(...items.map((item) => item.shippinCost || 0));
  };

  const fetchStores = async () => {
    setLoading(true);
    try {
      const data = await getAllMembersAPI();
      const filteredData = data.filter((store) => store.role === "store");

      const formattedData = filteredData.map(({ _id, ...rest }) => ({
        id: _id,
        ...rest,
      }));

      setStore(formattedData);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleConfirmOrder = async (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault(); // Prevent form submission
  await confirmPreOrderAPI(token, id);
};

  const fetchProducts = async () => {
    try {
      const response = await getAllProductAPI();
      console.log(response);
      if (response) {
        const updatedProducts = response.map((product) => ({
          ...product,
          id: product._id,
          lastUpdated: product?.updatedAt,
        }));
        console.log(updatedProducts);
        setProducts(updatedProducts);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  useEffect(() => {
    fetchStores();
    fetchProducts();
  }, []);
  // After fetchProducts
  useEffect(() => {
    if (products.length > 0 && id) {
      const matchedProduct = products.find((p) => p._id === id);
      if (matchedProduct) {
        // Update the first item in form with this product
        form.setValue(`items.0.productId`, matchedProduct._id);
        form.setValue(`items.0.productName`, matchedProduct.name);

        const pricingType = form.getValues(`items.0.pricingType`);
        const unitPrice =
          pricingType === "unit"
            ? Number(matchedProduct.price)
            : Number(matchedProduct.pricePerBox);
        form.setValue(`items.0.unitPrice`, unitPrice);
        form.setValue(
          `items.0.shippinCost`,
          Number(matchedProduct.shippinCost || 0)
        );
      }
    }
  }, [products, id]);

  const productOptions: {
    value: string;
    label: string;
    pricePerBox: number;
    pricePerUnit: number;
    shippinCost: number;
    salesMode: SalesMode;
    palletCapacity?: { totalCasesPerPallet: number };
  }[] = products.map((product) => ({
    value: product.id,
    label: product.name,
    pricePerBox: Number(product.pricePerBox),
    pricePerUnit: Number(product.price),
    shippinCost: Number(product.shippinCost || 0),
    salesMode: (product.salesMode as SalesMode) || "both",
    palletCapacity: product.palletCapacity,
  }));

  // Helper functions for salesMode-based constraints
  const getAllowedPricingTypes = (salesMode: SalesMode) => {
    switch (salesMode) {
      case "case":
        return { allowUnit: false, allowCase: true, default: "box" };
      case "unit":
        return { allowUnit: true, allowCase: false, default: "unit" };
      case "both":
      default:
        return { allowUnit: true, allowCase: true, default: "box" };
    }
  };

  const getQuantityConstraints = (pricingType: string) => {
    if (pricingType === "box") {
      return { min: 1, step: 1, allowDecimals: false };
    }
    return { min: 0.01, step: 0.01, allowDecimals: true };
  };

  // Calculate pallet estimate for order
  const calculateOrderPalletEstimate = () => {
    const items = form.getValues("items");
    let totalPallets = 0;
    const breakdown: { productName: string; cases: number; pallets: number }[] = [];

    items.forEach((item) => {
      if (item.pricingType === "box" && item.quantity > 0) {
        const product = productOptions.find((p) => p.value === item.productId);
        if (product?.palletCapacity?.totalCasesPerPallet) {
          const pallets = Math.ceil(
            item.quantity / product.palletCapacity.totalCasesPerPallet
          );
          totalPallets += pallets;
          breakdown.push({
            productName: item.productName,
            cases: item.quantity,
            pallets,
          });
        }
      }
    });

    return { totalPallets, breakdown };
  };

  useEffect(() => {
    setStoreDetails(form.getValues("store"));
  }, [form.watch("store")]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="store"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Store</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select Store" />
                      </SelectTrigger>
                      <SelectContent>
                        {store.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.storeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {onViewClientProfile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={onViewClientProfile}
                        className="flex-shrink-0"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="border p-4 rounded-md">
          <h3 className="font-medium mb-4">Order Items</h3>

          {form.watch("items").map((_, index) => {
            const selectedProductId = form.watch(`items.${index}.productId`);
            const selectedProduct = productOptions.find(
              (p) => p.value === selectedProductId
            );
            const salesMode = selectedProduct?.salesMode || "both";
            const allowedTypes = getAllowedPricingTypes(salesMode);
            const currentPricingType = form.watch(`items.${index}.pricingType`);
            const quantityConstraints = getQuantityConstraints(currentPricingType);

            return (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 mb-4 items-center"
              >
                {/* Product Select Dropdown */}
                <div className="col-span-5">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Product
                          {selectedProduct && (
                            <SalesModeBadge salesMode={salesMode} size="sm" />
                          )}
                        </FormLabel>
                        <FormControl>
                          <Select2
                            value={productOptions.find(
                              (option) => option.value === field.value
                            )}
                            options={productOptions}
                            onChange={(selectedOption) => {
                              const productSalesMode = selectedOption.salesMode || "both";
                              const allowed = getAllowedPricingTypes(productSalesMode);
                              
                              // Set default pricing type based on salesMode
                              const newPricingType = allowed.default;
                              
                              form.setValue(
                                `items.${index}.productId`,
                                selectedOption.value
                              );
                              form.setValue(
                                `items.${index}.productName`,
                                selectedOption.label
                              );
                              form.setValue(
                                `items.${index}.pricingType`,
                                newPricingType as "box" | "unit"
                              );
                              
                              const unitPrice =
                                newPricingType === "unit"
                                  ? selectedOption.pricePerUnit
                                  : selectedOption.pricePerBox;
                              form.setValue(
                                `items.${index}.unitPrice`,
                                unitPrice
                              );
                              form.setValue(
                                `items.${index}.shippinCost`,
                                selectedOption.shippinCost
                              );
                              
                              // Reset quantity to valid value for new pricing type
                              const constraints = getQuantityConstraints(newPricingType);
                              form.setValue(`items.${index}.quantity`, constraints.min);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pricing Type Selector - restricted by salesMode */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.pricingType`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const selectedProduct = productOptions.find(
                                (opt) =>
                                  opt.value ===
                                  form.getValues(`items.${index}.productId`)
                              );
                              if (selectedProduct) {
                                const price =
                                  value === "box"
                                    ? selectedProduct.pricePerBox
                                    : selectedProduct.pricePerUnit;
                                form.setValue(
                                  `items.${index}.unitPrice`,
                                  price
                                );
                              }
                              // Reset quantity when switching type
                              const constraints = getQuantityConstraints(value);
                              const currentQty = form.getValues(`items.${index}.quantity`);
                              if (!constraints.allowDecimals && !Number.isInteger(currentQty)) {
                                form.setValue(`items.${index}.quantity`, Math.ceil(currentQty));
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {allowedTypes.allowCase && (
                                <SelectItem value="box">Per Box</SelectItem>
                              )}
                              {allowedTypes.allowUnit && (
                                <SelectItem value="unit">Per Unit</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Quantity - with constraints based on pricingType */}
                <div className="col-span-1.5">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qty</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={quantityConstraints.min}
                            step={quantityConstraints.step}
                            {...field}
                            onChange={(e) => {
                              const value = quantityConstraints.allowDecimals
                                ? parseFloat(e.target.value) || 0
                                : parseInt(e.target.value) || 0;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Unit Price */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Remove Item Button */}
                <div className="col-span-0.5 flex items-center justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={form.watch("items").length <= 1}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            className="mt-2 w-full"
          >
            Add Item
          </Button>

          {/* Order Summary */}
          <div className="p-4 border rounded-md bg-gray-50 mt-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Subtotal:</span>
              <span>$ {calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Shipping:</span>
              <span>$ {calculateShipping().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>Total:</span>
              <span>$ {calculateTotal().toFixed(2)}</span>
            </div>
            
            {/* Pallet Estimate */}
            {(() => {
              const palletEstimate = calculateOrderPalletEstimate();
              if (palletEstimate.totalPallets > 0) {
                return (
                  <div className="border-t pt-2 mt-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex justify-between items-center cursor-help">
                            <span className="font-medium flex items-center gap-1">
                              <Layers className="h-4 w-4" />
                              Est. Pallets:
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </span>
                            <span>~{palletEstimate.totalPallets}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2 text-xs">
                            <p className="font-medium">Pallet Breakdown</p>
                            {palletEstimate.breakdown.map((item, idx) => (
                              <div key={idx} className="flex justify-between gap-4">
                                <span className="text-muted-foreground truncate max-w-[150px]">
                                  {item.productName}
                                </span>
                                <span>{item.cases} cases → ~{item.pallets} pallet(s)</span>
                              </div>
                            ))}
                            <p className="text-amber-600 text-[10px] mt-2 border-t pt-1">
                              ⚠️ Estimates only - verify for actual shipping
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
        <div className="w-full mt-6 flex flex-col md:flex-row items-center justify-between border-t pt-5 gap-4">

          {/* LEFT: Confirm Order Button */}
          {isPreOrder && (
            <button
              onClick={handleConfirmOrder}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium 
                 hover:bg-green-700 transition-all shadow-sm"
            >
              Confirm Order
            </button>
          )}

          {/* RIGHT: Cancel + Submit */}
          <div className="flex items-center gap-3 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="px-5 py-2 rounded-lg"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="px-5 py-2 rounded-lg"
            >
              {order ? "Update Order" : "Create Order"}
            </Button>
          </div>

        </div>

      </form>
    </Form>
  );
};

export default OrderEditForm;
