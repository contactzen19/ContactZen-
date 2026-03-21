import random
import pandas as pd

random.seed(42)

FIRST_NAMES = [
    "Joey", "Sarah", "Mike", "Anna", "Chris", "David", "Emily", "Tom",
    "Lisa", "Rachel", "Matt", "Nina", "James", "Ava", "Ryan", "Sophia"
]

LAST_NAMES = [
    "Prindle", "Lee", "Stone", "Fields", "Wong", "King", "Ross", "Baker",
    "Grant", "Miller", "Carter", "Young", "Hall", "Scott", "Turner", "Reed"
]

COMPANIES = [
    "Acme", "Globex", "Innotech", "Vertex", "Northstar", "BluePeak",
    "SummitWorks", "BrightPath", "Everlane", "CoreAxis"
]

TITLES = [
    "Director", "Manager", "VP", "HRBP", "Coordinator", "Ops Lead",
    "Marketing Manager", "Recruiter", "Sales Director", "People Partner"
]

SOURCES = (
    ["ZoomInfo"] * 180 +
    ["Manual Import"] * 120 +
    ["Trade Show"] * 80 +
    ["Legacy CRM"] * 90 +
    ["Website Form"] * 30
)

FREE_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]
COMPANY_DOMAINS = {
    "Acme": "acme.com",
    "Globex": "globex.com",
    "Innotech": "innotech.com",
    "Vertex": "vertex.com",
    "Northstar": "northstar.com",
    "BluePeak": "bluepeak.com",
    "SummitWorks": "summitworks.com",
    "BrightPath": "brightpath.com",
    "Everlane": "everlane.com",
    "CoreAxis": "coreaxis.com",
}

def make_phone():
    return f"{random.randint(200, 999)}{random.randint(200, 999)}{random.randint(1000, 9999)}"

def make_valid_email(first, last, company):
    domain = COMPANY_DOMAINS[company]
    return f"{first.lower()}.{last.lower()}@{domain}"

def make_invalid_email(first, last, company):
    patterns = [
        f"{first.lower()}.{last.lower()}@{company.lower()}",
        f"{first.lower()}@@{company.lower()}.com",
        f"{first.lower()}.{last.lower()}@{company.lower()}..com",
        "",
    ]
    return random.choice(patterns)

def make_risky_email(first, last):
    domain = random.choice(FREE_DOMAINS)
    return f"{first.lower()}.{last.lower()}@{domain}"

def row_from_profile(profile_id: int):
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    company = random.choice(COMPANIES)
    title = random.choice(TITLES)
    source = random.choice(SOURCES)

    roll = random.random()

    # Target overall mix: 60% valid, 25% invalid, 15% risky
    if roll < 0.60:
        email = make_valid_email(first, last, company)
    elif roll < 0.85:
        email = make_invalid_email(first, last, company)
    else:
        email = make_risky_email(first, last)

    return {
        "first_name": first,
        "last_name": last,
        "company": company,
        "title": title,
        "email": email,
        "source": source,
    }

def generate_dataset(n_rows: int):
    rows = [row_from_profile(i) for i in range(n_rows)]
    return pd.DataFrame(rows)

if __name__ == "__main__":
    # Fast version for testing
    df_50k = generate_dataset(50000)
    df_50k.to_csv("demo_contacts_50k.csv", index=False)

    # Big enterprise demo
    df_500k = generate_dataset(500000)
    df_500k.to_csv("demo_contacts_500k.csv", index=False)

    print("Created demo_contacts_50k.csv and demo_contacts_500k.csv")
    