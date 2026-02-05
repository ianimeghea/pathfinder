import requests
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
import os

app = Flask(__name__)
CORS(app)

load_dotenv(override=True)  

SERPER_API_KEY = os.getenv("SERPER_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)
# Safety Check (Optional but recommended)
if not SERPER_API_KEY or not OPENAI_API_KEY:
    print("⚠️  WARNING: API Keys not found in .env file!")

def get_structured_alumni_analysis(raw_profiles, country_code):
    """
    Uses GPT-4o to parse raw LinkedIn data into structured career paths,
    salary ranges, and notable achievements.
    """
    if not raw_profiles:
        return []

    system_prompt = f"""
    You are a Global Career & Compensation Analyst. You will be given raw text from LinkedIn profiles.
    
    For each profile, extract and return:
    1. A realistic annual salary range in {country_code.upper()} (e.g., "$120k - $160k").
    2. Total years of professional experience (integer).
    3. The specific seniority level.
    4. A 'Career Journey' array containing the last 4 job titles and companies.
    5. A 'notable_achievement' string (briefly summarize a key success found in their experience).

    Return JSON format:
    {{
      "alumni": [
        {{
          "id": int,
          "range": "string",
          "yearsExperience": int,
          "seniorityLevel": "string",
          "path": ["Title at Company", "Title at Company"],
          "achievement": "string"
        }}
      ]
    }}
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(raw_profiles)}
            ],
            response_format={ "type": "json_object" }
        )
        return json.loads(response.choices[0].message.content).get("alumni", [])
    except Exception as e:
        print(f"❌ OpenAI Analysis Error: {e}")
        return []

def get_alumni_data(school, role, country_code):
    """
    Revised search logic: Uses 'Negative Keywords' and 'Temporal Markers'
    to suppress Certifications and prioritize the Experience timeline.
    """
    url = "https://google.serper.dev/search"
    
    
    query = (
        f'site:linkedin.com/in/ "{school}" "{role}" '
        f'"Experience" ("present" OR "yrs" OR "mos") '
        f'-intitle:"Certifications" -inurl:"details/certifications"'
    )
    
    payload = json.dumps({
        "q": query,
        "num": 10,
        "gl": country_code # Geolocation helps align market-specific profile layouts
    })
    
    headers = {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(url, headers=headers, data=payload, timeout=10)
        results = response.json()
    except Exception as e:
        print(f"❌ Serper Error: {e}")
        return []

    raw_profiles_for_ai = []
    alumni_base = []

    if "organic" in results:
        for idx, item in enumerate(results["organic"]):
            link = item.get("link", "")
            # Ensure we aren't getting company pages or job postings
            if "/in/" not in link or "/jobs/" in link: continue

            # Combine title and snippet
            # We specifically look for patterns like '5 yrs 2 mos' in the snippet
            snippet = item.get('snippet', '')
            full_text_blob = f"Header: {item.get('title')} | Timeline Data: {snippet}"
            
            # Sitelinks often contain 'Experience' specifically
            if "sitelinks" in item:
                for sl in item["sitelinks"]:
                    if "Experience" in sl.get("title", ""):
                        full_text_blob += f" | Experience Section: {sl.get('title')}"

            raw_profiles_for_ai.append({
                "id": idx,
                "text": full_text_blob
            })
            
            alumni_base.append({
                "id": idx,
                "name": item.get("title", "").split(" - ")[0].split(" | ")[0].strip(),
                "profileUrl": link,
                "role": role
            })
    print(f"🧠 Reconstructing Experience timeline (Suppression of Certs active)...")
    analysis = get_structured_alumni_analysis(raw_profiles_for_ai, country_code)

    final_results = []
    for base in alumni_base:
        data = next((a for a in analysis if a["id"] == base["id"]), None)
        if data:
            final_results.append({
                "name": base.get("name"),
                "role": base.get("role"),
                "profileUrl": base.get("profileUrl"),
                "salary": data.get("range", "N/A"),
                "path": data.get("path", ["Timeline unavailable"]),
                "achievement": data.get("achievement", "Professional experience"),
                "metadata": {
                    "yearsExperience": data.get("yearsExperience", 0),
                    "seniorityLevel": data.get("seniorityLevel", "Professional"),
                    "country": country_code
                }
            })

    return final_results[:10]

@app.route('/api/scrape', methods=['GET'])
def scrape():
    school = request.args.get('school')
    role = request.args.get('role', 'Professional')
    country_code = request.args.get('countryCode', 'us').lower()
    
    print(f"📥 Request: {school} | {role} | {country_code}")
    
    if not school:
        return jsonify({"error": "University name is required"}), 400
    
    try:
        data = get_alumni_data(school, role, country_code)
        return jsonify(data)
    except Exception as e:
        print(f"❌ Server Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    print("🚀 Pathfinder Deep-Scraper Active")
    app.run(port=5000, debug=True)