import os
import pypdfium2 as pdfium

def convert_pdf(pdf_path, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    
    pdf = pdfium.PdfDocument(pdf_path)
    num_pages = len(pdf)
    print(f"Total PDF pages: {num_pages}")
    
    for i in range(num_pages):
        page = pdf[i]
        # Render at 150 DPI (scale ~2) for clear crisp inspection
        image = page.render(scale=2.0).to_pil()
        out_file = os.path.join(output_dir, f"page_{i + 1}.png")
        image.save(out_file)
        print(f"Rendered Page {i + 1} -> {out_file} (Dimensions: {image.width}x{image.height})")

if __name__ == "__main__":
    pdf_path = r"e:\ADAM-Enhanced\reports_output\adam1_report_fb100.pdf"
    output_dir = r"e:\ADAM-Enhanced\reports_output\images"
    convert_pdf(pdf_path, output_dir)
