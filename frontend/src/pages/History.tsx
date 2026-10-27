import { useState, useEffect, useCallback } from 'react';
import { Trash2, Filter, AlertTriangle, Calendar, CheckCircle2, Download } from 'lucide-react';
import { api } from '../utils/api';
import { EMOTIONS, getEmotionMeta } from '../utils/emotions';
import { exportToCsv } from '../utils/csv';

const History = () => {
  const [detections, setDetections] = useState<any[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 12 };
      if (selectedEmotion !== 'all') {
        params.emotion = selectedEmotion;
      }
      const res = await api.getHistory(params);
      setDetections(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, [page, selectedEmotion]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleExportCsv = () => {
    if (detections.length === 0) {
      showToast('Tidak ada data riwayat untuk diekspor.');
      return;
    }
    const rows = detections.map((d) => ({
      ID: d.id,
      Waktu: new Date(d.createdAt).toLocaleString('id-ID'),
      Emosi: d.emotion,
      Akurasi: `${Math.round(d.confidence * 100)}%`,
      Tersimpan_Gambar: d.imageUrl ? 'Ya' : 'Tidak',
    }));
    exportToCsv('riwayat-deteksi-emosi', rows);
    showToast('File CSV riwayat berhasil diunduh!');
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Hapus rekaman deteksi ini?')) return;
    try {
      await api.deleteDetection(id);
      showToast('Rekaman berhasil dihapus.');
      loadHistory();
    } catch {
      showToast('Gagal menghapus rekaman.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA riwayat deteksi? File gambar terkait juga akan dibersihkan dari server.')) return;
    try {
      await api.clearHistory();
      showToast('Seluruh riwayat berhasil dikosongkan.');
      loadHistory();
    } catch {
      showToast('Gagal mengosongkan riwayat.');
    }
  };

  return (
    <div>
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

      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: '1.85rem' }}>Riwayat Deteksi Emosi</h1>
          <p>Daftar lengkap sesi ekspresi wajah yang telah terekam ({totalCount} rekaman).</p>
        </div>

        <div className="flex items-center gap-3">
          {detections.length > 0 && (
            <>
              <button className="btn btn-secondary" onClick={handleExportCsv} title="Ekspor data ke file CSV">
                <Download size={16} /> Ekspor CSV
              </button>
              <button className="btn btn-danger" onClick={handleClearAll}>
                <Trash2 size={16} /> Kosongkan Riwayat
              </button>
            </>
          )}
        </div>
      </div>

      {/* Emotion Filter Pills */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="flex items-center gap-1.5" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
          <Filter size={15} /> Filter:
        </span>

        <button
          className={`btn ${selectedEmotion === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          onClick={() => { setSelectedEmotion('all'); setPage(1); }}
        >
          Semua ({totalCount})
        </button>

        {Object.keys(EMOTIONS).map((key) => {
          const emo = EMOTIONS[key];
          const isSelected = selectedEmotion === key;
          return (
            <button
              key={key}
              className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
              onClick={() => { setSelectedEmotion(key); setPage(1); }}
            >
              <span>{emo.emoji}</span> {emo.labelId}
            </button>
          );
        })}
      </div>

      {/* Detection Cards Grid */}
      {loading ? (
        <div className="text-center" style={{ padding: '4rem' }}>
          <p>Memuat riwayat deteksi...</p>
        </div>
      ) : detections.length > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {detections.map((det) => {
              const meta = getEmotionMeta(det.emotion);
              const scores = det.emotionScores || [];

              return (
                <div key={det.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
                  {det.imageUrl && (
                    <div
                      style={{
                        width: '100%',
                        height: '160px',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        marginBottom: '1rem',
                        background: '#040711',
                      }}
                    >
                      <img
                        src={det.imageUrl.startsWith('http') ? det.imageUrl : `http://localhost:5000${det.imageUrl}`}
                        alt="Foto deteksi"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '2rem' }}>{meta.emoji}</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: meta.color }}>
                          {meta.labelId}
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    <span className="badge" style={{ background: meta.bgColor, color: meta.color }}>
                      {Math.round(det.confidence * 100)}%
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center gap-1.5 mt-2 mb-3" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={14} />
                    <span>
                      {new Date(det.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Mini score distribution */}
                  {scores.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                      {scores.slice(0, 3).map((sc: any) => {
                        const sMeta = getEmotionMeta(sc.emotion);
                        return (
                          <div key={sc.id} className="flex justify-between items-center" style={{ fontSize: '0.75rem' }}>
                            <span>{sMeta.emoji} {sMeta.labelId}</span>
                            <span style={{ color: sc.emotion === det.emotion ? sMeta.color : 'inherit', fontWeight: 600 }}>
                              {(sc.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-end mt-3 pt-2">
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--danger)' }}
                      onClick={() => handleDeleteItem(det.id)}
                    >
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ← Sebelumnya
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Halaman {page} dari {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Selanjutnya →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center" style={{ padding: '4rem 1.5rem' }}>
          <AlertTriangle size={40} color="var(--primary)" style={{ opacity: 0.6, margin: '0 auto 1rem' }} />
          <h3>Tidak Ada Riwayat Deteksi</h3>
          <p className="mt-1 mb-4" style={{ maxWidth: '400px', margin: '0.5rem auto 1.5rem' }}>
            {selectedEmotion !== 'all'
              ? `Belum ada riwayat deteksi dengan emosi ${getEmotionMeta(selectedEmotion).labelId}.`
              : 'Mulai buka kamera dan simpan deteksi emosimu untuk melihat riwayat di sini.'}
          </p>
          <a href="/detection" className="btn btn-primary">
            Buka Deteksi Kamera
          </a>
        </div>
      )}
    </div>
  );
};

export default History;
