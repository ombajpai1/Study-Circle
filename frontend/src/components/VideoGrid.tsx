import { useEffect, useRef } from 'react';
import { useRoom } from '../context/RoomContext';

interface VideoTileProps {
  stream: MediaStream | null;
  label: string;
  avatarColor: string;
  muted?: boolean;
  activeReaction?: string;
  isLocal?: boolean;
}

function VideoTile({ stream, label, avatarColor, muted = false, activeReaction, isLocal = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideoTrack = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
  const initials = label.substring(0, 2).toUpperCase();

  return (
    <div className={`video-tile ${isLocal ? 'video-active' : ''}`}>
      {/* Video stream rendering */}
      {stream && hasVideoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: isLocal ? 'scaleX(-1)' : 'none',
            position: 'absolute',
            inset: 0
          }}
        />
      ) : (
        /* Fallback initials badge */
        <div 
          className="video-av" 
          style={{ 
            backgroundColor: avatarColor || 'var(--accent-bg)', 
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500
          }}
        >
          {initials}
        </div>
      )}

      {/* Floating Name overlay */}
      <div className="video-name" style={{ marginTop: stream && hasVideoTrack ? 'auto' : '0', zIndex: 5 }}>
        {label} {isLocal && '(You)'}
      </div>

      {/* Reaction popup */}
      {activeReaction && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '3rem',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          {activeReaction}
        </div>
      )}
    </div>
  );
}

export function VideoGrid() {
  const { peers, localStream, activeReactions } = useRoom();

  const activePeers = Object.values(peers);

  return (
    <div className="video-grid">
      {/* Local Participant Tile */}
      <VideoTile
        stream={localStream}
        label="You"
        avatarColor="var(--accent-bg)"
        muted={true}
        activeReaction={activeReactions['']}
        isLocal={true}
      />

      {/* Remote Participant Tiles */}
      {activePeers.map(p => (
        <VideoTile
          key={p.userId}
          stream={p.stream}
          label={p.displayName}
          avatarColor={p.avatarColor}
          muted={false}
          activeReaction={activeReactions[p.userId]}
        />
      ))}
      
      {/* Invite Tile */}
      <div className="video-tile" style={{ borderStyle: 'dashed', opacity: 0.4 }}>
        <div className="video-av" style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}>
          +
        </div>
        <div className="video-name">Invite</div>
      </div>
    </div>
  );
}
