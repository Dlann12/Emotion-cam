# 🌟 Wajah Emosi (DYE "Detect Your Emotion")

**"Kenali ekspresimu, pahami emosimu."**

Wajah Emosi adalah aplikasi AI Computer Vision (Full Stack) untuk mendeteksi emosi seseorang berdasarkan ekspresi wajah melalui kamera. Menggunakan **YOLO11n** di belakang layar dengan arsitektur microservices untuk performa yang optimal.

---

## 1. Final Project Structure

```text
Emtion Cam Detection/
├── frontend/                 # Vite + React (Vanilla CSS, no Tailwind)
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components (Dashboard, Detection, dll)
│   │   ├── App.tsx           # Router & Layout 
│   │   └── index.css         # UI System & Styling
│   └── package.json
│
├── backend/                  # Node.js + Express
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema (SQLite)
│   │   └── dev.db
│   ├── src/
│   │   ├── config/           # DB dan env config
│   │   ├── controllers/      # Logika API
│   │   ├── middlewares/      # Auth & Validator
│   │   ├── routes/           # Routing API
│   │   ├── app.ts            # Express setup
│   │   └── index.ts          # Entry point
│   ├── tsconfig.json
│   └── package.json
│
└── ml-service/               # Python FastAPI
    ├── app/
    │   ├── main.py           # FastAPI entry point
    │   ├── detector.py       # YOLO Abstraction (Mock & Real Model)
    │   ├── schemas.py        # Pydantic schemas
    │   └── config.py         # Configs (YOLO_MODEL_PATH)
    ├── dataset/              # YOLO compatible dataset struct
    ├── models/
    │   └── best.pt           # Final trained YOLO model (if available)
    └── requirements.txt
```

---

## 2. Database Schema

Database menggunakan SQLite via Prisma.

* `User`: Data user (email, password_hash, name).
* `EmotionDetection`: Log deteksi emosi tiap user (menyimpan URL gambar, hasil prediksi terbanyak, bbox, confidence).
* `EmotionScore`: Detail 7 kelas emosi dengan probabilitas dari satu record `EmotionDetection`.
* `Memory`: Menyimpan kenangan (foto + emosi + deskripsi + tanggal).
* `UserPreference`: Pengaturan tema/notifikasi.
* `PrivacySetting`: Mengontrol apakah *face image* disimpan secara permanen, dan consent pengolahan data.

*(Lihat `backend/prisma/schema.prisma` untuk detail struktur)*

---

## 3. API Documentation (Backend)

**Base URL**: `http://localhost:5000/api`

* `POST /auth/register` - Membuat akun baru.
* `POST /auth/login` - Login dengan email & password. Mengembalikan JWT.
* `GET /auth/me` - Mendapatkan data profile (Butuh `Authorization: Bearer <token>`).
* `GET /emotions` - List history deteksi user (dengan filter tanggal & jenis emosi).
* `POST /emotions/detect` - Upload frame ke backend, backend mem-forward ke `ml-service`, lalu simpan hasil ke DB dan return hasil ke frontend.
* `GET /analytics` - Summary data statistik emosi 7, 30 hari.
* `GET /memories` & `POST /memories` - CRUD Kenangan pengguna.
* `PUT /privacy` - Mengubah toggle privasi penyimpanan wajah.

---

## 4. ML Service Documentation

**Base URL**: `http://localhost:8000`

Service FastAPI khusus menangani CPU/GPU Intensive Task tanpa membebani Express JS.

* `GET /health`: Cek apakah service jalan, dan tipe model apa yang ter-load (`MockEmotionDetectionService` / `RealYoloEmotionDetectionService`).
* `POST /predict`: Menerima input `multipart/form-data` dengan field `file` (image). Return bounding box, probabilitas, dan klasifikasi emosi.

---

## 5. YOLO Model Integration Instructions

Secara default, ML service memakai `MockEmotionDetectionService` agar development tidak terblokir jika model belum siap. 

Ketika model `best.pt` dari YOLO11n sudah selesai ditraining:
1. Pindahkan file `best.pt` ke `ml-service/models/best.pt`.
2. Saat restart ML Service, `get_detector()` akan otomatis beralih ke `RealYoloEmotionDetectionService`.
3. Model akan dijalankan pakai library `ultralytics`.

---

## 6. Dataset Structure (YOLOv8/11 Format)

Letakkan dataset di dalam direktori `ml-service/dataset/`.
Format file sesuai standar YOLO format (txt files).

```text
dataset/
├── images/
│   ├── train/ (e.g. img1.jpg)
│   ├── val/
│   └── test/
├── labels/
│   ├── train/ (e.g. img1.txt)
│   ├── val/
│   └── test/
└── data.yaml
```

Isi `data.yaml`:
```yaml
path: ./dataset
train: images/train
val: images/val
names:
  0: angry
  1: disgust
  2: fear
  3: happy
  4: sad
  5: surprise
  6: neutral
```

---

## 7. Training Instructions

Jalankan perintah ini di dalam virtual environment Python:

```bash
yolo detect train model=yolo11n.pt data=dataset/data.yaml imgsz=640 epochs=100 batch=16 project=runs name=emotion_cam
```

Parameter bisa disesuaikan (batch/epochs) sesuai spesifikasi GPU yang dimiliki. Setelah selesai, pindahkan `runs/emotion_cam/weights/best.pt` ke `models/best.pt`.

---

## 8. Environment Variables

**Frontend (`frontend/.env`)**:
```env
VITE_API_URL=http://localhost:5000/api
```

**Backend (`backend/.env`)**:
```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-key-change-this"
ML_SERVICE_URL="http://localhost:8000"
```

**ML Service (`ml-service/.env`)**:
```env
YOLO_MODEL_PATH=models/best.pt
```

---

## 9. Local Development Instructions

### Persiapan
* Pastikan Node.js v18+ dan Python 3.10+ terinstal.
* Clone project.

---

## 10. Startup Commands

### 🟢 1. Menjalankan Backend (Express + Prisma)
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 🔴 2. Menjalankan ML Service (Python FastAPI)
```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 🔵 3. Menjalankan Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173` di browser.

---

## 11. Testing Instructions

### Automated Tests
* **Backend Integration Tests**:
  ```bash
  cd backend
  npm test
  ```
* **ML Service Unit Tests**:
  ```bash
  cd ml-service
  ./venv/bin/python -m unittest test_service.py
  ```

### Manual Testing
* **Camera Test**: Buka `http://localhost:5174/detection` dan izinkan akses webcam. UI dilengkapi **Temporal Smoothing** (anti-jitter) dan **Sound Feedback** interaktif.
* **CSV Export Test**: Masuk ke menu `Riwayat Deteksi` atau `Grafik & Tren` lalu klik tombol **Ekspor CSV** untuk mengunduh laporan.
* **Security & Rate Limiting**: Proteksi Zod validation dan rate limiting aktif pada `/api/auth/register`, `/api/auth/login`, dan `/api/emotions/detect`.

---

## 12. Deployment with Docker Compose

Jalankan seluruh ekosistem (Frontend, Backend, ML Service) dengan satu perintah:

```bash
docker compose up --build -d
```

* **Frontend**: `http://localhost:3000` (atau `http://localhost:5174` mode dev)
* **Backend**: `http://localhost:5000`
* **ML Service**: `http://localhost:8000` (didukung akselerasi NVIDIA GPU via Docker runtime)

---
🚀 *Happy Coding!*
