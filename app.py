from flask import Flask, jsonify, render_template
import requests
import xml.etree.ElementTree as ET
import urllib3

# Disable SSL verification warnings to keep output clean on macOS systems with outdated python certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/notes")
def get_notes():
    try:
        # Fetch feed XML. Bypassing SSL verification for macOS environments facing cert challenges
        response = requests.get(FEED_URL, verify=False, timeout=15)
        response.raise_for_status()
        
        # Parse Atom XML
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        notes = []
        for entry in root.findall('atom:entry', ns):
            title_el = entry.find('atom:title', ns)
            id_el = entry.find('atom:id', ns)
            updated_el = entry.find('atom:updated', ns)
            content_el = entry.find('atom:content', ns)
            
            # Find the link with rel="alternate" or fall back to any link
            link_el = entry.find("atom:link[@rel='alternate']", ns)
            if link_el is None:
                link_el = entry.find("atom:link", ns)
                
            href = link_el.attrib.get('href', '') if link_el is not None else ''
            
            notes.append({
                "id": id_el.text if id_el is not None else "",
                "date": title_el.text if title_el is not None else "",
                "updated": updated_el.text if updated_el is not None else "",
                "link": href,
                "content": content_el.text if content_el is not None else ""
            })
            
        return jsonify({
            "status": "success",
            "notes": notes
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)
