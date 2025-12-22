# Implementation Plan: Product Sales & Pallet Tracking

## Overview

This implementation adds sales mode configuration, pallet tracking calculations, and simplified product creation to the existing product management system. Tasks are ordered to build incrementally with early validation.

## Tasks

- [x] 1. Update Product Model with new fields
  - [x] 1.1 Add salesMode, caseDimensions, caseWeight, and palletCapacity fields to productModel.js
    - Add salesMode enum field with default "both"
    - Add caseDimensions object with length, width, height
    - Add caseWeight number field
    - Add palletCapacity object for cached calculations
    - _Requirements: 2.1, 3.1, 3.2_

  - [ ]* 1.2 Write property test for salesMode validation
    - **Property 2: SalesMode Validation**
    - Test that only "unit", "case", "both" values are accepted
    - **Validates: Requirements 2.1**

- [x] 2. Create Pallet Calculator Utility
  - [x] 2.1 Create palletCalculator.js utility in server/utils
    - Implement calculatePalletCapacity function
    - Implement calculatePalletsNeeded function
    - Use standard pallet dimensions (48"×40"×48", 2500 lbs)
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ]* 2.2 Write property test for cases per layer calculation
    - **Property 7: Cases Per Layer Calculation**
    - Test optimal orientation selection
    - **Validates: Requirements 3.3, 3.5**

  - [ ]* 2.3 Write property test for total cases per pallet
    - **Property 8: Total Cases Per Pallet Calculation**
    - Test height and weight limit constraints
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 2.4 Write property test for pallet count calculation
    - **Property 9: Pallet Count for Orders**
    - Test ceil(quantity/capacity) formula
    - **Validates: Requirements 3.7**

- [x] 3. Add Pre-save Hook for Pallet Calculation
  - [x] 3.1 Add mongoose pre-save hook to productModel.js
    - Calculate palletCapacity when caseDimensions or caseWeight changes
    - Import and use palletCalculator utility
    - _Requirements: 3.3, 3.4_

- [x] 4. Create Order Validation Utility
  - [x] 4.1 Create orderValidation.js utility in server/utils
    - Implement validateOrderItem function
    - Check salesMode against pricingType and quantity
    - Return validation result with error messages
    - _Requirements: 2.2, 2.3, 2.4, 2.6_

  - [ ]* 4.2 Write property test for case-only ordering constraint
    - **Property 3: Case-Only Ordering Constraint**
    - Test integer vs decimal quantities for case-only products
    - **Validates: Requirements 2.2, 2.6**

  - [ ]* 4.3 Write property test for unit-mode decimal quantities
    - **Property 4: Unit-Mode Decimal Quantities**
    - Test decimal quantities are accepted for unit mode
    - **Validates: Requirements 2.3, 4.5**

  - [ ]* 4.4 Write property test for both-mode flexibility
    - **Property 5: Both-Mode Flexibility**
    - Test both ordering methods work correctly
    - **Validates: Requirements 2.4**

- [x] 5. Checkpoint - Backend utilities complete
  - Ensure all backend tests pass
  - Ask the user if questions arise

- [x] 6. Update Product Controller
  - [x] 6.1 Update createProductCtrl to handle new fields
    - Accept salesMode, caseDimensions, caseWeight in request body
    - Set sensible defaults for missing optional fields
    - _Requirements: 1.1, 1.2_

  - [x] 6.2 Update updateProductCtrl to handle new fields
    - Allow updating salesMode, caseDimensions, caseWeight
    - Trigger pallet recalculation on dimension changes
    - _Requirements: 3.3, 3.4_

  - [x] 6.3 Update getAllProductCtrl to include new fields in response
    - Include salesMode, palletCapacity in product list
    - Calculate current inventory pallet estimate
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 6.4 Write property test for product creation with defaults
    - **Property 1: Product Creation with Defaults**
    - Test that required-only products get correct defaults
    - **Validates: Requirements 1.1, 1.2**

