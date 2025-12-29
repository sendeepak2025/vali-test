import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Package, Layers, Info } from "lucide-react";
import { CaseDimensions, PalletCapacity, PalletEstimate as PalletEstimateType } from "./formTypes";

// Standard pallet dimensions (must match backend)
const STANDARD_PALLET = {
  length: 48,
  width: 40,
  maxHeight: 60,      // Max total height including pallet (6" pallet + 54" stack)
  palletHeight: 6,    // Standard pallet deck height
  maxStackHeight: 54, // Max stack height on pallet
  warnWeight: 2000,   // Warning weight limit
  maxWeight: 2500,    // Hard weight limit
};

// Validation result interface for manual mode
interface ManualPalletValidation {
  isValid: boolean;
  casesPerLayer: number;
  layersUsed: number;
  totalPalletHeight: number;
  totalPalletWeight: number;
  warnings: string[];
  errors: string[];
}

interface PalletEstimateDisplayProps {
  caseDimensions?: CaseDimensions;
  caseWeight?: number;
  currentStock?: number;
  palletCapacity?: PalletCapacity;
  palletEstimate?: PalletEstimateType;
  showBreakdown?: boolean;
  compact?: boolean;
  // Manual mode support
  manualCasesPerPallet?: number;
}

// Calculate pallet capacity on frontend (for live preview)
const calculatePalletCapacity = (
  caseDimensions: CaseDimensions,
  caseWeight: number = 0
): PalletCapacity | null => {
  const { length, width, height } = caseDimensions;

  if (!length || !width || !height || length <= 0 || width <= 0 || height <= 0) {
    return null;
  }

  // Try both orientations
  const orientation1 =
    Math.floor(STANDARD_PALLET.length / length) *
    Math.floor(STANDARD_PALLET.width / width);
  const orientation2 =
    Math.floor(STANDARD_PALLET.length / width) *
    Math.floor(STANDARD_PALLET.width / length);

  const casesPerLayer = Math.max(orientation1, orientation2);

  if (casesPerLayer === 0) return null;

  const layersByHeight = Math.floor(STANDARD_PALLET.maxStackHeight / height);

  let layersByWeight = layersByHeight;
  if (caseWeight > 0) {
    const maxCasesByWeight = Math.floor(STANDARD_PALLET.maxWeight / caseWeight);
    layersByWeight = Math.floor(maxCasesByWeight / casesPerLayer);
  }

  const layersPerPallet = Math.min(layersByHeight, layersByWeight);
  const totalCasesPerPallet = casesPerLayer * layersPerPallet;

  return {
    casesPerLayer,
    layersPerPallet,
    totalCasesPerPallet,
  };
};

// Validate manual pallet entry using actual case dimensions
const validateManualPallet = (
  casesPerPallet: number,
  caseDimensions: CaseDimensions,
  caseWeight: number
): ManualPalletValidation => {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  const { length, width, height } = caseDimensions;
  
  // Check if dimensions are provided
  if (!length || !width || !height || length <= 0 || width <= 0 || height <= 0) {
    return {
      isValid: false,
      casesPerLayer: 0,
      layersUsed: 0,
      totalPalletHeight: 0,
      totalPalletWeight: 0,
      warnings: [],
      errors: ["Enter case dimensions for validation"],
    };
  }

  // Calculate cases per layer from actual dimensions
  // Try both orientations
  const orientation1 =
    Math.floor(STANDARD_PALLET.length / length) *
    Math.floor(STANDARD_PALLET.width / width);
  const orientation2 =
    Math.floor(STANDARD_PALLET.length / width) *
    Math.floor(STANDARD_PALLET.width / length);

  const casesPerLayer = Math.max(orientation1, orientation2);

  if (casesPerLayer === 0) {
    return {
      isValid: false,
      casesPerLayer: 0,
      layersUsed: 0,
      totalPalletHeight: 0,
      totalPalletWeight: 0,
      warnings: [],
      errors: ["Case too large for pallet (48\"×40\")"],
    };
  }

  // Calculate layers needed for the manual cases per pallet
  const layersUsed = Math.ceil(casesPerPallet / casesPerLayer);
  
  // Calculate total pallet height (stack height + pallet deck)
  const stackHeight = layersUsed * height;
  const totalPalletHeight = stackHeight + STANDARD_PALLET.palletHeight;
  
  // Calculate total weight
  const totalPalletWeight = casesPerPallet * (caseWeight || 0);

  // Validate height
  if (totalPalletHeight > STANDARD_PALLET.maxHeight) {
    errors.push(`Height ${totalPalletHeight.toFixed(1)}" exceeds max ${STANDARD_PALLET.maxHeight}"`);
  }

  // Validate weight
  if (caseWeight > 0) {
    if (totalPalletWeight > STANDARD_PALLET.maxWeight) {
      errors.push(`Weight ${totalPalletWeight.toFixed(0)} lbs exceeds max ${STANDARD_PALLET.maxWeight} lbs`);
    } else if (totalPalletWeight > STANDARD_PALLET.warnWeight) {
      warnings.push(`Weight ${totalPalletWeight.toFixed(0)} lbs exceeds recommended ${STANDARD_PALLET.warnWeight} lbs`);
    }
  }

  // Check if manual entry matches calculated capacity
  const calculatedMax = casesPerLayer * Math.floor(STANDARD_PALLET.maxStackHeight / height);
  if (casesPerPallet > calculatedMax) {
    warnings.push(`Entered ${casesPerPallet} cases exceeds calculated max ${calculatedMax}`);
  }

  return {
    isValid: errors.length === 0,
    casesPerLayer,
    layersUsed,
    totalPalletHeight,
    totalPalletWeight,
    warnings,
    errors,
  };
};

