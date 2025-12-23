import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  PriceListTemplate,
  InvoiceData,
} from "@/components/inventory/forms/formTypes";
import { formatCurrency } from "@/utils/formatters";
import { Check, FileText, Loader2, ShoppingCart, Search, Plus, Minus, X, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportInvoiceToPDF } from "@/utils/pdf";
import { getAllStoresAPI } from "@/services2/operations/auth";
import Select2 from "react-select";
import { createOrderAPI } from "@/services2/operations/order";
import { RootState } from "@/redux/store";
import { useSelector } from "react-redux";
import { getUserAPI } from "@/services2/operations/auth";
import AddressForm from "@/components/AddressFields";
import { getAllProductAPI } from "@/services2/operations/product"
import { emitOrderCreated } from "@/utils/orderEvents";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: PriceListTemplate | null;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  template,
}) => {
  
  
  
  const [selectedStore, setSelectedStore] = useState<{
    label: string;
    value: string;
  } | null>(null);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [priceType, setPriceType] = useState({}); // 'unit' or 'box'

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const { toast } = useToast();
  const [stores, setStores] = useState([]);
  const token = useSelector((state: RootState) => state.auth?.token ?? null);
  const [products, setProducts] = useState([])

  // Search and filter state
  const [productSearch, setProductSearch] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const [storeLoading, setStoreLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    email: "",
    address: "",
    phone: "",
    city: "",
    postalCode: "",
    country: "",
  });
  const [billingAddress, setBillingAddress] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const [shippinC, setShippinC] = useState(0)
  const [priceCategory,setPriceCategory] = useState("pricePerBox")


  useEffect(() => {
    if (!selectedStore?.value) return;

    const id = selectedStore.value;

    const fetchStoreDetails = async () => {
      try {
        setStoreLoading(true);

        const res = await getUserAPI({ id });
        console.log(res);
        if (res) {
          setBillingAddress({
            name: res.ownerName || "",
            email: res.email || "",
            address: res.address || "",
            city: res.city || "",
            postalCode: res.zipCode || "",
            country: res.state || "",
            phone: res.phone || "",
          });
          setShippinC(res.shippingCost)
          console.log(res)
          if (res.priceCategory === "price") {
            setPriceCategory("pricePerBox");
          } else {
            setPriceCategory(res.priceCategory);
          }
        }
      } catch (error) {
        console.error("Error fetching store user:", error);
      } finally {
        setStoreLoading(false);
      }
    };

    fetchStoreDetails();
  }, [selectedStore]);


  const fetchProducts = async () => {
    try {
      const response = await getAllProductAPI()
      if (response) {
        const updatedProducts = response.map((product) => ({
          ...product,
          id: product._id,
          lastUpdated: product?.updatedAt,
        }))
        setProducts(updatedProducts)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const storesData = await getAllStoresAPI();
        const formattedStores = storesData.map(({ _id, storeName }) => ({
          value: _id,
          label: storeName,
        }));

        setStores(formattedStores);
      } catch (error) {
        console.error("Error fetching stores:", error);
      }
    };

    fetchStores();
  }, []);



  const handleQuantityChange = (productId, value) => {
    const newValue = parseInt(value) || 0;
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, newValue),
    }));
  };

  const incrementQuantity = (productId) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const decrementQuantity = (productId) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) - 1),
    }));
  };

  const removeProduct = (productId) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: 0,
    }));
  };
  
  const handlePriceTypeChange = (productId, value) => {
    setPriceType((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  // Filter products based on search and selection
  const filteredProducts = useMemo(() => {
    if (!template?.products) return [];
    
    let filtered = template.products;
    
    // Filter by search
    if (productSearch.trim()) {
      const search = productSearch.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(search) ||
        p.category?.toLowerCase().includes(search)
      );
    }
    
    // Filter to show only selected
    if (showOnlySelected) {
      filtered = filtered.filter(p => (quantities[p.id] || 0) > 0);
    }
    
    return filtered;
  }, [template?.products, productSearch, showOnlySelected, quantities]);

  // Count selected products
  const selectedCount = useMemo(() => {
    return Object.values(quantities).filter(q => q > 0).length;
  }, [quantities]);

  const calculateSubtotal = () => {
    if (!template) return 0;

    return template.products.reduce((total, product) => {
      const quantity = quantities[product.id] || 0;
      const type = priceType[product.id] || "box"; // Default to 'box'
      const price = type === "unit" ? product.price : product[priceCategory] ||product.pricePerBox;

      return total + price * quantity;
    }, 0);
  };


  const calculateShipping = () => {
    if (!template) return 0

    let maxShipping = 0

    template.products.forEach((product) => {
      const quantity = quantities[product.id] || 0
      if (quantity <= 0) return

      const matchedProduct = products.find((p) => p.id === product.id)
      const shippingCost = matchedProduct?.shippinCost || 0

      if (shippingCost > maxShipping) {
        maxShipping = shippingCost
      }
    })

    // return maxShipping
    return shippinC
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping()
  }

  const handleCreateOrder = async () => {
    if (!template || !selectedStore) return
    const requiredFields = ["name", "email", "phone", "address", "city", "postalCode", "country"]
    const checkEmptyFields = (address: any) => requiredFields.some((field) => !address?.[field])

    const billingInvalid = checkEmptyFields(billingAddress)
    const shippingInvalid = sameAsBilling ? false : checkEmptyFields(shippingAddress)

    if (billingInvalid || shippingInvalid) {
      toast({
        title: "Incomplete Address",
        description: "Please fill all required address fields.",
        variant: "destructive",
      })

      return
    }

   
    const orderedProducts = template.products
    .filter((product) => (quantities[product.id] || 0) > 0)
    .map((product) => {
      const quantity = quantities[product.id] || 0;
      const pricingType = priceType[product.id] || "box"; // default to 'box'
  
      const unitPrice = pricingType === "unit" ? product.price : product[priceCategory] || product.pricePerBox;

      return {
        product: product.id,
        name: product.name,
        price: unitPrice,
        quantity: quantity,
        pricingType: pricingType,
        productId: product.id,
        productName: product.name,
        unitPrice: unitPrice,
        total: unitPrice * quantity,
      };
    });

    if (orderedProducts.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to create an order",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    const selectedStoreName = stores.find((store) => store.id === selectedStore)?.name || ""
    const totalAmount = calculateTotal()
    const generateOrderNumber = () => {
      const randomNumber = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit random number
      return `${randomNumber}`;
  };
  const ONo = generateOrderNumber()
    const order = {
      id: `${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`,
      date: new Date().toISOString(),
      clientId: selectedStore,
      clientName: selectedStore?.label,
      items: orderedProducts,
      total: totalAmount,
      status: "pending" as const,
      paymentStatus: "pending" as const,
      subtotal: totalAmount,
      shippinCost: calculateShipping(),
      store: selectedStore.value,
      billingAddress,
      // orderNumber :ONo,

      shippingAddress: sameAsBilling ? billingAddress : shippingAddress,
    }

    const orderRes = await createOrderAPI(order, token)

    // Emit event so Order Matrix and other components can refresh
    if (orderRes) {
      emitOrderCreated(orderRes);
    }

    setOrderDetails(order)
    setOrderConfirmed(true)

    try {
    

      exportInvoiceToPDF({
        id: orderRes.orderNumber as any,
        clientId: (orderRes.store as any)._id,
        clientName: (orderRes.store as any).storeName,
        shippinCost: orderRes.shippinCost || 0,
        date: orderRes.date,
        shippingAddress: orderRes?.shippingAddress,
        billingAddress: orderRes?.billingAddress,
        status: orderRes.status,
        items: orderRes.items,
        total: orderRes.total,
        paymentStatus: orderRes.paymentStatus || "pending",
        subtotal: orderRes.total,
        store: orderRes.store,
        paymentDetails:orderRes.paymentDetails || {}
      });
    } catch (error) {
      console.error("Error generating invoice PDF:", error)
    }

    toast({
      title: "Order Created Successfully",
      description: `Order ${order.id} has been created for ${selectedStore.label}`,
    })

    setIsSubmitting(false)
  }

  const handleClose = () => {
    setSelectedStore({ label: "", value: "" });
    setQuantities({});
    setProductSearch("");
    setShowOnlySelected(false);
    setOrderConfirmed(false);
    setOrderDetails(null);
    onClose();
  };

  const downloadConfirmation = () => {
    if (!orderDetails) return;

    console.log(orderDetails);

    try {
      const invoiceData: InvoiceData = {
        invoiceNumber: orderDetails.id,
        customerName: orderDetails.clientName,
        items: orderDetails.items.map((item) => ({
          productName: item.productName || item.name,
          price: item[priceCategory] || item.unitPrice || item.pricePerBox,
          quantity: item.quantity,
          total: (item[priceCategory] || item.unitPrice || item.pricePerBox) * item.quantity,
        })),
        total: orderDetails.total,
        date: orderDetails.date,
      }

      exportInvoiceToPDF({
        id: invoiceData.invoiceNumber,
        clientId: orderDetails.clientId.value,
        clientName: invoiceData.customerName,
        date: invoiceData.date,
        status: "pending",
        items: orderDetails.items,
        total: invoiceData.total,
        paymentStatus: "pending",
        subtotal: orderDetails.total,
        shippinCost: calculateShipping(),

      });

      toast({
        title: "Order Confirmation Downloaded",
        description: "The order confirmation PDF has been generated",
      });
    } catch (error) {
      console.error("Error generating confirmation PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate confirmation PDF",
        variant: "destructive",
      });
    }
  };

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {orderConfirmed
              ? "Order Confirmation"
              : "Create Order from Price List"}
          </DialogTitle>
          <DialogDescription>
            {orderConfirmed
              ? "Your order has been created successfully. You can download the confirmation PDF."
              : `Create a new order based on "${template?.name}" price list.`}
          </DialogDescription>
        </DialogHeader>

        {!orderConfirmed ? (
          <>
            <div className="space-y-4 py-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="store">Select Store</Label>

                <Select2
                  options={stores}
                  value={selectedStore}
                  onChange={setSelectedStore}
                  placeholder="Search and select a store..."
                  isSearchable={true}
                />

                {storeLoading ? (
                  <div className="flex justify-center items-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                    <span className="text-sm">Finding user details...</span>
                  </div>
                ) : (
                  <AddressForm
                    billingAddress={billingAddress}
                    setBillingAddress={setBillingAddress}
                    shippingAddress={shippingAddress}
                    setShippingAddress={setShippingAddress}
                    sameAsBilling={sameAsBilling}
                    setSameAsBilling={setSameAsBilling}
                  />
                )}
              </div>

              {/* Product Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-gray-50 p-3 rounded-lg border">
                <div className="relative flex-1 w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 bg-white"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant={showOnlySelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                    className="gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Selected ({selectedCount})
                  </Button>
                  {selectedCount > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {formatCurrency(calculateSubtotal())}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="border rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead className="w-[280px]">Product</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      <TableHead className="text-right w-[120px]">Price</TableHead>
                      <TableHead className="w-[180px] text-center">Quantity</TableHead>
                      <TableHead className="text-right w-[100px]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {productSearch ? "No products match your search" : "No products selected"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => {
                        const quantity = quantities[product.id] || 0;
                        const selectedType = priceType[product.id] || "box";
                        const price = selectedType === "unit" ? product.price : product[priceCategory] || product.pricePerBox;
                        const total = price * quantity;
                        const isSelected = quantity > 0;

                        return (
                          <TableRow key={product.id} className={isSelected ? "bg-green-50/50" : ""}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <img
                                  src={product.image || "/placeholder.svg"}
                                  alt=""
                                  className="h-10 w-10 object-contain rounded"
                                  loading="lazy"
                                />
                                <div>
                                  <span className="text-xs sm:text-sm font-medium block">{product.name}</span>
                                  <span className="text-xs text-muted-foreground sm:hidden">{product.category}</span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {product.category}
                            </TableCell>

                            <TableCell className="text-right text-xs sm:text-sm">
                              <div className="flex flex-col items-end gap-1">
                                <select
                                  value={selectedType}
                                  onChange={(e) => handlePriceTypeChange(product.id, e.target.value)}
                                  className="text-xs border rounded px-2 py-1 bg-white"
                                >
                                  <option value="unit">Per LB</option>
                                  <option value="box">Per Box</option>
                                </select>
                                <span className="font-medium">{formatCurrency(price)}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => decrementQuantity(product.id)}
                                  disabled={quantity === 0}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="0"
                                  value={quantity || ""}
                                  onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                  className="w-14 text-center h-8 px-1"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => incrementQuantity(product.id)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                {isSelected && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => removeProduct(product.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-right font-medium text-xs sm:text-sm">
                              {isSelected ? (
                                <span className="text-green-600 font-semibold">{formatCurrency(total)}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Order Summary - Sticky at bottom */}
              <div className="flex flex-col sm:flex-row justify-between items-center px-3 sm:px-6 py-3 sm:py-4 bg-muted rounded-lg border">
                <div className="flex items-center gap-4 mb-2 sm:mb-0">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{selectedCount} items</span>
                  </div>
                </div>
                <div className="w-full sm:w-auto">
                  <div className="grid grid-cols-3 gap-4 sm:gap-8">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Subtotal</div>
                      <div className="font-semibold">{formatCurrency(calculateSubtotal())}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Shipping</div>
                      <div className="font-semibold">{formatCurrency(calculateShipping())}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="font-bold text-lg text-green-600">{formatCurrency(calculateTotal())}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrder}
                disabled={
                  !selectedStore || isSubmitting || calculateTotal() === 0
                }
                className="gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Create Order ({selectedCount} items)
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-100 rounded-md p-4 mb-6 flex items-start gap-3">
              <div className="bg-green-100 rounded-full p-1 mt-0.5">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-800">
                  Order Created Successfully
                </h3>
                <p className="text-green-700 text-sm mt-1">
                  Order #{orderDetails?.id} has been created for{" "}
                  {orderDetails?.clientName}
                </p>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderDetails?.items.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {product.productName || product.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.unitPrice || product.pricePerBox)}
                      </TableCell>
                      <TableCell className="text-center text-xs sm:text-sm">
  {product.quantity} {product.pricingType === "unit" ? "LB" : product.pricingType !== "box" ? product.pricingType : ""}
</TableCell>

                      <TableCell className="text-right">
                        {formatCurrency(
                          (product.unitPrice || product.pricePerBox) *
                            product.quantity
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col sm:flex-row justify-end px-3 sm:px-6 py-3 sm:py-4 bg-muted border-t">
                  <div className="w-full sm:max-w-xl">
                    <div className="grid grid-cols-3 gap-2 font-medium text-muted-foreground text-xs sm:text-sm mb-1">
                      <div className="text-center">Subtotal</div>
                      <div className="text-center">Shipping Cost</div>
                      <div className="text-center">Total</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-bold text-sm sm:text-lg">
                      <div className="text-center">{formatCurrency(calculateSubtotal())}</div>
                      <div className="text-center">{formatCurrency(calculateShipping())}</div>
                      <div className="text-center text-green-600">{formatCurrency(calculateTotal())}</div>
                    </div>
                  </div>
                </div>
            <div className="flex justify-between items-center mt-6">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={downloadConfirmation} variant="default">
                <FileText className="mr-2 h-4 w-4" />
                Download Confirmation PDF
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderModal;
