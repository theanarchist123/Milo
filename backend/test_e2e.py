"""
End-to-end test: simulates exactly what happens when Process with Miro is clicked.
Reads the CA2 item from the DB, calls _expand_urls_in_content, prints what will be sent to Gemini.
"""
import sys
sys.path.insert(0, '.')

import sqlite3
import logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

from services.gemini_service import _expand_urls_in_content

# Get the CA2 item from DB
conn = sqlite3.connect('miro.db')
c = conn.cursor()
c.execute("SELECT title, description FROM course_items WHERE title LIKE '%Continuous Assessment 2%' LIMIT 1")
row = c.fetchone()
if not row:
    print("ERROR: CA2 item not found in DB")
    sys.exit(1)

title, description = row
content = f"{title}\n\n{description}"

print("=" * 60)
print("CONTENT BEING PASSED TO AI:")
print(content)
print("=" * 60)

expanded = _expand_urls_in_content(content)

print("\n" + "=" * 60)
print("EXPANDED CONTENT (first 2000 chars):")
print(expanded[:2000])
print("=" * 60)
print(f"\nTotal expanded content length: {len(expanded)} chars")
print(f"URL expansion added {len(expanded) - len(content)} extra chars")
