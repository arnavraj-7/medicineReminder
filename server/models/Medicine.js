import mongoose from 'mongoose';

const HistorySchema = new mongoose.Schema({
    timestamp: { 
        type: Date, 
        required: true,
        default: Date.now
    },
    status: { 
        type: String, 
        enum: ['taken', 'skipped'], 
        required: true 
    }
});

const MedicineSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    dosage: {
        type: String,
        required: true,
        trim: true
    },
    frequency: {
        type: String,
        required: true,
    },
    times: [{
        type: String,
        required: true,
    }],
    foodTiming: {
        type: String,
        enum: ['before', 'after', 'with', 'anytime'],
        default: 'anytime'
    },
    description: {
        type: String,
        trim: true
    },
    history: [HistorySchema],
}, {
    timestamps: true
});

export default mongoose.model('Medicine', MedicineSchema);