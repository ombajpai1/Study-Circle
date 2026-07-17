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

  return (
    <div className="video-tile" style={{
      position: 'relative',
      borderRadius: '16px',
      overflow: 'hidden',
      backgroundColor: 'rgba(30, 41, 59, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      aspectRatio: '4/3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease'
    }}>
      {/* Video Stream */}
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
            transform: isLocal ? 'scaleX(-1)' : 'none', // Mirror local video for natural experience
            borderRadius: '16px'
          }}
        />
      ) : (
        /* Fallback Avatar Badge */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: avatarColor,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            textTransform: 'uppercase'
          }}>
            {(label || '').slice(0, 2)}
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {!stream ? 'Connecting...' : 'Camera Off'}
          </span>
        </div>
      )}

      {/* Floating Name Label */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: '500',
        color: '#FFFFFF',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        pointerEvents: 'none'
      }}>
        {label} {isLocal && '(You)'}
      </div>

      {/* Pop-up Reaction Emoji overlay */}
      {activeReaction && (
        <div className="reaction-bubble" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1)',
          fontSize: '4.5rem',
          pointerEvents: 'none',
          animation: 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          zIndex: 10
        }}>
          {activeReaction}
        </div>
      )}
    </div>
  );
}

export function VideoGrid() {
  const { peers, localStream, activeReactions, roomInfo } = useRoom();

  const activePeers = Object.values(peers);
  const totalTiles = activePeers.length + 1;

  // Determine grid columns dynamically for beautiful layouts
  let gridTemplateColumns = '1fr';
  if (totalTiles >= 5) {
    gridTemplateColumns = 'repeat(3, 1fr)';
  } else if (totalTiles >= 2) {
    gridTemplateColumns = 'repeat(2, 1fr)';
  }

  // Create a helper for user initials / color fallback
  const hostColor = '#8B5CF6';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: gridTemplateColumns,
      gap: '16px',
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '8px'
    }}>
      {/* Local Participant Tile */}
      <VideoTile
        stream={localStream}
        label="You"
        avatarColor={hostColor}
        muted={true}
        activeReaction={activeReactions[roomInfo?.host_id || ''] || activeReactions['']}
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
    </div>
  );
}
