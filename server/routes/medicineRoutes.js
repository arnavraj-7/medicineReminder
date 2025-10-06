import express from 'express';

import { 
    getAllMedicines,
    getMedicineById,
    addMedicine,
    updateMedicine,
    updateMedicineHistory,
    deleteMedicine
} from '../controllers/medicineController.js';

const router = express.Router();


// Define routes with their handlers
router.get('/', getAllMedicines);
router.get('/:id', getMedicineById);
router.post('/', addMedicine);
router.put('/:id', updateMedicine);
router.post('/history/:id', updateMedicineHistory);
router.delete('/:id', deleteMedicine);

export default router;