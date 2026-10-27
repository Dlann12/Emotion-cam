import { useState, useEffect } from 'react';
import { User, Shield, KeyRound, Cpu, CheckCircle2, Save } from 'lucide-react';
import { useAuth } from '../utils/auth';
import { api } from '../utils/api';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Privacy states
  const [saveFaceImages, setSaveFaceImages] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);
  const [dataUsageConsent, setDataUsageConsent] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileRes, privacyRes] = await Promise.all([
          api.getProfile().catch(() => null),
          api.getPrivacy().catch(() => null),
        ]);

        if (profileRes) {
          setProfileData(profileRes);
          setName(profileRes.name || '');
        } else if (user) {
          setName(user.name);
        }

        if (privacyRes) {
          setSaveFaceImages(privacyRes.saveFaceImages !== false);
          setSaveHistory(privacyRes.saveHistory !== false);
          setDataUsageConsent(Boolean(privacyRes.dataUsageConsent));
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };

    loadProfile();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload: any = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      await api.updateProfile(payload);
      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      showToast('Profil berhasil diperbarui!');
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePrivacy = async () => {
    setSavingPrivacy(true);
    try {
      await api.updatePrivacy({
        saveFaceImages,
        saveHistory,
        dataUsageConsent,
      });
      showToast('Pengaturan privasi berhasil disimpan!');
    } catch {
      showToast('Gagal menyimpan privasi.');
    } finally {
      setSavingPrivacy(false);
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

      <div className="mb-8">
        <h1 style={{ fontSize: '1.85rem' }}>Profil & Pengaturan Akun</h1>
        <p>Kelola data akun, preferensi privasi, dan status sistem AI.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Left Card: Account & Password Edit */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <User size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.25rem' }}>Informasi Akun</h2>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Alamat Email</label>
              <input
                type="email"
                className="form-input"
                value={user?.email || profileData?.email || ''}
                readOnly
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', margin: '1.5rem 0', paddingTop: '1rem' }}>
              <div className="flex items-center gap-2 mb-3">
                <KeyRound size={17} color="var(--text-secondary)" />
                <h3 style={{ fontSize: '1rem' }}>Ubah Password (Opsional)</h3>
              </div>

              <div className="form-group">
                <label className="form-label">Password Saat Ini</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password Baru</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              <Save size={16} /> {savingProfile ? 'Menyimpan...' : 'Perbarui Profil'}
            </button>
          </form>
        </div>

        {/* Right Cards: Privacy Settings & Model Info */}
        <div className="flex-col gap-4">
          {/* Privacy Settings Card */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={20} color="var(--accent-emerald)" />
              <h2 style={{ fontSize: '1.25rem' }}>Pengaturan Privasi & Keamanan</h2>
            </div>

            <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Kami memprioritaskan privasi Anda. Atur bagaimana data dan rekaman wajah disimpan.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <label className="flex items-center justify-between" style={{ cursor: 'pointer' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>Simpan Riwayat Emosi</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Mencatat histori skor dan tren emosi harian ke database.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={saveHistory}
                  onChange={(e) => setSaveHistory(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', width: '20px', height: '20px' }}
                />
              </label>

              <label className="flex items-center justify-between" style={{ cursor: 'pointer' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>Simpan Foto Snapshot Wajah</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Menyimpan thumbnail gambar wajah saat deteksi disimpan.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={saveFaceImages}
                  onChange={(e) => setSaveFaceImages(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', width: '20px', height: '20px' }}
                />
              </label>

              <label className="flex items-center justify-between" style={{ cursor: 'pointer' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>Kontribusi Anonim AI</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Bantu evaluasi akurasi model tanpa melampirkan identitas pribadi.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={dataUsageConsent}
                  onChange={(e) => setDataUsageConsent(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', width: '20px', height: '20px' }}
                />
              </label>

              <button
                className="btn btn-secondary mt-2"
                onClick={handleUpdatePrivacy}
                disabled={savingPrivacy}
              >
                {savingPrivacy ? 'Menyimpan...' : 'Simpan Preferensi Privasi'}
              </button>
            </div>
          </div>

          {/* AI Architecture Telemetry Card */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={20} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.25rem' }}>Status Arsitektur AI</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div className="flex justify-between items-center py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Model AI Detektor</span>
                <span className="badge" style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)' }}>
                  YOLOv8 Emotion Vision
                </span>
              </div>

              <div className="flex justify-between items-center py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Spektrum Kelas</span>
                <span>7 Emosi Dasar Manusia</span>
              </div>

              <div className="flex justify-between items-center py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>FastAPI ML Service</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>● Online (:8000)</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span style={{ color: 'var(--text-secondary)' }}>Node Express Backend</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>● Online (:5000)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
