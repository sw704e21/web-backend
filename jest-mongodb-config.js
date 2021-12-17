module.exports = {
    mongodbMemoryServerOptions: {
        binary: {
            version: '5.0.5',
            skipMD5: true,
        },
        instance: {},
        autoStart: false,
    },
    mongoURLEnvName: 'MONGODB_URI',
};
