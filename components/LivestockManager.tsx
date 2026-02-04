
import React, { useState } from 'react';
import { Livestock, LivestockSpecies, LivestockStatus, MedicalRecord, MedicalRecordType, InseminationRecord, WeightRecord, ServiceDetails, MilkRecord, Breeder, BirthRecord } from '../types';
import { COMMON_VACCINES, FEED_PLANS } from '../constants';
import { Search, Plus, Tag, Scale, Settings, ArrowLeft, Save, Calendar, MapPin, Eye, Stethoscope, Dna, User, Phone, ScrollText, LineChart, Image as ImageIcon, Upload, Edit2, Milk, Droplets, Beef, Sprout, FileText, CheckCircle2, Baby, Info, Trash2, Clock, ChevronRight } from 'lucide-react';
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Props {
    livestock: Livestock[];
    breeders: Breeder[];
    species: LivestockSpecies;
    categories: string[];
    onAddLivestock: (c: Livestock) => void;
    onUpdateLivestock: (c: Livestock) => void;
    onDeleteLivestock: (id: string) => void | Promise<void>;
    onAddMedicalRecord: (animalId: string, record: MedicalRecord) => void;
    onAddBreedingRecord: (animalId: string, record: InseminationRecord) => void;
    onAddWeightRecord: (animalId: string, record: WeightRecord) => void;
    onAddMilkRecord: (animalId: string, record: MilkRecord) => void;
    onUpdateBreedingRecord: (animalId: string, record: InseminationRecord) => void;
}

type ViewMode = 'LIST' | 'ANIMAL_FORM' | 'DETAILS';

