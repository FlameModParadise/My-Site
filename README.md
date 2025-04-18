
# Flame Mod Paradise (FMP) – Tool Store 🚀

Welcome to **Flame Mod Paradise (FMP)** – a premium static web app that offers custom bots, automation tools, checkers, mod scripts, and exclusive free offers like Netflix, Spotify, and ChatGPT cookies.

---

## 🔥 Features

- Modern responsive UI (Dark mode enabled 🌙)
- PWA support with install prompt 📲
- Service Worker for offline caching and speed ⚡
- Dynamic filter, search, and sorting system
- Detail page with description, image gallery, and pricing
- Animated transitions & interactive UI elements
- JSON-driven content system (tools, bots, offers, etc.)
- Requirements popups for extra tool info
- Contact via Telegram/Discord
- Lazy-loading & accessibility enhancements

---

## 🗂 Project Structure

```
My Site/
├── index.html                # Main entry point
├── style.css                 # Fully styled CSS (responsive, dark mode)
├── script.js                 # Handles dynamic rendering and logic
├── manifest.json            # PWA configuration
├── service-worker.js        # Cache-first service worker setup
├── assets/                  # Icons, banners, placeholders
├── data/                    # JSON files for tool content (tools.json, bots.json...)
├── pages/                   # Additional static pages (contact, faq, reviews)
├── resources/               # Legal pages like ToS, Privacy, Sitemap
```

---

## 💻 Getting Started

### 1. Clone or Download

```bash
git clone https://github.com/<your-username>/My-Site.git
cd My-Site
```

### 2. Run Locally

You can test this static site using any local server. Example:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open: `http://localhost:8080`

### 3. Install as App (PWA)

- Open the site in Chrome or any PWA-supported browser.
- You’ll see an install prompt.
- Or click the install icon in address bar.

---

## 🧠 Tech Stack

- **HTML5 + CSS3**
- **Vanilla JavaScript**
- **Progressive Web App (PWA)**
- **JSON for dynamic content**
- **Service Workers for offline support**

---

## 📂 Data JSONs

All content like tools, bots, and offers are sourced from JSON files inside the `/data/` directory.

You can edit these files to update tool listings.

---

## 📱 Contact

📩 Telegram Bot: [@fmpChatBot](https://t.me/fmpChatBot)  
💬 Personal Telegram: [@flamemodparadise](https://t.me/flamemodparadise)  
📧 Email: flamemodparadiscord@gmail.com

---

## ⚠️ Disclaimer

Use the provided tools and scripts responsibly. No refunds after digital delivery. This is a **static showcase only**, for direct purchase please contact us.

---

### How to make items appear in the new sections

All three blocks are filled automatically from *the same JSON files* you already use (`tools.json`, `bots.json`, etc.).  
Just tweak or add the fields below—**no extra file, no new arrays**—and hit *Save → Refresh*.

| Section | What the JavaScript looks for | Exactly what to put in the item object |
|---------|------------------------------|-----------------------------------------|
| **🔥 Offers & Discounts** | ‑ `discount` **or** `offer` is **present and not expired** | ```json {  
  "name": "Combo Splitter",  
  "discount": "30",               // % off (string or number)  
  "discount_expiry": "2025‑05‑05T23:59:00Z"  
} ```<br>or<br>```json {  
  "name": "Log Extractor Pro",  
  "offer": "Buy 1 Get 1",         // any text works  
  "offer_expiry": "2025‑04‑30T18:00:00Z"  
} ``` |
| **⭐ Recommended** | 1) item has the tag **`"recommended"`** **OR**<br>2) its `release_date` is within the last 14 days | **Option A (best):**<br>```json  
"tags": ["extractor","recommended"]  
```<br>**Option B:** (no tag needed)<br>Set `"release_date"` to a date ≤ 14 days ago, e.g. `"2025‑04‑10"` |
| **⏰ Limited‑Time Item** | `stock` equals **1** | ```json  
"stock": 1  
``` |

*(You can combine them—an item with `discount` **and** `stock:1` will show in both relevant sections.)*

---

#### Step‑by‑step

1. **Open** the JSON file that contains the product (for example `data/tools.json`).  
2. **Find** the object for that tool, or create a new one.  
3. **Add / edit** the fields shown above.  
4. **Save** the file.  
5. **Hard‑refresh** the site (Ctrl/⌘‑Shift‑R) so the service‑worker grabs the new data.

That’s it—the JavaScript already watches those fields and shows or hides each block automatically. If none of the tools meet a block’s criteria, that section stays hidden.

Need a hand with anything else—like a helper UI to toggle discounts—or validation rules? Just let me know.


## 📄 License

This project is licensed for educational and showcase purposes only.

