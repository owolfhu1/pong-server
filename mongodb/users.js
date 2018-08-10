const MongoClient = require('mongodb').MongoClient;
const URL = "mongodb://orion:pass12@ds151202.mlab.com:51202/heroku_vds87lfj";

const register = (username, passHash, callback) => {
    MongoClient.connect(URL,(err, db) => {
        if (err) throw err;
        let dbo = db.db('heroku_vds87lfj');
        dbo.collection('users').findOne({name: username}, function (err, result) {
            if (err) throw err;
            if (!result) {
                dbo.collection('users').insertOne({
                    name: username,
                    pass: passHash,
                    //score : 500,
                }, (err,res) => {
                    if (err) throw err;
                    callback(true);
                    db.close();
                });
            } else {
                callback(false);
                db.close();
            }
        });
    });
};

const login = (username, passHash, callback) => {
    let success = false;
    MongoClient.connect(URL,(err, db) => {
        if (err) throw err;
        let dbo = db.db('heroku_vds87lfj');
        dbo.collection('users').findOne({
            name : username,
        }, (err, res) => {
            if (err) throw err;
            if (!res)
                callback(false);
            else
                callback(res.pass === passHash);
        });
    });
};


module.exports = {login, register};

