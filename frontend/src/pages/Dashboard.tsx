import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Sparkles, TrendingUp, History, Heart, Award, ArrowRight } from 'lucide-react';
import { useAuth } from '../utils/auth';
import { api } from '../utils/api';
import { getEmotionMeta } from '../utils/emotions';

const Dashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentDetections, setRecentDetections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [analyticsRes, historyRes] = await Promise.all([
          api.getAnalytics().catch(() => null),
          api.getHistory({ page: 1, limit: 5 }).catch(() => null),
        ]);

        if (analyticsRes) setAnalytics(analyticsRes);
        if (historyRes?.data) setRecentDetections(historyRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const dominantMeta = analytics?.summary?.dominantEmotion
    ? getEmotionMeta(analytics.summary.dominantEmotion)
    : getEmotionMeta('happy');

  const getWellnessTip = (emotion: string) => {
    switch (emotion) {
      case 'happy':
        return 'Pertahankan energi positif ini! Bagikan senyumanmu dengan orang-orang terdekat hari ini.';
      case 'sad':
        return 'Tidak apa-apa merasa lelah atau sedih sesekali. Luangkan waktu untuk istirahat atau dengarkan musik yang menenangkan.';
      case 'angry':
        return 'Tarik napas dalam-dalam selama 4 detik, tahan 4 detik, lalu hembuskan perlahan untuk merelaksasi detak jantung.';
      case 'fear':
        return 'Fokuslah pada hal-hal nyata di sekitarmu yang bisa kamu kendalikan saat ini.';
      case 'surprise':
        return 'Rasa ingin tahu dan keterkejutan bisa menjadi awal dari inspirasi baru!';
      default:
        return 'Kondisi emosi yang stabil membantu pikiran tetap fokus dan produktif.';
    }
  };

  return (
    <div>
      {/* Header Welcome */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: '2rem' }}>
            Selamat {new Date().getHours() < 12 ? 'Pagi' : new Date().getHours() < 17 ? 'Siang' : 'Malam'}, {user?.name || 'Sobat Emosi'} 👋
          </h1>
          <p>Bagaimana suasana hati dan ekspresimu hari ini? Mari luangkan waktu sejenak untuk memahaminya.</p>
        </div>

        <Link to="/detection" className="btn btn-primary" style={{ padding: '0.85rem 1.6rem' }}>
          <Camera size={19} /> Mulai Deteksi Kamera
        </Link>
      </div>

      {/* Featured Hero Banner */}
      <div className="card card-highlight mb-8 flex justify-between items-center flex-wrap gap-6" style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '650px' }}>
          <span className="badge mb-3" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
            <Sparkles size={14} /> AI Computer Vision 11n
          </span>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Kenali ekspresi wajah secara instan dan akurat
          </h2>
          <p style={{ marginBottom: '1.25rem' }}>
            Teknologi deteksi wajah kami menganalisis fitur mikro-ekspresi untuk mengenali 7 spektrum emosi dasar manusia secara real-time.
          </p>
          <div className="flex gap-3">
            <Link to="/detection" className="btn btn-primary">
              Coba Sekarang <ArrowRight size={17} />
            </Link>
            <Link to="/analytics" className="btn btn-secondary">
              Lihat Grafik Emosi
            </Link>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border)',
            padding: '1.5rem 2rem',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            minWidth: '220px',
          }}
        >
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>
            {dominantMeta.emoji}
          </span>
          <p style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>Emosi Dominan</p>
          <h3 style={{ color: dominantMeta.color, fontSize: '1.4rem' }}>{dominantMeta.labelId}</h3>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid-cols-4 mb-8">
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Deteksi</span>
            <History size={18} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>
            {loading ? '...' : analytics?.summary?.totalAllTime || recentDetections.length || 0}
          </h2>
          <p style={{ fontSize: '0.8rem' }}>Semua sesi rekaman</p>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Hari Ini</span>
            <TrendingUp size={18} color="var(--accent-emerald)" />
          </div>
          <h2 style={{ fontSize: '2rem', color: 'var(--accent-emerald)' }}>
            {loading ? '...' : analytics?.summary?.totalToday || 0}
          </h2>
          <p style={{ fontSize: '0.8rem' }}>Deteksi tercatat hari ini</p>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Rata-rata Akurasi</span>
            <Award size={18} color="var(--accent-cyan)" />
          </div>
          <h2 style={{ fontSize: '2rem', color: 'var(--accent-cyan)' }}>
            {loading ? '...' : `${Math.round((analytics?.summary?.averageConfidence || 0.88) * 100)}%`}
          </h2>
          <p style={{ fontSize: '0.8rem' }}>Tingkat keyakinan YOLO AI</p>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Emosi Positif</span>
            <Heart size={18} color="var(--accent-amber)" />
          </div>
          <h2 style={{ fontSize: '2rem', color: 'var(--accent-amber)' }}>
            {loading ? '...' : `${Math.round((analytics?.summary?.positiveRatio || 0.7) * 100)}%`}
          </h2>
          <p style={{ fontSize: '0.8rem' }}>Indeks suasana hati 30 hari</p>
        </div>
      </div>

      {/* Wellness & Recent Activity Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem' }}>
        {/* Wellbeing Tip Card */}
        <div className="card flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Heart size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '1.2rem' }}>Catatan Kesejahteraan</h2>
            </div>
            <p style={{ fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              {getWellnessTip(dominantMeta.key)}
            </p>
          </div>

          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ fontSize: '0.85rem' }}>
              💡 <strong>Tips:</strong> Melakukan pengecekan ekspresi setiap pagi dan sore hari dapat membantumu lebih sadar terhadap pola stres dan kelelahan mental.
            </p>
          </div>
        </div>

        {/* Recent Detections List */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '1.2rem' }}>Riwayat Terkini</h2>
            <Link to="/history" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
              Lihat Semua →
            </Link>
          </div>

          {recentDetections.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentDetections.map((det: any) => {
                const meta = getEmotionMeta(det.emotion);
                return (
                  <div
                    key={det.id}
                    className="flex justify-between items-center"
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: '1.6rem' }}>{meta.emoji}</span>
                      <div>
                        <p style={{ color: 'var(--text-main)', fontWeight: 600, margin: 0 }}>
                          {meta.labelId}
                        </p>
                        <p style={{ fontSize: '0.75rem', margin: 0 }}>
                          {new Date(det.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <span
                      className="badge"
                      style={{ background: meta.bgColor, color: meta.color }}
                    >
                      {Math.round(det.confidence * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center" style={{ padding: '2.5rem 1rem' }}>
              <p style={{ marginBottom: '1rem' }}>Belum ada rekaman emosi tersimpan.</p>
              <Link to="/detection" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
                Mulai Deteksi Pertama
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
