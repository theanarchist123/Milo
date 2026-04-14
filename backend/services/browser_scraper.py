"""
Browser Scraper Service — Smart URL content extractor.

For Google Sheets: uses Playwright to click each tab, capture the GID from 
the URL hash, then exports each tab as clean CSV text.
For Google Docs: exports as plain text.
For any webpage: reads visible text via Playwright.
"""
import logging
import time
import re
import requests
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)


def scrape_url(url: str, timeout_ms: int = 25000) -> str:
    """
    Smart URL scraper:
    - Google Sheets → discovers all tab GIDs by clicking tabs, exports each as CSV
    - Google Docs   → exports as plain text
    - Any webpage   → reads visible text via Playwright
    """
    logger.info(f"[BrowserScraper] Scraping: {url[:80]}")

    try:
        if 'docs.google.com/spreadsheets' in url:
            return _scrape_google_sheets_all_tabs(url, timeout_ms)
        elif 'docs.google.com/document' in url:
            return _scrape_google_doc(url, timeout_ms)
        else:
            return _scrape_webpage(url, timeout_ms)
    except Exception as e:
        logger.error(f"[BrowserScraper] Error scraping {url}: {e}")
        return ""


def _scrape_google_sheets_all_tabs(sheet_url: str, timeout_ms: int) -> str:
    """
    Step 1: Open sheet in headless browser, click each tab, capture GID from URL hash.
    Step 2: Export each GID as CSV using the public export API.
    Returns combined text of ALL tabs.
    """
    match = re.search(r'/d/([a-zA-Z0-9-_]+)', sheet_url)
    if not match:
        return ""
    sheet_id = match.group(1)

    # Step 1: Discover GIDs by clicking each tab
    gid_map = {}  # tab_name -> gid
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            page.goto(
                f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit",
                wait_until="domcontentloaded",
                timeout=timeout_ms,
            )
            # Wait for tab bar to render
            page.wait_for_selector(".docs-sheet-tab", timeout=15000)
            time.sleep(2)

            tabs = page.query_selector_all(".docs-sheet-tab")
            logger.info(f"[SheetScraper] Found {len(tabs)} tab elements")

            for tab in tabs:
                name = tab.inner_text().strip()
                if not name:
                    continue
                tab.click()
                time.sleep(0.6)
                current_url = page.url
                gid_match = re.search(r'gid=(\d+)', current_url)
                if gid_match:
                    gid_map[name] = gid_match.group(1)
                    logger.info(f"[SheetScraper] Tab '{name}' -> GID {gid_match.group(1)}")

            browser.close()

    except PlaywrightTimeout as e:
        logger.warning(f"[SheetScraper] Browser timeout during tab discovery: {e}")
    except Exception as e:
        logger.warning(f"[SheetScraper] Browser error during tab discovery: {e}")

    if not gid_map:
        logger.warning("[SheetScraper] No tabs found via browser; exporting gid=0 only")
        gid_map = {"Sheet1": "0"}

    # Step 2: Export each tab as CSV using the export API
    all_text = []
    for tab_name, gid in gid_map.items():
        export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
        try:
            r = requests.get(export_url, timeout=10)
            if r.status_code == 200 and r.text.strip():
                # Clean up CSV: remove empty rows and join cells with |
                lines = []
                for line in r.text.splitlines():
                    cells = [c.strip().strip('"') for c in line.split(',')]
                    clean = ' | '.join(c for c in cells if c)
                    if clean:
                        lines.append(clean)
                tab_text = '\n'.join(lines)
                if tab_text.strip():
                    all_text.append(f"=== Sheet Tab: {tab_name} ===\n{tab_text}")
                    logger.info(f"[SheetScraper] Tab '{tab_name}' (gid={gid}): {len(tab_text)} chars")
            else:
                logger.warning(f"[SheetScraper] Export returned {r.status_code} for tab '{tab_name}' GID={gid}")
        except Exception as e:
            logger.warning(f"[SheetScraper] Could not export tab '{tab_name}': {e}")

    combined = "\n\n".join(all_text)
    logger.info(f"[SheetScraper] Total from all tabs: {len(combined)} chars")
    return combined


def _scrape_google_doc(doc_url: str, timeout_ms: int) -> str:
    """Exports a Google Doc as plain text."""
    match = re.search(r'/d/([a-zA-Z0-9-_]+)', doc_url)
    if not match:
        return ""
    doc_id = match.group(1)
    export_url = f"https://docs.google.com/document/d/{doc_id}/export?format=txt"
    try:
        r = requests.get(export_url, timeout=10)
        if r.status_code == 200:
            logger.info(f"[BrowserScraper] Google Doc exported: {len(r.text)} chars")
            return r.text[:12000]
    except Exception as e:
        logger.warning(f"[BrowserScraper] Doc export failed: {e}")
    return ""


def _scrape_webpage(url: str, timeout_ms: int) -> str:
    """Uses Playwright to read visible text from any webpage."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            time.sleep(1)
            text = page.inner_text("body")
            browser.close()
            logger.info(f"[BrowserScraper] Webpage scraped: {len(text)} chars")
            return text[:6000]
    except Exception as e:
        logger.warning(f"[BrowserScraper] Webpage scrape failed: {e}")
        return ""
