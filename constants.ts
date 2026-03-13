
import { Livestock, Expense, ExpenseCategory, FeedInventory, Infrastructure, Sale, DietPlan, Breeder, Entity, Invoice, Farm, Location } from './types';

export const FIXED_CATEGORIES = ['Breeding', 'Meat', 'Dairy', 'Palai', 'Calf'];

export const FEED_PLANS = {
  BASIC: { name: 'Basic Grazing', description: 'Pasture grazing + Basic Hay' },
  PREMIUM: { name: 'Premium Growth', description: 'High Protein Grain + Supplements' },
  CUSTOM: { name: 'Custom/Medical', description: 'Special diet as per owner instruction' }
};

export const COMMON_VACCINES = [
  'BVD (Bovine Viral Diarrhea)',
  'IBR (Infectious Bovine Rhinotracheitis)',
  'Blackleg (Clostridial)',
  'PPR (Peste des Petits Ruminants)',
  'ET (Enterotoxemia)',
  'Leptospirosis',
  'Brucellosis',
  'Pinkeye',
  'Anthrax',
  'Foot and Mouth Disease'
];

export const MOCK_LOCATIONS: Location[] = [
  { id: 'loc-1', name: 'Lahore', type: 'CITY' },
  { id: 'loc-2', name: 'Sahiwal', type: 'CITY' }
];

export const MOCK_FARMS: Farm[] = [
  { id: 'farm-1', name: 'Farm A - Lahore', locationId: 'loc-1', type: 'DAIRY', currency: 'PKR', costCenterCode: 'CC-LHR-01' },
  { id: 'farm-2', name: 'Farm B - Sahiwal', locationId: 'loc-2', type: 'MEAT', currency: 'PKR', costCenterCode: 'CC-SWL-01' },
  { id: 'farm-3', name: 'Farm C - Sahiwal', locationId: 'loc-2', type: 'MIXED', currency: 'PKR', costCenterCode: 'CC-SWL-02' }
];

export const MOCK_BREEDERS: Breeder[] = [
  {
    id: 'brd-1',
    name: 'Elite Genetics Ltd',
    contact: '0321-5556677',
    location: 'Sahiwal District',
    specialization: 'High Yield Sahiwal Semen',
    notes: 'Primary supplier for cattle breeding.'
  },
  {
    id: 'brd-2',
    name: 'Northern Goat Farms',
    contact: '0345-9988112',
    location: 'Rawalpindi',
    specialization: 'Beetal & Saanen Importers',
    notes: 'Premium goat breeds vendor.'
  }
];

