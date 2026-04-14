"""Quick test: Pull all GIDs from the sheet HTML"""
import time
import re
from playwright.sync_api import sync_playwright

url = "https://docs.google.com/spreadsheets/d/13XeFNc_ZFr3GQv59Ix_t1EjiAJxNe5db/edit"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(url, wait_until="domcontentloaded", timeout=20000)
    time.sleep(4)
    
    # Extract from HTML
    html = page.content()
    
    # Google embeds sheet data as JSON - look for "sheets" array
    # Common pattern: {"sheetId":0,"title":"Instructions",...}
    gid_pairs = re.findall(r'"sheetId":(\d+).*?"title":"([^"]+)"', html)
    alt_pairs  = re.findall(r'"title":"([^"]+)".*?"sheetId":(\d+)', html)
    
    print("=== GID pairs (sheetId first) ===")
    for gid, name in gid_pairs[:10]:
        print(f"  GID={gid}  Name={name}")
    
    print("\n=== Alt pairs (title first) ===")
    for name, gid in alt_pairs[:10]:
        print(f"  Name={name}  GID={gid}")

    # Also check tabs more carefully
    tabs = page.query_selector_all(".docs-sheet-tab")
    print(f"\n=== {len(tabs)} tab elements found ===")
    for tab in tabs:
        html_content = tab.inner_html()
        print("Tab HTML:", html_content[:200])
    
    # Look for gid in tab links
    tab_links = page.query_selector_all(".docs-sheet-tab a")
    print(f"\n=== {len(tab_links)} tab links ===")
    for link in tab_links:
        href = link.get_attribute("href") or ""
        text = link.inner_text()
        print(f"  Text={text!r}  href={href[:100]}")
    
    browser.close()
