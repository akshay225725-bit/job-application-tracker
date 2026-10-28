const Application = require("../models/Application");
const Counter = require("../models/Counter");

const STATUSES = [
    "Applied",
    "Interview",
    "Offer",
    "Rejected",
    "Accepted",
    "Declined"
];

const FINAL_STATUSES = ["Rejected", "Accepted", "Declined"];

const ALLOWED_TRANSITIONS = {
    Applied: ["Interview", "Rejected"],
    Interview: ["Offer", "Rejected"],
    Offer: ["Accepted", "Declined"],
    Rejected: [],
    Accepted: [],
    Declined: []
};

// Standard response helper
const sendResponse = (res, statusCode, success, message, data = null) => {
    return res.status(statusCode).json({
        success,
        message,
        data
    });
};

// Normalize values for case-insensitive comparison
const normalize = (value) => value.trim().toLowerCase();

// Generate a company prefix
const getCompanyPrefix = (companyName) => {
    const letters = companyName
        .replace(/[^a-zA-Z]/g, "")
        .toUpperCase();

    return letters.slice(0, 3).padEnd(3, "X");
};

// Generate the next Application ID atomically
const generateApplicationId = async (companyName) => {
    const prefix = getCompanyPrefix(companyName);

    const counter = await Counter.findOneAndUpdate(
        { companyPrefix: prefix },
        {
            $inc: { sequence: 1 },
            $setOnInsert: { companyPrefix: prefix }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return `JA-${prefix}-${String(counter.sequence).padStart(3, "0")}`;
};

// Calculate the follow-up date from the applied date
const calculateFollowUpDate = (appliedDate) => {
    const date = new Date(appliedDate);
    date.setUTCDate(date.getUTCDate() + 7);
    return date;
};

// Return true if the follow-up date has passed and status is Applied
const isApplicationOverdue = (application) => {
    if (application.status !== "Applied") {
        return false;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const followUpDate = new Date(application.followUpDate);
    followUpDate.setUTCHours(0, 0, 0, 0);

    return today > followUpDate;
};

// Add the calculated overdue flag to an application
const formatApplication = (application) => {
    const data = application.toObject
        ? application.toObject()
        : { ...application };

    data.isOverdue = isApplicationOverdue(data);

    return data;
};

// Validate date-only input and reject future dates
const parseAppliedDate = (value) => {
    if (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
    ) {
        return null;
    }

    const today = new Date().toISOString().slice(0, 10);

    if (value > today) {
        return null;
    }

    return date;
};

// CREATE APPLICATION
exports.createApplication = async (req, res, next) => {
    try {
        const {
            companyName,
            jobRole,
            jobType,
            appliedDate,
            expectedSalary,
            notes
        } = req.body;

        if (
            typeof companyName !== "string" ||
            !companyName.trim() ||
            typeof jobRole !== "string" ||
            !jobRole.trim() ||
            !jobType ||
            !appliedDate
        ) {
            return sendResponse(
                res,
                400,
                false,
                "Company, job role, job type and applied date are required."
            );
        }

        if (!["Full-time", "Internship", "Contract"].includes(jobType)) {
            return sendResponse(
                res,
                400,
                false,
                "Invalid job type."
            );
        }

        if (expectedSalary !== undefined &&
            expectedSalary !== null &&
            (expectedSalary === "" ||
                !Number.isFinite(Number(expectedSalary)) ||
                Number(expectedSalary) < 0)) {
            return sendResponse(
                res,
                400,
                false,
                "Expected salary must be a non-negative number."
            );
        }

        if (notes !== undefined && typeof notes !== "string") {
            return sendResponse(
                res,
                400,
                false,
                "Notes must be text."
            );
        }

        const parsedDate = parseAppliedDate(appliedDate);

        if (!parsedDate) {
            return sendResponse(
                res,
                400,
                false,
                "Applied date must be a valid date and cannot be in the future."
            );
        }

        const cleanCompany = companyName.trim();
        const cleanRole = jobRole.trim();

        const companyKey = normalize(cleanCompany);
        const jobRoleKey = normalize(cleanRole);

        // Prevent duplicate active applications
        const existingApplication = await Application.findOne({
            companyKey,
            jobRoleKey,
            status: { $nin: FINAL_STATUSES }
        });

        if (existingApplication) {
            return sendResponse(
                res,
                409,
                false,
                "An active application already exists for this company and job role."
            );
        }

        // The client cannot choose the ID or initial status
        const applicationId = await generateApplicationId(cleanCompany);

        const application = await Application.create({
            applicationId,
            companyName: cleanCompany,
            companyKey,
            jobRole: cleanRole,
            jobRoleKey,
            jobType,
            appliedDate: parsedDate,
            expectedSalary:
                expectedSalary === undefined ||
                expectedSalary === null ||
                expectedSalary === ""
                    ? null
                    : Number(expectedSalary),
            notes: notes ? notes.trim() : "",
            status: "Applied",
            followUpDate: calculateFollowUpDate(parsedDate),
            statusHistory: [
                {
                    status: "Applied",
                    date: new Date()
                }
            ]
        });

        return sendResponse(
            res,
            201,
            true,
            "Application created successfully.",
            formatApplication(application)
        );
    } catch (error) {
        next(error);
    }
};

// GET ALL APPLICATIONS WITH BACKEND FILTERING AND SEARCH
exports.getApplications = async (req, res, next) => {
    try {
        const { status, company } = req.query;
        const filter = {};

        if (status) {
            if (!STATUSES.includes(status)) {
                return sendResponse(
                    res,
                    400,
                    false,
                    "Invalid status filter."
                );
            }

            filter.status = status;
        }

        if (company && company.trim()) {
            filter.companyKey = {
                $regex: company.trim().replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                ),
                $options: "i"
            };
        }

        const applications = await Application.find(filter)
            .sort({ createdAt: -1 });

        return sendResponse(
            res,
            200,
            true,
            "Applications retrieved successfully.",
            applications.map(formatApplication)
        );
    } catch (error) {
        next(error);
    }
};

// GET APPLICATION COUNTS BY STATUS
exports.getApplicationStats = async (req, res, next) => {
    try {
        const results = await Application.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const counts = {};

        STATUSES.forEach((status) => {
            counts[status] = 0;
        });

        results.forEach((item) => {
            counts[item._id] = item.count;
        });

        const total = Object.values(counts).reduce(
            (sum, count) => sum + count,
            0
        );

        return sendResponse(
            res,
            200,
            true,
            "Application statistics retrieved successfully.",
            { total, counts }
        );
    } catch (error) {
        next(error);
    }
};

// GET ONE APPLICATION
exports.getApplicationById = async (req, res, next) => {
    try {
        const application = await Application.findById(req.params.id);

        if (!application) {
            return sendResponse(
                res,
                404,
                false,
                "Application not found."
            );
        }

        return sendResponse(
            res,
            200,
            true,
            "Application retrieved successfully.",
            formatApplication(application)
        );
    } catch (error) {
        next(error);
    }
};

// EDIT PERMITTED APPLICATION FIELDS
exports.updateApplication = async (req, res, next) => {
    try {
        const application = await Application.findById(req.params.id);

        if (!application) {
            return sendResponse(
                res,
                404,
                false,
                "Application not found."
            );
        }

        const forbiddenFields = [
            "applicationId",
            "appliedDate",
            "status",
            "statusHistory",
            "followUpDate",
            "companyKey",
            "jobRoleKey",
            "isOverdue",
            "_id"
        ];

        if (forbiddenFields.some((field) =>
            Object.prototype.hasOwnProperty.call(req.body, field)
        )) {
            return sendResponse(
                res,
                400,
                false,
                "Application ID, applied date, status and system fields cannot be edited here."
            );
        }

        const allowedFields = [
            "companyName",
            "jobRole",
            "jobType",
            "expectedSalary",
            "notes"
        ];

        if (!Object.keys(req.body).some((field) =>
            allowedFields.includes(field)
        )) {
            return sendResponse(
                res,
                400,
                false,
                "No editable fields were provided."
            );
        }

        const cleanCompany =
            req.body.companyName === undefined
                ? application.companyName
                : typeof req.body.companyName === "string"
                    ? req.body.companyName.trim()
                    : "";

        const cleanRole =
            req.body.jobRole === undefined
                ? application.jobRole
                : typeof req.body.jobRole === "string"
                    ? req.body.jobRole.trim()
                    : "";

        if (!cleanCompany || !cleanRole) {
            return sendResponse(
                res,
                400,
                false,
                "Company name and job role cannot be empty."
            );
        }

        const jobType =
            req.body.jobType === undefined
                ? application.jobType
                : req.body.jobType;

        if (!["Full-time", "Internship", "Contract"].includes(jobType)) {
            return sendResponse(
                res,
                400,
                false,
                "Invalid job type."
            );
        }

        let expectedSalary = application.expectedSalary;

        if (Object.prototype.hasOwnProperty.call(
            req.body,
            "expectedSalary"
        )) {
            const value = req.body.expectedSalary;

            if (value === null || value === "") {
                expectedSalary = null;
            } else if (
                value === undefined ||
                !Number.isFinite(Number(value)) ||
                Number(value) < 0
            ) {
                return sendResponse(
                    res,
                    400,
                    false,
                    "Expected salary must be a non-negative number."
                );
            } else {
                expectedSalary = Number(value);
            }
        }

        let notes = application.notes;

        if (Object.prototype.hasOwnProperty.call(req.body, "notes")) {
            if (typeof req.body.notes !== "string") {
                return sendResponse(
                    res,
                    400,
                    false,
                    "Notes must be text."
                );
            }

            notes = req.body.notes.trim();
        }

        const companyKey = normalize(cleanCompany);
        const jobRoleKey = normalize(cleanRole);

        // Check for a duplicate active application, excluding this document
        const duplicate = await Application.findOne({
            _id: { $ne: application._id },
            companyKey,
            jobRoleKey,
            status: { $nin: FINAL_STATUSES }
        });

        if (
            duplicate &&
            !FINAL_STATUSES.includes(application.status)
        ) {
            return sendResponse(
                res,
                409,
                false,
                "Another active application already exists for this company and job role."
            );
        }

        application.companyName = cleanCompany;
        application.companyKey = companyKey;
        application.jobRole = cleanRole;
        application.jobRoleKey = jobRoleKey;
        application.jobType = jobType;
        application.expectedSalary = expectedSalary;
        application.notes = notes;

        await application.save();

        return sendResponse(
            res,
            200,
            true,
            "Application updated successfully.",
            formatApplication(application)
        );
    } catch (error) {
        next(error);
    }
};

// CHANGE STATUS WITH WORKFLOW VALIDATION
exports.updateApplicationStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        if (!STATUSES.includes(status)) {
            return sendResponse(
                res,
                400,
                false,
                "Invalid application status."
            );
        }

        const application = await Application.findById(req.params.id);

        if (!application) {
            return sendResponse(
                res,
                404,
                false,
                "Application not found."
            );
        }

        const allowedNextStatuses =
            ALLOWED_TRANSITIONS[application.status];

        if (!allowedNextStatuses.includes(status)) {
            return sendResponse(
                res,
                400,
                false,
                `Invalid status transition: ${application.status} cannot be changed to ${status}.`
            );
        }

        application.status = status;

        application.statusHistory.push({
            status,
            date: new Date()
        });

        await application.save();

        return sendResponse(
            res,
            200,
            true,
            "Application status updated successfully.",
            formatApplication(application)
        );
    } catch (error) {
        next(error);
    }
};

// DELETE ONLY IF THE STATUS ALLOWS IT
exports.deleteApplication = async (req, res, next) => {
    try {
        const application = await Application.findById(req.params.id);

        if (!application) {
            return sendResponse(
                res,
                404,
                false,
                "Application not found."
            );
        }

        if (
            application.status === "Interview" ||
            application.status === "Offer"
        ) {
            return sendResponse(
                res,
                400,
                false,
                "Applications in Interview or Offer status cannot be deleted."
            );
        }

        await application.deleteOne();

        return sendResponse(
            res,
            200,
            true,
            "Application deleted successfully.",
            { id: req.params.id }
        );
    } catch (error) {
        next(error);
    }
};