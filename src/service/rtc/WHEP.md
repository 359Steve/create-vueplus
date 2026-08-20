                    WHEP / WebRTC 播放

```txt
┌──────────────┐                         ┌──────────────┐
│    浏览器     │                         │     SRS      │
│   Player     │                         │    Server    │
└──────┬───────┘                         └──────┬───────┘
       │                                        │
       │ ① 创建 RTCPeerConnection               │
       │                                        │
       │ ② addTransceiver(video, recvonly)     │
       │ ③ addTransceiver(audio, recvonly)     │
       │                                        │
       │ ④ createOffer()                       │
       │                                        │
       │ ⑤ setLocalDescription(offer)          │
       │                                        │
       │ ⑥ ICE Gathering                        │
       │    收集 Candidate                       │
       │                                        │
       │ ⑦ POST WHEP                           │
       │    Offer SDP                           │
       │ ─────────────────────────────────────> │
       │                                        │
       │                         ⑧ 创建 Answer  │
       │                                        │
       │ ⑨ 返回 Answer SDP                     │
       │ <───────────────────────────────────── │
       │                                        │
       │ ⑩ setRemoteDescription(answer)         │
       │                                        │
       │ ⑪ ICE / DTLS / SRTP 建立               │
       │ <════════════════════════════════════> │
       │                                        │
       │ ⑫ ontrack                             │
       │ <────────── 音视频 RTP ─────────────── │
       │                                        │
       │ ⑬ MediaStream                          │
       │                                        │
       │ ⑭ video.srcObject                     │
       │                                        │
       │ ⑮ video.play()                        │
       │                                        │
```
