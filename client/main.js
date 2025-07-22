//main.js
import { startLocalMedia, shareScreen, stopScreenShare, getLocalStream, startCamera  } from './media.js';
import { createPeerConnection, closePeerConnection } from './webrtc.js';
import { getElement, toggleMute } from './ui.js';
import { setupSocketHandlers } from './socketEvents.js';

const socket = io();

let peerConnection;
let started = false;
let isCaller = false;


getElement('startBtn').onclick = async () => {

  if (started) return;  
  started = true;  
  isCaller = true;
  const username = getElement('username').value;
  const room = getElement('roomId').value;
  socket.emit('join', { roomId: room, username });                   //1. emit join user 1
  //const stream = await startLocalMedia(getElement('localVideo')); 
  peerConnection = createPeerConnection(socket, room);      
  setupSocketHandlers(socket);
};

getElement('joinBtn').onclick = async () => {
   if (started) return;
  started = true;
  isCaller = false;
  const username = getElement('username').value;
  const room = getElement('roomId').value;
  socket.emit('join', { roomId: room, username })               //4. emit join user 2 -> go to server.
    //const stream = await startLocalMedia(getElement('localVideo'));
  peerConnection = createPeerConnection(socket, room);
  socket.emit('ready-for-offer', room);                         // 5. Server emits 'ready-for-offer'
  setupSocketHandlers(socket);
};

socket.on('room-joined', (data) => {
  isCaller = data.callerId === socket.id;
});

getElement('startCameraBtn').onclick = async () => {
  if (!peerConnection) {
    alert("Please click Start or Connect first to initialize the peer connection.");
    return;
  }
  await startCamera(peerConnection, socket, getElement('roomId').value);
 getElement('localVideo').style.display  = 'block';
getElement('remoteVideo').style.display = 'block';
};


getElement('shareBtn').onclick = () => {                          //1a.
  shareScreen(peerConnection, getElement('sharedScreen'), getElement('roomId').value, socket);    //2a.
};

getElement('stopShareBtn').onclick = () => {
  stopScreenShare(getElement('sharedScreen'), socket, getElement('roomId').value, peerConnection);
};

getElement('muteButton').onclick = () => {
  toggleMute(getLocalStream(), getElement('muteButton'));
};

if (!isCaller) {
getElement('endCallBtn').onclick = () => {
   if (!isCaller) {
    alert("End call only by caller. You have planned to terminate the call, press Leave Call.");
    return;
  }
  const room = getElement('roomId').value;
  socket.emit('end-call'); // this ends call for everyone
  closePeerConnection();
  socket.disconnect();
  alert("Call ended by Caller");
  window.location.href = "/index.html";
};
}

getElement('leaveCallBtn').onclick = () => {
  socket.emit('leave-call'); // Ask server for permission
};