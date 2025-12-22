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
  maxHeight: 48,
  maxWeight: 2500,
};

interface PalletEstimateDisplayProps {
  caseDimensions?: CaseDimensions;
  caseWeight?: number;
  currentStock?: number;
  palletCapacity?: PalletCapacity;
  palletEstimate?: PalletEstimateType;
  showBreakdown?: boolean;
  compact?: boolean;
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

  const layersByHeight = Math.floor(STANDARD_PALLET.maxHeight / height);

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

export const PalletEstimateDisplay: React.FC<PalletEstimateDisplayProps> = ({
  caseDimensions,
  caseWeight = 0,
  currentStock = 0,
  palletCapacity: providedCapacity,
  palletEstimate: providedEstimate,
  showBreakdown = true,
  compact = false,
}) => {
  // Calculate capacity if not provided
  const capacity =
    providedCapacity ||
    (caseDimensions ? calculatePalletCapacity(caseDimensions, caseWeight) : null);

  // Check if dimensions are missing
  const hasDimensions =
    caseDimensions &&
    caseDimensions.length > 0 &&
    caseDimensions.width > 0 &&
    caseDimensions.height > 0;

  if (!hasDimensions) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
        <AlertCircle className={compact ? "h-3 w-3" : "h-4 w-4"} />
        <span>Dimensions required for pallet calculation</span>
      </div>
    );
  }

  if (!capacity || capacity.totalCasesPerPallet === 0) {
    return (
      <div className={`flex items-center gap-2 text-amber-600 ${compact ? "text-xs" : "text-sm"}`}>
        <AlertCircle className={compact ? "h-3 w-3" : "h-4 w-4"} />
        <span>Unable to calculate - check dimensions</span>
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
            Estimate
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showBreakdown && (
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
          Estimates only - verify for actual shipping (48"×40" pallet)
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
