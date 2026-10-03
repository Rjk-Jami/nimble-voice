export interface PeerConnectionState {
  peerId: string;
  userId: string;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  stream?: MediaStream;
}

export interface AudioAmplitudeMap {
  [participantId: string]: number; // 0 to 100
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  audioQualityBitrate: number;
}
