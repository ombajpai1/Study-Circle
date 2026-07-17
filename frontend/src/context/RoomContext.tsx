import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import SimplePeer from 'simple-peer';
import { api, getAccessToken } from '../api/client';
import type { StudyRoom } from '../api/client';

const Peer = (SimplePeer as any).default || SimplePeer;

export interface PeerEntry {
  peer: SimplePeer.Instance;
  stream: MediaStream | null;
  userId: string;
  displayName: string;
  avatarColor: string;
}

export interface ChatMessageEntry {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

export interface TimerSync {
  phase: 'idle' | 'focus' | 'break';
  started_at: string;
  focus_minutes: number;
  break_minutes: number;
}

interface RoomContextValue {
  peers: Record<string, PeerEntry>;
  localStream: MediaStream | null;
  roomInfo: StudyRoom | null;
  timerState: TimerSync | null;
  chatMessages: ChatMessageEntry[];
  activeReactions: Record<string, string>; // userId -> emoji
  isMicOn: boolean;
  isCameraOn: boolean;
  
  createRoom: (name: string, password?: string, subjectId?: string | null, focusMinutes?: number, breakMinutes?: number, maxParticipants?: number) => Promise<StudyRoom>;
  joinRoom: (code: string, password?: string) => Promise<StudyRoom>;
  leaveRoom: () => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
  sendChat: (text: string) => void;
  sendReaction: (emoji: string) => void;
  startTimer: (phase: 'focus' | 'break') => void;
  stopTimer: () => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRoom must be used within a RoomProvider');
  return context;
}

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [peers, setPeers] = useState<Record<string, PeerEntry>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [roomInfo, setRoomInfo] = useState<StudyRoom | null>(null);
  const [timerState, setTimerState] = useState<TimerSync | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageEntry[]>([]);
  const [activeReactions, setActiveReactions] = useState<Record<string, string>>({});
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const myIdRef = useRef<string>('');
  const peersRef = useRef<Record<string, PeerEntry>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const reactionTimeoutsRef = useRef<Record<string, number>>({});

  const updatePeers = useCallback((fn: (prev: Record<string, PeerEntry>) => Record<string, PeerEntry>) => {
    setPeers(prev => {
      const next = fn(prev);
      peersRef.current = next;
      return next;
    });
  }, []);

  const cleanupConnections = useCallback(() => {
    // Destroy all simple-peer connections
    Object.values(peersRef.current).forEach(entry => {
      try {
        entry.peer.destroy();
      } catch (err) {
        console.error('Error destroying peer connection:', err);
      }
    });

    // Stop local video/audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Reset state
    setPeers({});
    setLocalStream(null);
    setRoomInfo(null);
    setTimerState(null);
    setChatMessages([]);
    setActiveReactions({});
    localStreamRef.current = null;
    myIdRef.current = '';
  }, []);

