# SvasthaAI Backend

SvasthaAI is an AI-driven futuristic healthcare ecosystem that integrates advanced computer vision, deep learning, and large language models to provide a holistic "Health OS".

## 🚀 Architecture

The backend is built with **FastAPI** and follows a modular architecture designed for scalability and maintainability.

### Project Structure

```text
backend/
├── app/                # Core Application Logic
│   ├── api/            # API Route Handlers
│   ├── core/           # Configuration & Security
│   ├── db/             # Database Models & Connectivity
│   ├── schemas/        # Pydantic Data Models (DTOs)
│   └── services/       # Business Logic & AI Integrations
├── ai/                 # Machine Learning & AI Assets
│   ├── models/         # Model Architectures
│   ├── training/       # Training Scripts
│   └── preprocessors/  # Data Pipeline Utilities
├── data/               # Static Datasets (CSV/JSON)
├── docs/               # System Documentation & Reports
├── scripts/            # Operational & Maintenance Scripts
└── storage/            # Local Storage (DB & Uploads)
```

---

## 🛠️ Advanced Technology Stack

### 🧠 Artificial Intelligence
- **Computer Vision**: PyTorch/Torchvision (Organ Pathology Detection).
- **Facial Analytics**: DeepFace & FER (Stress Index & Emotion).
- **OCR**: python-doctr (Document Intelligence).
- **LLM**: Groq Llama-3 (Medical RAG).
- **Tabular**: Scikit-learn (Clinical Risk).

### 🌐 Backend
- **Framework**: FastAPI (Async Performance).
- **Database**: SQLAlchemy (Unified Storage).
- **Security**: JWT & BCrypt.
- **Reporting**: ReportLab (PDF Generation).


## 🛠️ Tech Stack

- **Framework:** FastAPI
- **Database:** SQLAlchemy (SQLite/PostgreSQL)
- **AI/ML:** PyTorch, OpenCV, HuggingFace
- **LLM:** Groq (Llama-3), LangChain
- **Reporting:** ReportLab (PDF Generation)
- **Authentication:** JWT with BCrypt

## ⚙️ Setup & Installation

1. **Environment Variables**
   Copy `.env.aws.example` to `.env` and fill in the required keys:
   ```bash
   cp .env.aws.example .env
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Application**
   ```bash
   uvicorn app.main:app --reload --port 8002
   ```

## 🧪 Maintenance Scripts

- `python scripts/seed_schemes.py`: Seed the database with disability schemes.
- `python scripts/reset_auth.py`: Reset administrator credentials.
- `python scripts/inspect_db.py`: Inspect the current database schema.

---

## ⚠️ Deployment Challenges

A critical hurdle in deploying SvasthaAI is the **Resource Intensity** of the AI stack. Libraries like **TensorFlow** and **DeepFace** require significant RAM (minimum 4GB), which makes standard **AWS Free Tier (t2.micro)** instances insufficient. 

**Our Solution**: 
- **Lazy Loading**: Models are loaded into memory only when invoked.
- **Unified Storage**: Centralized `storage/` for easy volume persistence in containerized deployments.


---
Developed by the SvasthaAI Team.
