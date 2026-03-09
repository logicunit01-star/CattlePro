
export type LivestockSpecies = 'CATTLE' | 'GOAT';
export type LivestockStatus = 'ACTIVE' | 'SICK' | 'SOLD' | 'DECEASED';

export interface Location {
  id: string;
  name: string; // e.g. City X
  type: 'CITY' | 'REGION';
}

export interface Farm {
  id: string; // Unique Farm ID
  name: string; // e.g. Farm A
  locationId: string; // Reference to Location
  type: 'DAIRY' | 'MEAT' | 'MIXED';
  currency: string;
  costCenterCode: string; // Accounting reference
}

export enum ExpenseCategory {
  FEED = 'FEED',
  VACCINE = 'VACCINE',
  MEDICAL = 'MEDICAL',
  BREEDING = 'BREEDING',
  LABOR = 'LABOR',
  TRANSPORT = 'TRANSPORT',
  MAINTENANCE = 'MAINTENANCE',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  PURCHASE = 'PURCHASE',
  OTHER = 'OTHER'
}

export type MedicalRecordType = 'VACCINATION' | 'TREATMENT' | 'CHECKUP' | 'INJURY' | 'HEAT' | 'OTHER';

export interface MedicalRecord {
  id: string;
  date: string;
  time: string;
  type: MedicalRecordType;
  medicineName?: string;
  doctorName?: string;
  cost: number;
  notes: string;
  nextDueDate?: string;
  imageUrl?: string;
}

export interface MedicineInventory {
  id: string;
  name: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unit: 'ML' | 'DOSE' | 'TABLET';
  costPerUnit: number;
  lowStockThreshold: number;
}

export interface BirthRecord {
  id: string;
  date: string;
  count: number;
  genders: ('MALE' | 'FEMALE')[];
  weights: number[];
  healthStatus: string;
  notes?: string;
  registeredAnimalIds?: string[]; // IDs of animals created from this birth
}

export interface InseminationRecord {
  id: string;
  date: string;
  conceiveDate?: string; // Date pregnancy was confirmed
  sireId: string;
  sireBreed: string;
  breederId?: string; // ID of the breeder/vendor
  strawBatchId: string;
  technician: string;
  cost: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'COMPLETED'; // COMPLETED means birth happened
  expectedBirthDate: string;
  birthRecord?: BirthRecord;
  notes?: string;
  imageUrl?: string;
}

export interface WeightRecord {
  id: string;
  date: string;
  weight: number;
  notes?: string;
}

export interface MilkRecord {
  id: string;
  date: string;
  session: 'MORNING' | 'EVENING';
  quantity: number;
  fatContent?: number;
  notes?: string;
}

export interface ServiceDetails {
  customerName: string;
  customerContact: string;
  startDate: string;
  feedPlan: 'BASIC' | 'PREMIUM' | 'CUSTOM';
  monthlyFee: number;
  specialInstructions?: string;
}

export interface Breeder {
  id: string;
  name: string;
  contact: string;
  location: string;
  specialization: string; // e.g. "Sahiwal Specialist", "Saanen Importer"
  notes?: string;
}


export interface Customer {
  id: string;
  name: string;
  contact: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
}

export type EntityType = 'VENDOR' | 'CUSTOMER' | 'PALAI_CLIENT';

export interface Entity {
  id: string;
  type: EntityType;
  farmId?: string; // If present, entity is specific to this farm. If null, global entity.
  name: string;
  contact: string;
  address?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE';
  openingBalance: number; // Positive = Receivable (They owe us), Negative = Payable (We owe them)
  currentBalance: number;
  notes?: string;
}

export interface Bill {
  id: string;
  farmId: string; // Mandatory Farm Context
  entityId: string; // Vendor ID
  date: string;
  dueDate?: string;
  invoiceNumber?: string; // Vendor's invoice #
  items: {
    description: string;
    amount: number;
    expenseCategory?: ExpenseCategory;
  }[];
  totalAmount: number;
  paidAmount: number;
  status: 'DRAFT' | 'POSTED' | 'PAID' | 'PARTIAL' | 'OVERDUE';
  attachmentUrl?: string;
  notes?: string;
}

export interface LedgerRecord {
  id: string;
  farmId: string; // Mandatory Farm Context
  date: string;
  entityId: string;
  referenceType: 'BILL' | 'SALE' | 'PAYMENT' | 'OPENING_BALANCE' | 'EXPENSE';
  referenceId?: string; // ID of the Bill/Sale
  description: string;
  debit: number; // Money coming IN (Receivable increases, Payable decreases)
  credit: number; // Money going OUT (Payable increases, Receivable decreases)
  balanceAfter: number; // Running balance for the entity
}

export interface Invoice {
  id: string;
  farmId: string; // Mandatory Farm Context
  customerId: string;
  customerName: string;
  createdDate: string;
  dueDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  status: 'PAID' | 'UNPAID' | 'PARTIAL';
  items: {
    description: string;
    amount: number;
  }[];
  totalAmount: number;
  amountPaid: number;
  notes?: string;
}

