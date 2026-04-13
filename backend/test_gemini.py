"""Quick test: verify new google.genai SDK with gemini-3-flash-preview."""
import os
os.environ.setdefault("GEMINI_API_KEY", "AIzaSyDmBtHlo5JeqS51OvTrmH9EoyN8-b3fXvE")

from services.gemini_service import classify_content, generate_output

print("TEST: Classification with new SDK")
result = classify_content(
    subject="Module 6 Think and pair activity",
    body="Complete the think and pair activity for module 6. Submit by Friday.",
    sender="Google Classroom",
)
print(f"  Result: {result}")

print("\nTEST: Generation with new SDK")
gen = generate_output(
    title="Module 6 Think and pair activity",
    content="Complete the think and pair activity for module 6.",
    output_type="ASSIGNMENT",
)
print(f"  Title: {gen.get('title')}")
print(f"  Chars: {len(gen.get('text', ''))}")
print(f"  Error: {gen.get('error', 'none')}")
print("Done!")
