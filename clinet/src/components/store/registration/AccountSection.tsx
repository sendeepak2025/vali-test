import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { KeyRound, Eye, EyeOff, FileText } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { StoreRegistrationValues } from "./types";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

interface AccountSectionProps {
  form: UseFormReturn<StoreRegistrationValues>;
  isEdit: boolean;
}

const AccountSection: React.FC<AccountSectionProps> = ({ form, isEdit }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const user = useSelector((state: RootState) => state.auth?.user ?? null);

  useEffect(() => {
    if (user?.role === "admin") {
      form.setValue("password", "12345678");
      form.setValue("confirmPassword", "12345678");
    }
  }, [user?.role, form]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold border-b pb-2">
        Account Credentials
      </h2>

      {!isEdit && (
        <div>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="flex relative">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      className="rounded-l-none pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormDescription>Must be at least 8 characters</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <div className="flex relative">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="rounded-l-none pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Terms Summary Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-2">Important Payment Terms:</p>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>Payment due within 7 days of invoice</li>
              <li>Late payments accrue <strong>1.5% monthly interest</strong> (18% annually)</li>
              <li>$50 fee for returned checks</li>
              <li>Legal action for non-payment in <strong>Atlanta, Georgia courts</strong></li>
            </ul>
          </div>
        </div>
      </div>

      <FormField
        control={form.control}
        name="agreeTerms"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4 border rounded-lg p-4 bg-gray-50">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel className="text-sm">
                I have read and agree to the{" "}
                <Link 
                  to="/terms-and-conditions" 
                  target="_blank"
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Terms and Conditions
                </Link>
                {" "}including payment terms, late payment interest charges, and legal jurisdiction.
              </FormLabel>
              <FormDescription className="text-xs text-gray-500">
                By checking this box, you acknowledge that late payments will incur 1.5% monthly interest 
                and agree to the jurisdiction of courts in Atlanta, Georgia for any disputes.
              </FormDescription>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default AccountSection;
