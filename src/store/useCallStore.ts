import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { playLoop, stopLoop } from '../lib/audioManager';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'declined';

interface CallStore {
  callStatus: CallStatus;
  callDuration: number;
  otherUser: { id: string, name: string, avatar_url: string } | null;
  matchId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  incomingOffer: any | null;
  
  // Actions
  setCallStatus: (status: CallStatus) => void;
  setOtherUser: (user: any) => void;
  setMatchId: (id: string | null) => void;
  setCallDuration: (d: number) => void;
  setIncomingOffer: (offer: any) => void;
  
  initCall: (isCaller: boolean, otherUser: any, matchId: string, myId: string) => Promise<void>;
  acceptCall: (myId: string) => Promise<void>;
  endCall: (notify: boolean, myId: string) => void;
  addRemoteIceCandidate: (candidate: any) => Promise<void>;
  handleCallAnswer: (answer: any) => Promise<void>;
}

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

let callTimerInterval: any = null;
let offerBroadcastInterval: any = null;
let iceCandidateBuffer: RTCIceCandidate[] = [];
let incomingIceBuffer: RTCIceCandidateInit[] = [];
let remoteDescSet = false;

export const useCallStore = create<CallStore>((set, get) => ({
  callStatus: 'idle',
  callDuration: 0,
  otherUser: null,
  matchId: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  incomingOffer: null,

  setCallStatus: (status) => set({ callStatus: status }),
  setOtherUser: (user) => set({ otherUser: user }),
  setMatchId: (id) => set({ matchId: id }),
  setCallDuration: (d) => set({ callDuration: d }),
  setIncomingOffer: (offer) => set({ incomingOffer: offer }),

  initCall: async (isCaller, targetUser, matchId, myId) => {
    try {
      const { peerConnection: existingPc, localStream: existingStream } = get();
      if (existingPc) existingPc.close();
      if (existingStream) existingStream.getTracks().forEach(t => t.stop());

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });

      const pc = new RTCPeerConnection(ICE_CONFIG);
      set({ 
        localStream: stream, 
        peerConnection: pc, 
        otherUser: targetUser, 
        matchId,
        callStatus: isCaller ? 'calling' : 'ringing' 
      });

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          set({ remoteStream: event.streams[0] });
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          if (remoteDescSet) {
             const channel = supabase.channel(`presence_${matchId}`);
             channel.subscribe(status => {
               if (status === 'SUBSCRIBED') {
                 channel.send({ type: 'broadcast', event: 'ice_candidate', payload: { candidate: event.candidate, to: targetUser.id } });
               }
             });
          } else {
            iceCandidateBuffer.push(event.candidate as RTCIceCandidate);
          }
        }
      };

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        playLoop('dialing');
        
        const broadcastOffer = () => {
           const channel = supabase.channel(`presence_${matchId}`);
           channel.subscribe(status => {
             if (status === 'SUBSCRIBED') {
               channel.send({ type: 'broadcast', event: 'call_offer', payload: { offer, from: myId, to: targetUser.id } });
             }
           });
           
           // Global redundant channel
           const globalChan = supabase.channel(`user_channel_${targetUser.id}`);
           globalChan.subscribe((status) => {
             if (status === 'SUBSCRIBED') {
               globalChan.send({ type: 'broadcast', event: 'call_offer', payload: { matchId: matchId, offer, from: myId, to: targetUser.id } });
               setTimeout(() => supabase.removeChannel(globalChan), 1500);
             }
           });
        };

        broadcastOffer();
        if (offerBroadcastInterval) clearInterval(offerBroadcastInterval);
        offerBroadcastInterval = setInterval(broadcastOffer, 3000);

        // Push notify
        supabase.functions.invoke('push-notify', {
          body: {
            user_id: targetUser.id,
            type: 'call',
            match_id: matchId,
            message: `Someone is calling you! 🎙️`,
          }
        });
      }
    } catch (err) {
      console.error('Core Call Error:', err);
      get().endCall(true, myId);
    }
  },

  acceptCall: async (myId) => {
    const { incomingOffer, otherUser, matchId } = get();
    if (!incomingOffer || !otherUser || !matchId) return;
    
    await get().initCall(false, otherUser, matchId, myId);
    const { peerConnection: pc } = get();
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      remoteDescSet = true;
      
      // Flush buffered ICE
      iceCandidateBuffer.forEach(candidate => {
        const channel = supabase.channel(`presence_${matchId}`);
        channel.send({ type: 'broadcast', event: 'ice_candidate', payload: { candidate, to: otherUser.id } });
      });
      iceCandidateBuffer = [];
      
      // Process incoming buffered ICE
      for (const cand of incomingIceBuffer) {
        try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch(e){}
      }
      incomingIceBuffer = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const channel = supabase.channel(`presence_${matchId}`);
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event: 'call_answer', payload: { answer, from: myId, to: otherUser.id } });
        }
      });

      set({ callStatus: 'connected', callDuration: 0 });
      stopLoop();
      if (callTimerInterval) clearInterval(callTimerInterval);
      callTimerInterval = setInterval(() => set(s => ({ callDuration: s.callDuration + 1 })), 1000);
    } catch (e) {
      get().endCall(true, myId);
    }
  },

  handleCallAnswer: async (answer) => {
    const { peerConnection: pc, otherUser, matchId } = get();
    if (!pc || !otherUser || !matchId) return;
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      remoteDescSet = true;
      
      if (offerBroadcastInterval) { clearInterval(offerBroadcastInterval); offerBroadcastInterval = null; }

      // Flush ICE
      iceCandidateBuffer.forEach(candidate => {
        const channel = supabase.channel(`presence_${matchId}`);
        channel.send({ type: 'broadcast', event: 'ice_candidate', payload: { candidate, to: otherUser.id } });
      });
      iceCandidateBuffer = [];

      set({ callStatus: 'connected', callDuration: 0 });
      stopLoop();
      if (callTimerInterval) clearInterval(callTimerInterval);
      callTimerInterval = setInterval(() => set(s => ({ callDuration: s.callDuration + 1 })), 1000);
    } catch (e) {}
  },

  addRemoteIceCandidate: async (candidate) => {
    const { peerConnection: pc } = get();
    if (!pc) return;
    
    if (remoteDescSet) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e){}
    } else {
      incomingIceBuffer.push(candidate);
    }
  },

  endCall: (notify, myId) => {
    const { peerConnection, localStream, otherUser, matchId, callStatus } = get();
    
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
    if (offerBroadcastInterval) { clearInterval(offerBroadcastInterval); offerBroadcastInterval = null; }
    stopLoop();
    
    const prevStatus = callStatus;
    set({ 
      callStatus: 'idle', 
      callDuration: 0, 
      peerConnection: null, 
      localStream: null, 
      remoteStream: null,
      incomingOffer: null
    });
    
    iceCandidateBuffer = [];
    incomingIceBuffer = [];
    remoteDescSet = false;

    if (notify && otherUser && matchId) {
      const eventType = prevStatus === 'ringing' || prevStatus === 'calling' ? 'call_declined' : 'call_end';
      const channel = supabase.channel(`presence_${matchId}`);
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event: eventType, payload: { to: otherUser.id, from: myId } });
        }
      });
      
      const globalChan = supabase.channel(`user_channel_${otherUser.id}`);
      globalChan.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          globalChan.send({ type: 'broadcast', event: eventType, payload: { from: myId, to: otherUser.id } });
          setTimeout(() => supabase.removeChannel(globalChan), 2000);
        }
      });
    }
  }
}));