export const MOCK_LIVESTOCK: Livestock[] = [
  {
    id: '1',
    farmId: 'farm-1',
    tagId: 'BR-001',
    species: 'CATTLE',
    ownership: 'OWNED',
    category: 'Breeding',
    breed: 'Angus',
    gender: 'FEMALE',
    weight: 650,
    dob: '2020-05-15',
    purchaseDate: '2021-01-10',
    purchasePrice: 250000,
    status: 'ACTIVE',
    location: 'Barn A',
    imageUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=300&q=80',
    weightHistory: [
      { id: 'w1', date: '2023-01-01', weight: 600 },
      { id: 'w2', date: '2023-06-01', weight: 625 },
      { id: 'w3', date: '2023-10-01', weight: 650 }
    ],
    medicalHistory: [
      {
        id: 'm1',
        date: '2023-01-15',
        time: '09:00',
        type: 'VACCINATION',
        medicineName: 'Blackleg (Clostridial)',
        doctorName: 'Dr. Smith',
        cost: 5000,
        notes: 'Routine annual shot',
        nextDueDate: '2024-01-15'
      }
    ],
    breedingHistory: [
      {
        id: 'b1',
        date: '2023-06-01',
        sireId: 'HERCULES-05',
        sireBreed: 'Angus',
        strawBatchId: 'STR-9982',
        technician: 'Dr. AI Tech',
        cost: 8500,
        status: 'CONFIRMED',
        expectedBirthDate: '2024-03-10',
        conceiveDate: '2023-07-01',
        breederId: 'brd-1',
        notes: 'First attempt'
      }
    ],
    milkProductionHistory: []
  },
  {
    id: '2',
    farmId: 'farm-2',
    tagId: 'MT-105',
    species: 'CATTLE',
    category: 'Meat',
    breed: 'Hereford',
    gender: 'MALE',
    weight: 450,
    dob: '2022-11-20',
    purchaseDate: '2023-03-01',
    purchasePrice: 120000,
    status: 'ACTIVE',
    location: 'Pasture 2',
    weightHistory: [
      { id: 'w10', date: '2023-03-01', weight: 350 },
      { id: 'w11', date: '2023-07-01', weight: 400 },
      { id: 'w12', date: '2023-10-01', weight: 450 }
    ],
    medicalHistory: [],
    breedingHistory: [],
    milkProductionHistory: []
  },
  {
    id: '3',
    farmId: 'farm-1',
    tagId: 'DY-001',
    species: 'CATTLE',
    category: 'Dairy',
    breed: 'Holstein',
    gender: 'FEMALE',
    weight: 580,
    dob: '2020-08-10',
    purchaseDate: '2022-05-15',
    purchasePrice: 350000,
    status: 'ACTIVE',
    location: 'Barn C',
    imageUrl: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=300&q=80',
    weightHistory: [
      { id: 'dw1', date: '2023-01-01', weight: 550 },
      { id: 'dw2', date: '2023-06-01', weight: 570 },
      { id: 'dw3', date: '2023-10-01', weight: 580 }
    ],
    medicalHistory: [],
    breedingHistory: [],
    milkProductionHistory: [
      { id: 'mk1', date: '2023-10-20', session: 'MORNING', quantity: 14, fatContent: 3.6 },
      { id: 'mk2', date: '2023-10-20', session: 'EVENING', quantity: 12, fatContent: 3.8 },
      { id: 'mk3', date: '2023-10-21', session: 'MORNING', quantity: 13.5, fatContent: 3.5 },
      { id: 'mk4', date: '2023-10-21', session: 'EVENING', quantity: 11, fatContent: 3.9 },
      { id: 'mk5', date: '2023-10-22', session: 'MORNING', quantity: 15, fatContent: 3.4 },
      { id: 'mk6', date: '2023-10-22', session: 'EVENING', quantity: 13, fatContent: 3.7 }
    ]
  },
  {
    id: '9',
    farmId: 'farm-1',
    tagId: 'GT-DY-01',
    species: 'GOAT',
    ownership: 'OWNED',
    category: 'Dairy',
    breed: 'Saanen',
    gender: 'FEMALE',
    weight: 55,
    dob: '2021-04-10',
    purchaseDate: '2022-03-01',
    purchasePrice: 75000,
    status: 'ACTIVE',
    location: 'Goat Shed D',
    imageUrl: 'https://images.unsplash.com/photo-1561312176-5aedf7172115?auto=format&fit=crop&w=300&q=80',
    weightHistory: [],
    medicalHistory: [],
    breedingHistory: [],
    milkProductionHistory: [
      { id: 'gmk1', date: '2023-10-20', session: 'MORNING', quantity: 2.5, fatContent: 4.1 },
      { id: 'gmk2', date: '2023-10-20', session: 'EVENING', quantity: 2.0, fatContent: 4.3 },
      { id: 'gmk3', date: '2023-10-21', session: 'MORNING', quantity: 2.8, fatContent: 4.0 },
      { id: 'gmk4', date: '2023-10-21', session: 'EVENING', quantity: 2.2, fatContent: 4.2 }
    ]
  },
  {
    id: '10',
    farmId: 'farm-1',
    tagId: 'BULL-001',
    species: 'CATTLE',
    category: 'Breeding',
    breed: 'Sahiwal',
    gender: 'MALE',
    weight: 850,
    dob: '2019-06-15',
    purchaseDate: '2021-01-20',
    purchasePrice: 450000,
    status: 'ACTIVE',
    location: 'Bull Pen',
    ownership: 'OWNED',
    imageUrl: 'https://images.unsplash.com/photo-1598282387225-b873c662ad33?auto=format&fit=crop&w=300&q=80',
    weightHistory: [],
    medicalHistory: [],
    breedingHistory: [],
    milkProductionHistory: []
  },
  {
    id: '11',
    farmId: 'farm-3',
    tagId: 'GT-BK-002',
    species: 'GOAT',
    category: 'Breeding',
    breed: 'Beetal',
    gender: 'MALE',
    weight: 85,
    dob: '2022-01-10',
    purchaseDate: '2022-08-15',
    purchasePrice: 120000,
    status: 'ACTIVE',
    location: 'Goat Shed A',
    ownership: 'OWNED',
    weightHistory: [],
    medicalHistory: [],
    breedingHistory: [],
    milkProductionHistory: []
  },
  {
    id: '12',
    farmId: 'farm-2',
    tagId: 'PALAI-BULL-001',
    species: 'CATTLE',
    category: 'Meat',
    breed: 'Cholistani',
    gender: 'MALE',
    weight: 380,
    dob: '2022-05-20',
    purchaseDate: '2023-09-01',
    purchasePrice: 0,
    status: 'ACTIVE',
    location: 'Fattening Lot B',
    ownership: 'PALAI',
    palaiCustomerId: 'CUST-001',
    notes: 'Customer: Ali Khan. Target weight 500kg for Eid.',
    weightHistory: [
      { id: 'pw1', date: '2023-09-01', weight: 350 },
      { id: 'pw2', date: '2023-10-01', weight: 380 }
    ],
    medicalHistory: [],
    breedingHistory: [],
    milkProductionHistory: []
  },
  {
    id: '13',
    farmId: 'farm-1',
    tagId: 'DY-005',
    species: 'CATTLE',
    category: 'Dairy',
    breed: 'Jersey',
    gender: 'FEMALE',
    weight: 420,
    dob: '2021-02-15',
    purchaseDate: '2023-01-10',
    purchasePrice: 280000,
    status: 'ACTIVE',
    location: 'Barn C',
    ownership: 'OWNED',
    imageUrl: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=300&q=80',
    weightHistory: [],
    medicalHistory: [],
    breedingHistory: [],
    milkProductionHistory: [
      { id: 'mk10', date: '2023-10-22', session: 'MORNING', quantity: 18, fatContent: 4.5 },
      { id: 'mk11', date: '2023-10-22', session: 'EVENING', quantity: 14, fatContent: 4.8 }
    ]
  },
  {
    id: '14',
    farmId: 'farm-1',
    tagId: 'CLF-101',
    species: 'CATTLE',
    category: 'Calf',
    breed: 'Angus Cross',
    gender: 'FEMALE',
    weight: 85,
    dob: '2023-08-01',
    purchaseDate: '2023-08-01',
    purchasePrice: 0,
    status: 'ACTIVE',
    location: 'Calf Pen',
    ownership: 'OWNED',
    damId: '1', // Child of BR-001
    weightHistory: [],
    medicalHistory: [],
    breedingHistory: [],
    milkProductionHistory: []
  },
  {
    id: '15',
    farmId: 'farm-3',
    tagId: 'GT-MT-05',
    species: 'GOAT',
    category: 'Meat',
    breed: 'Teddy',
    gender: 'MALE',
    weight: 35,
    dob: '2023-01-15',
    purchaseDate: '2023-05-20',
    purchasePrice: 25000,
    status: 'ACTIVE',
    location: 'Goat Shed B',
    ownership: 'OWNED',
    weightHistory: [],
    medicalHistory: [],
    breedingHistory: [],
    milkProductionHistory: []
  },
  {
    id: '16',
    farmId: 'farm-2',
    tagId: 'PALAI-GT-003',
    species: 'GOAT',
    category: 'Meat',
    breed: 'Kamori',
    gender: 'MALE',
    weight: 45,
    dob: '2022-12-01',
    purchaseDate: '2023-09-15',
    purchasePrice: 0,
    status: 'ACTIVE',
    location: 'Fattening Lot A',
    ownership: 'PALAI',
    palaiCustomerId: 'CUST-002', // Usman Farm
    notes: 'Premium Qurbani preparation.',
    weightHistory: [
      { id: 'pgw1', date: '2023-09-15', weight: 40 }
    ],
    medicalHistory: [],
    breedingHistory: [],
    milkProductionHistory: []
  },
  {
    id: '17',
    farmId: 'farm-1',
    tagId: 'BR-010',
    species: 'CATTLE',
    category: 'Breeding',
    breed: 'Sahiwal',
    gender: 'FEMALE',
    weight: 480,
    dob: '2021-05-10',
    purchaseDate: '2022-11-01',
    purchasePrice: 210000,
    status: 'ACTIVE',
    location: 'Barn A',
    ownership: 'OWNED',
    notes: 'Confirmed Pregnant - Due Dec 2023',
    weightHistory: [],
    medicalHistory: [],
    breedingHistory: [
      {
        id: 'b10',
        date: '2023-03-15',
        sireId: 'BULL-001',
        sireBreed: 'Sahiwal',
        breederId: 'Self',
        strawBatchId: '',
        technician: 'Self',
        status: 'CONFIRMED',
        expectedBirthDate: '2023-12-22',
        conceiveDate: '2023-04-15',
        cost: 0
      }
    ],
    milkProductionHistory: []
  }
];

