const { MongoClient } = require('mongodb');

let dbConnection;

module.exports = {
    connectToDb: (cb) => {
        const uri = process.env.MONGODB_URI; 
        if (!uri) {
            return cb(new Error('MongoDB URI not found in environment variables'));
        }

        MongoClient.connect(uri, { useUnifiedTopology: true })
            .then((client) => {
                dbConnection = client.db();
                console.log('Connected to MongoDB');
                return cb();
            })
            .catch(err => {
                console.error('Error connecting to MongoDB:', err);
                return cb(err);
            });
    },
    getDb: () => dbConnection
};
