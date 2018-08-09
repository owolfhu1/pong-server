const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const port = process.env.PORT || 4000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const Game = require('./Game');

const userMap = {}; //{username : socketId}
const lobby = []; //[userInLobby,secondUserInLobby, ...]
const gameMap = {}; //{gameId : gameObj}
const gameIdMap = {}; //{username : gameId}

function GameObj(game,leftPlayer,rightPlayer) {
    this.game = game;
    this.leftPlayer = leftPlayer;
    this.rightPlayer = rightPlayer;
    this.id = 'gameId' + Math.random().toString(36).substr(2, 6);
    this.interval = null;
    io.to(userMap[leftPlayer]).emit('start_game');
    io.to(userMap[rightPlayer]).emit('start_game');
}

const makeGame = (leftPlayer,rightPlayer) => {
    let game = new Game(io.to(userMap[leftPlayer]).emit,io.to(userMap[rightPlayer]).emit);
    let gameObj = new GameObj(game,leftPlayer,rightPlayer);
    gameIdMap[leftPlayer] = gameObj.id;
    gameIdMap[rightPlayer] = gameObj.id;
    gameMap[gameObj.id] = gameObj;
    lobby.splice(lobby.indexOf(leftPlayer),1);
    lobby.splice(lobby.indexOf(rightPlayer),1);
    for (let i in lobby)
        io.to(userMap[lobby[i]]).emit('lobby', lobby);
};

const startGame = gameObj => {
  
    gameObj.game.start();
    gameObj.interval = setInterval(() => {
        io.to(userMap[gameObj.leftPlayer]).emit('update_game',gameObj.game.getState());
        io.to(userMap[gameObj.rightPlayer]).emit('update_game',gameObj.game.getState());
    },100);
};

io.on('connection', socket => {

    let username = '';
    
    socket.on('login', name => {
        if (name in userMap)
            socket.emit('login_error', name + ' is already logged in');
        else if (!(new RegExp('^[a-zA-Z]{3,10}$').test(name)))
            socket.emit('login_error', 'invalid name, must be 3-10 letters only');
        else {
            userMap[name] = socket.id;
            lobby.push(name);
            username = name;
            socket.emit('login', {username,lobby,state:'lobby'});
            for (let i in lobby)
                io.to(userMap[lobby[i]]).emit('lobby', lobby);
        }
    });
    
    socket.on('request_game', name => io.to(userMap[name]).emit('request', username));
    
    socket.on('chat', text => {
        for (let i in lobby)
            io.to(userMap[lobby[i]]).emit('chat', username + ': ' + text);
    });
    
    socket.on('accept', name => {
        if (lobby.indexOf(name) !== -1)
            makeGame(username,name);
        else socket.emit('chat', `SYSTEM: ${name} is no longer in the lobby.`);
    });
    
    socket.on('decline', name => {
        if (lobby.indexOf(name) !== -1)
            io.to(userMap[name]).emit('chat', `SYSTEM: ${username} has declined your invitation.`);
    });

    socket.on('move_paddle', string => {
        let gameObj = gameMap[gameIdMap[username]];
        if (gameObj.leftPlayer === username)
            gameObj.game.moveLeftPaddle(string);
        else
            gameObj.game.moveRightPaddle(string);
        io.to(userMap[gameObj.leftPlayer]).emit('update_game', gameObj.game.getState());
        io.to(userMap[gameObj.rightPlayer]).emit('update_game', gameObj.game.getState());
    });
    
    socket.on('start_game', () => {
        let gameObj = gameMap[gameIdMap[username]];
        if (!gameObj.interval)
            startGame(gameObj);
        
    });

    socket.on('disconnect', () => {

        if (username.length > 0) {
            delete userMap[username];

            let index = lobby.indexOf(username);

            if (index !== -1) {
                lobby.splice(index,1);
                for (let i in lobby)
                    io.to(userMap[lobby[i]]).emit('lobby', lobby);
            }

        }
    });

});



server.listen(port, () => console.log(`Listening on port ${port}`));
