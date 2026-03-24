import React, { useState, useEffect, useCallback, useRef } from 'react';
import ClientList from './components/ClientList';
import DropZone from './components/DropZone';
import TransferQueue from './components/TransferQueue';
import IncomingRequestModal from './components/IncomingRequestModal';
import AdZone from './components/AdZone';
import * as signalRService from './services/signalr';
import * as webrtc from './services/webrtc';
import './App.css';

const DEFAULT_NAME = 'Device-' + Math.random().toString(36).slice(2, 6).toUpperCase();

export default function App() {
  const [myName] = useState(DEFAULT_NAME);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [files, setFiles] = useState([]);
  const [transfers, setTransfers] = useState([]); // outgoing
  const [receivedFiles, setReceivedFiles] = useState([]); // incoming
  const [incomingRequest, setIncomingRequest] = useState(null);
  const pendingFilesRef = useRef([]);

  const updateTransfer = useCallback((fileName, targetName, progress, status) => {
    setTransfers((prev) => {
      const idx = prev.findIndex((t) => t.fileName === fileName && t.targetName === targetName);
      if (idx === -1) {
        return [...prev, { fileName, targetName, progress, status }];
      }
      const updated = [...prev];
      updated[idx] = { ...updated[idx], progress, status };
      return updated;
    });
  }, []);

  const handleFileReceived = useCallback((fromName) => (fileInfo) => {
    setReceivedFiles((prev) => {
      const idx = prev.findIndex((f) => f.name === fileInfo.name && f.fromName === fromName);
      const entry = { ...fileInfo, fromName };
      if (idx === -1) return [...prev, entry];
      const updated = [...prev];
      updated[idx] = entry;
      return updated;
    });
  }, []);

  const handleReceiveSignal = useCallback(async (fromId, signal) => {
    if (signal.type === 'offer') {
      const fromClient = clients.find((c) => c.connectionId === fromId);
      const name = fromClient ? fromClient.displayName : fromId;
      await webrtc.handleOffer(fromId, signal.payload, handleFileReceived(name));
    } else if (signal.type === 'answer') {
      await webrtc.handleAnswer(fromId, signal.payload);
    } else if (signal.type === 'ice-candidate') {
      await webrtc.handleIceCandidate(fromId, signal.payload);
    }
  }, [clients, handleFileReceived]); // eslint-disable-line

  useEffect(() => {
    signalRService.startConnection(
      (list) => setClients(list),
      handleReceiveSignal,
      (request) => setIncomingRequest(request),
      async (fromId, accepted) => {
        if (!accepted) return;
        const filesToSend = pendingFilesRef.current[fromId];
        if (!filesToSend) return;
        delete pendingFilesRef.current[fromId];
        const targetName = clients.find((c) => c.connectionId === fromId)?.displayName || fromId;
        try {
          const dc = await webrtc.createOffer(fromId); // resolves when DataChannel opens
          for (const f of filesToSend) updateTransfer(f.name, targetName, 0, 'sending');
          await webrtc.sendFiles(dc, filesToSend, (fileName, progress) => {
            updateTransfer(fileName, targetName, progress, progress === 100 ? 'done' : 'sending');
          });
        } catch (e) {
          console.error('[Transfer] WebRTC failed', e);
          for (const f of filesToSend) updateTransfer(f.name, targetName, 0, 'error');
        }
      }
    ).then(() => {
      signalRService.registerClient(myName);
    });
  }, []); // eslint-disable-line

  const handleRescan = () => signalRService.getConnection()?.invoke('GetLanClients');

  const handleSend = async () => {
    if (!selectedClient || files.length === 0) return;
    const fileInfos = files.map((f) => ({ name: f.name, size: f.size, type: f.type }));
    await signalRService.requestTransfer(selectedClient.connectionId, fileInfos);
    // Store files to send after peer accepts
    pendingFilesRef.current[selectedClient.connectionId] = files;
    setFiles([]);
  };

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;
    await signalRService.respondTransfer(incomingRequest.fromId, true);
    setIncomingRequest(null);
  };

  const handleDeclineRequest = async () => {
    if (!incomingRequest) return;
    await signalRService.respondTransfer(incomingRequest.fromId, false);
    setIncomingRequest(null);
  };

  return (
    <div className="app-root">
      {/* Header */}
      <header className="app-header">
        <div className="header-logo">⚡ LAN File Transfer</div>
        <div className="header-name">你的名稱：<strong>{myName}</strong></div>
      </header>

      {/* AD ZONE A — 728x90 Leaderboard */}
      <AdZone id="ad-zone-a" height={90} label="廣告版位 A — 728×90 橫幅廣告" className="ad-leaderboard" />

      {/* Main layout */}
      <div className="app-body">
        {/* Left: Client list */}
        <aside className="app-sidebar-left">
          <ClientList
            clients={clients}
            selectedId={selectedClient?.connectionId}
            onSelect={setSelectedClient}
            onRescan={handleRescan}
          />
        </aside>

        {/* Center: Drop zone */}
        <main className="app-main">
          <DropZone
            selectedClient={selectedClient}
            files={files}
            onFilesAdded={(newFiles) => setFiles((prev) => [...prev, ...newFiles])}
            onSend={handleSend}
            onClearFiles={() => setFiles([])}
          />
        </main>

        {/* Right: Ad zones */}
        <aside className="app-sidebar-right">
          {/* AD ZONE B — 300x600 Half Page */}
          <AdZone id="ad-zone-b" width={300} height={600} label="廣告版位 B — 300×600" />
          {/* AD ZONE C — 300x250 Medium Rectangle */}
          <AdZone id="ad-zone-c" width={300} height={250} label="廣告版位 C — 300×250" className="ad-mt" />
        </aside>
      </div>

      {/* Transfer queue */}
      <TransferQueue transfers={transfers} receivedFiles={receivedFiles} />

      {/* AD ZONE D — 728x90 Footer */}
      <AdZone id="ad-zone-d" height={90} label="廣告版位 D — 728×90 底部橫幅廣告" className="ad-leaderboard" />

      <footer className="app-footer">
        LAN File Transfer v1.0 — WebRTC P2P
      </footer>

      {/* Incoming transfer modal */}
      <IncomingRequestModal
        request={incomingRequest}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
      />
    </div>
  );
}
