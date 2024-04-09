const { MongoClient } = require('mongodb');

let dbConnection;

module.exports = {
    connectToDb: (cb) => {
        const uri = 'mongodb+srv://chatbotevaluator:2024_UAM_chatbot@evaluator.vvans3s.mongodb.net/evaluator?retryWrites=true&w=majority&appName=evaluator'; 
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
