import urllib.request
import json

def test_endpoints():
    print("=== 1. Root & Health ===")
    res = urllib.request.urlopen("http://localhost:8000/")
    print("Root API:", json.loads(res.read())["message"])

    print("\n=== 2. ADDY Chat (Real LLM Pitch Analysis) ===")
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/addy/chat",
        data=json.dumps({"message": "We are BioCrop, raising $2.5M Seed for autonomous crop pollination drones across Europe"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    data = json.loads(res.read())
    print("ADDY Brief Profile:", data["structured_profile"])

    print("\n=== 3. Twin Finder (Real Comps & Lead Investors) ===")
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/twin-finder/comparables",
        data=json.dumps({"brief": "autonomous crop pollination drones in Europe", "stage": "Seed"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    data = json.loads(res.read())
    print(f"Comps Found ({data['comparables_count']}):")
    for comp in data["comparables"]:
        print(f"  - {comp['name']} ({comp['stage']}): {comp['funding_amount']} lead by {', '.join(comp['lead_investors'])}")

    print("\n=== 4. Resolve (Catalog Enrichment) ===")
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/resolve/paste",
        data=json.dumps({"firm_names": "Balderton Capital\nKleiner Perkins\nSequoia Capital\nEPIC Foundation"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    data = json.loads(res.read())
    print(f"Enriched {data['enriched_count']} firms:")
    for lead in data["results"]:
        print(f"  - {lead['firm_name']}: {lead['partner_name']} ({lead['role_title']}) -> {lead['verified_email']} (AUM: {lead['aum_display']})")

    print("\n=== 5. ADDY Search Confirm (Sparks Execution) ===")
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/addy/search-confirm",
        data=json.dumps({"query": "seed agtech and robotics", "track": "venture", "sparks_cost": 2.5}).encode(),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    data = json.loads(res.read())
    print(f"Delivered {len(data['leads_delivered'])} contacts (Sparks spent: {data['sparks_spent']}, remaining: {data['remaining_sparks']}):")
    for lead in data["leads_delivered"][:3]:
        print(f"  - {lead['firm_name']}: {lead['partner_name']} -> {lead['verified_email']} (Fit: {lead['fit_score']})")

if __name__ == "__main__":
    test_endpoints()
