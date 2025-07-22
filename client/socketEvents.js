
//socketevent.js
import { handleOffer, renegotiate, getPeerConnection } from './webrtc.js';
import { addParticipant, getElement } from './ui.js';

export function setupSocketHandlers(socket) {
  socket.on('user-joined', username => {        // after 'user joined' in server.js - this displays name.
    addParticipant(username);
  });

  socket.on('ready-to-call', (roomId) => {                            //8. 
    console.log("Peer is ready, sending offer...");
    const pc = getPeerConnection();
    pc.createOffer()                                            //9.
      .then(offer => pc.setLocalDescription(offer))       //28.
      .then(() => socket.emit('offer', { room: roomId, offer: pc.localDescription }));    //10. before share screen
  });

  socket.on('offer', offer => {             //13.     //13a.
    const room = getElement('roomId').value;
    console.log("Received offer");
    handleOffer(socket, room, offer);       //14.     //14a.
  });

  socket.on('answer', answer => {                       //19.         //19a.
    console.log("Received answer");
    getPeerConnection().setRemoteDescription(new RTCSessionDescription(answer));  //20.     //20a.
  });
  
  socket.on('ice-candidate', candidate => {       //33.
    console.log("Received ICE candidate");
    getPeerConnection().addIceCandidate(new RTCIceCandidate(candidate));    //34.
  });

  socket.on('negotiate', () => {              //7a.
    const room = getElement('roomId').value;
    console.log("Renegotiation requested");
    renegotiate(socket, room);                //8a.
  });

socket.on('join-request', ({ requestorId, username }) => {
  const accept = confirm(`${username} wants to join the call. Allow?`);
  console.log("Join request received from", username, "with ID", requestorId);
  socket.emit('join-response', { requestorId, accepted: accept });
});  


  socket.on('peer-left', () => {
    alert("The other user has left the call.");
    // Optionally reset UI or show "waiting for peer..."
  });

  socket.on('room-full', () => {
    alert("Room is full. Cannot join.");
    window.location.href = "/index.html";
  });

socket.on('left-call', () => {
  closePeerConnection();
  socket.disconnect();
  alert("You left the call.");
  window.location.href = "/index.html";
});

  socket.on('cannot-leave', (message) => {
    alert(message); // Show: "Callee is still in the call. As a caller, you cannot leave."
  });

  socket.on('call-ended', () => {
    alert("Call was ended by the host.");
    window.location.href = "/index.html";
  });

}
