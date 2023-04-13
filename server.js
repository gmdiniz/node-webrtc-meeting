const app = require('express')()
const http = require('http').Server(app)
const port = process.env.PORT || 3000

const io = require('socket.io')(http, {
    cors: {
        origins: ['*']
    },
    pingTimeout: 7000,
    pingInterval: 3000
})

app.listen(port, () => {
    console.log(`Server is up`)
})

const index = require('./src/services/routes/index')
const usersRoute = require('./src/services/routes/usersRoute')
const meetingsRoute = require('./src/services/routes/meetRoute')

app.use('/', index)
app.get('/users', usersRoute)
app.get('/meetings', meetingsRoute)

var channels = {}
var sockets = {}

function part(channel, socket) {
    console.log("["+ socket.id + "] part ");

    if (!(channel in socket.channels)) {
        console.log("["+ socket.id + "] ERROR: not in ", channel);
        return;
    }

    delete socket.channels[channel];
    delete channels[channel][socket.id];

    for (id in channels[channel]) {
        channels[channel][id].emit('removePeer', {'peer_id': socket.id});
        socket.emit('removePeer', {'peer_id': id});
    }
}

io.on('connection', (socket) => {
    socket.channels = {}
    sockets[socket.id] = socket

    console.log('[' + socket.id + '] connection accepted')

    socket.on('disconnect', () => {
        for (var channel in socket.channels) {
            part(channel, socket)
        }
        console.log('[' + socket.id + '] disconnected')
        delete sockets[socket.id]
    })

    socket.on('join', (config) => {
        console.log('[' + socket.id + '] join ', config)
        var channel = config.channel

        if (channel in socket.channels) {
            console.log('[' + socket.id + '] ERROR: already joined ', channel)
            return
        }

        if (!(channel in channels)) {
            channels[channel] = {}
        }

        for (var id in channels[channel]) {
            channels[channel][id].emit('addPeer', { peerId: socket.id, should_create_offer: false })
            socket.emit('addPeer', { peerId: id, should_create_offer: true })
        }

        channels[channel][socket.id] = socket
        socket.channels[channel] = channel
    })

    socket.on('incomingMessage', (message) => {
        currentDatetime = new Date().toDateString()
        currentChannel = message.channel
        message.currentDatetime = currentDatetime

        for (var socketId in sockets) {
            sockets[socketId].emit('incomingMessage', message)
        }
    })

    socket.on('part', (channel) => {
        console.log('[' + socket.id + '] part ')

        if (!(channel in socket.channels)) {
            console.log('[' + socket.id + '] ERROR: not in ', channel)
            return
        }

        delete socket.channels[channel]
        delete channels[channel][socket.id]

        for (id in channels[channel]) {
            channels[channel][id].emit('removePeer', { peerId: socket.id })
            socket.emit('removePeer', { peerId: id })
        }
    })

    socket.on('relayICECandidate', (config) => {
        var peerId = config.peerId
        var iceCandidate = config.iceCandidate
        console.log('[' + socket.id + '] relaying ICE candidate to [' + peerId + '] ', iceCandidate)

        if (peerId in sockets) {
            sockets[peerId].emit('iceCandidate', { peerId: socket.id, iceCandidate: iceCandidate })
        }
    })

    socket.on('relaySessionDescription', (config) => {
        var peerId = config.peerId
        var sessionDescription = config.sessionDescription
        console.log('[' + socket.id + '] relaying session description to [' + peerId + '] ', sessionDescription)

        if (peerId in sockets) {
            sockets[peerId].emit('sessionDescription', { peerId: socket.id, sessionDescription: sessionDescription })
        }
    })
})

module.exports = app
