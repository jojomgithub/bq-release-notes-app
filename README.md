# BigQuery Release Notes Hub 🚀

A web application that fetches the latest **Google BigQuery Release Notes** via their XML Atom feed, splits them into individual update cards, and lets you select and format them into tweets using a built-in interactive Tweet Composer.

Built with **Python Flask** and plain vanilla **HTML**, **JavaScript (ES6)**, and **CSS**.

---

## ✨ Features

* **Real-time Feed Synchronization**: Fetches the official Google Cloud BigQuery release notes XML feed dynamically.
* **Granular Feed Segmentation**: Splits multi-topic release notes by heading tags (`<h3>`) to show distinct, readable cards.
* **Category Filters**: Easily filter release updates by *Features*, *Changes*, *Announcements*, or *Deprecations* from the sidebar.
* **Instant Text Search**: Instantly filters updates as you type in the search bar.
* **Tweet Composer Modal**: A custom-designed slide-in composer offering four distinct writing styles:
  * **Standard**: Clean summary format.
  * **Excited**: Boosted launch announcement with emojis (`🚀`, etc.).
  * **Summary**: Structured bullet-list representation.
  * **Technical**: Tailored for developer communities.
* **Automated Character Budgeting**: Prevents tweets from exceeding X's 280-character limit, truncating update text intelligently.
* **Sleek Dark Theme**: Implements a glassmorphic dashboard design utilizing HSL colors and glowing ambient backdrops.

---

## 📁 Project Structure

```
├── app.py                 # Flask server & XML parsing engine
├── requirements.txt       # Dependencies (Flask, requests)
├── doc/                   # Detailed project documentation
│   ├── project_architecture_breakdown.md
│   └── release_notes_app_summary.md
├── templates/
│   └── index.html         # HTML layout structure & Tweet composer modal
└── static/
    ├── css/
    │   └── style.css      # Custom animations, variables, and responsive design
    └── js/
        └── main.js        # DOM parser, state filter, and tweet editor logic
```

---

## 🚀 Quick Start

### 1. Install Dependencies
Set up the virtual environment and install the requirements:

```bash
# Create a virtual environment
python3 -m venv .venv

# Activate the virtual environment
source .venv/bin/activate

# Install required packages
pip install -r requirements.txt
```

### 2. Run the Application
Start the Flask dev server:

```bash
python3 app.py
```

### 3. Open in Browser
Visit **[http://127.0.0.1:5001](http://127.0.0.1:5001)** in your preferred web browser.

---

## ⚙️ How it Works

1. **Backend**: [app.py](file:///Users/cerlitomoreno/development/ai/5dgai-vc/agy-cli-projects/bq-releases-notes/app.py) fetches the Atom XML feed from Google, parses the structure using `xml.etree.ElementTree`, extracts core details, and exposes a JSON list at `/api/notes`.
2. **Frontend**: [main.js](file:///Users/cerlitomoreno/development/ai/5dgai-vc/agy-cli-projects/bq-releases-notes/static/js/main.js) retrieves the JSON data, uses the browser's native `DOMParser` to extract headings (`<h3>`), groups them by date, and handles dynamic searching and category tab filtering.
3. **Sharing**: The composer modal formats selected update cards into preconfigured templates. Clicking **Post on X** triggers a Twitter Web Intent window, safely passing the URL-encoded tweet draft.
