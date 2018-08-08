const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const port = process.env.PORT || 4000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const userMap = {};
const lobby = [];
const gameMap = {};

const startGame = (leftPlayer,rightPlayer) => {
    //TODO
};

io.on('connection', socket => {

    let username = null;
    
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
            startGame(username,name);
        else socket.emit('chat', `SYSTEM: ${name} is no longer in the lobby.`);
    });
    
    socket.on('decline', name => {
        if (lobby.indexOf(name) !== -1)
            io.to(userMap[name]).emit('chat', `SYSTEM: ${username} has declined your invitation.`);
    });

});



server.listen(port, () => console.log(`Listening on port ${port}`));
