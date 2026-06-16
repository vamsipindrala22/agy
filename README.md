# 📊 BigQuery Release Notes Explorer

A premium, high-fidelity web dashboard that fetches, parses, and formats the live Google BigQuery Release Notes feed. The application includes dynamic real-time filtering, instant search, loading shimmers, and a custom-designed composer modal to share updates on **X (formerly Twitter)** with automatic character limit adjustments.

Built using **Python Flask** for the backend feed parser and **Vanilla HTML5, CSS3, and JavaScript** for a modern, responsive, and responsive user experience.

---

## 🚀 Key Features

* **Live Feed Parsing**: Fetches the GCP XML feed and parses it with `BeautifulSoup` and `lxml`.
* **Category Grouping**: Parses unstructured feed descriptions into clean, separate updates tagged by categories: `Feature`, `Issue`, `Announcement`, `Notice`, `Change`, and `Breaking`.
* **Premium Dark Theme**: Built with a custom, glowing, glassmorphic layout utilizing Outfit & Plus Jakarta Sans typography.
* **Instant Filtering & Search**: Interactive pill-based filters and reactive search bar to instantly query updates.
* **Manual Refresh & Spinner**: Quick-action reload button that animates to show feed retrieval states.
* **X (Twitter) Composer Modal**: Opens a dimmer modal populated with pre-formatted update text, including hashtags, official links, and live character counting (limited to 280 characters).

---

## 📁 File Structure

```text
agy-cli-projects/
├── templates/
│   └── index.html          # Dashboard HTML skeleton & X composer modal
├── static/
│   ├── css/
│   │   └── style.css       # Core styling, variables, blobs, animations & layouts
│   └── js/
│       └── app.js          # App controller: fetches feed, filters cards & manages Twitter modal
├── app.py                  # Flask web server: fetches, parses and caches XML feed
├── requirements.txt        # Backend dependencies (Flask, requests, bs4, lxml)
├── .gitignore              # Ignored files (venv, pycache)
└── README.md               # Repository documentation (this file)
```

---

## 💻 Code Highlights

### Backend: XML Parser & Grouping (`app.py`)
Parses `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml` and filters out unwanted updates:

```python
def parse_release_notes():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    response = requests.get(url, headers=headers, timeout=15)
    soup = BeautifulSoup(response.content, "xml")
    entries = soup.find_all("entry")
    parsed_updates = []
    
    for entry in entries:
        date_str = entry.find("title").get_text(strip=True) if entry.find("title") else ""
        link_elem = entry.find("link", rel="alternate")
        link = link_elem["href"] if link_elem and link_elem.has_attr("href") else ""
        
        content_elem = entry.find("content")
        if not content_elem:
            continue
            
        content_html = content_elem.get_text()
        content_soup = BeautifulSoup(content_html, "html.parser")
        h3s = content_soup.find_all("h3")
        
        # Split updates by <h3> category headings
        # Filter out "Deprecations" (per instructions)
        ...
        if "deprecat" not in current_type.lower():
            parsed_updates.append({
                "date": date_str,
                "link": link,
                "type": current_type,
                "content": update_html,
                "text": update_text
            })
    return parsed_updates
```

### Frontend: Twitter Intent Copy Generator (`static/js/app.js`)
Builds structured tweet contents and truncates description text to stay within Twitter's 280-character limit:

```javascript
function generateTweetText(update) {
    const date = update.date || '';
    const type = update.type || 'Update';
    const link = update.link || '';
    const hashtags = ' #BigQuery #GoogleCloud';
    
    const prefix = `📢 BigQuery Update (${date}):\n🔹 [${type}] `;
    const suffix = `\n🔗 Read more: ${link}${hashtags}`;
    
    const reservedLength = prefix.length + suffix.length;
    const maxContentLength = 280 - reservedLength - 5; // Safety margin
    
    let content = update.text || '';
    content = content.replace(/\s+/g, ' ').trim();
    
    if (content.length > maxContentLength) {
        content = content.substring(0, maxContentLength) + '...';
    }
    
    return `${prefix}${content}${suffix}`;
}
```

---

## 📊 Sample API Output Structure

When the frontend queries `/api/release-notes`, the backend returns this JSON schema:

```json
{
  "status": "success",
  "count": 68,
  "updates": [
    {
      "date": "June 15, 2026",
      "updated": "2026-06-15T00:00:00-07:00",
      "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_15_2026",
      "type": "Feature",
      "content": "<p>Use Gemini Cloud Assist to analyze your SQL queries and receive recommendations to <a href=\"https://docs.cloud.google.com/bigquery/docs/use-cloud-assist#optimize-query\">optimize query performance in BigQuery</a>.</p>",
      "text": "Use Gemini Cloud Assist to analyze your SQL queries and receive recommendations to optimize query performance in BigQuery."
    }
  ]
}
```

---

## 🛠️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vamsipindrala22/agy.git
   cd agy
   ```

2. **Set up virtual environment & install requirements**:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate

   pip install -r requirements.txt
   ```

3. **Run the Flask application**:
   ```bash
   python app.py
   ```

4. **Access the application**:
   Open your browser and navigate to `http://127.0.0.1:5000`.
