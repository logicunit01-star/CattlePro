
import React, { useState } from 'react';
import { Livestock, LivestockSpecies, LivestockStatus, MedicalRecord, MedicalRecordType, InseminationRecord, WeightRecord, ServiceDetails, MilkRecord, Breeder, BirthRecord, FeedInventory, Sale, Entity, Infrastructure } from '../types';
import { COMMON_VACCINES, FEED_PLANS } from '../constants';
import { uploadImage } from '../services/uploadService';
import { Search, Plus, Tag, Scale, Settings, ArrowLeft, Save, Calendar, MapPin, Eye, Stethoscope, Dna, User, Phone, ScrollText, LineChart, Image as ImageIcon, Upload, Edit2, Milk, Droplets, Beef, Sprout, FileText, CheckCircle2, Baby, Info, Trash2, Clock, ChevronRight, DollarSign, Skull, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Props {
    livestock: Livestock[];
    breeders: Breeder[];
    species: LivestockSpecies;
    categories: string[];
    entities?: Entity[];
    infrastructure?: Infrastructure[];
    onAddLivestock: (c: Livestock) => void;
    onUpdateLivestock: (c: Livestock) => void;
    onDeleteLivestock: (id: string) => void | Promise<void>;
    onAddMedicalRecord: (animalId: string, record: MedicalRecord) => void;
    onAddBreedingRecord: (animalId: string, record: InseminationRecord) => void;
    onAddWeightRecord: (animalId: string, record: WeightRecord) => void;

    onAddMilkRecord: (animalId: string, record: MilkRecord) => void;
    onUpdateBreedingRecord: (animalId: string, record: InseminationRecord) => void;
    onBulkVaccinate?: (animalIds: string[], record: MedicalRecord) => void | Promise<void>;
    onBulkMove?: (animalIds: string[], location: string) => void | Promise<void>;
    pagination?: { totalElements: number; totalPages: number; page: number; size: number; sortBy: string; sortDirection: string; searchQ: string; category?: string };
    onPageChange?: (page: number) => void;
    onSortChange?: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
    onSearchChange?: (q: string) => void;
    onCategoryChange?: (category: string) => void;
    inventory: FeedInventory[];
    onAddSale: (sale: Sale) => Promise<void>;
    allLivestock?: Livestock[];
}

type ViewMode = 'LIST' | 'ANIMAL_FORM' | 'DETAILS';

export const LivestockManager: React.FC<Props> = ({ livestock, breeders, species, categories, entities = [], infrastructure = [], onAddLivestock, onUpdateLivestock, onDeleteLivestock, onAddMedicalRecord, onAddBreedingRecord, onAddWeightRecord, onAddMilkRecord, onUpdateBreedingRecord, onBulkVaccinate, onBulkMove, pagination, onPageChange, onSortChange, onSearchChange, onCategoryChange, inventory, onAddSale, allLivestock }) => {
    const T = {
        animal: species === 'CATTLE' ? 'Animal' : 'Goat',
        sire: species === 'CATTLE' ? 'Bull' : 'Buck',
        offspring: species === 'CATTLE' ? 'Calf' : 'Kid',
        birth: species === 'CATTLE' ? 'Calving' : 'Kidding',
        gestationDays: species === 'CATTLE' ? 283 : 150,
        offspringTag: species === 'CATTLE' ? 'CLF' : 'KID',
        tagPlaceholder: species === 'CATTLE' ? 'EX:BR-101' : 'EX:GT-001',
        breedPlaceholder: species === 'CATTLE' ? 'e.g. Angus, Holstein, Sahiwal' : 'e.g. Saanen, Beetal, Kamori, Dera Din Panah',
        locationPlaceholder: species === 'CATTLE' ? 'Barn A' : 'Goat Shed A',
    };

    /** Generate next Tag ID for this species: EX:BR-xxx (cattle) or EX:GT-xxx (goat). Optionally consider currentTagId when computing next (e.g. for Regenerate). */
    const generateNextTagId = (currentTagId?: string): string => {
        const prefix = species === 'CATTLE' ? 'EX:BR-' : 'EX:GT-';
        const re = species === 'CATTLE' ? /^EX:BR-(\d+)$/i : /^EX:GT-(\d+)$/i;
        let max = 0;
        livestock.forEach((l) => {
            if (l.species !== species) return;
            const m = (l.tagId || '').trim().match(re);
            if (m) max = Math.max(max, parseInt(m[1], 10));
        });
        if (currentTagId) {
            const m = (currentTagId || '').trim().match(re);
            if (m) max = Math.max(max, parseInt(m[1], 10));
        }
        return `${prefix}${max + 1}`;
    };

    const [currentView, setCurrentView] = useState<ViewMode>('LIST');
    const [activeCategoryTab, setActiveCategoryTab] = useState<string>(() => (pagination?.category && categories.includes(pagination.category)) ? pagination.category : categories[0]);
    React.useEffect(() => {
        if (pagination?.category && categories.includes(pagination.category) && activeCategoryTab !== pagination.category) setActiveCategoryTab(pagination.category);
    }, [pagination?.category]);
    const [searchTerm, setSearchTerm] = useState('');
    const [serverSearchInput, setServerSearchInput] = useState('');
    React.useEffect(() => { if (pagination?.searchQ !== undefined) setServerSearchInput(pagination.searchQ); }, [pagination?.searchQ]);
    const searchInputValue = pagination ? serverSearchInput : searchTerm;
    const setSearchInputValue = (v: string) => { if (pagination && onSearchChange) { setServerSearchInput(v); onSearchChange(v); } else setSearchTerm(v); };
    const [viewLayout, setViewLayout] = useState<'GRID' | 'TABLE'>('TABLE');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'tagId', direction: 'asc' });

    const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);

    // Derive selectedAnimal from props to ensure it's always up to date
    const resolveLivestock = allLivestock && allLivestock.length > 0 ? allLivestock : livestock;
    const selectedAnimal = resolveLivestock.find(l => l.id === selectedAnimalId) || null;
    const [isEditing, setIsEditing] = useState(false);
    const [detailTab, setDetailTab] = useState<'INFO' | 'MEDICAL' | 'BREEDING' | 'WEIGHT' | 'PRODUCTION'>('INFO');

    const [isAddingHealthRecord, setIsAddingHealthRecord] = useState(false);
    const [isAddingBreedingRecord, setIsAddingBreedingRecord] = useState(false);
    const [isLoggingBirth, setIsLoggingBirth] = useState<string | null>(null);
    const [isAddingWeight, setIsAddingWeight] = useState(false);
    const [isAddingMilk, setIsAddingMilk] = useState(false);
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
    const [isSelling, setIsSelling] = useState(false);
    const [saleForm, setSaleForm] = useState<Partial<Sale>>({
        date: new Date().toISOString().split('T')[0],
        pricePerAnimal: 0,
        buyer: '',
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        amountReceived: 0
    });

    // Form States
    const [animalForm, setAnimalForm] = useState<Omit<Partial<Livestock>, 'serviceDetails'> & { serviceDetails?: Partial<ServiceDetails> }>({
        tagId: '', category: categories[0], breed: '', gender: 'MALE', weight: 0, dob: '', purchaseDate: '', purchasePrice: 0, status: 'ACTIVE', location: '', notes: '', imageUrl: '', medicalHistory: [], breedingHistory: [], weightHistory: [], milkProductionHistory: [],
        serviceDetails: { feedPlan: 'BASIC', monthlyFee: 0, specialInstructions: '' }
    });

    const [newHealthRecord, setNewHealthRecord] = useState<Partial<MedicalRecord>>({
        type: 'VACCINATION', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5), doctorName: '', medicineName: '', cost: 0, notes: '', nextDueDate: '', imageUrl: ''
    });

    const [newBreedingRecord, setNewBreedingRecord] = useState<Partial<InseminationRecord>>({
        date: new Date().toISOString().split('T')[0], conceiveDate: '', sireId: '', sireBreed: '', breederId: '', strawBatchId: '', technician: '', cost: 0, status: 'PENDING', notes: '', imageUrl: ''
    });

    const [birthForm, setBirthForm] = useState<Partial<BirthRecord>>({
        date: new Date().toISOString().split('T')[0], count: 1, genders: ['MALE'], weights: [0], healthStatus: 'Healthy', notes: ''
    });

    const [newWeight, setNewWeight] = useState<Partial<WeightRecord>>({ date: new Date().toISOString().split('T')[0], weight: 0, notes: '' });
    const [newMilk, setNewMilk] = useState<Partial<MilkRecord>>({ date: new Date().toISOString().split('T')[0], session: 'MORNING', quantity: 0, fatContent: 0, notes: '' });

    // Entry Options State
    const [isPregnantEntry, setIsPregnantEntry] = useState(false);
    const [pregnantDate, setPregnantDate] = useState(new Date().toISOString().split('T')[0]);
    const [isAddingCalfEntry, setIsAddingCalfEntry] = useState(false);
    type CalfEntry = { gender: 'MALE' | 'FEMALE'; weight: number; ageMonths: number; name: string };
    const [calfList, setCalfList] = useState<CalfEntry[]>([{ gender: 'FEMALE', weight: 15, ageMonths: 1, name: '' }]);

    // --- Form Validation ---
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const validateAnimalForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!animalForm.tagId?.trim()) errors.tagId = 'Tag ID is required.';
        if (!animalForm.breed?.trim()) errors.breed = 'Breed is required.';
        if (!animalForm.dob?.trim()) errors.dob = 'Date of Birth is required.';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleOpenAdd = () => {
        setImageUploadError(null);
        setFormErrors({});
        const nextTagId = generateNextTagId();
        setAnimalForm({
            tagId: nextTagId, category: categories[0], breed: '', gender: 'MALE', weight: 0, dob: '', purchaseDate: '', purchasePrice: 0, status: 'ACTIVE', location: '', notes: '', imageUrl: '', medicalHistory: [], breedingHistory: [], weightHistory: [], milkProductionHistory: [],
            serviceDetails: { feedPlan: 'BASIC', monthlyFee: 0, specialInstructions: '' }
        });
        setIsPregnantEntry(false);
        setIsAddingCalfEntry(false);
        setCalfList([{ gender: 'FEMALE', weight: 15, ageMonths: 1, name: '' }]);
        setIsEditing(false);
        setCurrentView('ANIMAL_FORM');
    };

    const isServerPagination = pagination != null;
    const filteredLivestock = livestock.filter(
        (c) =>
            c.species === species &&
            (isServerPagination ? true : c.category === activeCategoryTab) &&
            (isServerPagination ? true : (c.tagId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.breed.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    const sortedLivestock = React.useMemo(() => {
        if (isServerPagination) return filteredLivestock;
        let sortableItems = [...filteredLivestock];
        sortableItems.sort((a, b) => {
            let aVal: any = a[sortConfig.key as keyof Livestock];
            let bVal: any = b[sortConfig.key as keyof Livestock];

            if (sortConfig.key === 'age') {
                aVal = a.dob ? new Date(a.dob).getTime() : 0;
                bVal = b.dob ? new Date(b.dob).getTime() : 0;
                // Reverse because older = smaller timestamp
                if (aVal < bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                return 0;
            }

            if (sortConfig.key === 'cost') {
                const aCost = (a.purchasePrice || 0) + (a.accumulatedFeedCost || 0) + (a.accumulatedMedicalCost || 0);
                const bCost = (b.purchasePrice || 0) + (b.accumulatedFeedCost || 0) + (b.accumulatedMedicalCost || 0);
                aVal = aCost;
                bVal = bCost;
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [filteredLivestock, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        const currentKey = isServerPagination ? (pagination?.sortBy || 'tagId') : sortConfig.key;
        const currentDir = isServerPagination ? (pagination?.sortDirection as 'asc' | 'desc') : sortConfig.direction;
        if (currentKey === key && currentDir === 'asc') direction = 'desc';
        if (isServerPagination && onSortChange) onSortChange(key, direction);
        else setSortConfig({ key, direction });
    };

    const getBadges = (animal: Livestock) => {
        const badges = [];
        const upcomingVax = animal.medicalHistory?.find(m => m.type === 'VACCINATION' && m.nextDueDate && new Date(m.nextDueDate) >= new Date());
        if (upcomingVax) {
            badges.push({ text: `💉 Next Vax: ${new Date(upcomingVax.nextDueDate).toLocaleDateString()}`, color: 'bg-sky-100 text-sky-700 border-sky-200' });
        }
        const activePregnancy = animal.breedingHistory?.find(b => ['CONFIRMED', 'PENDING'].includes(b.status));
        if (activePregnancy && animal.gender === 'FEMALE') {
            if (activePregnancy.status === 'CONFIRMED' && activePregnancy.conceiveDate) {
                const months = Math.floor((new Date().getTime() - new Date(activePregnancy.conceiveDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
                badges.push({ text: `🍼 Pregnant: ${months} mo`, color: 'bg-pink-100 text-pink-700 border-pink-200' });
            } else {
                badges.push({ text: `🍼 Pregnant (Pending)`, color: 'bg-amber-100 text-amber-700 border-amber-200' });
            }
        }
        return badges;
    };

    const getStatusColor = (status: LivestockStatus) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800';
            case 'SICK': return 'bg-red-100 text-red-800';
            case 'SOLD': return 'bg-blue-100 text-blue-800';
            case 'DECEASED': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getCategoryIcon = (cat: string, size: number = 18) => {
        switch (cat) {
            case 'Dairy': return <Milk size={size} className="text-sky-600" />;
            case 'Meat': return <Beef size={size} className="text-red-600" />;
            case 'Breeding': return <Dna size={size} className="text-pink-600" />;
            case 'Palai': return <User size={size} className="text-blue-600" />;
            default: return <Tag size={size} className="text-emerald-600" />;
        }
    };

    const getPlaceholderVisual = (cat: string) => {
        const iconSize = 32;
        switch (cat) {
            case 'Dairy': return <div className="w-full h-full bg-sky-50 flex items-center justify-center"><Milk size={iconSize} className="text-sky-300" /></div>;
            case 'Meat': return <div className="w-full h-full bg-red-50 flex items-center justify-center"><Beef size={iconSize} className="text-red-300" /></div>;
            case 'Breeding': return <div className="w-full h-full bg-pink-50 flex items-center justify-center"><Dna size={iconSize} className="text-pink-300" /></div>;
            case 'Palai': return <div className="w-full h-full bg-blue-50 flex items-center justify-center"><User size={iconSize} className="text-blue-300" /></div>;
            default: return <div className="w-full h-full bg-gray-50 flex items-center justify-center"><Tag size={iconSize} className="text-gray-300" /></div>;
        }
    };

    const getAgeDisplay = (dob: string | undefined): string => {
        if (!dob || !dob.trim()) return '—';
        const birth = new Date(dob.trim());
        if (isNaN(birth.getTime())) return '—';
        const ageYears = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (ageYears < 0) return '0 years';
        if (ageYears < 1) return 'Less than 1 year';
        const y = Math.floor(ageYears);
        return `${y} ${y === 1 ? 'year' : 'years'}`;
    };

    const handleSaveBreedingRecord = () => {
        if (!selectedAnimal) return;
        if (!newBreedingRecord.date || !newBreedingRecord.sireId) {
            alert(`Please fill in Date and ${T.sire} ID.`);
            return;
        }

        const inseminationDate = new Date(newBreedingRecord.date!);
        const birthDate = new Date(inseminationDate.getTime() + (T.gestationDays * 24 * 60 * 60 * 1000));

        const record: InseminationRecord = {
            id: Math.random().toString(36).substr(2, 9),
            date: newBreedingRecord.date!,
            conceiveDate: newBreedingRecord.conceiveDate,
            sireId: newBreedingRecord.sireId!,
            sireBreed: newBreedingRecord.sireBreed || 'Unknown',
            breederId: newBreedingRecord.breederId,
            strawBatchId: newBreedingRecord.strawBatchId || '',
            technician: newBreedingRecord.technician || 'Self',
            cost: Number(newBreedingRecord.cost) || 0,
            status: newBreedingRecord.status || 'PENDING',
            expectedBirthDate: birthDate.toISOString().split('T')[0],
            notes: newBreedingRecord.notes || '',
            imageUrl: newBreedingRecord.imageUrl
        };

        onAddBreedingRecord(selectedAnimal.id, record);
        setIsAddingBreedingRecord(false);
        setNewBreedingRecord({ date: new Date().toISOString().split('T')[0], conceiveDate: '', sireId: '', sireBreed: '', breederId: '', strawBatchId: '', technician: '', cost: 0, status: 'PENDING', notes: '', imageUrl: '' });
    };

    const handleConfirmPregnancy = (recId: string) => {
        if (!selectedAnimal) return;
        const rec = selectedAnimal.breedingHistory.find(r => r.id === recId);
        if (!rec) return;

        const updated = { ...rec, status: 'CONFIRMED' as const, conceiveDate: new Date().toISOString().split('T')[0] };
        onUpdateBreedingRecord(selectedAnimal.id, updated);
    };

    const handleSaveBirth = () => {
        if (!selectedAnimal || !isLoggingBirth) return;
        const breedingRec = selectedAnimal.breedingHistory.find(r => r.id === isLoggingBirth);
        if (!breedingRec) return;

        const birth: BirthRecord = {
            id: Math.random().toString(36).substr(2, 9),
            date: birthForm.date!,
            count: birthForm.count!,
            genders: birthForm.genders!,
            weights: birthForm.weights!,
            healthStatus: birthForm.healthStatus || 'Healthy',
            notes: birthForm.notes,
            registeredAnimalIds: []
        };

        for (let i = 0; i < birth.count; i++) {
            const offspring: Livestock = {
                id: Math.random().toString(36).substr(2, 9),
                farmId: '',
                tagId: `${selectedAnimal.tagId}-${T.offspringTag}-${i + 1}`,
                species: selectedAnimal.species,
                category: 'Calf',
                breed: selectedAnimal.breed,
                gender: birth.genders[i],
                weight: birth.weights[i],
                dob: birth.date,
                purchaseDate: birth.date,
                purchasePrice: 0,
                status: 'ACTIVE',
                location: selectedAnimal.location,
                medicalHistory: [],
                breedingHistory: [],
                weightHistory: [{ id: 'w_' + Math.random(), date: birth.date, weight: birth.weights[i], notes: 'Birth weight' }],
                notes: `Offspring of ${selectedAnimal.tagId} (Dam) and ${breedingRec.sireId} (Sire)`,
                damId: selectedAnimal.id,
                sireId: breedingRec.sireId
            };
            onAddLivestock(offspring);
            birth.registeredAnimalIds!.push(offspring.id);
        }

        const updatedBreedingRec: InseminationRecord = { ...breedingRec, status: 'COMPLETED', birthRecord: birth };
        onUpdateBreedingRecord(selectedAnimal.id, updatedBreedingRec);
        setIsLoggingBirth(null);
    };

    const handleSaveMilk = () => {
        if (!selectedAnimal || !newMilk.quantity) return;
        onAddMilkRecord(selectedAnimal.id, {
            id: Math.random().toString(36).substr(2, 9),
            date: newMilk.date!,
            session: newMilk.session!,
            quantity: Number(newMilk.quantity),
            fatContent: Number(newMilk.fatContent),
            notes: newMilk.notes
        });
        setIsAddingMilk(false);
        setNewMilk({ date: new Date().toISOString().split('T')[0], session: 'MORNING', quantity: 0, fatContent: 0 });
    };

    const handleSaveWeight = () => {
        if (!selectedAnimal || !newWeight.weight) return;
        onAddWeightRecord(selectedAnimal.id, {
            id: Math.random().toString(36).substr(2, 9),
            date: newWeight.date!,
            weight: Number(newWeight.weight),
            notes: newWeight.notes
        });
        setIsAddingWeight(false);
        setNewWeight({ date: new Date().toISOString().split('T')[0], weight: 0 });
    };

    const handleSaveHealth = () => {
        if (!selectedAnimal || !newHealthRecord.medicineName) return;

        // Inventory Validation
        const item = inventory.find(i => i.name === newHealthRecord.medicineName);
        if (item && item.quantity <= 0) {
            if (!confirm(`Warning: Stock for ${item.name} is empty (${item.quantity}). Proceed and record negative stock?`)) return;
        }

        onAddMedicalRecord(selectedAnimal.id, {
            id: Math.random().toString(36).substr(2, 9),
            date: newHealthRecord.date!,
            time: newHealthRecord.time!,
            type: newHealthRecord.type!,
            medicineName: newHealthRecord.medicineName ?? '',
            doctorName: newHealthRecord.doctorName ?? '',
            cost: Number(newHealthRecord.cost) || 0,
            notes: newHealthRecord.notes ?? '',
            nextDueDate: (newHealthRecord.nextDueDate && newHealthRecord.nextDueDate.trim() !== '') ? newHealthRecord.nextDueDate : undefined,
            imageUrl: newHealthRecord.imageUrl ?? ''
        });
        setIsAddingHealthRecord(false);
        setNewHealthRecord({ type: 'VACCINATION', date: new Date().toISOString().split('T')[0], medicineName: '', doctorName: '', cost: 0 });
    };

    const [imageUploading, setImageUploading] = useState(false);
    const [imageUploadError, setImageUploadError] = useState<string | null>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'ANIMAL' | 'HEALTH' | 'BREEDING') => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        if (target === 'ANIMAL') {
            setImageUploadError(null);
            setImageUploading(true);
            try {
                const url = await uploadImage(file);
                setAnimalForm(prev => ({ ...prev, imageUrl: url }));
            } catch (err) {
                setImageUploadError(err instanceof Error ? err.message : 'Image upload failed');
            } finally {
                setImageUploading(false);
            }
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (target === 'HEALTH') setNewHealthRecord(prev => ({ ...prev, imageUrl: reader.result as string }));
            if (target === 'BREEDING') setNewBreedingRecord(prev => ({ ...prev, imageUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const updateBirthGenders = (idx: number, gender: 'MALE' | 'FEMALE') => {
        const newGenders = [...(birthForm.genders || [])];
        newGenders[idx] = gender;
        setBirthForm({ ...birthForm, genders: newGenders });
    };

    const updateBirthWeights = (idx: number, weight: number) => {
        const newWeights = [...(birthForm.weights || [])];
        newWeights[idx] = weight;
        setBirthForm({ ...birthForm, weights: newWeights });
    };

    const renderSalesModal = () => (
        isSelling && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-fade-in">
                    <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2"><DollarSign size={28} className="text-emerald-600" /> Sell Animals</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selected Animals</label>
                            <div className="p-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
                                {selectedBatchIds.length > 0 ? `${selectedBatchIds.length} Animals Selected` : selectedAnimal ? `${selectedAnimal.tagId} (${selectedAnimal.breed})` : 'No Selection'}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buyer (Customer)</label>
                            <select
                                className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                                value={saleForm.buyer}
                                onChange={e => setSaleForm({ ...saleForm, buyer: e.target.value })}
                            >
                                <option value="">Select Customer...</option>
                                <option value="Walk-In">Walk-In / Unknown</option>
                                {entities?.filter(e => e.type === 'CUSTOMER' || e.type === 'PALAI_CLIENT').map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Sale Amount (PKR)</label>
                            <input type="number" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-lg" value={saleForm.amount} onChange={e => setSaleForm({ ...saleForm, amount: parseFloat(e.target.value) })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                                <input type="date" className="w-full p-3 border border-gray-200 rounded-xl outline-none" value={saleForm.date} onChange={e => setSaleForm({ ...saleForm, date: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Status</label>
                                <select className="w-full p-3 border border-gray-200 rounded-xl outline-none" value={saleForm.paymentStatus} onChange={e => setSaleForm({ ...saleForm, paymentStatus: e.target.value as any })}>
                                    <option value="PAID">Paid</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="PARTIAL">Partial</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
                            <input type="text" className="w-full p-3 border border-gray-200 rounded-xl outline-none" value={saleForm.notes} onChange={e => setSaleForm({ ...saleForm, notes: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 mt-8">
                        <button onClick={() => setIsSelling(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all">CANCEL</button>
                        <button onClick={async () => {
                            if (!saleForm.buyer || !saleForm.amount) return alert("Please fill Buyer and Amount");
                            const idsToSell = selectedBatchIds.length > 0 ? selectedBatchIds : selectedAnimal ? [selectedAnimal.id] : [];

                            const cogsTotal = idsToSell.reduce((sum, id) => {
                                const a = livestock.find(l => l.id === id);
                                if (!a) return sum;
                                return sum + (a.purchasePrice || 0) + (a.accumulatedFeedCost || 0) + (a.accumulatedMedicalCost || 0);
                            }, 0);

                            const sale: Sale = {
                                id: Math.random().toString(36).substr(2, 9),
                                itemType: 'ANIMAL',
                                soldAnimalIds: idsToSell,
                                saleType: idsToSell.length > 1 ? 'BULK_ANIMALS' : 'SINGLE_ANIMAL',
                                amount: saleForm.amount || 0,
                                estimatedProfit: (saleForm.amount || 0) - cogsTotal,
                                amountReceived: saleForm.paymentStatus === 'PAID' ? (saleForm.amount || 0) : (saleForm.amountReceived || 0),
                                paymentStatus: saleForm.paymentStatus || 'PAID',
                                paymentMethod: 'CASH',
                                date: saleForm.date || new Date().toISOString().split('T')[0],
                                buyer: saleForm.buyer,
                                description: saleForm.notes || `Sale of ${idsToSell.length} animals`,
                                quantity: idsToSell.length
                            };

                            await onAddSale(sale);

                            // Update status of sold animals
                            idsToSell.forEach(id => {
                                const animal = livestock.find(l => l.id === id);
                                if (animal) onUpdateLivestock({ ...animal, status: 'SOLD' });
                            });

                            setIsSelling(false);
                            setSelectedBatchIds([]);
                            if (selectedAnimal) setCurrentView('LIST');
                        }} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all">CONFIRM SALE</button>
                    </div>
                </div>
            </div>
        )
    );

    if (currentView === 'ANIMAL_FORM') {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentView(isEditing ? 'DETAILS' : 'LIST')} className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">{isEditing ? 'Edit Details' : `Register New ${T.animal}`}</h2>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-widest border-b border-emerald-50 pb-2">Profile & Identification</h4>
                            <div className="flex items-center gap-6">
                                <div className="space-y-1">
                                    <div className="w-40 h-40 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-emerald-400 transition-all">
                                        {imageUploading && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                        {animalForm.imageUrl ? <img src={animalForm.imageUrl} className="w-full h-full object-cover" alt="" /> : getPlaceholderVisual(animalForm.category || 'Meat')}
                                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" disabled={imageUploading} onChange={(e) => handleImageUpload(e, 'ANIMAL')} />
                                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <Upload className="text-white" size={32} />
                                        </div>
                                    </div>
                                    {imageUploadError && <p className="text-xs text-red-600">{imageUploadError}</p>}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tag ID *</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="text" value={animalForm.tagId} onChange={e => setAnimalForm({ ...animalForm, tagId: e.target.value })} className="flex-1 border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none font-bold text-lg" placeholder={T.tagPlaceholder} />
                                            <button type="button" onClick={() => setAnimalForm(prev => ({ ...prev, tagId: generateNextTagId(prev.tagId) }))} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 whitespace-nowrap" title="Generate next Tag ID">New</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                        <select value={animalForm.category} onChange={e => setAnimalForm({ ...animalForm, category: e.target.value })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none">
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Breed *</label>
                                    <input type="text" value={animalForm.breed} onChange={e => { setAnimalForm({ ...animalForm, breed: e.target.value }); setFormErrors(p => ({ ...p, breed: '' })); }} className={`w-full border-b-2 py-2 outline-none ${formErrors.breed ? 'border-red-400' : 'border-gray-100 focus:border-emerald-500'}`} placeholder={T.breedPlaceholder} />
                                    {formErrors.breed && <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.breed}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button onClick={() => setAnimalForm({ ...animalForm, gender: 'MALE' })} className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${animalForm.gender === 'MALE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>MALE</button>
                                        <button onClick={() => setAnimalForm({ ...animalForm, gender: 'FEMALE' })} className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${animalForm.gender === 'FEMALE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>FEMALE</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-widest border-b border-emerald-50 pb-2">Physicals & Entry</h4>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Birth Weight (kg)</label>
                                    <input type="number" value={animalForm.weight} onChange={e => setAnimalForm({ ...animalForm, weight: parseFloat(e.target.value) })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location / Barn</label>
                                    <select value={animalForm.location || ''} onChange={e => setAnimalForm({ ...animalForm, location: e.target.value })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none bg-white">
                                        <option value="">Select Location (Optional)</option>
                                        {infrastructure.filter(i => i.category === 'BUILDING' || i.category === 'PASTURE').map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DOB *</label>
                                    <input type="date" value={animalForm.dob} onChange={e => { setAnimalForm({ ...animalForm, dob: e.target.value }); setFormErrors(p => ({ ...p, dob: '' })); }} className={`w-full border-b-2 py-2 outline-none ${formErrors.dob ? 'border-red-400' : 'border-gray-100 focus:border-emerald-500'}`} />
                                    {animalForm.dob && <p className="text-xs text-emerald-600 mt-1 font-semibold">Age: {getAgeDisplay(animalForm.dob)}</p>}
                                    {formErrors.dob && <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.dob}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Purchase Date</label>
                                    <input type="date" value={animalForm.purchaseDate} onChange={e => setAnimalForm({ ...animalForm, purchaseDate: e.target.value })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dam (Mother) ID (Optional)</label>
                                    <select value={animalForm.damId || ''} onChange={e => setAnimalForm({ ...animalForm, damId: e.target.value })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none bg-white">
                                        <option value="">Unknown / Skip</option>
                                        {livestock.filter(l => l.gender === 'FEMALE').map(i => (
                                            <option key={i.id} value={i.id}>{i.tagId} ({i.breed})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sire (Father) ID (Optional)</label>
                                    <select value={animalForm.sireId || ''} onChange={e => setAnimalForm({ ...animalForm, sireId: e.target.value })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none bg-white">
                                        <option value="">Unknown / Skip</option>
                                        {livestock.filter(l => l.gender === 'MALE').map(i => (
                                            <option key={i.id} value={i.id}>{i.tagId} ({i.breed})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Purchase Price (PKR)</label>
                                <input type="number" value={animalForm.purchasePrice} onChange={e => setAnimalForm({ ...animalForm, purchasePrice: parseFloat(e.target.value) })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none" />
                            </div>
                        </div>

                        {/* Palai Specific Options */}
                        {animalForm.category === 'Palai' && (
                            <div className="col-span-1 md:col-span-2 bg-blue-50 rounded-2xl p-6 border border-blue-100">
                                <h4 className="text-sm font-bold text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={16} /> Palai Contract Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rate Per Month (PKR)</label>
                                        <input type="number" value={animalForm.palaiProfile?.ratePerMonth || 0} onChange={e => setAnimalForm({ ...animalForm, palaiProfile: { ...animalForm.palaiProfile, ratePerMonth: parseFloat(e.target.value), startDate: animalForm.palaiProfile?.startDate || new Date().toISOString().split('T')[0] } })} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Feed Plan</label>
                                        <select value={animalForm.palaiProfile?.feedPlan || 'BASIC'} onChange={e => setAnimalForm({ ...animalForm, palaiProfile: { ...animalForm.palaiProfile, feedPlan: e.target.value as any, startDate: animalForm.palaiProfile?.startDate || new Date().toISOString().split('T')[0] } })} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="BASIC">Basic</option>
                                            <option value="PREMIUM">Premium</option>
                                            <option value="CUSTOM">Custom</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                                        <input type="date" value={animalForm.palaiProfile?.startDate || new Date().toISOString().split('T')[0]} onChange={e => setAnimalForm({ ...animalForm, palaiProfile: { ...animalForm.palaiProfile, startDate: e.target.value } })} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Female Specific Options */}
                        {animalForm.gender === 'FEMALE' && (
                            <div className="col-span-1 md:col-span-2 bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                                <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-widest mb-4 flex items-center gap-2"><Settings size={16} /> Reproduction Entry Options</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={isPregnantEntry} onChange={e => setIsPregnantEntry(e.target.checked)} className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300" />
                                            <span className="font-bold text-gray-700">Mark as Pregnant?</span>
                                        </label>
                                        {isPregnantEntry && (
                                            <div className="pl-8 animate-fade-in">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Est. Conception Date</label>
                                                <input type="date" value={pregnantDate} onChange={e => setPregnantDate(e.target.value)} className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={isAddingCalfEntry} onChange={e => {
                                                const checked = e.target.checked;
                                                setIsAddingCalfEntry(checked);
                                                if (checked && calfList.length === 0) setCalfList([{ gender: 'FEMALE', weight: 15, ageMonths: 1, name: '' }]);
                                            }} className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300" />
                                            <span className="font-bold text-gray-700">Add {T.offspring}(s) with Mother?</span>
                                        </label>
                                        {isAddingCalfEntry && (
                                            <div className="pl-8 space-y-4 animate-fade-in">
                                                {calfList.map((entry, idx) => (
                                                    <div key={idx} className="bg-white border border-emerald-100 rounded-xl p-4 space-y-3">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-xs font-bold text-emerald-700 uppercase">{T.offspring} {idx + 1}</span>
                                                            {calfList.length > 1 && (
                                                                <button type="button" onClick={() => setCalfList(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 text-xs font-bold">Remove</button>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                                                                <select value={entry.gender} onChange={e => setCalfList(prev => prev.map((c, i) => i === idx ? { ...c, gender: e.target.value as 'MALE' | 'FEMALE' } : c))} className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-2 outline-none text-sm">
                                                                    <option value="MALE">Male</option>
                                                                    <option value="FEMALE">Female</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age (Months)</label>
                                                                <input type="number" value={entry.ageMonths} onChange={e => setCalfList(prev => prev.map((c, i) => i === idx ? { ...c, ageMonths: parseFloat(e.target.value) || 0 } : c))} className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-2 outline-none text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight (kg)</label>
                                                                <input type="number" value={entry.weight} onChange={e => setCalfList(prev => prev.map((c, i) => i === idx ? { ...c, weight: parseFloat(e.target.value) || 0 } : c))} className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-2 outline-none text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name/Tag (Optional)</label>
                                                                <input type="text" value={entry.name} onChange={e => setCalfList(prev => prev.map((c, i) => i === idx ? { ...c, name: e.target.value } : c))} placeholder={`Auto: ${animalForm.tagId}-${T.offspringTag}-${idx + 1}`} className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 outline-none text-sm" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button type="button" onClick={() => setCalfList(prev => [...prev, { gender: 'FEMALE', weight: 15, ageMonths: 1, name: '' }])} className="text-emerald-600 hover:text-emerald-700 font-bold text-sm flex items-center gap-2">
                                                    <Plus size={16} /> Add another {T.offspring}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-12 flex justify-end gap-6">
                        <button onClick={() => setCurrentView('LIST')} className="font-bold text-gray-400 hover:text-gray-600">CANCEL</button>
                        <button onClick={async () => {
                            if (!validateAnimalForm()) return;

                            const motherId = isEditing ? selectedAnimal!.id : Math.random().toString(36).substr(2, 9);
                            const finalMother = { ...animalForm, id: motherId, species } as Livestock;

                            // 1. Save mother first (must complete before adding breeding record or calves)
                            try {
                                if (isEditing) {
                                    await onUpdateLivestock(finalMother);
                                } else {
                                    await onAddLivestock(finalMother);
                                }
                            } catch (e) {
                                alert("Failed to save animal. Please try again.");
                                return;
                            }

                            // 2. Add pregnancy record if "Mark as Pregnant?" checked (female only)
                            if (isPregnantEntry && animalForm.gender === 'FEMALE') {
                                const expectedBirth = new Date(new Date(pregnantDate).getTime() + (T.gestationDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
                                const breedingRec: InseminationRecord = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    date: pregnantDate,
                                    conceiveDate: pregnantDate,
                                    sireId: 'Unknown',
                                    sireBreed: 'Unknown',
                                    breederId: 'Self',
                                    strawBatchId: '',
                                    technician: 'Self',
                                    status: 'CONFIRMED',
                                    expectedBirthDate: expectedBirth,
                                    cost: 0
                                };
                                try {
                                    await onAddBreedingRecord(motherId, breedingRec);
                                } catch (e) {
                                    console.warn("Pregnancy record could not be saved:", e);
                                }
                            }

                            // 3. Add calves if "Add Calf(s) with Mother?" checked
                            if (isAddingCalfEntry && animalForm.gender === 'FEMALE' && calfList.length > 0) {
                                for (let i = 0; i < calfList.length; i++) {
                                    const entry = calfList[i];
                                    const calfDob = new Date();
                                    calfDob.setMonth(calfDob.getMonth() - entry.ageMonths);
                                    const calf: Livestock = {
                                        id: Math.random().toString(36).substr(2, 9),
                                        farmId: '',
                                        tagId: entry.name.trim() || `${animalForm.tagId}-${T.offspringTag}-${i + 1}`,
                                        species: species,
                                        category: 'Calf',
                                        breed: animalForm.breed,
                                        gender: entry.gender as any,
                                        weight: entry.weight,
                                        dob: calfDob.toISOString().split('T')[0],
                                        status: 'ACTIVE',
                                        damId: motherId,
                                        location: animalForm.location,
                                        purchaseDate: animalForm.purchaseDate,
                                        purchasePrice: 0,
                                        notes: `Auto-added with mother ${animalForm.tagId}`,
                                        medicalHistory: [], breedingHistory: [], weightHistory: [], milkProductionHistory: []
                                    };
                                    try {
                                        await onAddLivestock(calf);
                                    } catch (e) {
                                        console.warn("Calf could not be saved:", e);
                                    }
                                }
                            }

                            setCurrentView('LIST');
                        }} className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">SAVE RECORD</button>
                    </div>
                </div>
                {renderSalesModal()}
            </div>
        );
    }

    if (currentView === 'DETAILS' && selectedAnimal) {
        const milkData = (selectedAnimal.milkProductionHistory || []).map(r => ({ date: r.date, quantity: r.quantity }));
        const weightData = (selectedAnimal.weightHistory || []).map(r => ({ date: r.date, weight: r.weight }));

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <button onClick={() => { setCurrentView('LIST'); setSelectedAnimalId(null); }} className="bg-white p-3 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-800 shadow-sm transition-all">
                            <ArrowLeft size={24} />
                        </button>
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg relative group">
                            {selectedAnimal.imageUrl ? <img src={selectedAnimal.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : getPlaceholderVisual(selectedAnimal.category)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight font-display">{selectedAnimal.tagId}</h2>
                                <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusColor(selectedAnimal.status)}`}>{selectedAnimal.status}</span>
                            </div>
                            <p className="text-slate-500 font-medium text-sm flex items-center gap-2">{selectedAnimal.breed} <span className="w-1 h-1 rounded-full bg-slate-300"></span> {selectedAnimal.category} {species.toLowerCase()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setSaleForm({ ...saleForm, pricePerAnimal: 0, buyer: '', notes: `Sale of ${selectedAnimal.tagId}` });
                                setIsSelling(true);
                            }}
                            disabled={selectedAnimal.status === 'SOLD'}
                            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
                        >
                            <Tag size={18} /> SELL
                        </button>
                        <button onClick={() => {
                            setAnimalForm({ ...selectedAnimal });
                            setIsEditing(true);
                            setIsAddingCalfEntry(false);
                            setCalfList([{ gender: 'FEMALE', weight: 15, ageMonths: 1, name: '' }]);
                            setIsPregnantEntry(false);
                            setPregnantDate(new Date().toISOString().split('T')[0]);
                            setCurrentView('ANIMAL_FORM');
                        }} className="bg-white px-6 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2">
                            <Edit2 size={18} /> EDIT PROFILE
                        </button>
                        <button
                            onClick={async () => {
                                const confirmDeceased = confirm(`Mark ${selectedAnimal.tagId} as DECEASED? This will archive the animal.`);
                                if (!confirmDeceased) return;

                                const date = prompt("Date of Death (YYYY-MM-DD)", new Date().toISOString().split('T')[0]);
                                const cause = prompt("Cause of Death / Notes");

                                if (date && cause) {
                                    const updated = {
                                        ...selectedAnimal,
                                        status: 'DECEASED' as LivestockStatus,
                                        deathDate: date,
                                        notes: `${selectedAnimal.notes || ''} [DECEASED: ${date} - ${cause}]`
                                    };
                                    await onUpdateLivestock(updated);
                                    alert("Animal marked as deceased.");
                                    setSelectedAnimalId(null);
                                    setCurrentView('LIST');
                                }
                            }}
                            className="bg-gray-100 px-6 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-2"
                        >
                            <Skull size={18} /> DECEASED
                        </button>
                        <button
                            onClick={async () => {
                                if (!confirm(`Permanently Delete ${selectedAnimal.tagId}? This cannot be undone.`)) return;
                                await onDeleteLivestock(selectedAnimal.id);
                                setCurrentView('LIST');
                                setSelectedAnimalId(null);
                            }}
                            className="bg-red-50 px-6 py-2.5 rounded-xl border border-red-200 font-bold text-red-600 hover:bg-red-100 transition-all flex items-center gap-2"
                        >
                            <Trash2 size={18} /> DELETE
                        </button>
                    </div>
                </div>

                <div className="flex bg-white/50 backdrop-blur-sm rounded-xl p-1.5 shadow-sm border border-slate-200/60 overflow-x-auto no-scrollbar gap-2">
                    {[
                        { id: 'INFO', label: 'Overview', icon: Info },
                        { id: 'MEDICAL', label: 'Medical', icon: Stethoscope },
                        { id: 'WEIGHT', label: 'Weight', icon: Scale },
                        { id: 'BREEDING', label: 'Breeding', icon: Dna, hide: selectedAnimal.gender !== 'FEMALE' },
                        { id: 'PRODUCTION', label: 'Production', icon: Droplets, hide: selectedAnimal.category !== 'Dairy' }
                    ].filter(t => !t.hide).map(tab => (
                        <button key={tab.id} onClick={() => setDetailTab(tab.id as any)} className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${detailTab === tab.id ? 'bg-white text-emerald-700 shadow-md ring-1 ring-slate-100' : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'}`}>
                            <tab.icon size={16} className={detailTab === tab.id ? 'text-emerald-500' : ''} /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 min-h-[600px] overflow-hidden">
                    {detailTab === 'INFO' && (
                        <div className="p-8 lg:p-12 animate-fade-in">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                <div className="lg:col-span-2 space-y-10">
                                    <div>
                                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-50 pb-2">Vitals & Lineage</h4>
                                        {(() => {
                                            const latestWeight = selectedAnimal.weightHistory?.length > 0 ? selectedAnimal.weightHistory[selectedAnimal.weightHistory.length - 1].weight : selectedAnimal.weight;
                                            const displayWeight = latestWeight > 0 ? `${latestWeight} kg` : 'Not Recorded';
                                            const displayPrice = selectedAnimal.purchasePrice && selectedAnimal.purchasePrice > 0 ? `PKR ${selectedAnimal.purchasePrice.toLocaleString()}` : 'Not Recorded';
                                            const accMedCost = selectedAnimal.accumulatedMedicalCost || selectedAnimal.medicalHistory?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0;
                                            const accFeedCost = selectedAnimal.accumulatedFeedCost || 0;
                                            const totalCogs = (selectedAnimal.purchasePrice || 0) + accFeedCost + accMedCost;

                                            return (
                                                <>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Current Weight</p><p className={`text-xl font-black ${latestWeight > 0 ? 'text-gray-800' : 'text-gray-300'}`}>{displayWeight}</p></div>
                                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Age</p><p className={`text-xl font-black ${selectedAnimal.dob ? 'text-gray-800' : 'text-gray-300'}`}>{getAgeDisplay(selectedAnimal.dob)}</p></div>
                                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Entry Price</p><p className={`text-xl font-black ${selectedAnimal.purchasePrice && selectedAnimal.purchasePrice > 0 ? 'text-slate-600' : 'text-gray-300'}`}>{displayPrice}</p></div>
                                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Location</p><p className={`text-xl font-black ${selectedAnimal.location ? 'text-gray-800' : 'text-gray-300'}`}>{selectedAnimal.location || 'Not Assigned'}</p></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mt-6 pt-6 border-t border-slate-100">
                                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Acc. Feed Cost</p><p className={`text-xl font-black ${accFeedCost > 0 ? 'text-amber-600' : 'text-gray-300'}`}>PKR {Math.round(accFeedCost).toLocaleString()}</p></div>
                                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Acc. Medical Cost</p><p className={`text-xl font-black ${accMedCost > 0 ? 'text-sky-600' : 'text-gray-300'}`}>PKR {Math.round(accMedCost).toLocaleString()}</p></div>
                                                        <div className="sm:col-span-2"><p className="text-[10px] font-bold text-emerald-600 uppercase mb-1 tracking-widest bg-emerald-50 w-fit px-2 rounded">Total COGS (Break-even)</p><p className={`text-2xl font-black ${totalCogs > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>PKR {Math.round(totalCogs).toLocaleString()}</p></div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                        <h5 className="font-black text-gray-800 mb-6 flex items-center gap-2"><ScrollText size={18} className="text-emerald-600" /> Pedigree Tree</h5>
                                        <div className="flex items-center gap-12 justify-center py-6">
                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 border-2 border-white shadow-md mx-auto mb-2"><User size={24} /></div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Dam (Mother)</p>
                                                <p className="font-bold text-gray-800">{(allLivestock && allLivestock.length > 0 ? allLivestock : livestock).find(l => l.id === selectedAnimal.damId)?.tagId || 'Unknown'}</p>
                                            </div>
                                            <div className="h-px w-20 bg-gray-200 relative"><ChevronRight size={16} className="absolute -top-2 -right-2 text-gray-300" /></div>
                                            <div className="text-center">
                                                <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center text-white border-4 border-emerald-50 shadow-xl mx-auto mb-3 shadow-emerald-100"><Tag size={32} /></div>
                                                <p className="text-xs font-black text-emerald-600 uppercase mb-1">This {T.animal}</p>
                                                <p className="text-lg font-black text-gray-800">{selectedAnimal.tagId}</p>
                                            </div>
                                            <div className="h-px w-20 bg-gray-200 relative"><ArrowLeft size={16} className="absolute -top-2 -left-2 text-gray-300" /></div>
                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border-2 border-white shadow-md mx-auto mb-2"><Beef size={24} /></div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">{T.sire} (Father)</p>
                                                <p className="font-bold text-gray-800">{selectedAnimal.sireId || 'Unknown'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {selectedAnimal.gender === 'FEMALE' && (() => {
                                        const lookupList = allLivestock && allLivestock.length > 0 ? allLivestock : livestock;
                                        const offspringList = lookupList.filter(l => l.damId === selectedAnimal.id);
                                        if (offspringList.length === 0) return null;
                                        return (
                                            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 mt-6">
                                                <h5 className="font-black text-gray-800 mb-4 flex items-center gap-2"><Baby size={18} className="text-emerald-600" /> Offspring ({T.offspring}s) — {offspringList.length}</h5>
                                                <div className="flex flex-wrap gap-4">
                                                    {offspringList.map(calf => (
                                                        <button
                                                            key={calf.id}
                                                            type="button"
                                                            onClick={() => { setSelectedAnimalId(calf.id); setDetailTab('INFO'); }}
                                                            className={`flex items-center gap-3 rounded-xl px-4 py-3 border text-left min-w-[180px] transition-all ${calf.status === 'SOLD' ? 'bg-gray-50 border-gray-200 hover:border-gray-300' : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md'}`}
                                                        >
                                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                                                {calf.imageUrl ? <img src={calf.imageUrl} className="w-full h-full object-cover" alt="" /> : getPlaceholderVisual(calf.category)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-gray-800">{calf.tagId}</p>
                                                                <p className="text-xs text-gray-500">{calf.breed} · {calf.gender}{calf.status === 'SOLD' ? ' · SOLD' : ''}</p>
                                                            </div>
                                                            {calf.status === 'SOLD' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">Sold</span>}
                                                            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                                        <h5 className="font-black text-gray-800 mb-4 text-sm tracking-tight uppercase border-b border-gray-50 pb-2">Status Summary</h5>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Vaccinations</span><span className="text-sm font-bold">{selectedAnimal.medicalHistory.filter(m => m.type === 'VACCINATION').length} Done</span></div>
                                            <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Breeding cycles</span><span className="text-sm font-bold">{selectedAnimal.breedingHistory.length} Recorded</span></div>
                                            <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Health Checks</span><span className="text-sm font-bold">{selectedAnimal.medicalHistory.filter(m => m.type === 'CHECKUP').length} Conducted</span></div>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                                        <h5 className="font-black text-emerald-800 mb-3 text-sm flex items-center gap-2"><FileText size={16} /> Manager's Notes</h5>
                                        <p className="text-sm text-emerald-700 leading-relaxed italic">"{selectedAnimal.notes || 'No special instructions recorded for this animal.'}"</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {detailTab === 'MEDICAL' && (
                        <div className="p-8 lg:p-12 animate-fade-in">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800">Health & Veterinary Journal</h3>
                                    <p className="text-sm text-gray-400">Track treatments, vaccines, and wellness</p>
                                </div>
                                <button onClick={() => setIsAddingHealthRecord(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-100"><Plus size={20} /> NEW RECORD</button>
                            </div>

                            {isAddingHealthRecord && (
                                <div className="mb-12 bg-emerald-50 border border-emerald-100 rounded-3xl p-8 animate-slide-up">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Type</label>
                                            <select className="w-full p-2 rounded-lg border border-emerald-200" value={newHealthRecord.type} onChange={e => setNewHealthRecord({ ...newHealthRecord, type: e.target.value as any })}><option value="VACCINATION">Vaccination</option><option value="TREATMENT">Treatment</option><option value="CHECKUP">General Checkup</option><option value="INJURY">Injury Care</option><option value="HEAT">Heat Detection</option><option value="OTHER">Other</option></select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Medicine/Treatment</label>
                                            <select className="w-full p-2 rounded-lg border border-emerald-200" value={newHealthRecord.medicineName} onChange={e => {
                                                const selectedItem = inventory.find(i => i.name === e.target.value);
                                                setNewHealthRecord({ ...newHealthRecord, medicineName: e.target.value, cost: selectedItem ? selectedItem.unitCost : 0 });
                                            }}>
                                                <option value="">Select Medicine</option>
                                                {inventory.filter(i => i.category === 'MEDICINE' && i.quantity > 0).map(i => (
                                                    <option key={i.id} value={i.name}>{i.name} (Stock: {i.quantity})</option>
                                                ))}
                                                <option value="Other">Other / Manual Entry</option>
                                            </select>
                                            {newHealthRecord.medicineName === 'Other' && (
                                                <input type="text" className="w-full p-2 rounded-lg border border-emerald-200 mt-2" placeholder="Enter Medicine Name" onChange={e => setNewHealthRecord({ ...newHealthRecord, medicineName: e.target.value })} />
                                            )}
                                        </div>
                                        <div><label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Doctor Name</label><input type="text" className="w-full p-2 rounded-lg border border-emerald-200" value={newHealthRecord.doctorName} onChange={e => setNewHealthRecord({ ...newHealthRecord, doctorName: e.target.value })} /></div>
                                        <div><label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Cost (PKR)</label><input type="number" className="w-full p-2 rounded-lg border border-emerald-200" value={newHealthRecord.cost} onChange={e => setNewHealthRecord({ ...newHealthRecord, cost: parseFloat(e.target.value) })} /></div>
                                        <div><label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Date</label><input type="date" className="w-full p-2 rounded-lg border border-emerald-200" value={newHealthRecord.date} onChange={e => setNewHealthRecord({ ...newHealthRecord, date: e.target.value })} /></div>
                                        <div><label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Next Due (Optional)</label><input type="date" className="w-full p-2 rounded-lg border border-emerald-200" value={newHealthRecord.nextDueDate} onChange={e => setNewHealthRecord({ ...newHealthRecord, nextDueDate: e.target.value })} /></div>
                                        <div className="lg:col-span-2 flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded border border-emerald-200 flex items-center justify-center overflow-hidden relative group">
                                                {newHealthRecord.imageUrl ? <img src={newHealthRecord.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-emerald-300" />}
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleImageUpload(e, 'HEALTH')} />
                                            </div>
                                            <input type="text" className="flex-1 p-2 rounded-lg border border-emerald-200" placeholder="Notes (optional)" value={newHealthRecord.notes} onChange={e => setNewHealthRecord({ ...newHealthRecord, notes: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end gap-4">
                                        <button onClick={() => setIsAddingHealthRecord(false)} className="font-bold text-gray-400">CANCEL</button>
                                        <button onClick={handleSaveHealth} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold shadow-md">SAVE HEALTH RECORD</button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                {selectedAnimal.medicalHistory.slice().reverse().map(rec => (
                                    <div key={rec.id} className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-md transition-all flex flex-col md:flex-row gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 overflow-hidden">
                                            {rec.imageUrl ? <img src={rec.imageUrl} className="w-full h-full object-cover" /> : <Stethoscope size={20} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-xs font-black text-emerald-600 uppercase tracking-tighter">{rec.date}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${rec.type === 'VACCINATION' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{rec.type}</span>
                                            </div>
                                            <h4 className="font-black text-lg text-gray-800">{rec.medicineName}</h4>
                                            <p className="text-sm text-gray-400 mt-1">Administered by: <span className="text-gray-600 font-bold">{rec.doctorName}</span></p>
                                            {rec.notes && <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg mt-3 italic">"{rec.notes}"</p>}
                                        </div>
                                        <div className="flex flex-col items-end justify-center">
                                            <p className="text-lg font-black text-gray-800">PKR {(rec.cost ?? 0).toLocaleString()}</p>
                                            {rec.nextDueDate && <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 mt-1"><Clock size={10} /> Next Due: {rec.nextDueDate}</p>}
                                        </div>
                                    </div>
                                ))}
                                {selectedAnimal.medicalHistory.length === 0 && <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100 text-gray-400"><Stethoscope className="mx-auto mb-4 opacity-20" size={60} /><p className="font-black uppercase text-xs tracking-widest">No Health Records Yet</p></div>}
                            </div>
                        </div>
                    )}

                    {detailTab === 'WEIGHT' && (
                        <div className="p-8 lg:p-12 animate-fade-in">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800">Weight & Growth Analytics</h3>
                                    <p className="text-sm text-gray-400">Visualizing animal performance over time</p>
                                </div>
                                <button onClick={() => setIsAddingWeight(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-100"><Plus size={20} /> LOG WEIGHT</button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Growth Curve Analysis</h4>
                                            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Actual</span>
                                                <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Projected</span>
                                            </div>
                                        </div>
                                        <div className="h-72">
                                            <ResponsiveContainer width="100%" height="100%">
                                                {(() => {
                                                    const growthChartData = [...selectedAnimal.weightHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(rec => {
                                                        const months = selectedAnimal.dob ? (new Date(rec.date).getTime() - new Date(selectedAnimal.dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44) : 0;
                                                        const initialWt = species === 'CATTLE' ? 35 : 4;
                                                        const monthlyGain = species === 'CATTLE' ? 20 : 3.5;
                                                        return { date: rec.date, actual: rec.weight, projected: Math.round(initialWt + Math.max(0, months * monthlyGain)) };
                                                    });

                                                    return (
                                                        <AreaChart data={growthChartData}>
                                                            <defs>
                                                                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                                                                <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1} /><stop offset="95%" stopColor="#94a3b8" stopOpacity={0} /></linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                                                            <XAxis dataKey="date" hide />
                                                            <YAxis orientation="right" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} tickLine={false} axisLine={false} />
                                                            <Tooltip contentStyle={{ borderRadius: '16px', borderColor: '#f1f1f1', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                                            <Area type="monotone" name="Actual Weight" dataKey="actual" stroke="#10b981" fillOpacity={1} fill="url(#colorActual)" strokeWidth={4} activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                                                            <Area type="monotone" name="Proj. Biological" dataKey="projected" stroke="#94a3b8" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorProj)" strokeWidth={2} />
                                                        </AreaChart>
                                                    );
                                                })()}
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
                                        <h4 className="font-black text-slate-400 text-[10px] uppercase mb-4 tracking-widest flex items-center gap-2"><Sprout size={14} /> CURRENT ASSIGNED DIET PLAN</h4>
                                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                                <Sprout size={24} />
                                            </div>
                                            <div>
                                                <h5 className="font-black text-slate-800 text-lg">{selectedAnimal.serviceDetails?.feedPlan || 'BASIC NUTRITION'}</h5>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Maintenance Ration & Minerals</p>
                                            </div>
                                            <div className="ml-auto flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Est. Daily Intake</p>
                                                    <p className="text-sm font-black text-slate-800">{species === 'CATTLE' ? '12.5 KG' : '2.5 KG'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {isAddingWeight && (
                                        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 animate-slide-up">
                                            <div className="space-y-4">
                                                <div><label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">New Weight (kg)</label><input type="number" className="w-full p-2 rounded-lg border border-emerald-200" value={newWeight.weight} onChange={e => setNewWeight({ ...newWeight, weight: parseFloat(e.target.value) })} /></div>
                                                <div><label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Date</label><input type="date" className="w-full p-2 rounded-lg border border-emerald-200" value={newWeight.date} onChange={e => setNewWeight({ ...newWeight, date: e.target.value })} /></div>
                                                <div className="flex justify-end gap-3 pt-2"><button onClick={() => setIsAddingWeight(false)} className="text-xs font-bold text-gray-400 uppercase">Cancel</button><button onClick={handleSaveWeight} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md uppercase">Save</button></div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                                        <h5 className="font-black text-gray-400 text-[10px] uppercase mb-4 tracking-widest">Weight Log History</h5>
                                        <div className="space-y-4">
                                            {selectedAnimal.weightHistory.slice().reverse().map(rec => (
                                                <div key={rec.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                    <div><p className="text-xs font-black text-gray-800">{rec.date}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{rec.notes || 'Routine Check'}</p></div>
                                                    <div className="text-right"><p className="text-lg font-black text-emerald-600">{rec.weight} <span className="text-[10px] text-gray-400">kg</span></p></div>
                                                </div>
                                            ))}
                                            {selectedAnimal.weightHistory.length === 0 && <p className="text-xs text-gray-400 font-bold uppercase text-center py-4">No logged records</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {detailTab === 'PRODUCTION' && (
                        <div className="p-8 lg:p-12 animate-fade-in">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800">Milk Production Journal</h3>
                                    <p className="text-sm text-gray-400">Monitoring daily dairy yields and efficiency</p>
                                </div>
                                <button onClick={() => setIsAddingMilk(true)} className="bg-sky-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-sky-100"><Plus size={20} /> ADD MILK LOG</button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RechartsLine data={milkData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="quantity" stroke="#0ea5e9" strokeWidth={4} dot={{ r: 4, fill: '#0ea5e9' }} activeDot={{ r: 8 }} />
                                            </RechartsLine>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {isAddingMilk && (
                                        <div className="bg-sky-50 border border-sky-100 rounded-3xl p-6 animate-slide-up">
                                            <div className="space-y-4">
                                                <div><label className="block text-[10px] font-black text-sky-600 uppercase mb-1">Session</label><select className="w-full p-2 rounded-lg border border-sky-200" value={newMilk.session} onChange={e => setNewMilk({ ...newMilk, session: e.target.value as any })}><option value="MORNING">Morning</option><option value="EVENING">Evening</option></select></div>
                                                <div><label className="block text-[10px] font-black text-sky-600 uppercase mb-1">Quantity (Liters)</label><input type="number" step="0.1" className="w-full p-2 rounded-lg border border-sky-200" value={newMilk.quantity} onChange={e => setNewMilk({ ...newMilk, quantity: parseFloat(e.target.value) })} /></div>
                                                <div><label className="block text-[10px] font-black text-sky-600 uppercase mb-1">Fat % (Optional)</label><input type="number" step="0.1" className="w-full p-2 rounded-lg border border-sky-200" value={newMilk.fatContent} onChange={e => setNewMilk({ ...newMilk, fatContent: parseFloat(e.target.value) })} /></div>
                                                <div><label className="block text-[10px] font-black text-sky-600 uppercase mb-1">Date</label><input type="date" className="w-full p-2 rounded-lg border border-sky-200" value={newMilk.date} onChange={e => setNewMilk({ ...newMilk, date: e.target.value })} /></div>
                                                <div className="flex justify-end gap-3 pt-2"><button onClick={() => setIsAddingMilk(false)} className="text-xs font-bold text-gray-400 uppercase">Cancel</button><button onClick={handleSaveMilk} className="bg-sky-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md uppercase">Save</button></div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 max-h-96 overflow-y-auto custom-scrollbar">
                                        <h5 className="font-black text-gray-400 text-[10px] uppercase mb-4 tracking-widest">Milk Yield History</h5>
                                        <div className="space-y-4">
                                            {(selectedAnimal.milkProductionHistory || []).slice().reverse().map(rec => (
                                                <div key={rec.id} className="flex justify-between items-center border-b border-gray-200 pb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg ${rec.session === 'MORNING' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}><Clock size={14} /></div>
                                                        <div><p className="text-xs font-black text-gray-800">{rec.date}</p><p className="text-[9px] text-gray-400 uppercase font-black">{rec.session}</p></div>
                                                    </div>
                                                    <div className="text-right"><p className="text-lg font-black text-sky-600">{rec.quantity} <span className="text-[10px] text-gray-400">L</span></p></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {detailTab === 'BREEDING' && (
                        <div className="p-8 lg:p-12 animate-fade-in">
                            {isLoggingBirth ? (
                                <div className="max-w-2xl mx-auto bg-blue-50 rounded-3xl border border-blue-100 p-8 animate-fade-in shadow-xl shadow-blue-50">
                                    <h3 className="text-2xl font-black text-blue-800 mb-8 flex items-center gap-3 tracking-tighter"><Baby size={32} /> Log {T.birth} Event</h3>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div><label className="block text-[10px] font-black text-blue-700 uppercase mb-1 tracking-widest">Birth Date</label><input type="date" className="w-full p-3 border border-blue-200 rounded-xl" value={birthForm.date} onChange={e => setBirthForm({ ...birthForm, date: e.target.value })} /></div>
                                            <div><label className="block text-[10px] font-black text-blue-700 uppercase mb-1 tracking-widest">Number of {T.offspring}s</label><input type="number" className="w-full p-3 border border-blue-200 rounded-xl" value={birthForm.count} min={1} max={4} onChange={e => { const count = parseInt(e.target.value); const genders: any = Array(count).fill('MALE'); const weights = Array(count).fill(0); setBirthForm({ ...birthForm, count, genders, weights }); }} /></div>
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">{T.offspring} Identification Details</p>
                                            {Array.from({ length: birthForm.count || 0 }).map((_, i) => (
                                                <div key={i} className="grid grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
                                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Gender #{i + 1}</label><select className="w-full p-2 border rounded-lg text-sm font-bold" value={birthForm.genders?.[i]} onChange={e => updateBirthGenders(i, e.target.value as any)}><option value="MALE">Male</option><option value="FEMALE">Female</option></select></div>
                                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Weight (kg)</label><input type="number" className="w-full p-2 border rounded-lg text-sm font-bold" value={birthForm.weights?.[i]} onChange={e => updateBirthWeights(i, parseFloat(e.target.value))} /></div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end gap-6 pt-6 mt-6 border-t border-blue-100">
                                            <button onClick={() => setIsLoggingBirth(null)} className="font-bold text-gray-400 hover:text-gray-600">CANCEL</button>
                                            <button onClick={handleSaveBirth} className="bg-blue-600 text-white px-10 py-3 rounded-xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">CONFIRM BIRTH & REGISTER</button>
                                        </div>
                                    </div>
                                </div>
                            ) : isAddingBreedingRecord ? (
                                <div className="max-w-2xl mx-auto bg-pink-50 rounded-3xl border border-pink-100 p-8 animate-fade-in">
                                    <h3 className="text-2xl font-black text-pink-800 mb-8 flex items-center gap-3 tracking-tighter"><Dna size={32} /> New Insemination / Mating</h3>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div><label className="block text-[10px] font-black text-pink-700 uppercase mb-1 tracking-widest">Insemination Date</label><input type="date" className="w-full p-3 border border-pink-200 rounded-xl" value={newBreedingRecord.date} onChange={e => setNewBreedingRecord({ ...newBreedingRecord, date: e.target.value })} /></div>
                                            <div><label className="block text-[10px] font-black text-pink-700 uppercase mb-1 tracking-widest">Breeder / Source</label><select className="w-full p-3 border border-pink-200 rounded-xl" value={newBreedingRecord.breederId} onChange={e => setNewBreedingRecord({ ...newBreedingRecord, breederId: e.target.value })}><option value="">Internal / Other</option>{breeders.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div><label className="block text-[10px] font-black text-pink-700 uppercase mb-1 tracking-widest">{T.sire} Tag/Name</label><input type="text" className="w-full p-3 border border-pink-200 rounded-xl" value={newBreedingRecord.sireId} onChange={e => setNewBreedingRecord({ ...newBreedingRecord, sireId: e.target.value })} /></div>
                                            <div><label className="block text-[10px] font-black text-pink-700 uppercase mb-1 tracking-widest">{T.sire} Breed</label><input type="text" className="w-full p-3 border border-pink-200 rounded-xl" value={newBreedingRecord.sireBreed} onChange={e => setNewBreedingRecord({ ...newBreedingRecord, sireBreed: e.target.value })} /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div><label className="block text-[10px] font-black text-pink-700 uppercase mb-1 tracking-widest">Straw Batch #</label><input type="text" className="w-full p-3 border border-pink-200 rounded-xl" value={newBreedingRecord.strawBatchId} onChange={e => setNewBreedingRecord({ ...newBreedingRecord, strawBatchId: e.target.value })} /></div>
                                            <div><label className="block text-[10px] font-black text-pink-700 uppercase mb-1 tracking-widest">Cost (PKR)</label><input type="number" className="w-full p-3 border border-pink-200 rounded-xl" value={newBreedingRecord.cost} onChange={e => setNewBreedingRecord({ ...newBreedingRecord, cost: parseFloat(e.target.value) })} /></div>
                                        </div>
                                        <div className="flex justify-end gap-6 pt-6 mt-6 border-t border-pink-100">
                                            <button onClick={() => setIsAddingBreedingRecord(false)} className="font-bold text-gray-400">CANCEL</button>
                                            <button onClick={handleSaveBreedingRecord} className="bg-pink-600 text-white px-10 py-3 rounded-xl font-bold shadow-xl shadow-pink-100">SAVE INSEMINATION</button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="flex justify-between items-center">
                                        <div><h3 className="text-2xl font-black text-gray-800 tracking-tighter">Breeding History</h3><p className="text-sm text-gray-400">Manage pregnancies and calving cycles</p></div>
                                        <button onClick={() => setIsAddingBreedingRecord(true)} className="bg-pink-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-pink-50"><Plus size={20} /> NEW CYCLE</button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                        {selectedAnimal.breedingHistory.slice().reverse().map(rec => (
                                            <div key={rec.id} className={`bg-white rounded-3xl border-2 p-8 shadow-sm transition-all relative overflow-hidden ${rec.status === 'CONFIRMED' ? 'border-blue-200 shadow-blue-50' : rec.status === 'COMPLETED' ? 'border-emerald-100 opacity-90' : 'border-gray-100'}`}>
                                                <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
                                                    <div className="flex-1 space-y-4">
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{rec.date}</span>
                                                            <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${rec.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : rec.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{rec.status}</span>
                                                        </div>
                                                        <h4 className="text-2xl font-black text-gray-800 tracking-tight">{rec.sireId} <span className="text-sm font-bold text-pink-600 ml-2">[{rec.sireBreed}]</span></h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                                                            <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Source</p><p className="text-sm font-black text-gray-700">{breeders.find(b => b.id === rec.breederId)?.name || 'Internal'}</p></div>
                                                            <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Technician</p><p className="text-sm font-black text-gray-700">{rec.technician}</p></div>
                                                            <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Expected {T.birth}</p><p className="text-sm font-black text-emerald-600 tracking-tighter">{rec.expectedBirthDate}</p></div>
                                                            {rec.conceiveDate && <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Confirmed Date</p><p className="text-sm font-black text-blue-600 tracking-tighter">{rec.conceiveDate}</p></div>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {rec.status === 'PENDING' && (
                                                            <div className="flex gap-2">
                                                                <button onClick={() => {
                                                                    if (!confirm("Mark as Not Pregnant (Empty)?")) return;
                                                                    const updated = { ...rec, status: 'FAILED' as const };
                                                                    onUpdateBreedingRecord(selectedAnimal.id, updated);
                                                                }} className="bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl text-xs font-black hover:bg-gray-200 transition-all">PD -</button>
                                                                <button onClick={() => handleConfirmPregnancy(rec.id)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-100 hover:scale-105 transition-all">PD + (CONFIRM)</button>
                                                            </div>
                                                        )}
                                                        {rec.status === 'CONFIRMED' && <button onClick={() => setIsLoggingBirth(rec.id)} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-100 flex items-center gap-2 hover:scale-105 transition-all"><Baby size={16} /> LOG {T.birth.toUpperCase()}</button>}
                                                        {rec.status === 'COMPLETED' && rec.birthRecord && <div className="text-right"><p className="text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-widest">SUCCESSFUL BIRTH</p><p className="text-lg font-black text-gray-800">{rec.birthRecord.count} {T.offspring}(s)</p></div>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {selectedAnimal.breedingHistory.length === 0 && <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100 text-gray-400"><Dna className="mx-auto mb-4 opacity-20" size={60} /><p className="font-black uppercase text-xs tracking-widest">No Breeding Cycles Yet</p></div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
                {renderSalesModal()}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight font-display">{species === 'CATTLE' ? 'Cattle Herd' : 'Goat Flock'} Manager</h2>
                    <p className="text-sm text-slate-500 font-medium">Inventory & Lifecycle Monitoring System</p>
                </div>
                <button onClick={handleOpenAdd} className={`${species === 'GOAT' ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-200' : 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-200'} text-white px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 font-bold transition-all`}><Plus size={20} /> REGISTER {T.animal.toUpperCase()}</button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row gap-4 justify-between items-center premium-card">
                <div className="flex bg-slate-50 p-1.5 rounded-xl overflow-x-auto no-scrollbar max-w-full border border-slate-100">
                    {categories.map((cat) => (
                        <button key={cat} onClick={() => { setActiveCategoryTab(cat); if (isServerPagination && onCategoryChange) onCategoryChange(cat); }} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeCategoryTab === cat ? `bg-white shadow-sm ring-1 ring-slate-200 ${species === 'GOAT' ? 'text-amber-700' : 'text-emerald-700'}` : 'text-slate-400 hover:text-slate-700'}`}>
                            {getCategoryIcon(cat, 16)} {cat.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:max-w-xs group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search Tag or Breed..."
                        value={searchInputValue}
                        onChange={(e) => setSearchInputValue(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-50 outline-none font-medium text-sm transition-all"
                    />
                </div>
            </div>

            {selectedBatchIds.length > 0 && (
                <div className="bg-gray-900 text-white rounded-2xl p-4 flex items-center justify-between animate-slide-up shadow-2xl sticky top-4 z-30">
                    <div className="flex items-center gap-4">
                        <span className="font-black text-emerald-400 text-lg px-4">{selectedBatchIds.length} Selected</span>
                        <div className="h-8 w-px bg-gray-700"></div>
                        <button onClick={async () => {
                            const date = prompt("Vaccination Date (YYYY-MM-DD)", new Date().toISOString().split('T')[0]);
                            const medicine = prompt("Medicine Name");
                            if (date && medicine) {
                                const record: MedicalRecord = { id: Math.random().toString(36).substr(2, 9), date, time: '09:00', type: 'VACCINATION', medicineName: medicine, doctorName: 'Self', cost: 0, notes: 'Bulk Vaccination' };
                                if (onBulkVaccinate) {
                                    await onBulkVaccinate(selectedBatchIds, record);
                                    setSelectedBatchIds([]);
                                    setIsBatchMode(false);
                                } else {
                                    selectedBatchIds.forEach(id => onAddMedicalRecord(id, record));
                                    setSelectedBatchIds([]);
                                    setIsBatchMode(false);
                                }
                            }
                        }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"><Stethoscope size={16} /> VACCINATE</button>

                        <button onClick={async () => {
                            const newLocation = prompt("Enter New Location / Barn Name:");
                            if (newLocation) {
                                if (onBulkMove) {
                                    await onBulkMove(selectedBatchIds, newLocation);
                                    setSelectedBatchIds([]);
                                    setIsBatchMode(false);
                                } else {
                                    selectedBatchIds.forEach(id => {
                                        const animal = livestock.find(l => l.id === id);
                                        if (animal) onUpdateLivestock({ ...animal, location: newLocation });
                                    });
                                    setSelectedBatchIds([]);
                                    setIsBatchMode(false);
                                }
                            }
                        }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"><MapPin size={16} /> BULK MOVE</button>

                        <button onClick={() => {
                            setIsSelling(true);
                        }} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"><DollarSign size={16} /> BULK SELL</button>
                    </div>
                    <button onClick={() => { setSelectedBatchIds([]); setIsBatchMode(false); }} className="text-gray-400 hover:text-white font-bold text-xs">CANCEL SELECTION</button>
                </div>
            )}

            <div className="flex justify-between px-2 mb-4 items-center">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setViewLayout('GRID')} className={`p-2 rounded-lg transition-all ${viewLayout === 'GRID' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={18} /></button>
                    <button onClick={() => setViewLayout('TABLE')} className={`p-2 rounded-lg transition-all ${viewLayout === 'TABLE' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}><List size={18} /></button>
                </div>
                <button onClick={() => setIsBatchMode(!isBatchMode)} className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${isBatchMode ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>{isBatchMode ? 'EXIT BATCH MODE' : 'ENABLE BATCH ACTIONS'}</button>
            </div>

            {viewLayout === 'GRID' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedLivestock.map((animal) => {
                        const isGoat = species === 'GOAT';
                        const themeText = isGoat ? 'text-amber-600' : 'text-emerald-600';
                        const hoverBorder = isGoat ? 'hover:border-amber-300' : 'hover:border-emerald-300';
                        const lookupList = allLivestock && allLivestock.length > 0 ? allLivestock : livestock;
                        const kids = lookupList.filter(l => l.damId === animal.id || l.sireId === animal.id);
                        const dam = animal.damId ? (allLivestock && allLivestock.length > 0 ? allLivestock : livestock).find(l => l.id === animal.damId) : null;
                        const sire = animal.sireId ? livestock.find(l => l.id === animal.sireId) : null;
                        const badges = getBadges(animal);

                        return (
                            <div key={animal.id} onClick={() => {
                                if (isBatchMode) {
                                    setSelectedBatchIds(prev => prev.includes(animal.id) ? prev.filter(id => id !== animal.id) : [...prev, animal.id]);
                                } else {
                                    setSelectedAnimalId(animal.id); setCurrentView('DETAILS'); setDetailTab('INFO');
                                }
                            }} className={`bg-white rounded-[2rem] border overflow-hidden premium-card cursor-pointer group relative transition-all duration-300 ${isBatchMode && selectedBatchIds.includes(animal.id) ? (isGoat ? 'border-4 border-amber-500 bg-amber-50' : 'border-4 border-emerald-500 bg-emerald-50') : `border-slate-100 shadow-sm ${hoverBorder} hover:shadow-xl hover:-translate-y-1`}`}>
                                <div className="p-6 relative">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex gap-4 items-center">
                                            <div className="relative">
                                                <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-slate-50 group-hover:scale-105 transition-transform duration-300 z-10 relative`}>
                                                    {animal.imageUrl ? <img src={animal.imageUrl} className="w-full h-full object-cover" /> : getPlaceholderVisual(animal.category)}
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className={`font-black text-slate-800 text-xl tracking-tight group-hover:${themeText} transition-colors flex items-center gap-2`}>
                                                    {animal.tagId}
                                                </h3>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{animal.breed} <span className="opacity-50 mx-1">•</span> {animal.gender}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); if (!confirm(`Remove ${animal.tagId}?`)) return; onDeleteLivestock(animal.id); }} className="p-2 rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100" title="Delete"><Trash2 size={16} /></button>
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getStatusColor(animal.status)} shadow-sm`}>{animal.status}</span>
                                        </div>
                                    </div>

                                    {badges.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {badges.map((b, i) => <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded border ${b.color}`}>{b.text}</span>)}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mb-4">
                                        <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weight</span><span className="font-black text-slate-700 text-sm flex items-center gap-1.5"><Scale size={14} className={themeText} /> {animal.weight} KG</span></div>
                                        <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Age</span><span className="font-black text-slate-700 text-sm flex items-center gap-1.5"><Calendar size={14} className={themeText} /> {getAgeDisplay(animal.dob)}</span></div>
                                    </div>

                                    {(dam || sire) && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {dam && <div className="flex items-center gap-1.5 bg-pink-50 text-pink-700 px-3 py-1 rounded-full text-[10px] font-bold border border-pink-100"><User size={12} /> Dam: {dam.tagId}</div>}
                                            {sire && <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-100"><User size={12} /> Sire: {sire.tagId}</div>}
                                        </div>
                                    )}

                                    {kids.length > 0 && (
                                        <div className={`pt-4 border-t ${isGoat ? 'border-amber-100/50' : 'border-emerald-100/50'} mt-2`}>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between items-center">
                                                <span>Registered {isGoat ? 'Kids' : 'Calves'} ({kids.length})</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {kids.slice(0, 3).map(k => (
                                                    <div key={k.id} className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1 border ${isGoat ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}><Baby size={10} /> {k.tagId}</div>
                                                ))}
                                                {kids.length > 3 && <div className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded shadow-sm border border-slate-200">+{kids.length - 3} more</div>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className={`px-6 py-4 border-t border-slate-100 flex justify-between items-center transition-colors ${isGoat ? 'bg-amber-50/50 group-hover:bg-amber-100' : 'bg-emerald-50/50 group-hover:bg-emerald-100'}`}>
                                    <span className={`text-[10px] font-black tracking-widest uppercase transition-colors ${isGoat ? 'text-amber-500 group-hover:text-amber-700' : 'text-emerald-500 group-hover:text-emerald-700'}`}>View Full Profile & Lineage</span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isGoat ? 'bg-amber-200 text-amber-700 group-hover:bg-amber-500 group-hover:text-white' : 'bg-emerald-200 text-emerald-700 group-hover:bg-emerald-500 group-hover:text-white'} transition-all duration-300 shadow-sm`}><ChevronRight size={16} className={`group-hover:translate-x-0.5 transition-transform`} /></div>
                                </div>
                            </div>
                        );
                    })}
                    {sortedLivestock.length === 0 && (
                        <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-gray-100 shadow-sm border-dashed">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100"><Search size={32} className="text-gray-200" /></div>
                            <h4 className="text-lg font-black text-gray-800 tracking-tight">No Animals Found</h4>
                            <p className="text-sm text-gray-400 max-w-xs mx-auto">We couldn't find any {species.toLowerCase()} matching your search in the "{activeCategoryTab}" category.</p>
                        </div>
                    )}
                    {isServerPagination && pagination && pagination.totalPages > 0 && (
                        <div className="col-span-full flex items-center justify-between px-4 py-3 mt-4 rounded-2xl bg-slate-50 border border-slate-200">
                            <p className="text-xs font-bold text-slate-500">Showing {pagination.size * pagination.page + 1}–{Math.min(pagination.size * (pagination.page + 1), pagination.totalElements)} of {pagination.totalElements}</p>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => onPageChange?.(pagination.page - 1)} disabled={pagination.page <= 0} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed">Prev</button>
                                <span className="text-sm font-bold text-slate-600">Page {pagination.page + 1} of {pagination.totalPages}</span>
                                <button type="button" onClick={() => onPageChange?.(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages - 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in premium-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    {isBatchMode && <th className="p-4 w-12 text-center">Sel</th>}
                                    <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('tagId')}>Tag ID <ArrowUpDown size={12} className="inline ml-1 text-slate-300" /></th>
                                    <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('breed')}>Details <ArrowUpDown size={12} className="inline ml-1 text-slate-300" /></th>
                                    <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>Status <ArrowUpDown size={12} className="inline ml-1 text-slate-300" /></th>
                                    <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('weight')}>Vitals <ArrowUpDown size={12} className="inline ml-1 text-slate-300" /></th>
                                    <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('cost')}>Cost (PKR) <ArrowUpDown size={12} className="inline ml-1 text-slate-300" /></th>
                                    <th className="p-4 w-48">Alerts & Health</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedLivestock.map(animal => {
                                    const badges = getBadges(animal);
                                    const cost = (animal.purchasePrice || 0) + (animal.accumulatedFeedCost || 0) + (animal.accumulatedMedicalCost || 0);
                                    const isSelected = selectedBatchIds.includes(animal.id);

                                    return (
                                        <tr key={animal.id} onClick={() => {
                                            if (isBatchMode) {
                                                setSelectedBatchIds(prev => prev.includes(animal.id) ? prev.filter(id => id !== animal.id) : [...prev, animal.id]);
                                            } else {
                                                setSelectedAnimalId(animal.id); setCurrentView('DETAILS'); setDetailTab('INFO');
                                            }
                                        }} className={`border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50/50' : ''}`}>
                                            {isBatchMode && (
                                                <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input type="checkbox" checked={isSelected} onChange={() => setSelectedBatchIds(prev => prev.includes(animal.id) ? prev.filter(id => id !== animal.id) : [...prev, animal.id])} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                                                </td>
                                            )}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                                        {animal.imageUrl ? <img src={animal.imageUrl} className="w-full h-full object-cover" /> : getPlaceholderVisual(animal.category)}
                                                    </div>
                                                    <span className="font-extrabold text-slate-800 text-sm">{animal.tagId}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-bold text-slate-700 text-xs">{animal.breed}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-wider">{animal.gender} · {animal.category}</p>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${getStatusColor(animal.status)}`}>{animal.status}</span>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-bold text-slate-700 text-xs">{animal.weight} KG</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-wider">{getAgeDisplay(animal.dob)}</p>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-black text-emerald-700 text-xs">{Math.round(cost).toLocaleString()}</p>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1.5 maxWidth-[180px]">
                                                    {badges.map((b, i) => <span key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${b.color}`}>{b.text}</span>)}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${animal.tagId}?`)) onDeleteLivestock(animal.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {sortedLivestock.length === 0 && (
                                    <tr><td colSpan={8} className="p-16 text-center text-slate-400 font-bold">No animals found matching your criteria.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {isServerPagination && pagination && pagination.totalPages > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                            <p className="text-xs font-bold text-slate-500">
                                Showing {pagination.size * pagination.page + 1}–{Math.min(pagination.size * (pagination.page + 1), pagination.totalElements)} of {pagination.totalElements}
                            </p>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => onPageChange?.(pagination.page - 1)} disabled={pagination.page <= 0} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed">Prev</button>
                                <span className="text-sm font-bold text-slate-600">Page {pagination.page + 1} of {pagination.totalPages}</span>
                                <button type="button" onClick={() => onPageChange?.(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages - 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {renderSalesModal()}

            {/* Mobile FAB */}
            <button
                onClick={handleOpenAdd}
                className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center md:hidden z-50 hover:scale-110 transition-transform"
            >
                <Plus size={28} />
            </button>
        </div>
    );
};
