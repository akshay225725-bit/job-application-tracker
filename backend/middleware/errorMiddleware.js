const errorMiddleware = (err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    if (err.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: err.message,
            data: null
        });
    }

    if (err.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: "Invalid application ID format.",
            data: null
        });
    }

    if (err.code === 11000) {
        return res.status(409).json({
            success: false,
            message: "A record with this unique value already exists.",
            data: null
        });
    }

    return res.status(500).json({
        success: false,
        message: "An internal server error occurred.",
        data: null
    });
};

module.exports = errorMiddleware;