export interface PalaiProfile {
  startDate: string;
  ratePerMonth?: number;
  feedPlan?: 'BASIC' | 'PREMIUM' | 'CUSTOM';
  specialInstructions?: string;
}

export interface Livestock {
  id: string;
  farmId: string; // Mandatory Farm Context
  tagId: string;
  species: LivestockSpecies;
  category: string;
  breed: string;
  gender: 'MALE' | 'FEMALE';
  weight: number;
  dob: string;
  purchaseDate?: string;
  purchasePrice?: number;
  ownership?: 'OWNED' | 'PALAI';
  palaiCustomerId?: string;
  palaiProfile?: PalaiProfile; // New detailed profile
  status: LivestockStatus;
  location?: string; // Barn/Pen within the farm (derived context can be useful)
  imageUrl?: string;
  notes?: string;
  medicalHistory: MedicalRecord[];
  breedingHistory: InseminationRecord[];
  weightHistory: WeightRecord[];
  milkProductionHistory?: MilkRecord[];
  serviceDetails?: ServiceDetails;
  damId?: string; // Mother
  sireId?: string; // Father
  accumulatedFeedCost?: number;
  accumulatedMedicalCost?: number;
  deathDate?: string;
}

export interface AppState {
  farms: Farm[];
  locations: Location[];
  currentFarmId: string | null; // Selected context (null = Consolidated View if authorized)

  livestock: Livestock[];
  expenses: Expense[];
  sales: Sale[];
  feed: FeedInventory[];
  treatmentProtocols: TreatmentProtocol[];
  dietPlans: DietPlan[];
  infrastructure: Infrastructure[];
  processedFeedLedgers: ProcessedFeedLedger[];
  breeders: Breeder[];
  categories: string[];
  customers: Customer[]; // Legacy, will migrate to entities
  invoices: Invoice[];

  // New Finance Model
  entities: Entity[];
  bills: Bill[];
  ledger: LedgerRecord[];
  consumptionLogs: ConsumptionLog[]; // New: Track feed usage history
}

export interface Expense {
  id: string;
  farmId: string; // Mandatory Farm Context
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  relatedAnimalId?: string;
  location?: string;
  farmName?: string; // Optional denormalized for display
  supplier?: string;
  paymentStatus?: 'PAID' | 'PENDING' | 'PARTIAL';
  paymentDate?: string;
  amountPaid?: number;
  isSystemGenerated?: boolean;
  referenceType?: string;
  /** When set, this expense is removed when the feed ledger is reversed. */
  processedFeedLedgerId?: string;
  // Procurement (FEED): so edit form matches new purchase entry
  feedCategory?: string;  // GRASS, TMR, WANDA
  feedItemId?: string;    // FeedInventory id
  weight?: number;        // kg
  quantity?: number;      // bags/bundles for TMR/WANDA
  rate?: number;         // PKR per kg
}

export interface Sale {
  id: string;
  farmId?: string; // Backend may omit; frontend infers from soldAnimalIds when missing
  itemType: 'ANIMAL' | 'MILK' | 'MANURE' | 'OTHER';

  // Animal Sale Specifics
  soldAnimalIds?: string[]; // Supports multiple animals
  saleType?: 'SINGLE_ANIMAL' | 'BULK_ANIMALS' | 'OTHER';

  // Financials
  amount: number; // Total Sale Value
  estimatedProfit?: number; // Total generated minus cumulative animal COGS
  pricingMethod?: 'PER_ANIMAL' | 'LUMP_SUM'; // For bulk sales
  pricePerAnimal?: number;

  // Payment Tracking
  paymentStatus?: 'PAID' | 'PENDING' | 'PARTIAL';
  amountReceived?: number;
  paymentMethod?: 'CASH' | 'BANK' | 'CHEQUE' | 'OTHER';
  paymentDate?: string;

  quantity?: number; // For non-animal items like Milk (liters)
  date: string;
  buyer: string;
  buyerContact?: string;
  weightAtSale?: number; // Avg or Total depending on context
  description?: string;
  location?: string;
}

export interface FeedInventory {
  id: string;
  farmId: string; // Mandatory Farm Context
  name: string;
  category?: 'FEED' | 'MEDICINE' | 'TOOL' | 'SUPPLY' | 'EQUIPMENT' | 'OTHER';
  quantity: number;
  unit?: string;
  weightPerUnit?: number;
  unitCost: number;
  reorderLevel: number;
  batchNumber?: string;
  expiryDate?: string;
  location?: string;
  feedType?: 'GRASS' | 'TMR' | 'WANDA' | 'OTHER';
  defaultSupplier?: string;
  description?: string;
}