export const MOCK_EXPENSES: Expense[] = [
  { id: 'e1', farmId: 'farm-1', category: ExpenseCategory.FEED, amount: 15000, date: '2023-10-01', description: 'Bulk Hay Purchase' },
  { id: 'e2', farmId: 'farm-1', category: ExpenseCategory.LABOR, amount: 20000, date: '2023-10-05', description: 'Monthly Farm Hand Wages' },
];

export const MOCK_SALES: Sale[] = [
  {
    id: 's1',
    farmId: 'farm-1',
    itemType: 'ANIMAL',
    soldAnimalIds: ['old_1'],
    saleType: 'SINGLE_ANIMAL',
    amount: 320000,
    paymentStatus: 'PAID',
    amountReceived: 320000,
    paymentMethod: 'CASH',
    date: '2023-09-01',
    buyer: 'Local Butcher',
    weightAtSale: 600,
    location: 'Main Farm'
  },
];

export const MOCK_FEED: FeedInventory[] = [
  { id: 'f1', farmId: 'farm-1', name: 'Alfalfa Hay', quantity: 5000, unitCost: 30, reorderLevel: 1000 },
  { id: 'f2', farmId: 'farm-2', name: 'Corn Silage', quantity: 2000, unitCost: 15, reorderLevel: 500 },
];

