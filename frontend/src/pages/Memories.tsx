import { useState, useEffect } from 'react';
import { Sparkles, Trash2, Calendar, Plus, CheckCircle2, Heart } from 'lucide-react';
import { api } from '../utils/api';
import { getEmotionMeta, EMOTIONS } from '../utils/emotions';

const Memories = () => {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('happy');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadMemories = async () => {
    setLoading(true);
    try {
      const res = await api.getMemories();
      setMemories(res.data || []);
    } catch (err) {
      console.error('Failed to load memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus kenangan ini?')) return;
    try {
      await api.deleteMemory(id);
      showToast('Kenangan berhasil dihapus.');
      loadMemories();
    } catch {
      showToast('Gagal menghapus kenangan.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await api.createMemory({
        title,
        description,
        emotion: selectedEmotion,
        confidence: 0.95,
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      showToast('Kenangan baru berhasil ditambahkan!');
      loadMemories();
    } catch {
      showToast('Gagal membuat kenangan.');
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

      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: '1.85rem' }}>Album Kenangan Emosi</h1>
          <p>Koleksi momen berharga dan refleksi suasana hatimu sepanjang waktu.</p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Buat Kenangan Baru
        </button>
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: '4rem' }}>
          <p>Memuat album kenangan...</p>
        </div>
      ) : memories.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {memories.map((mem) => {
            const emotionKey = mem.emotionDetection?.emotion || 'happy';
            const meta = getEmotionMeta(emotionKey);

            return (
              <div key={mem.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                {mem.imageUrl && mem.imageUrl !== '/uploads/placeholder.jpg' && (
                  <div
                    style={{
                      width: '100%',
                      height: '200px',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      marginBottom: '1.25rem',
                      background: '#040711',
                    }}
                  >
                    <img
                      src={mem.imageUrl.startsWith('http') ? mem.imageUrl : `http://localhost:5000${mem.imageUrl}`}
                      alt={mem.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                <div className="flex justify-between items-start mb-2">
                  <span className="badge" style={{ background: meta.bgColor, color: meta.color }}>
                    <span>{meta.emoji}</span> {meta.labelId}
                  </span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.6rem', color: 'var(--danger)', border: 'none' }}
                    onClick={() => handleDelete(mem.id)}
                    title="Hapus kenangan"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', marginTop: '0.25rem' }}>
                  {mem.title}
                </h3>

                {mem.description && (
                  <p style={{ fontSize: '0.9rem', marginBottom: '1rem', flex: 1 }}>
                    {mem.description}
                  </p>
                )}

                <div
                  className="flex items-center gap-1.5 mt-auto pt-3"
                  style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}
                >
                  <Calendar size={13} />
                  <span>
                    {new Date(mem.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center" style={{ padding: '4rem 1.5rem' }}>
          <Heart size={44} color="var(--primary)" style={{ opacity: 0.6, margin: '0 auto 1rem' }} />
          <h3>Belum Ada Kenangan Tersimpan</h3>
          <p className="mt-1 mb-4" style={{ maxWidth: '420px', margin: '0.5rem auto 1.5rem' }}>
            Saat mendeteksi ekspresi wajah, Anda dapat menekan tombol "Buat Kenangan" untuk mengabadikan momen tersebut bersama catatan emosi.
          </p>
          <div className="flex justify-center gap-3">
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={17} /> Tulis Kenangan Sekarang
            </button>
            <a href="/detection" className="btn btn-secondary">
              Buka Kamera
            </a>
          </div>
        </div>
      )}

      {/* Manual Memory Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2>Tulis Kenangan Baru</h2>
              <p style={{ fontSize: '0.875rem' }}>Abadikan momen atau suasana hati pentingmu hari ini.</p>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Pilih Suasana Hati / Emosi</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(EMOTIONS).map((key) => {
                    const emo = EMOTIONS[key];
                    const isSelected = selectedEmotion === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        onClick={() => setSelectedEmotion(key)}
                      >
                        {emo.emoji} {emo.labelId}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Judul Kenangan</label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Merayakan keberhasilan presentasi"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Refleksi</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tuliskan pengalaman atau perasaan yang ingin kamu ingat..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  <Sparkles size={16} /> Simpan Kenangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Memories;
