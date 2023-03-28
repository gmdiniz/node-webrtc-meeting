<template>
    <div class="main-wrapper">
        <div id="video-call-div" class="d-flex video-call-div">
            <div>
                <v-card class="local-video-area">
                    <video
                    muted
                    id="local-video"
                    class="local-video"
                    ref="local-video"
                    autoplay
                    ></video>
                </v-card>
                <v-card class="chat-text-area">
                    <v-text-field
                        v-model='message'
                        class="chat-input-field"
                        label='Envie uma mensagem'
                        v-on:keyup.enter="sendMessage()"
                        clearable
                        variant="solo"
                    />
                    <div>
                        <div v-for="(message, index) in messages" :key="index">
                            {{ message.message }}
                        </div>
                    </div>
                </v-card>
            </div>
            <v-card class="remote-video-area" v-if="shouldShowRemoteArea()">
                <div
                    v-for="stream in peerMediaElements"
                    :key="stream.id"
                >
                    <video
                        class="remote-video"
                        :id="stream.id"
                        :ref="stream.id"
                        :srcObject.prop="stream"
                        autoplay
                    >
                    </video>
                </div>
            </v-card>
            <div class="d-flex meeting-actions">
                <li v-on:click="muteVideo()" class="icon">
                    <mdicon name="camera-off"/>
                </li>
                <li v-on:click="muteAudio()" class="icon">
                    <mdicon name="microphone-off"/>
                </li>
                <li v-on:click="leaveRoom()" class="icon">
                    <mdicon name="exit-to-app"/>
                </li>
            </div>
        </div>
    </div>
</template>

<script>
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
const { io } = require('socket.io-client')
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' }
]

