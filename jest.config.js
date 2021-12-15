module.exports = async () => {
    return {
        verbose: true,
        preset: "@shelf/jest-mongodb",
        coveragePathIgnorePatterns: [
            "/node_modules/",
            "/routes/dev.js",
            "/models/",
            "/app.js"
        ]
    };
};
