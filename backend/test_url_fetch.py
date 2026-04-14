import requests
import re

url = 'https://docs.google.com/spreadsheets/d/13XeFNc_ZFr3GQv59Ix_t1EjiAJxNe5db/edit?usp=sharing&ouid=107269377278224864204&rtpof=true&sd=true'
print("Original URL:", url[:80], "...")

match = re.search(r'/d/([a-zA-Z0-9-_]+)', url)
print("Match:", match.group(1) if match else "NO MATCH")

doc_id = match.group(1)
export_url = f'https://docs.google.com/spreadsheets/d/{doc_id}/export?format=csv'
print("Export URL:", export_url)

r = requests.get(export_url, timeout=10)
print("Status:", r.status_code)
print("Content-Length:", len(r.text))
print("Full content:")
print(r.text)
