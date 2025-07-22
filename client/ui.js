//ui.js
export function getElement(id) {    
  return document.getElementById(id);
}

export function addParticipant(name) {
  const el = document.createElement('p');
  el.textContent = `${name} joined the room`;
  getElement('participants').appendChild(el); 
}

export function toggleMute(localStream, button) {
  const track = localStream.getAudioTracks()[0];
  if (track) {
    track.enabled = !track.enabled;
    button.textContent = track.enabled ? "Mute" : "Unmute";
  }
}
