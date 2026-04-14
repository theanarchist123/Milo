from services.docx_generator import create_docx_from_markdown

markdown = """# Aim
To learn python

```python
print("Hello world")
```

- Point 1
- Point 2

**Note:** This is important."""

create_docx_from_markdown("Test Doc", markdown)
print("DOCX created successfully.")
