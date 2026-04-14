"""Find GIDs from Playwright — get the full raw page content + JS variables"""
import time
import re
import json
from playwright.sync_api import sync_playwright

sheet_id = "13XeFNc_ZFr3GQv59Ix_t1EjiAJxNe5db"
url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)  # headed so we can see
    page = browser.new_page()
    page.goto(url, wait_until="networkidle", timeout=30000)
    time.sleep(3)
    
    # Try to extract the bootstrapData which contains sheet list
    result = page.evaluate("""() => {
        const results = {};
        
        // Look for sheet ids in all script tags
        try {
            const scripts = document.querySelectorAll('script');
            const patterns = [];
            // Find any that mention 'sheetId' or 'gid'
            scripts.forEach((s, i) => {
                if (s.innerText && (s.innerText.includes('sheetId') || s.innerText.includes('"gid"'))) {
                    patterns.push(s.innerText.substring(0, 2000));
                }
            });
            results.scriptMatches = patterns.slice(0, 3);
        } catch(e) { results.scriptError = e.toString(); }
        
        // Try window.__BOOTSTRAP_DATA__ or similar
        for (const key of ['bootstrapData', '__BOOTSTRAP_DATA__', 'APP_INITIALIZATION_STATE']) {
            try {
                if (window[key]) results[key] = JSON.stringify(window[key]).substring(0, 500);
            } catch(e) {}
        }
        
        return results;
    }""")
    
    print("JS result keys:", list(result.keys()))
    for k, v in result.items():
        print(f"\n--- {k} ---")
        print(str(v)[:500])
    
    # Get current URL hash (gid is in hash fragment when switching tabs)
    current_url = page.url
    print("\nCurrent URL:", current_url)
    
    # Click each tab and capture the URL hash
    tabs = page.query_selector_all(".docs-sheet-tab")
    print(f"\n{len(tabs)} tabs found. Clicking each to get GID from URL...\n")
    for tab in tabs:
        name = tab.inner_text().strip()
        tab.click()
        time.sleep(0.5)
        tab_url = page.url
        gid_match = re.search(r'gid=(\d+)', tab_url)
        gid = gid_match.group(1) if gid_match else "?"
        print(f"  Tab: {name!r:30s}  GID: {gid}")
    
    browser.close()
