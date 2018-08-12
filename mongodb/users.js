const MongoClient = require('mongodb').MongoClient;
const URL = "mongodb://orion:pass12@ds151202.mlab.com:51202/heroku_vds87lfj";

const K_VALUE = 50;

const DATABASE = 'heroku_vds87lfj';

const register = (username, passHash, callback) => {
    MongoClient.connect(URL,(err, db) => {
        if (err) throw err;
        let dbo = db.db(DATABASE);
        dbo.collection('users').findOne({name: username}, function (err, result) {
            if (err) throw err;
            if (!result) {
                dbo.collection('users').insertOne({
                    name: username,
                    pass: passHash,
                    score : 1500,
                }, (err,res) => {
                    if (err) throw err;
                    // dbo.collection('games').insertOne({
                    //     name : username,
                    //     wins : []
                    // }, (err,res) => {
                    //     if (err) throw err;
                    // });
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
        let dbo = db.db(DATABASE);
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

        let dbo = db.db(DATABASE);
    
        dbo.collection('games').insertOne({winner,loser}, (err,res) => {
            if (err) throw err;
        });
        
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
                    // winner : Math.floor(newWinnerRating), //TODO fix this
                    // loser : Math.floor(newLoserRating),
                    winner : Math.floor(newLoserRating),
                    loser : Math.floor(newWinnerRating),
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

const topThree = callback => {
    MongoClient.connect(URL, (err,db) => {
        if (err) throw err;
        let dbo = db.db(DATABASE);
        dbo.collection('users').find({}).toArray((err, res) => {
            if (err) throw err;
            res.sort((b,a) => a.score - b.score);
            let one = res.length > 0 ? `1) ${res[0].name} with ${Math.floor(res[0].score)} points` : null;
            let two = res.length > 1 ? `2) ${res[1].name} with ${Math.floor(res[1].score)} points` : null;
            let three = res.length > 2 ? `3) ${res[2].name} with ${Math.floor(res[2].score)} points` : null;
            callback({one,two,three});
            db.close();
        });
    });
};

const getMyScore = (username,callback) => {
    MongoClient.connect(URL, (err,db) => {
        if (err) throw err;
        let dbo = db.db(DATABASE);
        dbo.collection('users').find({}).toArray((err, res) => {
            res.sort((b,a) => a.score - b.score);
            for (let i = 0; i < res.length; i++)
                if (res[i].name === username)
                    callback(`Rank ${i+1} with ${Math.floor(res[i].score)} points`);
            db.close();
        });
    });
};

const recordGame = (winner,loser) => {
    MongoClient.connect(URL, (err,db) => {
        if (err) throw err;
        let dbo = db.db(DATABASE);
        dbo.collection('games').findOne({name:winner}, (err,res) => {
            if (err) throw err;
            res.wins.push(loser);
            dbo.collection('games').updateOne({name:winner},{$set:{wins:res.wins}},(err,res) => {
                if (err) throw err;
            });
        });
    });
};

module.exports = {login,register,updateScores,topThree,getMyScore,recordGame};

