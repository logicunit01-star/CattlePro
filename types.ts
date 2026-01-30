
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

export type MedicalRecordType = 'VACCINATION' | 'TREATMENT' | 'CHECKUP' | 'INJURY';

export interface MedicalRecord {
  id: string;
  date: string;
  time: string;
  type: MedicalRecordType;
  medicineName: string;
  doctorName: string;
  cost: number;
  notes: string;
  nextDueDate?: string;
  imageUrl?: string;
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

export interface Livestock {
  id: string;
  tagId: string;
  species: LivestockSpecies;
  category: string;
  breed: string;
  gender: 'MALE' | 'FEMALE';
  weight: number;
  dob: string;
  purchaseDate: string;
  purchasePrice: number;
  status: LivestockStatus;
  location: string;
  imageUrl?: string;
  medicalHistory: MedicalRecord[];
  breedingHistory: InseminationRecord[];
  weightHistory: WeightRecord[];
  milkProductionHistory?: MilkRecord[];
  serviceDetails?: ServiceDetails;
  notes?: string;
  damId?: string; // Mother
  sireId?: string; // Father
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  relatedAnimalId?: string;
}

export interface Sale {
  id: string;
  animalId: string;
  amount: number;
  date: string;
  buyer: string;
  weightAtSale: number;
}

export interface FeedInventory {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  reorderLevel: number;
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