export const PalletEstimateDisplay: React.FC<PalletEstimateDisplayProps> = ({
  caseDimensions,
  caseWeight = 0,
  currentStock = 0,
  palletCapacity: providedCapacity,
  palletEstimate: providedEstimate,
  showBreakdown = true,
  compact = false,
  manualCasesPerPallet,
}) => {
  // Check if using manual mode
  const isManualMode = manualCasesPerPallet !== undefined && manualCasesPerPallet > 0;

  // For manual mode, validate using actual dimensions
  const validation = isManualMode && caseDimensions
    ? validateManualPallet(manualCasesPerPallet, caseDimensions, caseWeight)
    : null;

  // Calculate capacity - either from manual input or dimensions
  let capacity: PalletCapacity | null = null;
  
  if (isManualMode) {
    // Manual mode - use user's cases per pallet with validated breakdown
    capacity = {
      casesPerLayer: validation?.casesPerLayer || 0,
      layersPerPallet: validation?.layersUsed || 0,
      totalCasesPerPallet: manualCasesPerPallet,
      isManual: true,
    };
  } else {
    // Auto mode - calculate from dimensions
    capacity =
      providedCapacity ||
      (caseDimensions ? calculatePalletCapacity(caseDimensions, caseWeight) : null);
  }

  // Check if dimensions are missing (only relevant for auto mode)
  const hasDimensions =
    caseDimensions &&
    caseDimensions.length > 0 &&
    caseDimensions.width > 0 &&
    caseDimensions.height > 0;

  // Show appropriate message if no data
  if (!isManualMode && !hasDimensions) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
        <AlertCircle className={compact ? "h-3 w-3" : "h-4 w-4"} />
        <span>Enter dimensions or cases per pallet</span>
      </div>
    );
  }

  if (!capacity || capacity.totalCasesPerPallet === 0) {
    return (
      <div className={`flex items-center gap-2 text-amber-600 ${compact ? "text-xs" : "text-sm"}`}>
        <AlertCircle className={compact ? "h-3 w-3" : "h-4 w-4"} />
        <span>Unable to calculate - check input values</span>
      </div>
    );
  }

  // Calculate pallets needed for current stock
  const palletsNeeded =
    currentStock > 0 ? Math.ceil(currentStock / capacity.totalCasesPerPallet) : 0;
  const fullPallets = Math.floor(currentStock / capacity.totalCasesPerPallet);
  const remainder = currentStock % capacity.totalCasesPerPallet;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <Layers className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs">
                ~{palletsNeeded} pallet{palletsNeeded !== 1 ? "s" : ""}
              </span>
              <Info className="h-3 w-3 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2 text-xs">
              <p className="font-medium">Pallet Capacity Breakdown</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-muted-foreground">Cases/Layer:</span>
                <span>{capacity.casesPerLayer}</span>
                <span className="text-muted-foreground">Layers/Pallet:</span>
                <span>{capacity.layersPerPallet}</span>
                <span className="text-muted-foreground">Total/Pallet:</span>
                <span>{capacity.totalCasesPerPallet}</span>
              </div>
              {currentStock > 0 && (
                <>
                  <hr className="border-border" />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-muted-foreground">Current Stock:</span>
                    <span>{currentStock} cases</span>
                    <span className="text-muted-foreground">Full Pallets:</span>
                    <span>{fullPallets}</span>
                    {remainder > 0 && (
                      <>
                        <span className="text-muted-foreground">Partial:</span>
                        <span>{remainder} cases</span>
                      </>
                    )}
                  </div>
                </>
              )}
              <p className="text-amber-600 text-[10px] mt-2">
                ⚠️ Estimates only - verify for actual shipping
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Pallet Estimate
          <Badge variant="outline" className="text-[10px] font-normal">
            {capacity.isManual ? "Manual" : "Auto"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showBreakdown && (
          capacity.isManual ? (
            // Manual mode - show validated breakdown using actual dimensions
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {capacity.totalCasesPerPallet}
                </p>
                <p className="text-sm text-muted-foreground">Cases Per Pallet</p>
              </div>
              
              {validation && validation.casesPerLayer > 0 && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Calculated from your dimensions:</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Cases/Layer:</span>
                    <span>{validation.casesPerLayer}</span>
                    <span className="text-muted-foreground">Layers Used:</span>
                    <span>{validation.layersUsed}</span>
                  </div>
                  <hr className="border-border/50" />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Pallet Height:</span>
                    <span>{validation.totalPalletHeight.toFixed(1)}" (max 60")</span>
                    {caseWeight > 0 && (
                      <>
                        <span className="text-muted-foreground">Total Weight:</span>
                        <span>{validation.totalPalletWeight.toFixed(0)} lbs</span>
                      </>
                    )}
                  </div>
                  
                  {/* Warnings */}
                  {validation.warnings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {validation.warnings.map((warning, i) => (
                        <p key={i} className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {/* Errors */}
                  {validation.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {validation.errors.map((error, i) => (
                        <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {validation && validation.casesPerLayer === 0 && validation.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3">
                  {validation.errors.map((error, i) => (
                    <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Auto mode - show full breakdown
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{capacity.casesPerLayer}</p>
                <p className="text-xs text-muted-foreground">Cases/Layer</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{capacity.layersPerPallet}</p>
                <p className="text-xs text-muted-foreground">Layers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {capacity.totalCasesPerPallet}
                </p>
                <p className="text-xs text-muted-foreground">Total/Pallet</p>
              </div>
            </div>
          )
        )}

        {currentStock > 0 && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Current Stock ({currentStock} cases)
              </span>
              <span className="font-medium">
                ~{palletsNeeded} pallet{palletsNeeded !== 1 ? "s" : ""}
              </span>
            </div>
            {remainder > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {fullPallets} full + {remainder} cases on partial pallet
              </p>
            )}
          </div>
        )}

        <p className="text-[10px] text-amber-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {capacity.isManual 
            ? "Manual entry - verify for actual shipping" 
            : "Estimates only - verify for actual shipping (48\"×40\" pallet)"}
        </p>
      </CardContent>
    </Card>
  );
};

// Simple inline display for tables
interface PalletEstimateInlineProps {
  palletEstimate?: PalletEstimateType | null;
  totalCasesPerPallet?: number;
  currentStock?: number;
}

export const PalletEstimateInline: React.FC<PalletEstimateInlineProps> = ({
  palletEstimate,
  totalCasesPerPallet,
  currentStock = 0,
}) => {
  if (palletEstimate) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="cursor-help">
            <span className="text-sm">
              ~{palletEstimate.estimatedPallets || 0}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {palletEstimate.fullPallets || 0} full pallets
              {palletEstimate.partialPalletCases
                ? ` + ${palletEstimate.partialPalletCases} cases`
                : ""}
            </p>
            <p className="text-[10px] text-amber-600">Estimate only</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (totalCasesPerPallet && totalCasesPerPallet > 0 && currentStock > 0) {
    const estimated = Math.ceil(currentStock / totalCasesPerPallet);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="cursor-help">
            <span className="text-sm">~{estimated}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{currentStock} cases ÷ {totalCasesPerPallet}/pallet</p>
            <p className="text-[10px] text-amber-600">Estimate only</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <span className="text-muted-foreground text-sm">-</span>;
};

export default PalletEstimateDisplay;
