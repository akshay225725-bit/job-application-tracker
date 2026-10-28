const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const applicationRoutes = require("./routes/applicationRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Job Application Tracker API is running",
        data: null
    });
});

app.use("/api/applications", applicationRoutes);

// Handle unknown endpoints
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found.",
        data: null
    });
});

// Error middleware must be registered after routes
app.use(errorMiddleware);

const startServer = async () => {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};

startServer();