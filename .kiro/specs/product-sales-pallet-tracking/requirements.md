# Requirements Document

## Introduction

This feature enhances the product management system with three key improvements:
1. Simplified product creation flow for faster data entry
2. Flexible sales unit configuration (sell by unit OR case only)
3. Smart pallet tracking with automatic calculations based on case volume and dimensions

**Note: All pallet calculations and estimates in this feature are for reference purposes only and may not be 100% accurate. Actual pallet configurations should be verified based on real-world conditions.**

## Glossary

- **Product**: An inventory item that can be sold to stores
- **Case**: A box/container holding multiple units of a product (also called "box" in the system)
- **Unit**: Individual item measurement (lb, oz, pieces, etc.)
- **Pallet**: A flat transport structure that holds multiple cases for shipping
- **Sales_Mode**: Configuration determining if a product can be sold by unit, case, or both
- **Case_Volume**: The physical space a case occupies (length × width × height)
- **Pallet_Capacity**: Estimated number of cases that fit on a standard pallet
- **Standard_Pallet**: A 48" × 40" pallet (industry standard in North America)

## Requirements

### Requirement 1: Simplified Product Creation

**User Story:** As an admin, I want to add products quickly with minimal required fields, so that I can efficiently manage inventory without filling unnecessary details.

#### Acceptance Criteria

1. WHEN creating a new product, THE Product_Form SHALL require only: name, category, and price as mandatory fields
2. WHEN the user submits a product with only required fields, THE System SHALL create the product with sensible defaults for optional fields
3. THE Product_Form SHALL display required fields prominently at the top and optional fields in collapsible sections
4. WHEN a user starts typing a product name, THE System SHALL auto-suggest existing categories based on similar products
5. THE Product_Form SHALL provide a "Quick Add" mode that shows only essential fields (name, category, price, case size, price per case)

### Requirement 2: Sales Unit Configuration

**User Story:** As an admin, I want to configure whether a product can be sold by unit, by case only, or both, so that I can control how stores order products.

#### Acceptance Criteria

1. THE Product_Model SHALL include a salesMode field with values: "unit", "case", or "both"
2. WHEN salesMode is "case", THE Order_System SHALL only allow ordering in whole case quantities
3. WHEN salesMode is "unit", THE Order_System SHALL allow ordering by individual units (lb, oz, pieces, etc.)
4. WHEN salesMode is "both", THE Order_System SHALL allow ordering by either unit or case
5. WHEN creating an order, THE Order_Form SHALL display appropriate quantity inputs based on the product's salesMode
6. IF a store attempts to order units for a "case-only" product, THEN THE System SHALL display an error message and prevent the order
7. THE Product_List SHALL display a visual indicator showing each product's salesMode

### Requirement 3: Smart Pallet Tracking

**User Story:** As an admin, I want the system to estimate pallet requirements based on case dimensions and volume, so that I can better plan shipping and warehouse space.

#### Acceptance Criteria

1. THE Product_Model SHALL include case dimension fields: caseLength, caseWidth, caseHeight (in inches)
2. THE Product_Model SHALL include caseWeight field (in lbs)
3. WHEN case dimensions are provided, THE System SHALL calculate and display estimated cases per pallet layer
4. WHEN case dimensions are provided, THE System SHALL calculate and display estimated total cases per pallet (assuming standard stacking)
5. THE System SHALL calculate pallet estimates using: Standard pallet size of 48" × 40", maximum stack height of 48", and weight limit of 2500 lbs
6. WHEN viewing product details, THE System SHALL display pallet capacity estimates with a disclaimer: "Estimates only - verify for actual shipping"
7. WHEN creating a purchase order, THE System SHALL display estimated pallet count based on order quantity
8. WHEN viewing inventory, THE System SHALL show estimated pallet space required for current stock
9. IF case dimensions are not provided, THEN THE System SHALL not display pallet estimates and show "Dimensions required for pallet calculation"

### Requirement 4: Order Integration with Sales Mode

**User Story:** As a store owner, I want to see clear pricing and ordering options based on how each product is sold, so that I can place orders correctly.

#### Acceptance Criteria

1. WHEN displaying products in the order form, THE System SHALL show unit price for "unit" mode products
2. WHEN displaying products in the order form, THE System SHALL show case price for "case" mode products
3. WHEN displaying products in the order form, THE System SHALL show both prices for "both" mode products with a toggle
4. WHEN a product is "case-only", THE Quantity_Input SHALL use a number stepper with minimum value of 1 case
5. WHEN a product is "unit" mode, THE Quantity_Input SHALL allow decimal values for weight-based units
6. THE Order_Summary SHALL clearly display quantities in the appropriate unit (cases vs units)

### Requirement 5: Inventory Display Enhancements

**User Story:** As an admin, I want to see inventory quantities in both units and cases with pallet estimates, so that I can make informed purchasing and storage decisions.

#### Acceptance Criteria

1. THE Inventory_Table SHALL display a column showing current stock in cases
2. THE Inventory_Table SHALL display a column showing current stock in units
3. THE Inventory_Table SHALL display estimated pallet count for current inventory (where dimensions available)
4. WHEN hovering over pallet estimate, THE System SHALL show calculation breakdown
5. THE Inventory_Stats SHALL show total estimated pallets across all products
6. WHEN filtering by category, THE System SHALL update pallet estimates for filtered products only
