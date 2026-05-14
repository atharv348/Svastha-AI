from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from groq import Groq

from services.groq_service import generate_ai_content


# Prefer modern provider packages, then fall back for compatibility.
try:
    from langchain_huggingface import HuggingFaceEmbeddings
except Exception:  # pragma: no cover
    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
    except Exception:  # pragma: no cover
        from langchain.embeddings import HuggingFaceEmbeddings

try:
    from langchain_chroma import Chroma
except Exception:  # pragma: no cover
    try:
        from langchain_community.vectorstores import Chroma
    except Exception:  # pragma: no cover
        from langchain.vectorstores import Chroma

try:
    from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader, TextLoader
except Exception:  # pragma: no cover
    from langchain.document_loaders import DirectoryLoader, PyPDFLoader, TextLoader

try:
    from langchain_core.documents import Document
except Exception:  # pragma: no cover
    from langchain.schema import Document

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except Exception:  # pragma: no cover
    from langchain.text_splitter import RecursiveCharacterTextSplitter


class VaidyaAIRAG:
    """RAG service for medical reasoning and medicine recommendations."""

    def __init__(
        self,
        groq_api_key: str | None,
        knowledge_base_path: str,
        persist_directory: str = "./vaidyaai_chroma_db",
    ) -> None:
        self.knowledge_base_path = Path(knowledge_base_path)
        self.persist_directory = persist_directory

        self.groq_client = Groq(api_key=groq_api_key) if groq_api_key else None
        self.vector_store: Chroma | None = None
        self.conversation_history: list[dict[str, str]] = []

        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
        )

    def _load_indian_medical_sources(self) -> list[Document]:
        icmr_content = """
Indian Council of Medical Research (ICMR) Focus Notes:
- Dengue: fever, retro-orbital pain, severe myalgia.
- Malaria: cyclical fever, chills, sweating, fatigue.
- Typhoid: prolonged fever, abdominal pain, weakness.
- Tuberculosis: chronic cough, weight loss, night sweats.

Prevention:
- Clean water, vector control, household hygiene, routine vaccination.
"""

        ayurveda_content = """
Ayurvedic Overview:
- Doshas: Vata, Pitta, Kapha.
- Common supportive remedies: turmeric, tulsi, ginger, ashwagandha, giloy.
- Supportive practices: sleep hygiene, stress reduction, tailored diet.
"""

        return [
            Document(page_content=icmr_content, metadata={"source": "ICMR Notes", "category": "India-specific"}),
            Document(page_content=ayurveda_content, metadata={"source": "Ayurvedic Notes", "category": "Traditional"}),
        ]

    def load_medical_documents(self, include_indian_sources: bool = True) -> int:
        if not self.knowledge_base_path.exists():
            raise FileNotFoundError(f"Knowledge base folder not found: {self.knowledge_base_path}")

        all_documents: list[Document] = []

        pdf_loader = DirectoryLoader(
            str(self.knowledge_base_path),
            glob="**/*.pdf",
            loader_cls=PyPDFLoader,
            show_progress=True,
            use_multithreading=True,
        )
        all_documents.extend(pdf_loader.load())

        txt_loader = DirectoryLoader(
            str(self.knowledge_base_path),
            glob="**/*.txt",
            loader_cls=TextLoader,
            show_progress=True,
            use_multithreading=True,
        )
        all_documents.extend(txt_loader.load())

        md_loader = DirectoryLoader(
            str(self.knowledge_base_path),
            glob="**/*.md",
            loader_cls=TextLoader,
            show_progress=True,
            use_multithreading=True,
        )
        all_documents.extend(md_loader.load())

        if include_indian_sources:
            all_documents.extend(self._load_indian_medical_sources())

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        chunks = splitter.split_documents(all_documents)

        self.vector_store = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            persist_directory=self.persist_directory,
            collection_metadata={"hnsw:space": "cosine"},
        )

        return len(chunks)

    def load_existing_index(self) -> bool:
        if not Path(self.persist_directory).exists():
            return False

        self.vector_store = Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings,
        )
        return True

    def retrieve_context(self, query: str, k: int = 5, filter_metadata: dict[str, Any] | None = None) -> str:
        if self.vector_store is None:
            raise ValueError("Vector store not initialized")

        if filter_metadata:
            docs = self.vector_store.similarity_search(query, k=k, filter=filter_metadata)
        else:
            docs = self.vector_store.similarity_search(query, k=k)

        context_parts: list[str] = []
        for idx, doc in enumerate(docs, start=1):
            source = doc.metadata.get("source", "Unknown")
            context_parts.append(f"[Source {idx}: {source}]\n{doc.page_content}")

        return "\n\n".join(context_parts)

    def _chat(self, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 1800) -> str:
        if self.groq_client is None:
            merged = f"{system_prompt}\n\nUser Request:\n{user_prompt}"
            return generate_ai_content(merged)

        response = self.groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content

    def _estimate_confidence(self, diagnosis_text: str) -> str:
        text = diagnosis_text.lower()
        low_markers = ["possibly", "might", "could", "uncertain", "needs confirmation"]
        high_markers = ["likely", "consistent with", "strongly suggests", "high suspicion"]

        low_score = sum(1 for marker in low_markers if marker in text)
        high_score = sum(1 for marker in high_markers if marker in text)

        if high_score > low_score:
            return "High"
        if low_score > high_score:
            return "Low"
        return "Medium"

    def diagnose_with_context(
        self,
        symptoms: list[str],
        patient_info: dict[str, Any],
        selected_diseases: list[str] | None = None,
        severity: str = "moderate",
    ) -> dict[str, Any]:
        if self.vector_store is None:
            self.load_existing_index()

        selected_diseases = selected_diseases or []
        query_parts = [
            f"Symptoms: {', '.join(symptoms)}",
            f"Severity: {severity}",
        ]
        if selected_diseases:
            query_parts.append(f"Suspected conditions: {', '.join(selected_diseases)}")

        query = " | ".join(query_parts)
        context = self.retrieve_context(query, k=7) if self.vector_store is not None else "No indexed context available."

        system_prompt = f"""
You are VaidyaAI, a medical assistant for India-focused triage support.
Use the supplied context and provide cautious, clinically responsible guidance.

Context:
{context}

Instructions:
1) Provide differential diagnosis with reasoning.
2) Suggest investigations.
3) Identify emergency red flags.
4) Include practical immediate actions.
5) Mention where in-person medical consultation is mandatory.
6) Keep final guidance concise and safety-first.
"""

        user_prompt = f"""
Patient profile:
- age: {patient_info.get('age', 'unknown')}
- gender: {patient_info.get('gender', 'unknown')}
- location: {patient_info.get('location', 'India')}
- history: {patient_info.get('medical_history', 'none reported')}
- allergies: {patient_info.get('allergies', [])}
- medications: {patient_info.get('medications', [])}

Symptoms: {', '.join(symptoms)}
Severity: {severity}
Suspected conditions: {', '.join(selected_diseases) if selected_diseases else 'not specified'}
"""

        diagnosis = self._chat(system_prompt=system_prompt, user_prompt=user_prompt, temperature=0.2)

        sources = []
        if self.vector_store is not None:
            source_docs = self.vector_store.similarity_search(query, k=3)
            sources = [doc.metadata.get("source", "Unknown") for doc in source_docs]

        return {
            "diagnosis": diagnosis,
            "context_sources": sources,
            "confidence": self._estimate_confidence(diagnosis),
            "severity_assessment": severity,
        }

    def get_medicine_recommendations(
        self,
        diagnosis: str,
        patient_age: int,
        is_pregnant: bool = False,
        allergies: list[str] | None = None,
    ) -> str:
        if self.vector_store is None:
            self.load_existing_index()

        allergies = allergies or []
        context = (
            self.retrieve_context(f"Medicine recommendations for {diagnosis}", k=5)
            if self.vector_store is not None
            else "No indexed context available."
        )

        constraints = []
        if is_pregnant:
            constraints.append("pregnancy-safe options only")
        if allergies:
            constraints.append(f"avoid allergens: {', '.join(allergies)}")
        if patient_age < 18:
            constraints.append("pediatric dosing only")
        elif patient_age > 65:
            constraints.append("elderly-sensitive dosing")

        system_prompt = """
You are a medication guidance assistant. Give safety-first advice.
Always state that final prescription decisions require a licensed clinician.
"""

        user_prompt = f"""
Diagnosis: {diagnosis}
Patient age: {patient_age}
Constraints: {', '.join(constraints) if constraints else 'none'}

Context:
{context}

Provide:
- OTC options
- prescription categories to discuss with doctor
- ayurvedic/supportive options
- major contraindications and red flags
"""

        return self._chat(system_prompt=system_prompt, user_prompt=user_prompt, temperature=0.1, max_tokens=1400)