- [x] 7. Update Order Controller with Validation
  - [x] 7.1 Integrate order validation in order creation
    - Import orderValidation utility
    - Validate each order item against product salesMode
    - Return appropriate error messages
    - _Requirements: 2.2, 2.3, 2.4, 2.6_

  - [x] 7.2 Add pallet estimate to order response
    - Calculate estimated pallets for order items
    - Include in order creation/view response
    - _Requirements: 3.7_

- [x] 8. Checkpoint - Backend API complete
  - Ensure all backend tests pass
  - Test API endpoints manually
  - Ask the user if questions arise

- [x] 9. Update Frontend Form Types
  - [x] 9.1 Update formTypes.ts with new fields
    - Add salesMode to form schema
    - Add caseDimensions object fields
    - Add caseWeight field
    - _Requirements: 2.1, 3.1, 3.2_

- [x] 10. Create Sales Mode Selector Component
  - [x] 10.1 Create SalesModeSelector.tsx component
    - Radio button group for unit/case/both
    - Clear labels explaining each option
    - _Requirements: 2.1, 2.7_

- [x] 11. Create Pallet Estimate Display Component
  - [x] 11.1 Create PalletEstimate.tsx component
    - Display cases per layer, layers per pallet, total
    - Show disclaimer about estimates
    - Handle missing dimensions gracefully
    - _Requirements: 3.6, 3.9_

- [x] 12. Update AddProductForm
  - [x] 12.1 Add Quick Add mode toggle
    - Show only essential fields in quick mode
    - Full form in advanced mode
    - _Requirements: 1.3, 1.5_

  - [x] 12.2 Add salesMode selector to form
    - Use SalesModeSelector component
    - Default to "both"
    - _Requirements: 2.1_

  - [x] 12.3 Add case dimensions inputs
    - Length, width, height number inputs
    - Show pallet estimate when dimensions entered
    - _Requirements: 3.1, 3.2, 3.6_

- [x] 13. Update ProductFormTabs
  - [x] 13.1 Add "Sales & Shipping" tab
    - Include salesMode selector
    - Include case dimensions inputs
    - Include pallet estimate display
    - _Requirements: 2.1, 3.1, 3.6_

- [x] 14. Update Order Form for Sales Mode
  - [x] 14.1 Update quantity input based on salesMode
    - Number stepper for case-only products
    - Decimal input for unit products
    - Toggle for both-mode products
    - _Requirements: 4.4, 4.5, 4.6_

  - [x] 14.2 Display appropriate pricing based on salesMode
    - Show unit price for unit mode
    - Show case price for case mode
    - Show both with toggle for both mode
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 14.3 Add pallet estimate to order summary
    - Calculate and display estimated pallets
    - Show breakdown on hover/click
    - _Requirements: 3.7_

- [x] 15. Update Inventory Table
  - [x] 15.1 Add salesMode indicator column
    - Visual badge showing unit/case/both
    - _Requirements: 2.7_

  - [x] 15.2 Add pallet estimate column
    - Show estimated pallets for current stock
    - Tooltip with calculation breakdown
    - Handle missing dimensions
    - _Requirements: 5.3, 5.4_

  - [ ]* 15.3 Write property test for inventory pallet estimate
    - **Property 10: Inventory Pallet Estimate**
    - Test ceil(stock/capacity) formula
    - **Validates: Requirements 3.8**

- [x] 16. Update Inventory Stats
  - [x] 16.1 Add total pallet estimate to stats
    - Sum pallet estimates across all products
    - Update on filter changes
    - _Requirements: 5.5, 5.6_

  - [ ]* 16.2 Write property test for total pallets aggregation
    - **Property 11: Total Pallets Aggregation**
    - Test sum of individual estimates
    - **Validates: Requirements 5.5**

  - [ ]* 16.3 Write property test for filtered pallet calculation
    - **Property 12: Filtered Pallet Calculation**
    - Test filter affects total calculation
    - **Validates: Requirements 5.6**

- [x] 17. Final Checkpoint
  - Ensure all tests pass
  - Verify end-to-end flow works
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests
- Backend tasks (1-8) should be completed before frontend tasks (9-16)
- Pallet calculations use standard North American pallet (48"×40")
- All pallet estimates include disclaimer about accuracy
