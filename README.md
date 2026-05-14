# 🏥 SvasthaAI - Advanced AI-Powered Healthcare Ecosystem

SvasthaAI is a comprehensive, professional-grade healthcare platform designed to provide intelligent health monitoring, AI-driven diagnostics, and personalized wellness guidance. Built with a focus on high-fidelity design and scalable architecture, SvasthaAI leverages state-of-the-art AI to empower users with actionable medical insights.

## 🚀 Key Features

- **AI Symptom Checker (Sahayak)**: Real-time symptom analysis and preliminary disease identification.
- **Mental Wellness (ManasMitra)**: AI-driven mental health support and emotional well-being tracking.
- **Health Dashboard**: A data-rich visualization of vital metrics (BMI, Heart Rate, Blood Pressure) with premium UI components.
- **Predictive Analytics**: Machine learning models for early detection of conditions like Diabetes, Hypertension, and Anemia.
- **Automated Medical Reports**: Generate professional PDF summaries of health data and AI insights.
- **Wellness Gamification (SvasthaQuest)**: Engage in health challenges and track progress with interactive UI elements.
- **Diet & Workout Planning**: Personalized meal plans and exercise routines based on fitness goals.

## 🛠️ Advanced Technology Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) with [Vite](https://vitejs.dev/) for high-performance builds.
- **Styling**: [TailwindCSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/) for a premium, consistent design system.
- **Animations**: [GSAP](https://greensock.com/gsap/) & [Framer Motion](https://www.framer.com/motion/) for smooth, high-fidelity interactive experiences.
- **Visualization**: [Recharts](https://recharts.org/) for dynamic medical data graphing.

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python) for asynchronous, high-speed API performance.
- **Database**: [SQLite](https://www.sqlite.org/) with [SQLAlchemy](https://www.sqlalchemy.org/) ORM.
- **Security**: JWT-based authentication and Pydantic validation.

### Artificial Intelligence & Machine Learning
- **Large Language Models**: [Groq API](https://groq.com/) for lightning-fast AI symptom analysis and chatbots.
- **Computer Vision**: [DeepFace](https://github.com/serengil/deepface) for facial-based health and emotion analysis.
- **Deep Learning**: [TensorFlow](https://www.tensorflow.org/) & [Scikit-learn](https://scikit-learn.org/) for predictive health modeling.
- **Image Processing**: [OpenCV](https://opencv.org/) for medical image preprocessing.

### Infrastructure
- **Containerization**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/).
- **Reverse Proxy**: [Nginx](https://www.nginx.com/) for optimized frontend serving and API routing.

## 📁 Project Structure

```text
Svastha-AI/
├── backend/            # FastAPI application logic
│   ├── app/           # API routers, models, and services
│   ├── storage/       # Database and local file uploads
│   └── .env           # Environment configurations (Redacted)
├── frontend/           # React + Vite application
├── infra/              # Deployment orchestration (Docker, Nginx)
├── data/               # ML datasets and CSV files
├── docs/               # Project documentation and reports
├── scripts/            # Database management and utility scripts
└── README.md           # Project overview
```

## ⚠️ Challenges of Deployment

Deploying SvasthaAI presents unique technical challenges, particularly on cloud platforms like **AWS**:

1. **Heavyweight Libraries**: The integration of **TensorFlow** and **DeepFace** requires significant compute resources. These libraries have large binary footprints and require specialized system dependencies (`libGL`, `libXext`, etc.).
2. **Memory Constraints**: Standard free-tier instances (like `t2.micro` or `t3.micro`) are insufficient for building or running the SvasthaAI environment. The application requires a minimum of **4GB RAM** (e.g., `t3.medium`) to handle ML model loading and inference without OOM (Out-of-Memory) errors.
3. **Complex Dependency Management**: Ensuring compatibility between CUDA-capable libraries and CPU-only cloud environments requires meticulous Docker orchestration.
4. **Environment Security**: Managing sensitive API keys for Groq and other services requires robust secret management, which we've standardized using environment variables and template `.env` files.

---
*Disclaimer: SvasthaAI is an AI-powered tool for informational purposes. Always consult a qualified medical professional for health-related decisions.*
