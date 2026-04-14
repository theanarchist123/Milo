import re
import requests

# Simulate exactly what's in the DB
content = 'Continuous Assessment 2- Problem solving: Algorithm, implementation and Time Complexity Analysis\n\nScan and upload the document for CA2 here. Submit hard copy at the time of submission.\nFor assigned problem statements , refer to\xa0https://docs.google.com/spreadsheets/d/13XeFNc_ZFr3GQv59Ix_t1EjiAJxNe5db/edit?usp=sharing&ouid=107269377278224864204&rtpof=true&sd=true\n\n'

print("Testing content url extraction...")

# Test with unicode-aware regex (catch \xa0 non-breaking space before URL)
urls = set(re.findall(r'(https?://\S+)', content))
print("Found URLs (\\S+):", urls)

# Also test with explicit non-breaking-space-aware split
for url in urls:
    url_clean = url.rstrip(")'\",.&")
    print(f"URL Clean: {url_clean[:60]}...")

    if 'docs.google.com/spreadsheets' in url_clean:
        match = re.search(r'/d/([a-zA-Z0-9-_]+)', url_clean)
        if match:
            doc_id = match.group(1)
            export_url = f"https://docs.google.com/spreadsheets/d/{doc_id}/export?format=csv"
            r = requests.get(export_url, timeout=10)
            print(f"Fetched: Status={r.status_code}, Len={len(r.text)}")
            print("Content head:", r.text[:300])
        else:
            print("NO DOC ID MATCHED")