  // WebRTC simple-peer creation helpers
  const initiateOffer = useCallback((targetId: string, stream: MediaStream, iceServers: any[]) => {
    if (peersRef.current[targetId]?.peer) return;

    console.log(`[RoomContext] Initiating WebRTC offer to peer ${targetId}`);
    const peer = new Peer({
      initiator: true,
      stream,
      config: { iceServers },
      trickle: true,
    });

    peer.on('signal', (data: any) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          ...data,
          type: data.type || 'ice_candidate',
          target_id: targetId
        }));
      }
    });

    peer.on('stream', (remoteStream: MediaStream) => {
      console.log(`[RoomContext] Received remote stream from peer ${targetId}`);
      updatePeers(prev => ({
        ...prev,
        [targetId]: { ...prev[targetId], stream: remoteStream }
      }));
    });

    peer.on('error', (err: Error) => {
      console.error(`[RoomContext] Peer connection error with ${targetId}:`, err);
    });

    updatePeers(prev => ({
      ...prev,
      [targetId]: { 
        peer, 
        stream: null, 
        userId: targetId, 
        displayName: prev[targetId]?.displayName || targetId.slice(0, 6), 
        avatarColor: prev[targetId]?.avatarColor || '#3B82F6' 
      }
    }));
  }, [updatePeers]);

  const createAnsweringPeer = useCallback((peerId: string, stream: MediaStream, iceServers: any[], offerMsg: any) => {
    if (peersRef.current[peerId]?.peer) {
      peersRef.current[peerId].peer.signal(offerMsg);
      return;
    }

    console.log(`[RoomContext] Creating answering peer connection for ${peerId}`);
    const peer = new Peer({
      initiator: false,
      stream,
      config: { iceServers },
      trickle: true,
    });

    peer.on('signal', (data: any) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          ...data,
          type: data.type || 'ice_candidate',
          target_id: peerId
        }));
      }
    });

    peer.on('stream', (remoteStream: MediaStream) => {
      console.log(`[RoomContext] Received remote stream from answering peer ${peerId}`);
      updatePeers(prev => ({
        ...prev,
        [peerId]: { ...prev[peerId], stream: remoteStream }
      }));
    });

    peer.on('error', (err: Error) => {
      console.error(`[RoomContext] Answering peer error with ${peerId}:`, err);
    });

    peer.signal(offerMsg);

    updatePeers(prev => ({
      ...prev,
      [peerId]: { 
        peer, 
        stream: null, 
        userId: peerId, 
        displayName: prev[peerId]?.displayName || peerId.slice(0, 6), 
        avatarColor: prev[peerId]?.avatarColor || '#3B82F6' 
      }
    }));
  }, [updatePeers]);

  // Connects to rooms signaling socket and captures media tracks
  const initializeRoomConnections = useCallback(async (room: StudyRoom, token: string) => {
    // 1. Capture local audio/video media stream
    console.log('[RoomContext] Capturing user camera & audio...');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, frameRate: 24 },
      audio: { echoCancellation: true, noiseSuppression: true }
    });
    setLocalStream(stream);
    localStreamRef.current = stream;
    setIsMicOn(true);
    setIsCameraOn(true);

    // 2. Fetch TURN authentication credentials
    console.log('[RoomContext] Fetching TURN server tokens...');
    const credentials = await api.rooms.getTurnCredentials();
    const iceServers = [
      {
        urls: credentials.urls,
        username: credentials.username,
        credential: credentials.credential
      }
    ];

    // 3. Connect to room signaling WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.hostname}:8000/api/v1/ws/room/${room.id}?token=${token}`;
    console.log(`[RoomContext] Connecting to signaling socket: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[RoomContext] Signaling WebSocket connected.');
    };

    ws.onerror = (err) => {
      console.error('[RoomContext] Room WebSocket error:', err);
    };

    ws.onclose = (event) => {
      console.log(`[RoomContext] Room WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'No reason given'}`);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type } = msg;

        switch (type) {
          case 'room_joined': {
            console.log(`[RoomContext] Joined room successfully. My ID: ${msg.your_id}`);
            myIdRef.current = msg.your_id;
            
            // Connect to peers who are already in the room
            msg.peers.forEach((peerId: string) => {
              // Asymmetric initialization: only smaller user_id generates the offer
              if (msg.your_id < peerId) {
                initiateOffer(peerId, stream, iceServers);
              }
            });
            break;
          }
          case 'peer_joined': {
            const { peer_id, display_name, avatar_color } = msg;
            console.log(`[RoomContext] Peer joined room: ${display_name} (${peer_id})`);
            
            updatePeers(prev => {
              const existing = prev[peer_id];
              return {
                ...prev,
                [peer_id]: {
                  peer: existing?.peer,
                  stream: existing?.stream || null,
                  userId: peer_id,
                  displayName: display_name,
                  avatarColor: avatar_color
                }
              };
            });

            // Asymmetric connection: smaller user_id sends the offer
            if (myIdRef.current < peer_id) {
              initiateOffer(peer_id, stream, iceServers);
            }
            break;
          }
          case 'offer': {
            console.log(`[RoomContext] Received offer from ${msg.sender_id}`);
            createAnsweringPeer(msg.sender_id, stream, iceServers, msg);
            break;
          }
          case 'answer':
          case 'ice_candidate': {
            const targetPeer = peersRef.current[msg.sender_id]?.peer;
            if (targetPeer) {
              targetPeer.signal(msg);
            }
            break;
          }
          case 'peer_left': {
            console.log(`[RoomContext] Peer left room: ${msg.peer_id}`);
            const entry = peersRef.current[msg.peer_id];
            if (entry) {
              entry.peer.destroy();
            }
            updatePeers(prev => {
              const next = { ...prev };
              delete next[msg.peer_id];
              return next;
            });
            break;
          }
          case 'chat': {
            const senderFriend = peersRef.current[msg.sender_id];
            const senderName = senderFriend ? senderFriend.displayName : msg.sender_id.slice(0, 6);
            setChatMessages(prev => [
              ...prev,
              {
                senderId: msg.sender_id,
                senderName,
                text: msg.text,
                timestamp: new Date()
              }
            ]);
            break;
          }
          case 'reaction': {
            const { sender_id, emoji } = msg;
            setActiveReactions(prev => ({
              ...prev,
              [sender_id]: emoji
            }));
            
            // Clear reaction after 4 seconds
            if (reactionTimeoutsRef.current[sender_id]) {
              window.clearTimeout(reactionTimeoutsRef.current[sender_id]);
            }
            reactionTimeoutsRef.current[sender_id] = window.setTimeout(() => {
              setActiveReactions(prev => {
                const next = { ...prev };
                delete next[sender_id];
                return next;
              });
            }, 4000);
            break;
          }
          case 'timer_sync': {
            setTimerState({
              phase: msg.phase,
              started_at: msg.started_at,
              focus_minutes: msg.focus_minutes,
              break_minutes: msg.break_minutes
            });
            break;
          }
          case 'timer_stopped': {
            setTimerState(null);
            break;
          }
          case 'room_ended': {
            console.log('[RoomContext] Host terminated room. Leaving...');
            cleanupConnections();
            break;
          }
          case 'pong':
            break;
        }
      } catch (err) {
        console.error('[RoomContext] Error processing socket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('[RoomContext] Room WebSocket closed.');
    };
  }, [cleanupConnections, initiateOffer, createAnsweringPeer, updatePeers]);

  // REST API wrappers
  const createRoom = useCallback(async (
    name: string, 
    password?: string, 
    subjectId?: string | null, 
    focusMinutes?: number, 
    breakMinutes?: number, 
    maxParticipants?: number
  ) => {
    const room = await api.rooms.create({
      name,
      password,
      subject_id: subjectId,
      focus_minutes: focusMinutes,
      break_minutes: breakMinutes,
      max_participants: maxParticipants
    });
    
    setRoomInfo(room);
    const token = getAccessToken();
    if (token) {
      await initializeRoomConnections(room, token);
    }
    return room;
  }, [initializeRoomConnections]);

  const joinRoom = useCallback(async (code: string, password?: string) => {
    cleanupConnections();
    const room = await api.rooms.join({ code, password });
    setRoomInfo(room);
    
    const token = getAccessToken();
    if (token) {
      await initializeRoomConnections(room, token);
    }
    return room;
  }, [cleanupConnections, initializeRoomConnections]);

  const leaveRoom = useCallback(async () => {
    if (roomInfo) {
      try {
        await api.rooms.leave(roomInfo.id);
      } catch (err) {
        console.error('Error leaving room on backend:', err);
      }
    }
    cleanupConnections();
  }, [roomInfo, cleanupConnections]);

  // WebRTC track toggles
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, []);

  // Signaling message triggers
  const sendChat = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        text
      }));
      // Append locally
      setChatMessages(prev => [
        ...prev,
        {
          senderId: myIdRef.current,
          senderName: 'You',
          text,
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reaction',
        emoji
      }));
      // Display locally
      const sender = myIdRef.current;
      setActiveReactions(prev => ({
        ...prev,
        [sender]: emoji
      }));

      if (reactionTimeoutsRef.current[sender]) {
        window.clearTimeout(reactionTimeoutsRef.current[sender]);
      }
      reactionTimeoutsRef.current[sender] = window.setTimeout(() => {
        setActiveReactions(prev => {
          const next = { ...prev };
          delete next[sender];
          return next;
        });
      }, 4000);
    }
  }, []);

  const startTimer = useCallback((phase: 'focus' | 'break') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'timer_start',
        phase
      }));
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'timer_stop'
      }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupConnections();
      // Clear all active reaction timers
      Object.values(reactionTimeoutsRef.current).forEach(t => window.clearTimeout(t));
    };
  }, [cleanupConnections]);

  return (
    <RoomContext.Provider value={{
      peers,
      localStream,
      roomInfo,
      timerState,
      chatMessages,
      activeReactions,
      isMicOn,
      isCameraOn,
      createRoom,
      joinRoom,
      leaveRoom,
      toggleMic,
      toggleCamera,
      sendChat,
      sendReaction,
      startTimer,
      stopTimer
    }}>
      {children}
    </RoomContext.Provider>
  );
}
