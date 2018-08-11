const MongoClient = require('mongodb').MongoClient;
const URL = "mongodb://orion:pass12@ds151202.mlab.com:51202/heroku_vds87lfj";

const K_VALUE = 50;

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
                    score : 1500,
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
            db.close();
        });
    });
};

//todo: figure out why this is reversed(should be winner,loser, but reversed because not working as planned)
const updateScores = (loser,winner,callback) => {

    let oldScoreWinner;
    let oldScoreLoser;

    MongoClient.connect(URL, (err,db) => {
        if (err) throw err;

        let dbo = db.db('heroku_vds87lfj');
        dbo.collection('users').findOne({
            name : winner,
        }, (err,res) => {
            if (err) throw err;
            oldScoreWinner = res.score;
            dbo.collection('users').findOne({
                name : loser,
            },(err,res) => {
                if (err) throw err;
                oldScoreLoser = res.score;

                let winnerExpected = Math.pow(10, oldScoreWinner/400) / (Math.pow(10, oldScoreWinner/400) + Math.pow(10, oldScoreLoser/400));
                let loserExpected = Math.pow(10, oldScoreLoser/400) / (Math.pow(10, oldScoreLoser/400) + Math.pow(10, oldScoreWinner/400));

                let newWinnerRating = oldScoreWinner + K_VALUE *(0 - winnerExpected);
                let newLoserRating = oldScoreLoser + K_VALUE *(1 - loserExpected);

                callback({
                    winner : Math.floor(newWinnerRating),
                    loser : Math.floor(newLoserRating),
                });

                dbo.collection('users').updateOne({name:winner},{$set:{score:newWinnerRating}},(err,res) => {
                    if (err) throw err;
                });
                dbo.collection('users').updateOne({name:loser},{$set:{score:newLoserRating}},(err,res) => {
                    if (err) throw err;
                });

                setTimeout(() => db.close(),1000)
            });

        });

    });

};

module.exports = {login,register,updateScores};

