"""Find the real GIDs by fetching the sheet HTML and extracting from JSON data"""
import re
import requests

sheet_id = "13XeFNc_ZFr3GQv59Ix_t1EjiAJxNe5db"

# Try fetching the sheet info feed (works for public sheets)
feed_url = f"https://spreadsheets.google.com/feeds/worksheets/{sheet_id}/public/basic?alt=json"
r = requests.get(feed_url, timeout=10)
print("Feed status:", r.status_code)
if r.status_code == 200:
    import json
    data = json.loads(r.text)
    for entry in data.get('feed', {}).get('entry', []):
        title = entry.get('title', {}).get('$t', 'unknown')
        # gid is embedded in the self link
        for link in entry.get('link', []):
            href = link.get('href', '')
            if 'gid=' in href:
                gid = re.search(r'gid=(\d+)', href)
                print(f"Sheet: {title!r:40s}  GID: {gid.group(1) if gid else 'N/A'}")
                break
else:
    print("Feed not available")
    print(r.text[:500])
