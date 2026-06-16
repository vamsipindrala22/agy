import os
import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# Cache variables to avoid hammering the Google API on every page load
cache = {
    "data": None,
    "last_fetched": None
}

def parse_release_notes():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"Error fetching release notes: {e}")
        return None
        
    try:
        soup = BeautifulSoup(response.content, "xml")
        entries = soup.find_all("entry")
        parsed_updates = []
        
        for entry in entries:
            date_str = entry.find("title").get_text(strip=True) if entry.find("title") else ""
            updated_str = entry.find("updated").get_text(strip=True) if entry.find("updated") else ""
            
            link_elem = entry.find("link", rel="alternate")
            link = link_elem["href"] if link_elem and link_elem.has_attr("href") else ""
            
            content_elem = entry.find("content")
            if not content_elem:
                continue
                
            content_html = content_elem.get_text()
            content_soup = BeautifulSoup(content_html, "html.parser")
            
            h3s = content_soup.find_all("h3")
            if not h3s:
                # Fallback: if there are no <h3> headings, treat the whole content as one update
                update_html = str(content_soup).strip()
                update_text = content_soup.get_text(separator=" ").strip()
                parsed_updates.append({
                    "date": date_str,
                    "updated": updated_str,
                    "link": link,
                    "type": "Update",
                    "content": update_html,
                    "text": update_text
                })
            else:
                current_type = None
                current_elements = []
                
                # Group elements between h3 tags
                for child in content_soup.contents:
                    if child.name == 'h3':
                        # Save the previous update
                        if current_type and current_elements:
                            if "deprecat" not in current_type.lower():
                                update_html = "".join(str(el) for el in current_elements).strip()
                                update_text = BeautifulSoup(update_html, "html.parser").get_text(separator=" ").strip()
                                parsed_updates.append({
                                    "date": date_str,
                                    "updated": updated_str,
                                    "link": link,
                                    "type": current_type,
                                    "content": update_html,
                                    "text": update_text
                                })
                        current_type = child.get_text(strip=True)
                        current_elements = []
                    else:
                        if current_type is not None:
                            current_elements.append(child)
                            
                # Save the final update block
                if current_type and current_elements:
                    if "deprecat" not in current_type.lower():
                        update_html = "".join(str(el) for el in current_elements).strip()
                        update_text = BeautifulSoup(update_html, "html.parser").get_text(separator=" ").strip()
                        parsed_updates.append({
                            "date": date_str,
                            "updated": updated_str,
                            "link": link,
                            "type": current_type,
                            "content": update_html,
                            "text": update_text
                        })
                    
        return parsed_updates
    except Exception as e:
        print(f"Error parsing release notes: {e}")
        return None

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def get_release_notes():
    # We fetch fresh data when requested by the front-end (e.g. on manual refresh or initial load)
    # The client-side refresh button will trigger this.
    data = parse_release_notes()
    if data is None:
        return jsonify({"error": "Failed to fetch or parse release notes feed"}), 500
        
    return jsonify({
        "status": "success",
        "count": len(data),
        "updates": data
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
