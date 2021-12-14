module.exports = async () => {
    return {
        verbose: true,
        preset: "@shelf/jest-mongodb",
        coveragePathIgnorePatterns: [
            "/node_modules/"
        ]
    };
};
