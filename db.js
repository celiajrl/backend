const { MongoClient } = require('mongodb');

let dbConnection;

module.exports = {
    connectToDb: (cb) => {
        MongoClient.connect('mongodb://localhost:27017/evaluator', { useUnifiedTopology: true })
          .then((client) => {
            dbConnection = client.db();
            return cb();
          })
          .catch(err => {
            console.log(err);
            return cb(err);
          });
    },
    getDb: () => dbConnection
};