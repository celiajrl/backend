const { MongoClient, GridFSBucket } = require('mongodb');
const fs = require('fs');

let dbConnection;
let gridFSBucket;

module.exports = {
    connectToDb: (cb) => {
        const uri = process.env.MONGODB_URI || "mongodb+srv://chatbotevaluator:2024_UAM_chatbot@evaluator.vvans3s.mongodb.net/evaluator?retryWrites=true&w=majority&appName=evaluator";
        if (!uri) {
            return cb(new Error('MongoDB URI not found in environment variables'));
        }

        const client = new MongoClient(uri);

        client.connect()
            .then(() => {
                dbConnection = client.db();
                // Initialize GridFS bucket
                gridFSBucket = new GridFSBucket(dbConnection, {
                    bucketName: 'chatbots'
                });
                console.log('Connected to MongoDB');
                cb();
            })
            .catch(err => {
                console.error('Error connecting to MongoDB:', err);
                cb(err);
            });
    },
    getDb: () => dbConnection,
    getGridFSBucket: () => gridFSBucket,

    // Upload a file to GridFS
    uploadFileToGridFS: (fileStream, filename, callback) => {
        const uploadStream = gridFSBucket.openUploadStream(filename);
        fileStream.pipe(uploadStream)
            .on('error', (error) => {
                console.error('Failed to upload file:', error);
                callback(error, null);
            })
            .on('finish', () => {
                console.log('File uploaded successfully');
                callback(null, uploadStream.id);  // Return the file ID
            });
    },

    // Retrieve a file from GridFS
    getFileFromGridFS: (fileId, res) => {
        const downloadStream = gridFSBucket.openDownloadStream(fileId);
        downloadStream.pipe(res)
            .on('error', (error) => {
                console.error('Failed to retrieve file:', error);
                res.status(500).send('Failed to retrieve file');
            })
            .on('finish', () => {
                console.log('File retrieved successfully');
            });
    }
};

