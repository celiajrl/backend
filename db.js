/**
 * db.js
 * 
 * Descripción: Este archivo contiene funciones para conectar con la base de datos de MongoDB,
 *              inicializar un bucket de GridFS para el almacenamiento de archivos grandes y realizar
 *              operaciones de carga y descarga de archivos.
 * 
 * Año: 2024
 * 
 * Autora: Celia Jiménez
 */

const { MongoClient, ObjectId } = require('mongodb');
const { GridFSBucket } = require('mongodb');
const stream = require('stream');

let dbConnection;
let gridFsBucket;

module.exports = {
    // Función para establecer la conexión con la base de datos MongoDB e inicializar GridFS
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

    // Función para obtener la conexión a la base de datos
    getDb: () => dbConnection,

    // Función para obtener el bucket de GridFS
    getGridFSBucket: () => gridFsBucket,

    // Función para cargar un archivo en GridFS
    uploadFileToGridFS: (fileBuffer, filename, callback) => {
        const readableStream = new stream.Readable({
            read() {
                this.push(fileBuffer);
                this.push(null);
            }
        });

        const uploadStream = gridFsBucket.openUploadStream(filename);

        // Maneja los eventos de error y finalización del flujo de carga
        readableStream.pipe(uploadStream)
            .on('error', (error) => {
                console.error('Error uploading file to GridFS:', error);
                callback(error);
            })
            .on('finish', () => {
                console.log('File uploaded successfully to GridFS');
                callback(null, uploadStream.id); // Devuelve el ID del archivo para referencia futura
            });
    },

    // Función para recuperar un archivo de GridFS
    retrieveFileFromGridFS: (fileId, callback) => {
        const downloadStream = gridFsBucket.openDownloadStream(ObjectId(fileId));
        const chunks = [];

        // Captura los datos del flujo de descarga
        downloadStream.on('data', (chunk) => {
            chunks.push(chunk);
        });

        // Maneja el evento de error del flujo de descarga
        downloadStream.on('error', (err) => {
            console.error('Error downloading file from GridFS:', err);
            callback(err, null);
        });

        // Maneja el evento de finalización del flujo de descarga
        downloadStream.on('end', () => {
            const fileBuffer = Buffer.concat(chunks);
            console.log('File downloaded successfully from GridFS');
            callback(null, fileBuffer);
        });
    }
};
