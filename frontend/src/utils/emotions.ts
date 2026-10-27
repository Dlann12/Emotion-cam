export interface EmotionMeta {
  key: string;
  label: string;
  labelId: string;
  emoji: string;
  color: string;
  bgColor: string;
  description: string;
}

export const EMOTIONS: Record<string, EmotionMeta> = {
  happy: {
    key: 'happy',
    label: 'Happy',
    labelId: 'Senang',
    emoji: '😊',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    description: 'Menunjukkan rasa gembira, antusias, dan kepuasan.',
  },
  sad: {
    key: 'sad',
    label: 'Sad',
    labelId: 'Sedih',
    emoji: '😢',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    description: 'Menunjukkan rasa sedih, murung, atau kelelahan emosional.',
  },
  neutral: {
    key: 'neutral',
    label: 'Neutral',
    labelId: 'Netral',
    emoji: '😐',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    description: 'Ekspresi tenang tanpa emosi kuat yang dominan.',
  },
  surprise: {
    key: 'surprise',
    label: 'Surprise',
    labelId: 'Terkejut',
    emoji: '😲',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    description: 'Menunjukkan rasa takjub, kaget, atau rasa ingin tahu tinggi.',
  },
  angry: {
    key: 'angry',
    label: 'Angry',
    labelId: 'Marah',
    emoji: '😠',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    description: 'Menunjukkan ketegangan, frustrasi, atau ketidaksenangan.',
  },
  fear: {
    key: 'fear',
    label: 'Fear',
    labelId: 'Takut',
    emoji: '😨',
    color: '#A855F7',
    bgColor: 'rgba(168, 85, 247, 0.15)',
    description: 'Menunjukkan kewaspadaan tinggi atau rasa cemas.',
  },
  disgust: {
    key: 'disgust',
    label: 'Disgust',
    labelId: 'Jijik',
    emoji: '🤢',
    color: '#84CC16',
    bgColor: 'rgba(132, 204, 22, 0.15)',
    description: 'Menunjukkan penolakan atau rasa kurang nyaman terhadap stimulus.',
  },
};

export const getEmotionMeta = (emotion: string): EmotionMeta => {
  const normalized = (emotion || '').toLowerCase().trim();
  if (normalized === 'anger') return EMOTIONS.angry;
  if (normalized === 'content') return EMOTIONS.happy;
  return EMOTIONS[normalized] || {
    key: normalized,
    label: normalized || 'Unknown',
    labelId: normalized || 'Tidak Diketahui',
    emoji: '👤',
    color: '#94A3B8',
    bgColor: 'rgba(148, 163, 184, 0.15)',
    description: 'Emosi wajah terdeteksi.',
  };
};
