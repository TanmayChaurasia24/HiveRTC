// ═══════════════════════════════════════════════════════════════
// @hivertc/react — ControlBar Component
// Pre-built floating control bar with mic, camera, screen
// share, recording, hand raise, and leave buttons.
// ═══════════════════════════════════════════════════════════════

export interface ControlBarProps {
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isHandRaised: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onShareScreen: () => void;
  onStopScreenShare: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onRaiseHand: () => void;
  onLowerHand: () => void;
  onLeave: () => void;
  /** Optional CSS class */
  className?: string;
}

/**
 * A pre-built meeting control bar with all standard controls.
 * Uses inline styles for zero-dependency styling.
 *
 * @example
 * ```tsx
 * <ControlBar
 *   isMicOn={isMicOn}
 *   isCamOn={isCamOn}
 *   isScreenSharing={isScreenSharing}
 *   isRecording={isRecording}
 *   isHandRaised={isHandRaised}
 *   onToggleMic={toggleMic}
 *   onToggleCam={toggleCam}
 *   onShareScreen={shareScreen}
 *   onStopScreenShare={stopScreenShare}
 *   onStartRecording={startRecording}
 *   onStopRecording={stopRecording}
 *   onRaiseHand={raiseHand}
 *   onLowerHand={lowerHand}
 *   onLeave={leaveRoom}
 * />
 * ```
 */
export function ControlBar({
  isMicOn,
  isCamOn,
  isScreenSharing,
  isRecording,
  isHandRaised,
  onToggleMic,
  onToggleCam,
  onShareScreen,
  onStopScreenShare,
  onStartRecording,
  onStopRecording,
  onRaiseHand,
  onLowerHand,
  onLeave,
  className = '',
}: ControlBarProps) {
  const barStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  };

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.2s ease',
  };

  const btnActive: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: '#fff',
  };

  const btnOff: React.CSSProperties = {
    ...btnBase,
    backgroundColor: '#ef4444',
    color: '#fff',
  };

  const btnFeature: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
  };

  const btnFeatureActive: React.CSSProperties = {
    ...btnBase,
    backgroundColor: '#6366f1',
    color: '#fff',
  };

  const leaveStyle: React.CSSProperties = {
    ...btnBase,
    width: 'auto',
    padding: '0 20px',
    backgroundColor: '#fff',
    color: '#ef4444',
    fontWeight: 700,
    fontSize: '14px',
    gap: '6px',
  };

  const divider: React.CSSProperties = {
    width: '1px',
    height: '32px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    margin: '0 4px',
  };

  return (
    <div style={barStyle} className={className}>
      {/* Mic */}
      <button
        onClick={onToggleMic}
        style={isMicOn ? btnActive : btnOff}
        title={isMicOn ? 'Mute' : 'Unmute'}
      >
        {isMicOn ? '🎙️' : '🔇'}
      </button>

      {/* Camera */}
      <button
        onClick={onToggleCam}
        style={isCamOn ? btnActive : btnOff}
        title={isCamOn ? 'Turn off camera' : 'Turn on camera'}
      >
        {isCamOn ? '📹' : '📷'}
      </button>

      <div style={divider} />

      {/* Screen Share */}
      <button
        onClick={isScreenSharing ? onStopScreenShare : onShareScreen}
        style={isScreenSharing ? btnFeatureActive : btnFeature}
        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
      >
        🖥️
      </button>

      {/* Recording */}
      <button
        onClick={isRecording ? onStopRecording : onStartRecording}
        style={isRecording ? btnFeatureActive : btnFeature}
        title={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? '⏹️' : '⏺️'}
      </button>

      {/* Hand Raise */}
      <button
        onClick={isHandRaised ? onLowerHand : onRaiseHand}
        style={isHandRaised ? btnFeatureActive : btnFeature}
        title={isHandRaised ? 'Lower hand' : 'Raise hand'}
      >
        ✋
      </button>

      <div style={divider} />

      {/* Leave */}
      <button onClick={onLeave} style={leaveStyle} title="Leave meeting">
        📞 Leave
      </button>
    </div>
  );
}
