import React from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Package, Scale, Layers } from "lucide-react";
import { SalesMode } from "./formTypes";

interface SalesModeSelectorProps {
  control: any;
  name?: string;
  disabled?: boolean;
}

const salesModeOptions: {
  value: SalesMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "unit",
    label: "Unit Only",
    description: "Sell by individual units (lb, oz, pieces, etc.)",
    icon: <Scale className="h-5 w-5" />,
  },
  {
    value: "case",
    label: "Case Only",
    description: "Sell by whole cases/boxes only",
    icon: <Package className="h-5 w-5" />,
  },
  {
    value: "both",
    label: "Both",
    description: "Customer can choose unit or case",
    icon: <Layers className="h-5 w-5" />,
  },
];

export const SalesModeSelector: React.FC<SalesModeSelectorProps> = ({
  control,
  name = "salesMode",
  disabled = false,
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel>Sales Mode</FormLabel>
          <FormDescription>
            Choose how this product can be sold to customers
          </FormDescription>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value || "both"}
              value={field.value || "both"}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              disabled={disabled}
            >
              {salesModeOptions.map((option) => (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={`salesMode-${option.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`salesMode-${option.value}`}
                    className={`
                      flex flex-col items-center justify-center rounded-lg border-2 p-4 
                      cursor-pointer transition-all
                      hover:bg-accent hover:text-accent-foreground
                      peer-data-[state=checked]:border-primary 
                      peer-data-[state=checked]:bg-primary/5
                      ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <div className="mb-2 text-muted-foreground peer-data-[state=checked]:text-primary">
                      {option.icon}
                    </div>
                    <span className="font-medium text-sm">{option.label}</span>
                    <span className="text-xs text-muted-foreground text-center mt-1">
                      {option.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

// Simple badge component to display sales mode in lists/tables
interface SalesModeBadgeProps {
  salesMode: SalesMode;
  size?: "sm" | "md";
}

export const SalesModeBadge: React.FC<SalesModeBadgeProps> = ({
  salesMode,
  size = "sm",
}) => {
  const config = {
    unit: {
      label: "Unit",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      icon: <Scale className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />,
    },
    case: {
      label: "Case",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      icon: <Package className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />,
    },
    both: {
      label: "Both",
      className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      icon: <Layers className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />,
    },
  };

  const { label, className, icon } = config[salesMode] || config.both;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}
        ${className}
      `}
    >
      {icon}
      {label}
    </span>
  );
};

export default SalesModeSelector;
