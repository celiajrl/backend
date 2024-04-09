const { MongoClient, ServerApiVersion } = require('mongodb');

let dbConnection;


module.exports = {
    connectToDb: (cb) => {
        const uri = process.env.MONGODB_URI || "mongodb+srv://chatbotevaluator:2024_UAM_chatbot@evaluator.vvans3s.mongodb.net/evaluator?retryWrites=true&w=majority&appName=evaluator";
        if (!uri) {
            return cb(new Error('MongoDB URI not found in environment variables'));
        }

        // Create a MongoClient with MongoClientOptions object to set the Stable API version
        const client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });

        // Connect to MongoDB using the client
        client.connect()
            .then(() => {
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
