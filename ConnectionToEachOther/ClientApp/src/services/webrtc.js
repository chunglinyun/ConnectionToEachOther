import { sendSignal } from './signalr';

const CHUNK_SIZE = 65536; // 64KB
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// Active peer connections: targetId -> { pc, dc }
const peers = {};

// Called by sender: creates offer and DataChannel, resolves when channel is open
export function createOffer(targetId) {
  return new Promise((resolve, reject) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const dc = pc.createDataChannel('fileTransfer', { ordered: true });

    peers[targetId] = { pc, dc };

    dc.binaryType = 'arraybuffer';
    dc.onopen = () => resolve(dc);
    dc.onerror = (e) => reject(e);
    dc.onclose = () => delete peers[targetId];

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal(targetId, { type: 'ice-candidate', payload: JSON.stringify(e.candidate) });
      }
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        sendSignal(targetId, { type: 'offer', payload: JSON.stringify(pc.localDescription) });
      })
      .catch(reject);
  });
}

// Called by receiver when offer arrives
export function handleOffer(fromId, offerPayload, onFileReceived) {
  return new Promise((resolve, reject) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peers[fromId] = { pc };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal(fromId, { type: 'ice-candidate', payload: JSON.stringify(e.candidate) });
      }
    };

    pc.ondatachannel = (e) => {
      const dc = e.channel;
      dc.binaryType = 'arraybuffer';
      peers[fromId].dc = dc;

      let receivingFile = null;
      let receivedChunks = [];
      let receivedSize = 0;

      dc.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data);
          if (msg.type === 'file-start') {
            receivingFile = { name: msg.name, size: msg.size, fileType: msg.fileType };
            receivedChunks = [];
            receivedSize = 0;
          } else if (msg.type === 'file-end') {
            const blob = new Blob(receivedChunks, {
              type: receivingFile.fileType || 'application/octet-stream',
            });
            onFileReceived && onFileReceived({ ...receivingFile, blob, progress: 100 });
            receivingFile = null;
            receivedChunks = [];
            receivedSize = 0;
          }
        } else {
          receivedChunks.push(event.data);
          receivedSize += event.data.byteLength;
          if (receivingFile) {
            const progress = Math.round((receivedSize / receivingFile.size) * 100);
            onFileReceived && onFileReceived({ ...receivingFile, progress, blob: null });
          }
        }
      };

      dc.onclose = () => delete peers[fromId];
    };

    const offer = JSON.parse(offerPayload);
    pc.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => pc.createAnswer())
      .then((answer) => pc.setLocalDescription(answer))
      .then(() => {
        sendSignal(fromId, { type: 'answer', payload: JSON.stringify(pc.localDescription) });
        resolve();
      })
      .catch(reject);
  });
}

export async function handleAnswer(fromId, answerPayload) {
  const peer = peers[fromId];
  if (!peer) return;
  const answer = JSON.parse(answerPayload);
  await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
}

export async function handleIceCandidate(fromId, candidatePayload) {
  const peer = peers[fromId];
  if (!peer) return;
  try {
    await peer.pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidatePayload)));
  } catch (e) {
    console.warn('[WebRTC] ICE candidate error', e);
  }
}

// Send files after DataChannel is confirmed open
export async function sendFiles(dc, files, onProgress) {
  for (const file of files) {
    dc.send(JSON.stringify({ type: 'file-start', name: file.name, size: file.size, fileType: file.type }));

    let offset = 0;
    while (offset < file.size) {
      // Backpressure: wait if buffer is getting full
      while (dc.bufferedAmount > CHUNK_SIZE * 16) {
        await new Promise((r) => setTimeout(r, 10));
      }
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      dc.send(buffer);
      offset += buffer.byteLength;
      onProgress && onProgress(file.name, Math.round((offset / file.size) * 100));
    }

    dc.send(JSON.stringify({ type: 'file-end', name: file.name }));
  }
}

export function closePeer(targetId) {
  const peer = peers[targetId];
  if (peer) {
    peer.pc.close();
    delete peers[targetId];
  }
}
