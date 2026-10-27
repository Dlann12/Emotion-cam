import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Bookmark, Sparkles, CheckCircle2, AlertCircle, Eye, EyeOff, Zap, Volume2, VolumeX } from 'lucide-react';
import { api } from '../utils/api';
import { getEmotionMeta, EMOTIONS } from '../utils/emotions';
import { sound } from '../utils/audio';

interface FaceResult {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  emotion: string;
  confidence: number;
  scores: Record<string, number>;
}

const Detection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isProcessingRef = useRef<boolean>(false);
  const prevFaceRef = useRef<FaceResult | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(true);
  const [faces, setFaces] = useState<FaceResult[]>([]);
  const [primaryFace, setPrimaryFace] = useState<FaceResult | null>(null);
  const [mirrored, setMirrored] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sound.enabled);
  const [autoSave, setAutoSave] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toggle audio
  const handleToggleSound = () => {
    const newState = sound.toggle();
    setSoundEnabled(newState);
    showToast(newState ? 'Efek audio diaktifkan' : 'Efek audio dibisukan');
  };

  // Memory modal state
  const [showMemoryModal, setShowMemoryModal] = useState<boolean>(false);
  const [memoryTitle, setMemoryTitle] = useState<string>('');
  const [memoryDesc, setMemoryDesc] = useState<string>('');
  const [memorySnapshot, setMemorySnapshot] = useState<string | null>(null);
  const [savingMemory, setSavingMemory] = useState<boolean>(false);

  // Show temporary toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch {
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Capture frame as base64 JPEG
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Smooth face detection output to prevent box jitter and label jumping
  const smoothFace = (incoming: FaceResult, prev: FaceResult | null): FaceResult => {
    if (!prev) return incoming;

    // Exponential smoothing for bounding box (alpha = 0.45)
    const alphaBbox = 0.45;
    const smoothedBbox: [number, number, number, number] = [
      Math.round(prev.bbox[0] * (1 - alphaBbox) + incoming.bbox[0] * alphaBbox),
      Math.round(prev.bbox[1] * (1 - alphaBbox) + incoming.bbox[1] * alphaBbox),
      Math.round(prev.bbox[2] * (1 - alphaBbox) + incoming.bbox[2] * alphaBbox),
      Math.round(prev.bbox[3] * (1 - alphaBbox) + incoming.bbox[3] * alphaBbox),
    ];

    // Exponential smoothing for scores
    const alphaScore = 0.4;
    const smoothedScores: Record<string, number> = {};
    const allEmotions = new Set([...Object.keys(prev.scores || {}), ...Object.keys(incoming.scores || {})]);

    allEmotions.forEach((emo) => {
      const p = prev.scores?.[emo] || 0;
      const cur = incoming.scores?.[emo] || 0;
      smoothedScores[emo] = Number((p * (1 - alphaScore) + cur * alphaScore).toFixed(3));
    });

    // Check if new emotion is happy and changed
    if (incoming.emotion === 'happy' && prev.emotion !== 'happy') {
      sound.playChime('happy');
    }

    return {
      bbox: smoothedBbox,
      emotion: incoming.emotion,
      confidence: Number((prev.confidence * 0.4 + incoming.confidence * 0.6).toFixed(3)),
      scores: smoothedScores,
    };
  };

  // Frame processing loop with non-overlapping lock
  useEffect(() => {
    let intervalId: any;
    let lastTime = Date.now();
    let frameCount = 0;

    if (isDetecting && hasPermission) {
      intervalId = setInterval(async () => {
        if (isProcessingRef.current) return; // Prevent request piling
        isProcessingRef.current = true;

        const frameData = captureFrame();
        if (!frameData) {
          isProcessingRef.current = false;
          return;
        }

        const startTime = Date.now();
        try {
          const res = await api.detectEmotion(frameData, autoSave);
          const duration = Date.now() - startTime;
          setLatencyMs(duration);

          frameCount++;
          const now = Date.now();
          if (now - lastTime >= 1000) {
            setFps(frameCount);
            frameCount = 0;
            lastTime = now;
          }

          if (res.success && res.faces) {
            if (res.faces.length > 0) {
              const smoothed = smoothFace(res.faces[0], prevFaceRef.current);
              prevFaceRef.current = smoothed;
              setPrimaryFace(smoothed);
              setFaces([smoothed, ...res.faces.slice(1)]);
            } else {
              prevFaceRef.current = null;
              setPrimaryFace(null);
              setFaces([]);
            }
          }
        } catch {
          // Detection interval silent error recovery
        } finally {
          isProcessingRef.current = false;
        }
      }, 400); // 2.5 FPS for high responsiveness
    }

    return () => clearInterval(intervalId);
  }, [isDetecting, hasPermission, autoSave, captureFrame]);

  // Explicit Save Detection
  const handleSaveDetection = async () => {
    if (!primaryFace) {
      showToast('Tidak ada wajah terdeteksi untuk disimpan.');
      return;
    }
    const frame = captureFrame();
    sound.playChime('snap');
    try {
      await api.saveDetection({ face: primaryFace, image: frame || undefined });
      sound.playChime('save');
      showToast('Deteksi berhasil disimpan ke riwayat!');
    } catch {
      showToast('Gagal menyimpan deteksi.');
    }
  };

  // Open Memory Modal
  const handleOpenMemoryModal = () => {
    if (!primaryFace) {
      showToast('Arahkan wajah ke kamera terlebih dahulu.');
      return;
    }
    const frame = captureFrame();
    setMemorySnapshot(frame);
    const meta = getEmotionMeta(primaryFace.emotion);
    setMemoryTitle(`Momen ${meta.labelId} Hari Ini`);
    setMemoryDesc('');
    setShowMemoryModal(true);
  };

  // Submit Memory
  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryTitle.trim() || !primaryFace) return;

    setSavingMemory(true);
    try {
      await api.createMemory({
        title: memoryTitle,
        description: memoryDesc,
        image: memorySnapshot || undefined,
        emotion: primaryFace.emotion,
        confidence: primaryFace.confidence,
        bbox: primaryFace.bbox,
        scores: primaryFace.scores,
      });
      setShowMemoryModal(false);
      showToast('Kenangan berhasil disimpan ke album kenangan!');
    } catch {
      showToast('Gagal menyimpan kenangan.');
    } finally {
      setSavingMemory(false);
    }
  };

  const primaryMeta = primaryFace ? getEmotionMeta(primaryFace.emotion) : null;

  return (
    <div>
      {/* Toast alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--primary)',
            padding: '0.85rem 1.4rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: 'var(--text-main)',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} color="var(--primary)" />
          {toastMessage}
        </div>
      )}

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '1.85rem' }}>Deteksi Emosi Wajah</h1>
          <p>Analisis ekspresi wajah secara langsung menggunakan model YOLOv8 Vision.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className={`btn ${soundEnabled ? 'btn-secondary' : 'btn-secondary'}`}
            onClick={handleToggleSound}
            title={soundEnabled ? 'Matikan Efek Suara' : 'Nyalakan Efek Suara'}
            style={{ opacity: soundEnabled ? 1 : 0.65 }}
          >
            {soundEnabled ? <Volume2 size={18} color="var(--primary)" /> : <VolumeX size={18} />}
            {soundEnabled ? 'Suara Aktif' : 'Mute'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setMirrored(!mirrored)}
            title="Cerminkan Kamera"
          >
            {mirrored ? <Eye size={18} /> : <EyeOff size={18} />}
            {mirrored ? 'Mirror Aktif' : 'Mirror Nonaktif'}
          </button>

          <button
            className={`btn ${isDetecting ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsDetecting(!isDetecting)}
          >
            <Camera size={18} />
            {isDetecting ? 'Deteksi Berjalan' : 'Lanjutkan Deteksi'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        {/* Left Column: Live Camera Feed */}
        <div className="flex-col gap-4">
          <div className="card" style={{ padding: '0.75rem' }}>
            <div className="camera-container">
              {hasPermission === false && (
                <div className="text-center" style={{ padding: '3rem 1.5rem' }}>
                  <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ color: 'var(--danger)' }}>Akses Kamera Ditolak</h3>
                  <p className="mt-2">Silakan izinkan izin akses webcam pada pengaturan browser Anda.</p>
                  <button className="btn btn-primary mt-4" onClick={startCamera}>
                    <RefreshCw size={18} /> Coba Lagi
                  </button>
                </div>
              )}

              {hasPermission === true && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`camera-video ${!mirrored ? 'unmirrored' : ''}`}
                  />

                  {/* HUD Corners */}
                  <div className="hud-corner hud-tl" />
                  <div className="hud-corner hud-tr" />
                  <div className="hud-corner hud-bl" />
                  <div className="hud-corner hud-br" />

                  {/* Status telemetry overlay */}
                  <div className="live-badge">
                    <span className="pulse-dot" />
                    <span>YOLOv8 AI</span>
                    <span style={{ opacity: 0.5 }}>|</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{latencyMs}ms</span>
                    <span style={{ opacity: 0.5 }}>|</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{fps} FPS</span>
                  </div>

                  {/* Real-time Bounding Box Overlays */}
                  {isDetecting && (
                    <div className="camera-overlay">
                      {faces.map((face, idx) => {
                        const video = videoRef.current;
                        if (!video || !video.videoWidth) return null;

                        const meta = getEmotionMeta(face.emotion);
                        const [x1, y1, x2, y2] = face.bbox;

                        // Calculate percentage relative to video resolution
                        const topPct = (y1 / video.videoHeight) * 100;
                        const heightPct = ((y2 - y1) / video.videoHeight) * 100;

                        // Account for mirror reflection if mirrored
                        const leftPct = mirrored
                          ? (1 - x2 / video.videoWidth) * 100
                          : (x1 / video.videoWidth) * 100;
                        const widthPct = ((x2 - x1) / video.videoWidth) * 100;

                        return (
                          <div
                            key={idx}
                            className="detection-box"
                            style={{
                              top: `${topPct}%`,
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              height: `${heightPct}%`,
                              borderColor: meta.color,
                              boxShadow: `0 0 16px ${meta.color}66`,
                            }}
                          >
                            <div
                              className="detection-tag"
                              style={{
                                backgroundColor: meta.color,
                              }}
                            >
                              <span>{meta.emoji}</span>
                              <span>{meta.labelId}</span>
                              <span style={{ opacity: 0.85 }}>({Math.round(face.confidence * 100)}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Prompt when no face in frame */}
                  {isDetecting && faces.length === 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '20px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border)',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Arahkan wajah Anda ke tengah frame kamera
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="flex justify-between items-center mt-4" style={{ padding: '0 0.5rem' }}>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                  />
                  <span>Simpan otomatis setiap deteksi</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  className="btn btn-secondary"
                  onClick={handleSaveDetection}
                  disabled={!primaryFace}
                >
                  <Bookmark size={17} /> Simpan Deteksi
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleOpenMemoryModal}
                  disabled={!primaryFace}
                >
                  <Sparkles size={17} /> Buat Kenangan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Emotion Analysis Breakdown */}
        <div className="flex-col gap-4">
          <div className="card">
            <h2 className="mb-4" style={{ fontSize: '1.25rem' }}>Hasil Deteksi Terkini</h2>

            {primaryFace && primaryMeta ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: primaryMeta.bgColor,
                    border: `1px solid ${primaryMeta.color}40`,
                    marginBottom: '1.5rem',
                  }}
                >
                  <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>{primaryMeta.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 style={{ fontSize: '1.8rem', color: primaryMeta.color, margin: 0 }}>
                        {primaryMeta.labelId}
                      </h2>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        ({primaryMeta.label})
                      </span>
                    </div>
                    <p style={{ margin: '0.25rem 0', fontWeight: 600, color: 'var(--text-main)' }}>
                      Tingkat Akurasi: {Math.round(primaryFace.confidence * 100)}%
                    </p>
                    <p style={{ fontSize: '0.85rem' }}>{primaryMeta.description}</p>
                  </div>
                </div>

                {/* 7 Emotion Bars */}
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Distribusi Probabilitas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.keys(EMOTIONS).map((key) => {
                    const emo = EMOTIONS[key];
                    const score = primaryFace.scores[key] || 0;
                    const percent = (score * 100).toFixed(1);
                    const isDominant = key === primaryFace.emotion;

                    return (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-1" style={{ fontSize: '0.85rem' }}>
                          <span className="flex items-center gap-1.5" style={{ fontWeight: isDominant ? 700 : 500 }}>
                            <span>{emo.emoji}</span>
                            <span>{emo.labelId}</span>
                          </span>
                          <span style={{ fontWeight: isDominant ? 700 : 400, color: isDominant ? emo.color : 'inherit' }}>
                            {percent}%
                          </span>
                        </div>
                        <div className="emotion-track">
                          <div
                            className="emotion-fill"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: emo.color,
                              boxShadow: isDominant ? `0 0 8px ${emo.color}80` : 'none',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center" style={{ padding: '3.5rem 1rem' }}>
                <Zap size={40} color="var(--primary)" style={{ opacity: 0.6, margin: '0 auto 1rem' }} />
                <h3>Menunggu Deteksi Wajah</h3>
                <p className="mt-1" style={{ fontSize: '0.9rem' }}>
                  Arahkan wajah Anda ke webcam. AI akan secara otomatis mengenali ekspresi dan probabilitas 7 emosi.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Memory Creation Modal */}
      {showMemoryModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2>Simpan ke Kenangan</h2>
              <p style={{ fontSize: '0.875rem' }}>Abadikan momen ekspresi ini ke dalam jurnal emosi Anda.</p>
            </div>

            <form onSubmit={handleCreateMemory} style={{ padding: '1.5rem' }}>
              {memorySnapshot && (
                <div
                  style={{
                    width: '100%',
                    height: '180px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    marginBottom: '1.25rem',
                    border: '1px solid var(--border)',
                  }}
                >
                  <img
                    src={memorySnapshot}
                    alt="Snapshot wajah"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Judul Momen</label>
                <input
                  type="text"
                  className="form-input"
                  value={memoryTitle}
                  onChange={(e) => setMemoryTitle(e.target.value)}
                  placeholder="Contoh: Senang menyelesaikan tugas hari ini"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Refleksi (Opsional)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={memoryDesc}
                  onChange={(e) => setMemoryDesc(e.target.value)}
                  placeholder="Ceritakan apa yang membuatmu merasakan emosi ini..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMemoryModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingMemory}
                >
                  {savingMemory ? 'Menyimpan...' : 'Simpan Kenangan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Detection;