export interface MaintenanceRecord {
  id: string;
  infrastructureId: string; // Links to the asset
  date: string;
  type: 'PREVENTIVE' | 'REPAIR' | 'INSPECTION';
  description: string;
  cost: number;
  performedBy: string;
  nextServiceDate?: string; // When next service is due
}

export interface Infrastructure {
  id: string;
  farmId: string; // Mandatory Farm Context
  name: string;
  assetTag: string;
  category: 'EQUIPMENT' | 'BUILDING' | 'PASTURE' | 'VEHICLE' | 'MACHINERY';
  status: 'OPERATIONAL' | 'NEEDS_REPAIR' | 'UNDER_MAINTENANCE' | 'DISPOSED';
  location: string;
  purchaseDate: string;
  value: number;
  imageUrl?: string;

  // Maintenance Tracking
  lastServiceDate?: string; // Auto-updated from logs
  nextServiceDue?: string;
  maintenanceLog?: MaintenanceRecord[];

  // Depreciation
  lifespanYears?: number;
  depreciationRate?: number; // % per year
  notes?: string;
}

export type DietTargetType = 'INDIVIDUAL' | 'CATEGORY' | 'GROUP' | 'ALL';
export type DietStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
export type DietDistributionMode = 'PER_ANIMAL' | 'TOTAL_DISTRIBUTED' | 'PER_HUNDRED_KG_BW';

export interface DietPlanItem {
  id: string;
  inventoryId: string; // Link to FeedInventory
  inventoryName: string; // Denormalized for display
  quantity: number; // Daily amount per animal
  unit: string; // e.g., 'kg', 'g'
  costPerUnit?: number; // Snapshot of cost at plan creation (optional)
}

export interface DietPlan {
  id: string;
  farmId: string; // Mandatory Farm Context
  name: string;
  targetType: DietTargetType;
  targetId?: string; // ID of animal, or 'Milking Cows', 'Calves', etc.
  targetIds?: string[]; // Multiple individuals
  targetName?: string; // Display name for target
  status: DietStatus;
  distributionMode: DietDistributionMode;
  autoProcess?: boolean;
  lastProcessedDate?: string;
  startDate: string;
  endDate?: string;
  items: DietPlanItem[];
  notes?: string;
  // Computed fields (optional)
  totalAnimals?: number;
  costPerAnimalPerDay?: number;
  totalCostPerDay?: number;
}

export interface ConsumptionLog {
  id: string;
  farmId: string;
  dietPlanId: string;
  processedLedgerId?: string; // Link to master ledger for easy batch reversal
  animalId?: string; // Explicit link so animal history clearly shows exactly what they ate per day
  date: string;
  itemId: string; // FeedInventory ID
  quantityUsed: number; // Total consumed
  cost: number; // Total cost for this entry
  unit: string;
}

export interface ProcessedFeedLedger {
  id: string;
  farmId: string;
  date: string;
  dietPlanId: string;
  totalAnimalsFed: number;
  totalCost: number;
  processedBy: string;
  status: 'PROCESSED' | 'REVERSED';
}

// --- MEDICINE MODULE ---

export interface TreatmentItem {
  id: string;
  inventoryId: string; // Link to FeedInventory (Medicine)
  inventoryName: string;
  dosage: number; // Amount per animal
  unit: string; // ml, tablet, etc.
  costPerUnit?: number;
}

export interface TreatmentProtocol {
  id: string;
  farmId: string;
  name: string; // e.g. "Deworming Protocol A"
  targetType: DietTargetType; // Reuse: INDIVIDUAL | CATEGORY | GROUP
  targetId?: string;
  targetName?: string;
  status: DietStatus; // Reuse: DRAFT | ACTIVE | ARCHIVED
  scheduleType: 'ONE_OFF' | 'RECURRING' | 'AS_NEEDED';
  frequency?: string; // e.g. "Every 3 months"
  items: TreatmentItem[];
  notes?: string;
  // Computed
  costPerAnimal?: number;
}

export interface TreatmentLog {
  id: string;
  farmId: string;
  protocolId?: string; // Optional if ad-hoc
  date: string;
  animalId?: string; // If specific animal
  targetGroup?: string; // If mass treatment
  itemId: string;
  medicineName: string;
  quantityUsed: number;
  cost: number;
  performedBy?: string;
}

export interface AppState {
  farms: Farm[];
  locations: Location[];
  currentLocationId: string | null;
  currentFarmId: string | null;

  livestock: Livestock[];
  expenses: Expense[];
  sales: Sale[];
  feed: FeedInventory[]; // Helper: Includes Medicines
  infrastructure: Infrastructure[];
  dietPlans: DietPlan[];
  treatmentProtocols: TreatmentProtocol[]; // New
  breeders: Breeder[];
  categories: string[];
  customers: Customer[];
  invoices: Invoice[];

  entities: Entity[];
  bills: Bill[];
  ledger: LedgerRecord[];
  consumptionLogs: ConsumptionLog[];
  treatmentLogs: TreatmentLog[]; // New
}