export const LivestockManager: React.FC<Props> = ({ livestock, breeders, species, categories, onAddLivestock, onUpdateLivestock, onDeleteLivestock, onAddMedicalRecord, onAddBreedingRecord, onAddWeightRecord, onAddMilkRecord, onUpdateBreedingRecord }) => {
    const T = {
        animal: species === 'CATTLE' ? 'Animal' : 'Goat',
        sire: species === 'CATTLE' ? 'Bull' : 'Buck',
        offspring: species === 'CATTLE' ? 'Calf' : 'Kid',
        birth: species === 'CATTLE' ? 'Calving' : 'Kidding',
        gestationDays: species === 'CATTLE' ? 283 : 150,
        offspringTag: species === 'CATTLE' ? 'CLF' : 'KID',
        tagPlaceholder: species === 'CATTLE' ? 'EX: BR-101' : 'EX: GT-001',
        breedPlaceholder: species === 'CATTLE' ? 'e.g. Angus, Holstein, Sahiwal' : 'e.g. Saanen, Beetal, Kamori, Dera Din Panah',
        locationPlaceholder: species === 'CATTLE' ? 'Barn A' : 'Goat Shed A',
    };

    const [currentView, setCurrentView] = useState<ViewMode>('LIST');
    const [activeCategoryTab, setActiveCategoryTab] = useState<string>(categories[0]);
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);

    // Derive selectedAnimal from props to ensure it's always up to date
    const selectedAnimal = livestock.find(l => l.id === selectedAnimalId) || null;
    const [isEditing, setIsEditing] = useState(false);
    const [detailTab, setDetailTab] = useState<'INFO' | 'MEDICAL' | 'BREEDING' | 'WEIGHT' | 'PRODUCTION'>('INFO');

    const [isAddingHealthRecord, setIsAddingHealthRecord] = useState(false);
    const [isAddingBreedingRecord, setIsAddingBreedingRecord] = useState(false);
    const [isLoggingBirth, setIsLoggingBirth] = useState<string | null>(null);
    const [isAddingWeight, setIsAddingWeight] = useState(false);
    const [isAddingMilk, setIsAddingMilk] = useState(false);
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

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
    const [calfDetails, setCalfDetails] = useState({ gender: 'FEMALE', weight: 15, ageMonths: 1, name: '' });

    const handleOpenAdd = () => {
        setAnimalForm({
            tagId: '', category: categories[0], breed: '', gender: 'MALE', weight: 0, dob: '', purchaseDate: '', purchasePrice: 0, status: 'ACTIVE', location: '', notes: '', imageUrl: '', medicalHistory: [], breedingHistory: [], weightHistory: [], milkProductionHistory: [],
            serviceDetails: { feedPlan: 'BASIC', monthlyFee: 0, specialInstructions: '' }
        });
        setIsPregnantEntry(false);
        setIsAddingCalfEntry(false);
        setCalfDetails({ gender: 'FEMALE', weight: 15, ageMonths: 1, name: '' });
        setIsEditing(false);
        setCurrentView('ANIMAL_FORM');
    };

    const filteredLivestock = livestock.filter(
        (c) =>
            c.species === species &&
            c.category === activeCategoryTab &&
            (c.tagId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.breed.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
        onAddMedicalRecord(selectedAnimal.id, {
            id: Math.random().toString(36).substr(2, 9),
            date: newHealthRecord.date!,
            time: newHealthRecord.time!,
            type: newHealthRecord.type!,
            medicineName: newHealthRecord.medicineName!,
            doctorName: newHealthRecord.doctorName!,
            cost: Number(newHealthRecord.cost),
            notes: newHealthRecord.notes!,
            nextDueDate: newHealthRecord.nextDueDate,
            imageUrl: newHealthRecord.imageUrl
        });
        setIsAddingHealthRecord(false);
        setNewHealthRecord({ type: 'VACCINATION', date: new Date().toISOString().split('T')[0], medicineName: '', doctorName: '', cost: 0 });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'ANIMAL' | 'HEALTH' | 'BREEDING') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (target === 'ANIMAL') setAnimalForm({ ...animalForm, imageUrl: reader.result as string });
                if (target === 'HEALTH') setNewHealthRecord({ ...newHealthRecord, imageUrl: reader.result as string });
                if (target === 'BREEDING') setNewBreedingRecord({ ...newBreedingRecord, imageUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
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
                                <div className="w-40 h-40 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-emerald-400 transition-all">
                                    {animalForm.imageUrl ? <img src={animalForm.imageUrl} className="w-full h-full object-cover" /> : getPlaceholderVisual(animalForm.category || 'Meat')}
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'ANIMAL')} />
                                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload className="text-white" size={32} />
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tag ID *</label>
                                        <input type="text" value={animalForm.tagId} onChange={e => setAnimalForm({ ...animalForm, tagId: e.target.value })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none font-bold text-lg" placeholder={T.tagPlaceholder} />
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
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Breed</label>
                                    <input type="text" value={animalForm.breed} onChange={e => setAnimalForm({ ...animalForm, breed: e.target.value })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none" placeholder={T.breedPlaceholder} />
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
                                    <input type="text" value={animalForm.location} onChange={e => setAnimalForm({ ...animalForm, location: e.target.value })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none" placeholder={T.locationPlaceholder} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DOB</label>
                                    <input type="date" value={animalForm.dob} onChange={e => setAnimalForm({ ...animalForm, dob: e.target.value })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Purchase Date</label>
                                    <input type="date" value={animalForm.purchaseDate} onChange={e => setAnimalForm({ ...animalForm, purchaseDate: e.target.value })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Purchase Price (PKR)</label>
                                <input type="number" value={animalForm.purchasePrice} onChange={e => setAnimalForm({ ...animalForm, purchasePrice: parseFloat(e.target.value) })} className="w-full border-b-2 border-gray-100 focus:border-emerald-500 py-2 outline-none" />
                            </div>
                        </div>

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
                                            <input type="checkbox" checked={isAddingCalfEntry} onChange={e => setIsAddingCalfEntry(e.target.checked)} className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300" />
                                            <span className="font-bold text-gray-700">Add {T.offspring} with Mother?</span>
                                        </label>
                                        {isAddingCalfEntry && (
                                            <div className="pl-8 space-y-3 animate-fade-in">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                                                        <select value={calfDetails.gender} onChange={e => setCalfDetails({ ...calfDetails, gender: e.target.value })} className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-2 outline-none text-sm">
                                                            <option value="MALE">Male</option>
                                                            <option value="FEMALE">Female</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age (Months)</label>
                                                        <input type="number" value={calfDetails.ageMonths} onChange={e => setCalfDetails({ ...calfDetails, ageMonths: parseFloat(e.target.value) })} className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-2 outline-none text-sm" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{T.offspring} Name/Tag (Optional)</label>
                                                    <input type="text" value={calfDetails.name} onChange={e => setCalfDetails({ ...calfDetails, name: e.target.value })} placeholder={`Auto: ${animalForm.tagId}-${T.offspringTag}-1`} className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 outline-none text-sm" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-12 flex justify-end gap-6">
                        <button onClick={() => setCurrentView('LIST')} className="font-bold text-gray-400 hover:text-gray-600">CANCEL</button>
                        <button onClick={() => {
                            if (!animalForm.tagId) return alert("Tag ID Required");

                            // 1. Save Mother
                            const motherId = isEditing ? selectedAnimal!.id : Math.random().toString(36).substr(2, 9);
                            const finalMother = { ...animalForm, id: motherId, species } as Livestock;
                            isEditing ? onUpdateLivestock(finalMother) : onAddLivestock(finalMother);

                            // 2. Add Pregnancy Record if checked (only for new mothers usually, or edits)
                            if (isPregnantEntry && animalForm.gender === 'FEMALE') {
                                const breedingRec: InseminationRecord = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    date: pregnantDate,
                                    sireId: 'Unknown',
                                    sireBreed: 'Unknown',
                                    breederId: 'Self',
                                    strawBatchId: '',
                                    technician: 'Self',
                                    status: 'CONFIRMED',
                                    expectedBirthDate: new Date(new Date(pregnantDate).getTime() + (T.gestationDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                                    cost: 0
                                };
                                onAddBreedingRecord(motherId, breedingRec);
                            }

                            // 3. Add Calf if checked
                            if (isAddingCalfEntry && animalForm.gender === 'FEMALE') {
                                const calfDob = new Date();
                                calfDob.setMonth(calfDob.getMonth() - calfDetails.ageMonths);

                                const calf: Livestock = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    tagId: calfDetails.name || `${animalForm.tagId}-${T.offspringTag}-1`,
                                    species: species,
                                    category: 'Calf', // Generic
                                    breed: animalForm.breed,
                                    gender: calfDetails.gender as any,
                                    weight: calfDetails.weight,
                                    dob: calfDob.toISOString().split('T')[0],
                                    status: 'ACTIVE',
                                    damId: motherId,
                                    location: animalForm.location,
                                    purchaseDate: animalForm.purchaseDate,
                                    purchasePrice: 0,
                                    notes: `Auto-added with mother ${animalForm.tagId}`,
                                    medicalHistory: [], breedingHistory: [], weightHistory: [], milkProductionHistory: []
                                };
                                onAddLivestock(calf);
                            }

                            setCurrentView('LIST');
                        }} className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">SAVE RECORD</button>
                    </div>
                </div>
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
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-xl">
                            {selectedAnimal.imageUrl ? <img src={selectedAnimal.imageUrl} className="w-full h-full object-cover" /> : getPlaceholderVisual(selectedAnimal.category)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-3xl font-black text-gray-800 tracking-tighter">{selectedAnimal.tagId}</h2>
                                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(selectedAnimal.status)}`}>{selectedAnimal.status}</span>
                            </div>
                            <p className="text-gray-500 font-medium">{selectedAnimal.breed} • {selectedAnimal.category} {species.toLowerCase()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setAnimalForm({ ...selectedAnimal }); setIsEditing(true); setCurrentView('ANIMAL_FORM'); }} className="bg-white px-6 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2">
                            <Edit2 size={18} /> EDIT PROFILE
                        </button>
                        <button
                            onClick={async () => {
                                if (!confirm(`Remove ${selectedAnimal.tagId} from records? This cannot be undone.`)) return;
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

                <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-gray-200 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'INFO', label: 'OVERVIEW', icon: Info },
                        { id: 'MEDICAL', label: 'HEALTH LOG', icon: Stethoscope },
                        { id: 'WEIGHT', label: 'WEIGHT HISTORY', icon: Scale },
                        { id: 'BREEDING', label: 'REPRODUCTION', icon: Dna, hide: selectedAnimal.gender !== 'FEMALE' },
                        { id: 'PRODUCTION', label: 'MILK RECORDS', icon: Droplets, hide: selectedAnimal.category !== 'Dairy' }
                    ].filter(t => !t.hide).map(tab => (
                        <button key={tab.id} onClick={() => setDetailTab(tab.id as any)} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap ${detailTab === tab.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
                            <tab.icon size={16} /> {tab.label}
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
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                                            <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Current Weight</p><p className="text-xl font-black text-gray-800">{selectedAnimal.weight} kg</p></div>
                                            <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Age</p><p className="text-xl font-black text-gray-800">{getAgeDisplay(selectedAnimal.dob)}</p></div>
                                            <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Entry Price</p><p className="text-xl font-black text-emerald-600">PKR {selectedAnimal.purchasePrice?.toLocaleString()}</p></div>
                                            <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Location</p><p className="text-xl font-black text-gray-800">{selectedAnimal.location}</p></div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                        <h5 className="font-black text-gray-800 mb-6 flex items-center gap-2"><ScrollText size={18} className="text-emerald-600" /> Pedigree Tree</h5>
                                        <div className="flex items-center gap-12 justify-center py-6">
                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 border-2 border-white shadow-md mx-auto mb-2"><User size={24} /></div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Dam (Mother)</p>
                                                <p className="font-bold text-gray-800">{livestock.find(l => l.id === selectedAnimal.damId)?.tagId || 'Unknown'}</p>
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
                                        <div><label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Type</label><select className="w-full p-2 rounded-lg border border-emerald-200" value={newHealthRecord.type} onChange={e => setNewHealthRecord({ ...newHealthRecord, type: e.target.value as any })}><option value="VACCINATION">Vaccination</option><option value="TREATMENT">Treatment</option><option value="CHECKUP">General Checkup</option><option value="INJURY">Injury Care</option><option value="HEAT">Heat Detection</option><option value="OTHER">Other</option></select></div>
                                        <div><label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Medicine/Treatment</label><input type="text" className="w-full p-2 rounded-lg border border-emerald-200" value={newHealthRecord.medicineName} onChange={e => setNewHealthRecord({ ...newHealthRecord, medicineName: e.target.value })} placeholder="Penicillin, Vaccine X..." /></div>
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
                                            <p className="text-lg font-black text-gray-800">PKR {rec.cost.toLocaleString()}</p>
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
                                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={weightData}>
                                                <defs><linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="weight" stroke="#10b981" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={4} />
                                            </AreaChart>
                                        </ResponsiveContainer>
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
                                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 max-h-96 overflow-y-auto custom-scrollbar">
                                        <h5 className="font-black text-gray-400 text-[10px] uppercase mb-4 tracking-widest">Weight Log History</h5>
                                        <div className="space-y-4">
                                            {selectedAnimal.weightHistory.slice().reverse().map(rec => (
                                                <div key={rec.id} className="flex justify-between items-center border-b border-gray-200 pb-3">
                                                    <div><p className="text-xs font-black text-gray-800">{rec.date}</p><p className="text-[10px] text-gray-400">{rec.notes || 'Routine weigh'}</p></div>
                                                    <div className="text-right"><p className="text-lg font-black text-emerald-600">{rec.weight} <span className="text-[10px] text-gray-400">kg</span></p></div>
                                                </div>
                                            ))}
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
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tighter">{species === 'CATTLE' ? 'Cattle Herd' : 'Goat Flock'} Manager</h2>
                    <p className="text-sm text-gray-500 font-medium">Inventory & Lifecycle Monitoring System</p>
                </div>
                <button onClick={handleOpenAdd} className={`${species === 'GOAT' ? 'bg-amber-600 shadow-amber-100 hover:bg-amber-700' : 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700'} text-white px-6 py-3 rounded-2xl flex items-center gap-2 shadow-xl font-bold transition-all`}><Plus size={20} /> REGISTER {T.animal.toUpperCase()}</button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="flex bg-gray-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar max-w-full">
                    {categories.map((cat) => (
                        <button key={cat} onClick={() => setActiveCategoryTab(cat)} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeCategoryTab === cat ? `bg-white shadow-sm ${species === 'GOAT' ? 'text-amber-700' : 'text-emerald-700'}` : 'text-gray-500 hover:text-gray-900'}`}>
                            {getCategoryIcon(cat, 16)} {cat.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Search Tag or Breed..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm" />
                </div>
            </div>

            {selectedBatchIds.length > 0 && (
                <div className="bg-gray-900 text-white rounded-2xl p-4 flex items-center justify-between animate-slide-up shadow-2xl sticky top-4 z-30">
                    <div className="flex items-center gap-4">
                        <span className="font-black text-emerald-400 text-lg px-4">{selectedBatchIds.length} Selected</span>
                        <div className="h-8 w-px bg-gray-700"></div>
                        <button onClick={() => {
                            const date = prompt("Vaccination Date (YYYY-MM-DD)", new Date().toISOString().split('T')[0]);
                            const medicine = prompt("Medicine Name");
                            if (date && medicine) {
                                selectedBatchIds.forEach(id => onAddMedicalRecord(id, {
                                    id: Math.random().toString(36).substr(2, 9),
                                    date, time: '09:00', type: 'VACCINATION', medicineName: medicine, doctorName: 'Self', cost: 0, notes: 'Bulk Vaccination'
                                }));
                                alert("Records Added");
                                setSelectedBatchIds([]);
                                setIsBatchMode(false);
                            }
                        }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"><Stethoscope size={16} /> VACCINATE</button>
                    </div>
                    <button onClick={() => { setSelectedBatchIds([]); setIsBatchMode(false); }} className="text-gray-400 hover:text-white font-bold text-xs">CANCEL SELECTION</button>
                </div>
            )}

            <div className="flex justify-end px-2 mb-4">
                <button onClick={() => setIsBatchMode(!isBatchMode)} className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${isBatchMode ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>{isBatchMode ? 'EXIT BATCH MODE' : 'ENABLE BATCH ACTIONS'}</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredLivestock.map((animal) => (
                    <div key={animal.id} onClick={() => {
                        if (isBatchMode) {
                            setSelectedBatchIds(prev => prev.includes(animal.id) ? prev.filter(id => id !== animal.id) : [...prev, animal.id]);
                        } else {
                            setSelectedAnimalId(animal.id); setCurrentView('DETAILS'); setDetailTab('INFO');
                        }
                    }} className={`bg-white rounded-3xl border overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group relative ${isBatchMode && selectedBatchIds.includes(animal.id) ? 'border-4 border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100' : 'border-gray-100'}`}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-gray-50">
                                        {animal.imageUrl ? <img src={animal.imageUrl} className="w-full h-full object-cover" /> : getPlaceholderVisual(animal.category)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-800 text-xl tracking-tight">{animal.tagId}</h3>
                                        <p className="text-xs font-bold text-gray-400 uppercase">{animal.breed}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!confirm(`Remove ${animal.tagId} from records?`)) return;
                                            onDeleteLivestock(animal.id);
                                        }}
                                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(animal.status)} shadow-sm`}>{animal.status}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-y-4 text-xs">
                                <div className={`flex items-center gap-2 font-black text-gray-600 uppercase tracking-tighter`}><Scale size={16} className={species === 'GOAT' ? 'text-amber-500' : 'text-emerald-500'} /> {animal.weight} KG</div>
                                <div className={`flex items-center gap-2 font-black text-gray-600 uppercase tracking-tighter`}><Calendar size={16} className={species === 'GOAT' ? 'text-amber-500' : 'text-emerald-500'} /> {animal.dob}</div>
                                {animal.damId && <div className="col-span-2 flex items-center gap-2 font-black text-pink-600 uppercase tracking-tighter"><Baby size={16} /> Mother: {livestock.find(l => l.id === animal.damId)?.tagId || 'Unknown'}</div>}
                            </div>
                        </div>
                        <div className={`bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center transition-colors ${species === 'GOAT' ? 'group-hover:bg-amber-600' : 'group-hover:bg-emerald-600'}`}>
                            <span className="text-[10px] font-black text-gray-400 tracking-widest group-hover:text-white uppercase">Open Records</span>
                            <ChevronRight size={18} className="text-gray-300 group-hover:text-white" />
                        </div>
                    </div>
                ))}
                {filteredLivestock.length === 0 && (
                    <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-gray-100 shadow-sm border-dashed">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100"><Search size={32} className="text-gray-200" /></div>
                        <h4 className="text-lg font-black text-gray-800 tracking-tight">No Animals Found</h4>
                        <p className="text-sm text-gray-400 max-w-xs mx-auto">We couldn't find any {species.toLowerCase()} matching your search in the "{activeCategoryTab}" category.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
