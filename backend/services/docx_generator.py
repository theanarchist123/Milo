import os
import re
from docx import Document
from docx.shared import Pt
import uuid

def create_docx_from_markdown(title: str, markdown_text: str) -> str:
    """
    Creates a DOCX file from a markdown string and saves it to media/outputs.
    Returns the relative file path.
    """
    doc = Document()
    
    # Add Title
    title_par = doc.add_heading(title, level=0)
    
    lines = markdown_text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            doc.add_paragraph()
            continue
            
        # Headings
        if line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            clean_text = line.lstrip('#').strip()
            clean_text = clean_text.replace('**', '') # Strip bold from headings
            doc.add_heading(clean_text, level=min(level, 4))
            continue
            
        # Lists
        if line.startswith('- ') or line.startswith('* '):
            p = doc.add_paragraph(style='List Bullet')
            _add_formatted_text(p, line[2:].strip())
            continue
            
        if re.match(r'^\d+\.\s', line):
            p = doc.add_paragraph(style='List Number')
            _add_formatted_text(p, re.sub(r'^\d+\.\s', '', line).strip())
            continue
            
        # Regular paragraph
        p = doc.add_paragraph()
        _add_formatted_text(p, line)
        
    filename = f"{uuid.uuid4().hex}.docx"
    filepath = os.path.join("media", "outputs", filename)
    doc.save(filepath)
    
    return f"outputs/{filename}"

def _add_formatted_text(paragraph, text: str):
    """
    Helper to add text with basic **bold** and *italic* formatting to a paragraph.
    """
    # Simple regex to find bold and italic
    # We will split the text by bold, then by italic
    bold_parts = re.split(r'(\*\*.*?\*\*)', text)
    
    for b_part in bold_parts:
        if b_part.startswith('**') and b_part.endswith('**'):
            run = paragraph.add_run(b_part[2:-2])
            run.bold = True
        else:
            italic_parts = re.split(r'(\*.*?\*)', b_part)
            for i_part in italic_parts:
                if i_part.startswith('*') and i_part.endswith('*'):
                    run = paragraph.add_run(i_part[1:-1])
                    run.italic = True
                else:
                    paragraph.add_run(i_part)
