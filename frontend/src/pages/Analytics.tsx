import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Sparkles, PieChart, Activity, RefreshCw, Download } from 'lucide-react';
import { api } from '../utils/api';
import { EMOTIONS, getEmotionMeta } from '../utils/emotions';
import { exportToCsv } from '../utils/csv';

const Analytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const totalEmotionsCount = data?.distribution
    ? Object.values(data.distribution as Record<string, number>).reduce((a, b) => a + b, 0)
    : 0;

  const dominantMeta = data?.summary?.dominantEmotion
    ? getEmotionMeta(data.summary.dominantEmotion)
    : getEmotionMeta('neutral');

  const handleExportAnalyticsCsv = () => {
    if (!data?.distribution) return;
    const rows = Object.entries(data.distribution).map(([emotion, count]) => ({
      Kategori_Emosi: emotion,
      Jumlah_Kemunculan: count,
      Persentase: totalEmotionsCount > 0 ? `${Math.round(((count as number) / totalEmotionsCount) * 100)}%` : '0%',
    }));
    exportToCsv('laporan-analitik-emosi', rows);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: '1.85rem' }}>Grafik & Analitik Emosi</h1>
          <p>Pantau pola ekspresi wajah, kecenderungan mood, dan ringkasan 30 hari terakhir.</p>
        </div>

        <div className="flex items-center gap-3">
          {data?.distribution && (
            <button className="btn btn-secondary" onClick={handleExportAnalyticsCsv} title="Unduh data statistik">
              <Download size={17} /> Ekspor Laporan CSV
            </button>
          )}
          <button className="btn btn-secondary" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'animate-pulse' : ''} /> Segarkan Data
          </button>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid-cols-3 mb-8">
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Emosi Paling Sering</span>
            <Sparkles size={18} color={dominantMeta.color} />
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '2.5rem' }}>{dominantMeta.emoji}</span>
            <div>
              <h2 style={{ fontSize: '1.6rem', color: dominantMeta.color, margin: 0 }}>
                {dominantMeta.labelId}
              </h2>
              <p style={{ fontSize: '0.85rem' }}>Dominan dalam 30 hari</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Akurasi Deteksi Rata-rata</span>
            <Activity size={18} color="var(--accent-cyan)" />
          </div>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--accent-cyan)', margin: 0 }}>
            {Math.round((data?.summary?.averageConfidence || 0.88) * 100)}%
          </h2>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Tingkat keyakinan model YOLO AI</p>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Sesi Direkam</span>
            <BarChart3 size={18} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--primary)', margin: 0 }}>
            {data?.summary?.totalAllTime || totalEmotionsCount || 0}
          </h2>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Semua pengamatan wajah</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Weekly Bar Timeline Chart */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.25rem' }}>Aktivitas Deteksi 7 Hari Terakhir</h2>
          </div>

          {data?.dailyTimeline && data.dailyTimeline.length > 0 ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  height: '200px',
                  paddingTop: '20px',
                  gap: '0.75rem',
                }}
              >
                {data.dailyTimeline.map((item: any, idx: number) => {
                  const maxVal = Math.max(...data.dailyTimeline.map((t: any) => t.count), 5);
                  const heightPercent = Math.max((item.count / maxVal) * 100, 6);
                  const dateObj = new Date(item.date);
                  const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });

                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        height: '100%',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {item.count}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '42px',
                          height: `${heightPercent}%`,
                          background: item.count > 0 ? 'linear-gradient(180deg, var(--primary) 0%, rgba(255,90,31,0.3) 100%)' : 'rgba(255,255,255,0.05)',
                          borderRadius: '6px 6px 2px 2px',
                          transition: 'height 0.4s ease',
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dayName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-center" style={{ padding: '3rem' }}>Belum ada data rekaman 7 hari.</p>
          )}
        </div>

        {/* Sentiment Ratio Breakdown */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <PieChart size={20} color="var(--accent-emerald)" />
            <h2 style={{ fontSize: '1.25rem' }}>Keseimbangan Spektrum Emosi</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div className="flex justify-between items-center mb-1.5" style={{ fontSize: '0.9rem' }}>
                <span className="flex items-center gap-2">
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                  Positif (Senang, Terkejut)
                </span>
                <strong>{Math.round((data?.summary?.positiveRatio || 0.7) * 100)}%</strong>
              </div>
              <div className="emotion-track">
                <div
                  className="emotion-fill"
                  style={{ width: `${(data?.summary?.positiveRatio || 0.7) * 100}%`, background: 'var(--accent-emerald)' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5" style={{ fontSize: '0.9rem' }}>
                <span className="flex items-center gap-2">
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                  Netral / Tenang
                </span>
                <strong>{Math.round((data?.summary?.neutralRatio || 0.2) * 100)}%</strong>
              </div>
              <div className="emotion-track">
                <div
                  className="emotion-fill"
                  style={{ width: `${(data?.summary?.neutralRatio || 0.2) * 100}%`, background: 'var(--accent-cyan)' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5" style={{ fontSize: '0.9rem' }}>
                <span className="flex items-center gap-2">
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-rose)' }} />
                  Kelelahan / Stres (Sedih, Marah, Cemas)
                </span>
                <strong>{Math.round((data?.summary?.negativeRatio || 0.1) * 100)}%</strong>
              </div>
              <div className="emotion-track">
                <div
                  className="emotion-fill"
                  style={{ width: `${(data?.summary?.negativeRatio || 0.1) * 100}%`, background: 'var(--accent-rose)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7 Emotion Distribution Grid */}
      <div className="card">
        <h2 className="mb-4" style={{ fontSize: '1.25rem' }}>Detail Sebaran 7 Kelas Emosi</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {Object.keys(EMOTIONS).map((key) => {
            const emo = EMOTIONS[key];
            const count = data?.distribution ? data.distribution[key] || 0 : 0;
            const percentage = totalEmotionsCount > 0 ? ((count / totalEmotionsCount) * 100).toFixed(1) : '0.0';

            return (
              <div
                key={key}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '1.75rem' }}>{emo.emoji}</span>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--text-main)' }}>{emo.labelId}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emo.label}</span>
                    </div>
                  </div>
                  <span className="badge" style={{ background: emo.bgColor, color: emo.color }}>
                    {count} kali
                  </span>
                </div>

                <div className="emotion-track mt-3">
                  <div
                    className="emotion-fill"
                    style={{ width: `${percentage}%`, background: emo.color }}
                  />
                </div>
                <div className="flex justify-between mt-1.5" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Proporsi</span>
                  <span>{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
