
import { Livestock, Expense, ExpenseCategory, FeedInventory, Infrastructure, Sale, DietPlan, Breeder } from './types';

export const FIXED_CATEGORIES = ['Breeding', 'Meat', 'Dairy', 'Palai'];

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
    tagId: 'BR-001',
    species: 'CATTLE',
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
    tagId: 'GT-DY-01',
    species: 'GOAT',
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
  }
];

export const MOCK_EXPENSES: Expense[] = [
  { id: 'e1', category: ExpenseCategory.FEED, amount: 15000, date: '2023-10-01', description: 'Bulk Hay Purchase' },
  { id: 'e2', category: ExpenseCategory.LABOR, amount: 20000, date: '2023-10-05', description: 'Monthly Farm Hand Wages' },
];

export const MOCK_SALES: Sale[] = [
  { id: 's1', animalId: 'old_1', amount: 320000, date: '2023-09-01', buyer: 'Local Butcher', weightAtSale: 600 },
];

export const MOCK_FEED: FeedInventory[] = [
  { id: 'f1', name: 'Alfalfa Hay', quantity: 5000, unitCost: 30, reorderLevel: 1000 },
  { id: 'f2', name: 'Corn Silage', quantity: 2000, unitCost: 15, reorderLevel: 500 },
];

export const MOCK_INFRASTRUCTURE: Infrastructure[] = [
  { 
    id: 'i1', 
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
    name: 'Meat Fattening Stage 1',
    scheduleType: 'DAILY',
    description: 'Morning: 3kg Corn Silage + 1kg Grain Mix\nNoon: Free Grazing\nEvening: 2kg Alfalfa Hay + Minerals',
    assignedAnimalIds: ['2']
  }
];
