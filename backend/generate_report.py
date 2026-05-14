from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.units import inch

def generate_project_report():
    file_path = "SvasthaAI_Project_Report.pdf"
    doc = SimpleDocTemplate(file_path, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'ProjectTitle',
        parent=styles['Heading1'],
        fontSize=24,
        alignment=1,  # Center
        spaceAfter=30,
        textColor=colors.HexColor("#0D9488") # Primary color from project
    )
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceBefore=15,
        spaceAfter=10,
        textColor=colors.HexColor("#0F172A"),
        borderPadding=5,
        borderWidth=0,
        leftIndent=0
    )
    
    body_style = styles['BodyText']
    body_style.fontSize = 11
    body_style.leading = 14
    
    bullet_style = ParagraphStyle(
        'BulletPoint',
        parent=styles['BodyText'],
        leftIndent=20,
        bulletIndent=10,
        spaceAfter=5
    )

    story = []

    # --- COVER PAGE ---
    story.append(Spacer(1, 2 * inch))
    story.append(Paragraph("SvasthaAI: Futuristic Health OS", title_style))
    story.append(Paragraph("An AI-Driven Integrated Healthcare Ecosystem", ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=14, alignment=1, textColor=colors.grey)))
    story.append(Spacer(1, 3 * inch))
    story.append(Paragraph("Technical Documentation & Project Report", ParagraphStyle('ReportType', parent=styles['Normal'], fontSize=12, alignment=1)))
    story.append(Paragraph("2026 Edition", ParagraphStyle('Year', parent=styles['Normal'], fontSize=10, alignment=1)))
    story.append(PageBreak())

    # --- 1. PROJECT OVERVIEW ---
    story.append(Paragraph("1. Project Overview", heading_style))
    story.append(Paragraph(
        "SvasthaAI is a comprehensive, AI-driven 'Health OS' designed to bridge the gap between clinical diagnostics, "
        "personalized wellness, and accessible healthcare. It serves as a futuristic health ecosystem that integrates "
        "deep learning, computer vision, and large language models (LLMs) to provide a holistic health management experience.",
        body_style
    ))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Key Objectives:", body_style))
    story.append(Paragraph("- Provide real-time, high-accuracy clinical diagnostics for multiple organs.", bullet_style))
    story.append(Paragraph("- Deliver personalized, science-backed wellness coaching (Meal & Workout plans).", bullet_style))
    story.append(Paragraph("- Monitor and analyze mental wellness using multi-modal data.", bullet_style))
    story.append(Paragraph("- Ensure inclusive healthcare access for persons with disabilities.", bullet_style))
    story.append(Paragraph("- Gamify the health journey to ensure long-term consistency.", bullet_style))

    # --- 2. CORE MODULES ---
    story.append(Paragraph("2. Core Modules", heading_style))
    
    # 2.1 Multi-Organ Diagnostics
    story.append(Paragraph("2.1 Multi-Organ AI Diagnostics", styles['Heading3']))
    story.append(Paragraph(
        "A sophisticated computer vision suite utilizing custom CNN models (PyTorch) for analyzing medical scans across five key domains:",
        body_style
    ))
    story.append(Paragraph("<b>Skin:</b> Detection of Melanoma, Basal Cell Carcinoma, and Eczema.", bullet_style))
    story.append(Paragraph("<b>Eye:</b> Screening for Cataracts, Diabetic Retinopathy, and Glaucoma.", bullet_style))
    story.append(Paragraph("<b>Oral:</b> Identifying Dental Caries, Gingivitis, and Ulcers.", bullet_style))
    story.append(Paragraph("<b>Lungs:</b> Analyzing X-rays for Pneumonia, Tuberculosis, and COVID-19.", bullet_style))
    story.append(Paragraph("<b>Bone:</b> Detecting fractures and signs of Osteoporosis.", bullet_style))

    # 2.2 Personalized AI Coaching
    story.append(Paragraph("2.2 AROMI: AI Wellness Coach", styles['Heading3']))
    story.append(Paragraph(
        "AROMI is a multilingual (English, Hindi, Marathi) health coach that leverages RAG (Retrieval-Augmented Generation) "
        "to analyze patient reports and generate 7-day personalized wellness plans.",
        body_style
    ))

    # 2.3 Mental Wellness
    story.append(Paragraph("2.3 ManasMitra: Mental Health Companion", styles['Heading3']))
    story.append(Paragraph(
        "Utilizes 'Tri-Fusion Stress Analysis' (Emotion recognition + App usage + Subjective check-ins) to monitor stress "
        "and provide actionable relief strategies.",
        body_style
    ))

    # --- 3. TECHNICAL STACK ---
    story.append(Paragraph("3. Technical Architecture", heading_style))
    
    data = [
        ['Component', 'Technology Used'],
        ['Frontend', 'React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI'],
        ['Backend', 'FastAPI (Python), SQLAlchemy, PostgreSQL'],
        ['AI/ML', 'PyTorch, OpenCV, Scikit-learn, HuggingFace'],
        ['LLM & RAG', 'Groq (Llama-3), LangChain, ChromaDB'],
        ['Authentication', 'JWT (JSON Web Tokens), BCrypt'],
        ['OCR', 'Python-doctr (Deep Learning OCR)']
    ]
    
    t = Table(data, colWidths=[1.5*inch, 4*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0D9488")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t)

    # --- 4. CONCLUSION ---
    story.append(Paragraph("4. Conclusion", heading_style))
    story.append(Paragraph(
        "SvasthaAI represents the next generation of healthcare platforms, moving from passive record-keeping "
        "to active intelligence. By combining high-speed AI inference with deep personalization, it empowers "
        "users to take control of their health destiny.",
        body_style
    ))

    doc.build(story)
    print(f"Report generated successfully at {file_path}")

if __name__ == "__main__":
    generate_project_report()
