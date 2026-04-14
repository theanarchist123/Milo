"""Find GIDs by clicking each tab and reading URL hash"""
import time
import re
from playwright.sync_api import sync_playwright

sheet_id = "13XeFNc_ZFr3GQv59Ix_t1EjiAJxNe5db"
url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    
    # Wait for tabs to appear
    page.wait_for_selector(".docs-sheet-tab", timeout=20000)
    time.sleep(2)
    
    tabs = page.query_selector_all(".docs-sheet-tab")
    print(f"{len(tabs)} tabs found")
    
    for tab in tabs:
        name = tab.inner_text().strip()
        tab.click()
        time.sleep(0.8)
        tab_url = page.url
        gid_match = re.search(r'gid=(\d+)', tab_url)
        gid = gid_match.group(1) if gid_match else "?"
        print(f"  Tab: {name!r:35s} GID: {gid}")
    
    browser.close()
