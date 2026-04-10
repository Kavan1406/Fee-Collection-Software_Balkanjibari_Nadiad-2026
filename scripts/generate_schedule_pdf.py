import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader

def generate_pdf():
    # Paths
    img1_path = r'C:\Users\darsh\.gemini\antigravity\brain\97aeb6c9-3a00-4601-a794-60747009a7e6\media__1775766643134.png'
    img2_path = r'C:\Users\darsh\.gemini\antigravity\brain\97aeb6c9-3a00-4601-a794-60747009a7e6\media__1775766652233.png'
    logo_path = r'c:\Users\darsh\Downloads\admin-student-dashboard-ui\public\logo.jpeg'
    output_path = r'c:\Users\darsh\Downloads\admin-student-dashboard-ui\public\templates\activity_schedule_2026.pdf'

    # Create directory if not exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4

    # --- PAGE 1: COVER ---
    if os.path.exists(logo_path):
        c.drawImage(logo_path, (width - 100) / 2, height - 150, width=100, height=100, mask='auto')
    
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2, height - 200, "BALKANJI BARI, NADIAD")
    
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width / 2, height - 240, "SUMMER CAMP 2026")
    c.drawCentredString(width / 2, height - 270, "ACTIVITY GUIDE & SCHEDULE")

    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, 100, "Registration Office: Balkanji Bari, Mission Road, Nadiad")
    c.drawCentredString(width / 2, 80, "Contact: +91 94295 56123 | Website: www.balkanjibari.org")
    
    c.showPage()

    # --- PAGE 2: SCHEDULE PART 1 ---
    if os.path.exists(img1_path):
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 50, "Schedule Page 1 (Subjects 1-15)")
        
        img = ImageReader(img1_path)
        img_w, img_h = img.getSize()
        
        # Scale to fit width (max 500)
        scale = (width - 100) / img_w
        draw_w = img_w * scale
        draw_h = img_h * scale
        
        c.drawImage(img1_path, 50, height - 100 - draw_h, width=draw_w, height=draw_h)
    
    c.showPage()

    # --- PAGE 3: SCHEDULE PART 2 ---
    if os.path.exists(img2_path):
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 50, "Schedule Page 2 (Subjects 16-23)")
        
        img = ImageReader(img2_path)
        img_w, img_h = img.getSize()
        
        # Scale to fit width
        scale = (width - 100) / img_w
        draw_w = img_w * scale
        draw_h = img_h * scale
        
        c.drawImage(img2_path, 50, height - 100 - draw_h, width=draw_w, height=draw_h)

    c.save()
    print(f"PDF generated successfully at: {output_path}")

if __name__ == "__main__":
    generate_pdf()
