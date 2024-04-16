const { MongoClient, ObjectId } = require('mongodb');
const { GridFSBucket } = require('mongodb');

let dbConnection;
let gridFsBucket;

module.exports = {
    connectToDb: (cb) => {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            return cb(new Error('MongoDB URI not found in environment variables'));
        }

        const client = new MongoClient(uri);
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
        const uploadStream = gridFsBucket.openUploadStream(filename);
        console.log(uploadStream);
        uploadStream.write(fileBuffer, err => {
            if (err) {
                return callback(err);
            }
            uploadStream.end();
            console.log("end stream write");
        });
        console.log("aqui");

        uploadStream.on('finish', () => {
            console.log('File uploaded successfully to GridFS');
            callback(null, uploadStream.id); // Return the file ID for further reference
        });

        uploadStream.on('error', (err) => {
            console.error('Error uploading file to GridFS:', err);
            callback(err);
        });
    },

    retrieveFileFromGridFS: (fileId, callback) => {
        const downloadStream = gridFsBucket.openDownloadStream(ObjectId(fileId));
        const chunks = [];

        downloadStream.on('data', chunk => {
            chunks.push(chunk);
        });

        downloadStream.on('error', err => {
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

