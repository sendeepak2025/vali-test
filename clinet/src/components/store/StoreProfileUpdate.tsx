"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSelector } from "react-redux"
import { RootState } from "@/redux/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Store, MapPin, KeyRound, Save, User, Mail, Phone, Building2, Link, Receipt } from "lucide-react"
import { updateStoreAPI } from "@/services2/operations/auth"
import { storeSettingsSchema } from "@/lib/validations/settings"
import type { StoreSettingsValues } from "@/lib/validations/settings"
import LoggedInPasswordReset from "./LoggedInPasswordReset"
import StoreInvoiceStatement from "./StoreInvoiceStatement"

const StoreProfileUpdate = () => {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState("info")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  
  const user = useSelector((state: RootState) => state.auth?.user ?? null)
  const token = useSelector((state: RootState) => state.auth?.token ?? null)

  if (!user) return <div className="text-center py-8 text-muted-foreground">User not found.</div>

  const storeForm = useForm<StoreSettingsValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      storeName: user.storeName || "",
      ownerName: user.ownerName || "",
      email: user.email || "",
      phone: user.phone || "",
      businessDescription: user.businessDescription || "",
      address: user.address || "",
      city: user.city || "",
      state: user.state || "",
      zipCode: user.zipCode || "",
    },
    mode: "onChange",
  })

  const onUpdateSettings = async (values: StoreSettingsValues) => {
    setIsUpdating(true)
    try {
      await updateStoreAPI(user._id, values, token)
      toast({
        title: "Profile Updated",
        description: "Your store profile has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-white border">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Store Info</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Address</span>
            <span className="sm:hidden">Address</span>
          </TabsTrigger>
         
          <TabsTrigger value="password" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Password</span>
            <span className="sm:hidden">Password</span>
          </TabsTrigger>
        </TabsList>

        {/* Store Information Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Update Store Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...storeForm}>
                <form onSubmit={storeForm.handleSubmit(onUpdateSettings)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={storeForm.control}
                      name="storeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            Store Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Your Store Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={storeForm.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Owner Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Your Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={storeForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="store@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={storeForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Phone Number
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Your Phone Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={storeForm.control}
                    name="businessDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your business..." 
                            className="min-h-[100px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isUpdating}>
                    {isUpdating ? (
                      <>Updating...</>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Store Information
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Update Store Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...storeForm}>
                <form onSubmit={storeForm.handleSubmit(onUpdateSettings)} className="space-y-4">
                  <FormField
                    control={storeForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={storeForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={storeForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={storeForm.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="ZIP Code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isUpdating}>
                    {isUpdating ? (
                      <>Updating...</>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Address
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab - Invoice & Statement */}
        {/* <TabsContent value="billing">
          <StoreInvoiceStatement />
        </TabsContent> */}

        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Reset Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <KeyRound className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Secure Password Reset</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  For security reasons, password changes are done through email verification. 
                  We'll send a secure reset link to your registered email address.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Reset link will be sent to:</span>
                  </div>
                  <p className="text-blue-800 font-semibold">{user?.email}</p>
                </div>

                <Button 
                  type="button" 
                  className="w-full max-w-md"
                  onClick={() => setShowForgotPassword(true)}
                >
                  <Link className="mr-2 h-4 w-4" />
                  Send Password Reset Link
                </Button>
                
                <p className="text-xs text-gray-500 mt-4">
                  The reset link will expire in 1 hour for security purposes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Password Reset Modal */}
      <LoggedInPasswordReset 
        isOpen={showForgotPassword} 
        onClose={() => setShowForgotPassword(false)} 
      />
    </div>
  )
}

export default StoreProfileUpdate