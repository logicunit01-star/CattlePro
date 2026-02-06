
export type LivestockSpecies = 'CATTLE' | 'GOAT';
export type LivestockStatus = 'ACTIVE' | 'SICK' | 'SOLD' | 'DECEASED';

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
  location?: string;
  imageUrl?: string;
  notes?: string;
  medicalHistory: MedicalRecord[];
  breedingHistory: InseminationRecord[];
  weightHistory: WeightRecord[];
  milkProductionHistory?: MilkRecord[];
  serviceDetails?: ServiceDetails;
  damId?: string; // Mother
  sireId?: string; // Father
}

export interface AppState {
  livestock: Livestock[];
  expenses: Expense[];
  sales: Sale[];
  feed: FeedInventory[];
  infrastructure: Infrastructure[];
  dietPlans: DietPlan[];
  breeders: Breeder[];
  categories: string[];
  customers: Customer[]; // Legacy, will migrate to entities
  invoices: Invoice[];

  // New Finance Model
  entities: Entity[];
  bills: Bill[];
  ledger: LedgerRecord[];
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  relatedAnimalId?: string;
  location?: string;
  farmId?: string;
  supplier?: string;
  paymentStatus?: 'PAID' | 'PENDING' | 'PARTIAL';
  paymentDate?: string;
}

export interface Sale {
  id: string;
  itemType: 'ANIMAL' | 'MILK' | 'MANURE' | 'OTHER';

  // Animal Sale Specifics
  soldAnimalIds?: string[]; // Supports multiple animals
  saleType?: 'SINGLE_ANIMAL' | 'BULK_ANIMALS' | 'OTHER';

  // Financials
  amount: number; // Total Sale Value
  pricingMethod?: 'PER_ANIMAL' | 'LUMP_SUM'; // For bulk sales
  pricePerAnimal?: number;

  // Payment Tracking
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
  amountReceived: number;
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
  name: string;
  category?: 'FEED' | 'MEDICINE';
  quantity: number;
  unit?: string;
  unitCost: number;
  reorderLevel: number;
  batchNumber?: string;
  expiryDate?: string;
  location?: string;
  feedType?: 'GRASS' | 'TMR' | 'WANDA' | 'OTHER';
  defaultSupplier?: string;
}

export interface Infrastructure {
  id: string;
  name: string;
  assetTag: string;
  category: 'EQUIPMENT' | 'BUILDING' | 'PASTURE' | 'TOOL' | 'VEHICLE';
  status: 'OPERATIONAL' | 'NEEDS_REPAIR' | 'UNDER_MAINTENANCE';
  location: string;
  purchaseDate: string;
  value: number;
  imageUrl?: string;
}

export interface DietPlan {
  id: string;
  name: string;
  scheduleType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  description: string;
  assignedAnimalIds: string[];
}

export interface AppState {
  livestock: Livestock[];
  expenses: Expense[];
  sales: Sale[];
  feed: FeedInventory[];
  infrastructure: Infrastructure[];
  dietPlans: DietPlan[];
  breeders: Breeder[];
  categories: string[];
}
