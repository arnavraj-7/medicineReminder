import Medicine from '../models/Medicine.js';

// Get all medicines for a user
export const getAllMedicines = async (req, res) => {
    try {
        const medicines = await Medicine.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(medicines);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get a single medicine by ID
export const getMedicineById = async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        
        if (!medicine) {
            return res.status(404).json({ msg: 'Medicine not found' });
        }
        
        if (medicine.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        
        res.json(medicine);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Medicine not found' });
        }
        res.status(500).send('Server Error');
    }
};

// Add a new medicine
export const addMedicine = async (req, res) => {
    const { name, dosage, frequency, times, foodTiming, description } = req.body;
    
    try {
        const newMedicine = new Medicine({
            user: req.user.id,
            name,
            dosage,
            frequency,
            times,
            foodTiming,
            description,
            history: []
        });
        
        const medicine = await newMedicine.save();
        res.json(medicine);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Update a medicine
export const updateMedicine = async (req, res) => {
    const { name, dosage, frequency, times, foodTiming, description } = req.body;
    
    try {
        let medicine = await Medicine.findById(req.params.id);
        
        if (!medicine) {
            return res.status(404).json({ msg: 'Medicine not found' });
        }
        
        if (medicine.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        
        // Update fields
        medicine.name = name || medicine.name;
        medicine.dosage = dosage || medicine.dosage;
        medicine.frequency = frequency || medicine.frequency;
        medicine.times = times || medicine.times;
        medicine.foodTiming = foodTiming !== undefined ? foodTiming : medicine.foodTiming;
        medicine.description = description !== undefined ? description : medicine.description;
        
        await medicine.save();
        res.json(medicine);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Update medicine history (mark as taken or skipped)
export const updateMedicineHistory = async (req, res) => {
    const { status } = req.body;
    
    try {
        const medicine = await Medicine.findById(req.params.id);
        
        if (!medicine) {
            return res.status(404).json({ msg: 'Medicine not found' });
        }
        
        if (medicine.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        
        if (!['taken', 'skipped'].includes(status)) {
            return res.status(400).json({ msg: 'Invalid status. Must be "taken" or "skipped"' });
        }
        
        medicine.history.push({ 
            timestamp: new Date(), 
            status: status 
        });
        
        await medicine.save();
        res.json(medicine);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Delete a medicine
export const deleteMedicine = async (req, res) => {
    try {
        let medicine = await Medicine.findById(req.params.id);
        
        if (!medicine) {
            return res.status(404).json({ msg: 'Medicine not found' });
        }

        if (medicine.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await Medicine.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Medicine removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};