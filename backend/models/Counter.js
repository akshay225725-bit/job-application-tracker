const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
    companyPrefix: {
        type: String,
        required: true,
        unique: true
    },

    sequence: {
        type: Number,
        required: true,
        default: 0
    }
});

module.exports = mongoose.model("Counter", counterSchema);