import * as signalR from '@microsoft/signalr';

let connection = null;

export function getConnection() {
  return connection;
}

export async function startConnection(onClientListUpdated, onReceiveSignal, onTransferRequest, onTransferResponse) {
  connection = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/transfer')
    .withAutomaticReconnect()
    .build();

  connection.on('ClientListUpdated', (clients) => {
    onClientListUpdated && onClientListUpdated(clients);
  });

  connection.on('ReceiveSignal', (fromId, signal) => {
    onReceiveSignal && onReceiveSignal(fromId, signal);
  });

  connection.on('TransferRequest', (request) => {
    onTransferRequest && onTransferRequest(request);
  });

  connection.on('TransferResponse', (fromId, accepted) => {
    onTransferResponse && onTransferResponse(fromId, accepted);
  });

  await connection.start();
  return connection;
}

export async function registerClient(displayName) {
  await connection.invoke('RegisterClient', displayName);
}

export async function sendSignal(targetConnectionId, signal) {
  await connection.invoke('SendSignal', targetConnectionId, signal);
}

export async function requestTransfer(targetConnectionId, files) {
  await connection.invoke('RequestTransfer', targetConnectionId, files);
}

export async function respondTransfer(targetConnectionId, accepted) {
  await connection.invoke('RespondTransfer', targetConnectionId, accepted);
}
