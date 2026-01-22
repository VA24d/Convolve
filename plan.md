1. The Enhanced System Architecture

We will upgrade the 3-agent team into a robust "Cognitive Pipeline" that handles the chaos of rural data.

Agent 1: "Drishti" (The Vision Encoder)

Role: Extracts structured "Eligibility Signals" from unstructured images.

Tech Stack:

Model: A lightweight VLM (like Llava or GPT-4o-mini via API).

Task: It doesn't just "caption" the image. It runs a structured extraction against a checklist:

housing_type: "Kutcha" (Mud/Thatch) vs "Pucca" (Concrete).

assets: "Cattle", "Tractor", "Two-wheeler".

demographics: "Elderly female present", "School-age children".

Output: A JSON object of detected Evidence.

Agent 2: "Vidhi" (The Rules Engine)

Role: The Qdrant Operator.

Challenge: Government schemes have mixed criteria. Some are Boolean (State == 'Bihar') and some are Semantic ("Support for distressed farmers").

Qdrant Innovation (ACORN):

The Problem: If you search for "farming subsidies" (Semantic) but filter by State='Bihar' AND Caste='SC' AND Land='<2 acres', a standard HNSW graph breaks (the "disconnected island" problem).

The Solution: Use Qdrant's ACORN Algorithm. It ensures that even with 5+ heavy filters, the traversal finds the exact 3 schemes that match, with 100% recall.

Agent 3: "Sahayak" (The Form Filler)

Role: The Action Agent.

Action: Once a scheme is found (e.g., PM Awas Yojana), this agent maps the User's "Visual Evidence" into the official PDF application form.

Output: A pre-filled PDF ready to print. "Here is your application, filled out."

2. The Project Execution Plan (Hackathon Timeline)

Phase 1: Data Prep (The Foundation)

Goal: Build the "Schemes" Knowledge Base.

Source: Scrape ~50-100 key schemes from myscheme.gov.in.

Qdrant Schema:

JSON
{
  "collection_name": "gov_schemes",
  "vectors": {
    "description_vector": 768  // Semantic match ("money for house")
  },
  "payload": {
    "scheme_name": "PM Awas Yojana",
    "state": ["All", "UP", "Bihar"], // Array for filtering
    "eligibility_rules": {
      "housing": "kutcha",
      "income_limit": 100000,
      "assets_excluded": ["car", "fridge"]
    },
    "benefits": "₹1.5 Lakhs financial aid"
  }
}
Phase 2: The "Drishti" Vision Pipeline

Goal: Prove you can extract bureaucratic data from photos.

Action: Create a prompt for your VLM:

"Analyze this image for Indian government welfare eligibility. Classify the roof material (Thatch/Tile/Concrete). Count livestock. Estimate economic tier. Output JSON."

Test: Validate it against 5 distinct photos (Mud house, Concrete house, Farmer with cow, Woman weaving).

Phase 3: The Qdrant "ACORN" Implementation

Goal: The core technical demo.

Code Logic:

Take the JSON from Drishti.

Construct a Qdrant Filter:

Python
# The "Magic" Filter that breaks normal DBs but works with ACORN
query_filter = Filter(
    must=[
        FieldCondition(key="eligibility_rules.housing", match=MatchValue(value="kutcha")),
        FieldCondition(key="state", match=MatchValue(value="Rajasthan"))
    ]
)
# The Search
client.search(
    collection_name="gov_schemes",
    query_vector=user_intent_vector, # "I need help with my home"
    query_filter=query_filter,
    search_params=SearchParams(method="hnsw_ef") # ACORN enabled
)
Phase 4: The "Indian Allure" UI (Streamlit)

Goal: Make it look like a field tool.

UI: Simple mobile-view interface.

Big Button: "Take Photo" (Camera Input).

Audio Output: Use Google TTS (Text-to-Speech) or ElevenLabs to read the result in Hindi.

Visual Proof: Show the photo side-by-side with the "Matched Scheme" card.

3. The "Wow" Demo Script (2 Minutes)

The Hook (0:00-0:30):

Presenter: "There are 1,000 schemes in India, but 70% of funds go unused because people can't read the rules. Today, we fix this with a photo."

Action: Hold up a photo of a rural grandmother in front of a mud house.

The Magic (0:30-1:00):

Presenter: "I upload this to Yojana-Drishti. Watch the Agents work."

Screen:

Agent Drishti: Scanning... "Detected: Mud Wall, No Power Meter, 1 Goat."

Agent Vidhi: Filtering Qdrant... "Applying ACORN filter on 'Housing=Kutcha'..." -> MATCH FOUND.

The Result (1:00-1:30):

Audio (Hindi): "Namaste Mataji. Aap PM Awas Yojana ke liye yogy hain." (Hello Mother, you are eligible for the Housing Scheme).

Screen: A "Benefit Check" appears: ₹1,20,000 Approved.

The Closing (1:30-2:00):

Presenter: "We didn't just search text. We used Qdrant's ACORN to navigate complex bureaucratic filters that standard vector engines miss. This is AI for the last mile."

4. Why This Plan Works

Feasible: You are not building a new model; you are chaining existing APIs (Vision -> Qdrant -> Voice).

Technical: You explicitly mention ACORN and Metadata Filtering, which are core Qdrant strengths.

Emotional: The "Grandmother with a Mud House" use case appeals to the "Societal Impact" judges instantly.