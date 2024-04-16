const { MongoClient, ObjectId } = require('mongodb');
const { GridFSBucket } = require('mongodb');
const stream = require('stream');

let dbConnection;
let gridFsBucket;

module.exports = {
    connectToDb: (cb) => {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            return cb(new Error('MongoDB URI not found in environment variables'));
        }

        const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        client.connect()
            .then(() => {
                dbConnection = client.db();
                gridFsBucket = new GridFSBucket(dbConnection, {
                    bucketName: 'chatbotFiles'
                });
                console.log('Connected to MongoDB and GridFS initialized');
                return cb();
            })
            .catch(err => {
                console.error('Error connecting to MongoDB:', err);
                return cb(err);
            });
    },

    getDb: () => dbConnection,

    getGridFSBucket: () => gridFsBucket,

    uploadFileToGridFS: (fileBuffer, filename, callback) => {
        const readableStream = new stream.Readable({
            read() {
                this.push(fileBuffer);
                this.push(null);
            }
        });

        const uploadStream = gridFsBucket.openUploadStream(filename);

        readableStream.pipe(uploadStream)
            .on('error', (error) => {
                console.error('Error uploading file to GridFS:', error);
                callback(error);
            })
            .on('finish', () => {
                console.log('File uploaded successfully to GridFS');
                callback(null, uploadStream.id); // Return the file ID for further reference
            });
    },

    retrieveFileFromGridFS: (fileId, callback) => {
        const downloadStream = gridFsBucket.openDownloadStream(ObjectId(fileId));
        const chunks = [];

        downloadStream.on('data', (chunk) => {
            chunks.push(chunk);
        });

        downloadStream.on('error', (err) => {
            console.error('Error downloading file from GridFS:', err);
            callback(err, null);
        });

        downloadStream.on('end', () => {
            const fileBuffer = Buffer.concat(chunks);
            console.log('File downloaded successfully from GridFS');
            callback(null, fileBuffer);
        });
    }
};
