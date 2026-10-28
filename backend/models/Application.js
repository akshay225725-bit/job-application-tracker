const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: [
                "Applied",
                "Interview",
                "Offer",
                "Rejected",
                "Accepted",
                "Declined"
            ],
            required: true
        },
        date: {
            type: Date,
            required: true,
            default: Date.now
        }
    },
    { _id: false }
);

const applicationSchema = new mongoose.Schema(
    {
        applicationId: {
            type: String,
            required: true,
            unique: true,
            immutable: true
        },

        companyName: {
            type: String,
            required: true,
            trim: true
        },

        companyKey: {
            type: String,
            required: true
        },

        jobRole: {
            type: String,
            required: true,
            trim: true
        },

        jobRoleKey: {
            type: String,
            required: true
        },

        jobType: {
            type: String,
            enum: ["Full-time", "Internship", "Contract"],
            required: true
        },

        appliedDate: {
            type: Date,
            required: true,
            immutable: true,
            validate: {
                validator: function (value) {
                    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
                        return false;
                    }

                    const today = new Date();
                    today.setUTCHours(0, 0, 0, 0);

                    const applied = new Date(value);
                    applied.setUTCHours(0, 0, 0, 0);

                    return applied <= today;
                },
                message: "Applied date cannot be in the future."
            }
        },

        expectedSalary: {
            type: Number,
            min: [0, "Expected salary cannot be negative."],
            default: null
        },

        notes: {
            type: String,
            trim: true,
            default: ""
        },

        status: {
            type: String,
            enum: [
                "Applied",
                "Interview",
                "Offer",
                "Rejected",
                "Accepted",
                "Declined"
            ],
            default: "Applied",
            required: true
        },

        followUpDate: {
            type: Date,
            required: true,
            immutable: true
        },

        statusHistory: {
            type: [statusHistorySchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);

applicationSchema.index({
    companyKey: 1,
    jobRoleKey: 1,
    status: 1
});

module.exports = mongoose.model("Application", applicationSchema);