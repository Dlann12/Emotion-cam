const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = (includeAuth = true, isJson = true): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (includeAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

export const api = {
  // Auth
  async login(credentials: { email: string; password: string }) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(false, true),
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login gagal');
    return data;
  },

  async register(payload: { email: string; password: string; name: string }) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(false, true),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registrasi gagal');
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: getHeaders(true, true),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat sesi');
    return data;
  },

  // Emotion Detection
  async detectEmotion(base64Image: string, autoSave = false) {
    const res = await fetch(`${API_URL}/emotions/detect?autoSave=${autoSave}`, {
      method: 'POST',
      headers: getHeaders(true, true),
      body: JSON.stringify({ image: base64Image, autoSave }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Deteksi gagal');
    return data;
  },

  async saveDetection(payload: { face: any; image?: string }) {
    const res = await fetch(`${API_URL}/emotions/save`, {
      method: 'POST',
      headers: getHeaders(true, true),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan deteksi');
    return data;
  },

  async getHistory(params?: { page?: number; limit?: number; emotion?: string; startDate?: string; endDate?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.emotion) query.append('emotion', params.emotion);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`${API_URL}/emotions?${query.toString()}`, {
      headers: getHeaders(true, true),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat riwayat');
    return data;
  },

  async deleteDetection(id: string) {
    const res = await fetch(`${API_URL}/emotions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true, true),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus deteksi');
    return data;
  },

  async clearHistory() {
    const res = await fetch(`${API_URL}/emotions`, {
      method: 'DELETE',
      headers: getHeaders(true, true),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengosongkan riwayat');
    return data;
  },

  // Analytics
  async getAnalytics() {
    const res = await fetch(`${API_URL}/analytics`, {
      headers: getHeaders(true, true),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat analitik');
    return data;
  },

  // Memories
  async getMemories() {
    const res = await fetch(`${API_URL}/memories`, {
      headers: getHeaders(true, true),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat kenangan');
    return data;
  },

  async createMemory(payload: {
    title: string;
    description?: string;
    image?: string;
    imageUrl?: string;
    emotionDetectionId?: string;
    emotion?: string;
    confidence?: number;
    bbox?: number[];
    scores?: Record<string, number>;
  }) {
    const res = await fetch(`${API_URL}/memories`, {
      method: 'POST',
      headers: getHeaders(true, true),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal membuat kenangan');
    return data;
  },

  async deleteMemory(id: string) {
    const res = await fetch(`${API_URL}/memories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true, true),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus kenangan');
    return data;
  },

  // Profile
  async getProfile() {
    const res = await fetch(`${API_URL}/profile`, {
      headers: getHeaders(true, true),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat profil');
    return data;
  },

  async updateProfile(payload: { name?: string; currentPassword?: string; newPassword?: string }) {
    const res = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: getHeaders(true, true),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui profil');
    return data;
  },

  // Privacy
  async getPrivacy() {
    const res = await fetch(`${API_URL}/privacy`, {
      headers: getHeaders(true, true),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat pengaturan privasi');
    return data;
  },

  async updatePrivacy(payload: { saveFaceImages?: boolean; saveHistory?: boolean; dataUsageConsent?: boolean }) {
    const res = await fetch(`${API_URL}/privacy`, {
      method: 'PUT',
      headers: getHeaders(true, true),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan privasi');
    return data;
  },

  // Health
  async checkHealth() {
    try {
      const res = await fetch(`${API_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
