const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventName: { type: String, required: true },
    category: { type: String, required: true },
    organizationName: { type: String, required: true },
    organizerName: { type: String, required: true },
    organizerEmail: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    latitude: { type: String },
    longitude: { type: String },
    googleFormLink: { type: String },
    
    date: { type: String, required: true },
    time: { type: String, required: true },

    // TTL Index Field for Auto-Deletion
    eventDateTime: { 
        type: Date, 
        required: true, 
        index: { expireAfterSeconds: 60 } 
    },

    imagePath: { type: String, required: true },
    brochurePath: { type: String, required: true },
    
    // Link Event to User
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }
}, {
    timestamps: true,
    collection: 'Events'
});

module.exports = mongoose.model('Event', eventSchema);