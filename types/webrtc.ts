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
  audioQualityBitrate?: number;
}

export interface SignalingOfferPayload {
  targetSocketId: string;
  senderSocketId?: string;
  sdp: RTCSessionDescriptionInit;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
    isHost?: boolean;
  };
}

export interface SignalingAnswerPayload {
  targetSocketId: string;
  senderSocketId?: string;
  sdp: RTCSessionDescriptionInit;
}

export interface SignalingIcePayload {
  targetSocketId: string;
  senderSocketId?: string;
  candidate: RTCIceCandidateInit;
}

export interface VoiceSpeakingPayload {
  roomId: string;
  userId: string;
  isSpeaking: boolean;
  level: number;
}

export interface VoiceStateTogglePayload {
  roomId: string;
  userId: string;
  isMuted?: boolean;
  isDeafened?: boolean;
  handRaised?: boolean;
}
