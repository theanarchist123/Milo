"""Quick test: Open the CA2 Google Sheet with a real browser and read ALL tabs."""
import logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

from services.browser_scraper import scrape_url

url = "https://docs.google.com/spreadsheets/d/13XeFNc_ZFr3GQv59Ix_t1EjiAJxNe5db/edit?usp=sharing&ouid=107269377278224864204&rtpof=true&sd=true"

print("Opening browser...\n")
text = scrape_url(url, timeout_ms=30000)
print("\n=== SCRAPED CONTENT ===")
safe = text[:6000].encode('ascii', errors='replace').decode('ascii')
print(safe)
print(f"\n=== Total: {len(text)} chars ===")
