
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import io

def test_pdf():
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.drawString(100, 750, "SvasthaAI Test Report")
    c.save()
    content = buffer.getvalue()
    with open("test_report.pdf", "wb") as f:
        f.write(content)
    print(f"Generated PDF of size: {len(content)} bytes")

if __name__ == "__main__":
    test_pdf()
