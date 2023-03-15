const corsMiddleWare = require('cors');
const { Server } = require('socket.io');
const PORT = 4000;

//Server setup
const express = require('express');
const app = express();

// Socket setup
const http = require('http');
const server = http.createServer(app);
const io = new Server(server);

//Functions
const addPlayerToPlayers = require('./functions/addPlayerToPlayers');
const addPlayerToRoom = require('./functions/addPlayerToRoom');
const createRoom = require('./functions/createRoom');
const countDown = require('./functions/countDown');
const findRoomByRoomId = require('./functions/findRoomByRoomId');
const findPlayerBySocketId = require('./functions/findPlayerBySocketId');
const onStartGame = require('./functions/onStartGame');
const setAnswerFromPlayer = require('./functions/setAnswerFromPlayer');
const sendRoomStateToRoom = require('./functions/sendRoomStateToRoom');

let roomState = [];
let players = [];

//every second, the timer in EACH ROOM is decreased by 1 if necessary
//by the countDown function. It takes the roomState, cause all the
//rooms are inside the roomState. The new roomState is then updated
//with the new timers in each room.
const raiseTimer = () => {
    try {
        roomState = countDown(roomState, io);
    } catch (error) {
        console.log(error);
    }
};
setInterval(raiseTimer, 500);

app.use(corsMiddleWare());
app.use(express.json());

//Every socket.on and socket.emit needs to be wrapped around "io.on('connection, socket)"
io.on('connection', (socket) => {
    socket.on('joinRoom', (data) => {
        try {
            //retrieve the code (a roomId) and name from the data that
            //was sent
            const { code, name, imageUrl } = data;
            const roomId = code;
            //use the old playerState, and add the new player with their
            //socketId and the name from the client input
            players = addPlayerToPlayers(socket.id, name, imageUrl, players);
            const player = findPlayerBySocketId(socket.id, players);
            //add the newly created player to the room, using the
            //old roomState and declaring the new roomState
            roomState = addPlayerToRoom(player, roomId, roomState);
            //find the room that we require to send the data to
            room = findRoomByRoomId(roomId, roomState);
            //send the new roomState to everyone in the room
            sendRoomStateToRoom(room, io);
        } catch (error) {
            console.log(error);
        }
    });

    //event when client wants to host a game
    socket.on('createRoom', (data) => {
        try {
            //retrieve the name and questions from the data that is sent
            //through createRoom
            const { name, questions, imageUrl } = data;
            //the new playerState (stored in the let players)
            //gets updated with the dedicatd function
            players = addPlayerToPlayers(socket.id, name, imageUrl, players);
            //inside the now updated playerState, we search for the host
            const host = findPlayerBySocketId(socket.id, players);
            //we update the roomState with the createRoom function
            //and provide it with the newly added player, now host,
            //the questions
            //and the old roomState
            const { newRoomState, room } = createRoom(
                host,
                questions,
                roomState,
            );
            roomState = newRoomState;
            //we send this new roomState to everyone that is connected
            //to the newly created room
            //socket.emit('roomUpdate', roomState);
            sendRoomStateToRoom(room, io);
        } catch (error) {
            console.log(error);
        }
    });

    //event to handle the start of the game by the host
    socket.on('startGame', (roomId) => {
        try {
            roomState = onStartGame(roomId, roomState, io);
        } catch (error) {
            console.log(error);
        }
    });

    //event to handle the client choosing an answer. May be called by client multiple times until timer runs out
    //in order to refresh their answer
    socket.on('lockAnswer', (data) => {
        try {
            const { answer, roomId } = data;
            if (!answer || !roomId) return;
            const player = findPlayerBySocketId(socket.id, players);
            roomState = setAnswerFromPlayer(answer, player, roomId, roomState);
        } catch (error) {
            console.log(error);
        }
    });

    //development event to get the rooms and players displayed in terminal
    socket.on('getData', () => {
        try {
            console.log(roomState);
            console.log(players);
        } catch (error) {
            console.log(error);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Listening on port: ${PORT}`);
});

module.exports = server;