export default {
    name: 'MeetingRoom',
    data: function () {
        return {
            messages: [],
            peers: {},
            localStream: null,
            isAudio: true,
            isVideo: true,
            message: '',
            channelId: '',
            peerMediaElements: {},
            socketServer: null,
            roomId: this.$route.params.roomId
        }
    },
    computed: {
        ...mapState(['APIData']),
        ...mapGetters({ loggedUser: 'userLogin' })
    },
    methods: {
        muteAudio () {
            this.isAudio = !this.isAudio
            this.localStream.getAudioTracks()[0].enabled = this.isAudio
        },
        muteVideo () {
            this.isVideo = !this.isVideo
            this.localStream.getVideoTracks()[0].enabled = this.isVideo
        },
        leaveRoom () {
            this.$router.push({ name: 'meetings' })
        },
        sendMessage () {
            this.socketServer.emit('liveChat', {
                message: this.message,
                userLogin: this.loggedUser,
                type: 'liveChat'
            })

            this.message = ''
        },
        startCall () {
            const params = {
                video: true,
                audio: true
            }
            navigator.getUserMedia(params, this.userStreamHandler, console.log)
        },
        showUserMedia (stream) {
            this.$refs['local-video'].srcObject = stream
        },
        userStreamHandler (stream) {
            this.localStream = stream
            this.showUserMedia(stream)
            this.initWebsocket()
        },
        partChatChannel (channel) {
            this.socketServer.emit('part', channel)
        },
        initWebsocket () {
            const randomRoomId = this.$route.params.roomId.replaceAll('-', '')
            this.socketServer = io('http://localhost:3000')

            this.socketServer.on('connect', () => {
                this.socketServer.emit('join', { channel: randomRoomId, userdata: {} })
            })
            this.socketServer.on('addPeer', this.addPeerEvent)
            this.socketServer.on('sessionDescription', this.sessionDescriptionEvent)
            this.socketServer.on('iceCandidate', this.iceCandidateEvent)
            this.socketServer.on('removePeer', this.removePeerEvent)
        },
        shouldShowRemoteArea () {
            return !!Object.keys(this.peerMediaElements).length
        },
        addPeerEvent (config) {
            console.log('Signaling server said to add peer:', config)
            var peerId = config.peerId
            if (peerId in this.peers) {
                console.log('Already connected to peer ', peerId)
                return
            }
            var peerConn = new RTCPeerConnection(
                { iceServers: ICE_SERVERS },
                { optional: [{ DtlsSrtpKeyAgreement: true }] }
            )
            this.peers[peerId] = peerConn

            peerConn.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socketServer.emit('relayICECandidate', {
                        peerId: peerId,
                        iceCandidate: {
                            sdpMLineIndex: event.candidate.sdpMLineIndex,
                            candidate: event.candidate.candidate
                        }
                    })
                }
            }
            peerConn.ontrack = ({ streams }) => {
                const stream = streams[0]
                Vue.set(this.peerMediaElements, peerId, stream)
            }
            peerConn.addStream(this.localStream)

            if (config.should_create_offer) {
                console.log('Creating RTC offer to ', peerId)
                const ref = this
                peerConn.createOffer(
                    function (localDescription) {
                        console.log('Local offer description is: ', localDescription)
                        peerConn.setLocalDescription(localDescription,
                            () => {
                                ref.socketServer.emit('relaySessionDescription',
                                    { peerId: peerId, sessionDescription: localDescription })
                                console.log('Offer setLocalDescription succeeded')
                            },
                            () => { console.log('Offer setLocalDescription failed!') }
                        )
                    },
                    function (error) {
                        console.log('Error sending offer: ', error)
                    })
            }
        },
        sessionDescriptionEvent (config) {
            console.log('Remote description received: ', config)
            var peerId = config.peerId
            var peer = this.peers[peerId]
            var ref = this
            var remoteDescription = config.sessionDescription
            console.log(config.sessionDescription)

            var desc = new RTCSessionDescription(remoteDescription)
            peer.setRemoteDescription(desc,
                () => {
                    console.log('setRemoteDescription succeeded')
                    if (remoteDescription.type === 'offer') {
                        console.log('Creating answer')
                        peer.createAnswer(
                            function (localDescription) {
                                console.log('Answer description is: ', localDescription)
                                peer.setLocalDescription(localDescription,
                                    () => {
                                        ref.socketServer.emit('relaySessionDescription',
                                            { peerId: peerId, sessionDescription: localDescription })
                                        console.log('Answer setLocalDescription succeeded')
                                    },
                                    () => { console.log('Answer setLocalDescription failed!') }
                                )
                            },
                            function (error) {
                                console.log('Error creating answer: ', error)
                                console.log(peer)
                            })
                    }
                },
                (error) => {
                    console.log('setRemoteDescription error: ', error)
                }
            )
            console.log('Description Object: ', desc)
        },
        iceCandidateEvent (config) {
            var peer = this.peers[config.peerId]
            var iceCandidate = config.iceCandidate
            peer.addIceCandidate(new RTCIceCandidate(iceCandidate))
        },
        removePeerEvent (config) {
            var peerId = config.peerId
            if (peerId in this.peers) {
                this.peers[peerId].close()
            }

            delete this.peers[peerId]
            Vue.delete(this.peerMediaElements, peerId)
        }
    },
    created () {
        this.startCall()
    },
    mounted () {

    }
}
</script>

<style scoped>
    .main-wrapper {
        height: 100%;
        background-color: #E5ECE9;
    }
    .local-video{
        width: 350px;
        margin-bottom: auto;
    }

    .chat-input-field {
        margin-top: auto;
    }

    .remote-video {
        width: 350px;
    }

    .local-video-area {
        text-align: center;
        margin: 20px;
        padding: 20px;
        width: 400px;
    }

    .chat-text-area {
        margin: 20px;
        padding: 20px 20px 10px 20px;
    }

    .remote-video-area {
        display: flex;
        min-width: 300px;
        margin: 20px;
        padding: 20px 20px 10px 20px;
        height: 100%;
    }

    .meeting-actions {
        position: fixed;
        margin: 20px;
        bottom: 0;
        width: 100%;
        place-content: center;
    }

    .icon {
        position: relative;
        background: #ffffff;
        border-radius: 50%;
        padding: 25px;
        margin: 10px;
        width: 30px;
        height: 30px;
        font-size: 18px;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        box-shadow: 0 10px 10px rgb(0 0 0 / 10%);
        transition: all 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    .icon:hover {
        text-shadow: 0px -1px 0px rgba(0, 0, 0, 0.1);
        opacity: 0.5;
        color: #1877F2;
    }
</style>
