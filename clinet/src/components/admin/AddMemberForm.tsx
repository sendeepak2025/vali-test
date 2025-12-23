"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { createMemberAPI, updateMemberAPI } from "@/services2/operations/auth"
import { User, Mail, Phone, Building2, Briefcase, Calendar, Key, Shield } from "lucide-react"

const memberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  employeeId: z.string().optional(),
  joiningDate: z.string().optional(),
  isOrder: z.boolean().default(false),
  isProduct: z.boolean().default(false),
})

type MemberFormValues = z.infer<typeof memberSchema>

interface AddMemberFormProps {
  member?: any
  isEdit?: boolean
  onSuccess: () => void
  onCancel: () => void
  currentUser?: any
}


const AddMemberForm = ({ member, isEdit, onSuccess, onCancel, currentUser }: AddMemberFormProps) => {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(isEdit ? memberSchema.omit({ password: true }) : memberSchema),
    defaultValues: {
      name: member?.name || "",
      email: member?.email || "",
      phone: member?.phone || "",
      password: "",
      department: member?.department || "",
      designation: member?.designation || "",
      employeeId: member?.employeeId || "",
      joiningDate: member?.joiningDate ? new Date(member.joiningDate).toISOString().split('T')[0] : "",
      isOrder: member?.isOrder || false,
      isProduct: member?.isProduct || false,
    },
  })

  const onSubmit = async (values: MemberFormValues) => {
    setIsSubmitting(true)
    try {
      if (isEdit && member) {
        await updateMemberAPI(member.id || member._id, {
          ...values,
          activityLog: {
            action: "member_updated",
            description: "Member details updated",
            performedBy: currentUser?._id,
            performedByName: currentUser?.name || currentUser?.email,
          }
        })
        toast({ title: "Success", description: "Member updated successfully" })
      } else {
        await createMemberAPI({
          ...values,
          role: "member",
          createdBy: currentUser?._id,
          activityLog: {
            action: "member_created",
            description: "New member account created",
            performedBy: currentUser?._id,
            performedByName: currentUser?.name || currentUser?.email,
          }
        })
        toast({ title: "Success", description: "Member created successfully" })
      }
      onSuccess()
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save member" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 flex items-center gap-2">
            <User className="h-4 w-4" /> Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} disabled={isEdit} />
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
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 8900" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Min 6 characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* Work Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Work Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee ID</FormLabel>
                  <FormControl>
                    <Input placeholder="EMP001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input placeholder="Sales, Operations, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input placeholder="Manager, Executive, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="joiningDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Joining Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Permissions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="isOrder"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <FormLabel className="text-base">Order Access</FormLabel>
                    <p className="text-sm text-gray-500">Can view and manage orders</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isProduct"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <FormLabel className="text-base">Product Access</FormLabel>
                    <p className="text-sm text-gray-500">Can view and manage products</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEdit ? "Update Member" : "Create Member"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default AddMemberForm