export const MOCK_INFRASTRUCTURE: Infrastructure[] = [
  {
    id: 'i1',
    farmId: 'farm-1',
    name: 'John Deere 5050',
    assetTag: 'TRAC-01',
    category: 'VEHICLE',
    status: 'OPERATIONAL',
    location: 'Garage A',
    purchaseDate: '2019-05-20',
    value: 4500000
  }
];

export const MOCK_DIET_PLANS: DietPlan[] = [
  {
    id: 'dp1',
    farmId: 'farm-1',
    name: 'Standard Dairy Ration',
    targetType: 'CATEGORY',
    targetId: 'Milking Cows',
    targetName: 'Milking Cows',
    status: 'ACTIVE',
    distributionMode: 'PER_ANIMAL',
    startDate: '2023-11-01',
    items: [
      { id: 'item-1', inventoryId: 'f1', inventoryName: 'Alfalfa Hay', quantity: 15, unit: 'kg', costPerUnit: 30 },
    ],
    totalAnimals: 15,
    costPerAnimalPerDay: 450,
    totalCostPerDay: 6750
  }
];

export const MOCK_CUSTOMERS: Entity[] = [
  { id: 'CUST-001', type: 'CUSTOMER', name: 'Ali Khan', contact: '0300-1234567', status: 'ACTIVE', address: 'Lahore Cantt', openingBalance: 0, currentBalance: 0 },
  { id: 'CUST-002', type: 'CUSTOMER', name: 'Usman Farm', contact: '0321-9876543', status: 'ACTIVE', address: 'Multan Road', openingBalance: 0, currentBalance: 0 },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'INV-1001',
    farmId: 'farm-2',
    customerId: 'CUST-001',
    customerName: 'Ali Khan',
    createdDate: '2023-11-01',
    dueDate: '2023-11-10',
    billingPeriodStart: '2023-10-01',
    billingPeriodEnd: '2023-10-31',
    status: 'UNPAID',
    items: [
      { description: 'Fattening Package (Oct) - 3 Animals', amount: 45000 }
    ],
    totalAmount: 45000,
    amountPaid: 0
  }
];
