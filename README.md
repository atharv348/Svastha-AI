# SvasthaAI - AI Health Platform

SvasthaAI is a sophisticated health-tracking and multi-organ diagnostic application designed to provide a futuristic "Health OS" experience. It leverages Deep Learning and Artificial Intelligence to analyze clinical scans, track vitals, and provide personalized wellness advice.

---

## 📁 Project Structure

```
Svastha_Ai/
├── backend/
│   ├── ai_models/               # AI model definitions and inference
│   ├── models/                  # Database models (SQLAlchemy)
│   ├── routers/                 # API endpoints
│   ├── services/                # Business logic and external services
│   ├── uploads/                 # Uploaded images and files (gitignored)
│   ├── database.py              # Database configuration
│   ├── main.py                  # FastAPI application entry point
│   ├── schemas.py               # Pydantic models for API schemas
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   └── services/            # API services
│   ├── public/                   # Static assets
│   ├── package.json              # Node.js dependencies
│   └── vite.config.ts            # Vite configuration
├── datasets/                     # Training datasets (gitignored)
├── models/                       # Trained ML models (gitignored)
├── docker-compose.yml            # Docker configuration
├── nginx.conf                    # Nginx configuration
└── README.md                     # This file
```

## 🚀 Features

- **Multi-Organ AI Diagnostics**: Clinical scan analysis for Skin, Eye, Oral, Bone, and Lungs.
- **Structured Medical Reports**: Detailed reports with local language support (Marathi, Hindi).
- **Clinical Risk Prediction**: AI-powered assessment for Diabetes, Hypertension, and Anemia using tabular data.
- **Child Growth Tracker**: Malnutrition detection and Z-score analysis based on WHO standards.
- **MUAC Tape Analysis**: Image-based malnutrition risk assessment.
- **SvasthaAI Coach (AROMI)**: Multilingual AI coach (English, Hindi, Marathi) for personalized health guidance.
- **Nearby Hospitals**: Location-based hospital and clinic finder with map integration.
- **Health Dashboard**: Comprehensive overview of your health vitals, predictions, and growth tracking.

---

## 🛠️ Technical Stack

- **Frontend**: React.js, Tailwind CSS, Lucide-React, TanStack Query (React Query).
- **Backend**: FastAPI (Python), SQLAlchemy ORM, SQLite Database.
- **Machine Learning**: PyTorch, Torchvision, OpenCV.
- **AI Integration**: Groq API (Llama-3) for medical advice.

---

## 🔮 Future Scope & Roadmap

SehatSaathi is designed to evolve into a fully integrated medical ecosystem. Key future developments include:

### 1. 🌐 IoT Device Integration (Real-time Vitals)
- **Smart Wearables**: Integration with smartwatches and fitness bands for live **Footsteps**, **Heart Rate**, and **SpO2** tracking.
- **Custom IoT Hardware**: Support for ESP32/Arduino-based sensors for continuous health monitoring (ECG, Temperature, and Pulse).
- **Automatic Sync**: Real-time data synchronization between physical devices and the SehatSaathi Dashboard.

### 2. 🧠 Expanded Medical Diagnostics
- **MRI/CT Scan Analysis**: Support for complex 3D medical imaging analysis using advanced CNN architectures.
- **Predictive Analytics**: Using historical data to predict potential health risks before symptoms appear.

### 3. 🏥 Healthcare Ecosystem
- **Telemedicine**: Direct video consultation with doctors based on AI scan results.
- **Pharmacy Integration**: Automatic prescription uploads and medicine delivery.
- **Medical Record Blockchain**: Secure, encrypted storage of patient history using blockchain technology for data privacy.

---

## 📦 Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- Groq API Key (Get it from [ Groq Console](https://console.groq.com/))

### Backend Setup
1. Navigate to `backend/`
2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your `GROQ_API_KEY` and a secure `SECRET_KEY`.
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `python main.py`

### Frontend Setup
1. Navigate to `frontend/`
2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`

---

## 🔒 Security Note
**IMPORTANT**: Never commit your `.env` files to version control. The repository includes `.env.example` files to guide your configuration. Always use environment variables for sensitive data like API keys and database credentials.

---

## 📄 License
This project is licensed under the MIT License.
