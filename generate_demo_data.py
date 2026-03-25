"""
ContactZen Demo Data Generator
Produces a 2,500-contact dataset designed to tell the wow-moment story:
  - ~30% overall contact risk rate
  - ZoomInfo as the worst source (~38% bad) → vendor accountability narrative
  - Phone gaps and bad numbers → direct dial story
  - Duplicates → CRM bloat story
  - Missing titles → personalization gap story
  - Numbers that feel real for a 20-30 rep sales team
"""
import random
import pandas as pd

random.seed(42)

FIRST_NAMES = [
    "James", "Sarah", "Michael", "Emily", "Chris", "Jessica", "David", "Ashley",
    "Daniel", "Amanda", "Matthew", "Stephanie", "Andrew", "Jennifer", "Joshua",
    "Nicole", "Ryan", "Megan", "Tyler", "Lauren", "Brandon", "Rachel", "Justin",
    "Samantha", "Nathan", "Brittany", "Kevin", "Amber", "Eric", "Danielle",
    "Adam", "Rebecca", "Jonathan", "Heather", "Patrick", "Crystal", "Kyle",
    "Kayla", "Brian", "Alexandra", "Timothy", "Monica", "Jeffrey", "Tiffany",
    "Sean", "Natalie", "Gregory", "Victoria", "Derek", "Courtney"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen",
    "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera",
    "Campbell", "Mitchell", "Carter", "Roberts"
]

COMPANIES = [
    "Salesforce", "HubSpot", "Outreach", "Salesloft", "Gong", "Chorus", "ZoomInfo",
    "Apollo", "Clearbit", "LinkedIn", "Drift", "Intercom", "Marketo", "Pardot",
    "Mailchimp", "Constant Contact", "ActiveCampaign", "Klaviyo", "Braze", "Iterable",
    "Gainsight", "ChurnZero", "Totango", "Medallia", "Qualtrics", "Zendesk",
    "Freshworks", "Pipedrive", "Copper", "Insightly", "Monday.com", "Asana",
    "Notion", "Confluence", "Jira", "Slack", "Teams", "Zoom", "Webex", "RingCentral",
    "Twilio", "Sendgrid", "Mailgun", "Postmark", "Mandrill", "Campaign Monitor",
    "Segment", "mParticle", "Amplitude", "Mixpanel"
]

TITLES = [
    "VP of Sales", "Sales Director", "Account Executive", "SDR", "BDR",
    "RevOps Manager", "Revenue Operations Lead", "Sales Operations Manager",
    "Director of Marketing", "Marketing Manager", "Demand Generation Manager",
    "Head of Growth", "Chief Revenue Officer", "VP of Marketing",
    "Sales Development Manager", "Inside Sales Rep", "Enterprise AE",
    "Mid-Market AE", "Customer Success Manager", "VP of Customer Success",
    "Director of Revenue Operations", "Sales Enablement Manager",
    "Field Sales Director", "Regional Sales Manager", "National Sales Manager",
]

COMPANY_DOMAINS = {c: f"{c.lower().replace(' ', '').replace('.', '')}.com" for c in COMPANIES}

FREE_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"]
DISPOSABLE_DOMAINS = ["mailinator.com", "guerrillamail.com", "yopmail.com", "10minutemail.com"]

TOLL_FREE_PREFIXES = ["800", "888", "877", "866", "855"]


def make_valid_phone():
    prefix = random.choice(["212", "415", "312", "617", "206", "303", "512", "702", "404", "713"])
    return f"{prefix}{random.randint(2000000, 9999999)}"


def make_invalid_phone():
    return random.choice(["555", "123", "000", f"1{random.randint(10, 99)}"])


def make_toll_free_phone():
    prefix = random.choice(TOLL_FREE_PREFIXES)
    return f"{prefix}{random.randint(2000000, 9999999)}"


def make_valid_email(first, last, company):
    domain = COMPANY_DOMAINS[company]
    patterns = [
        f"{first.lower()}.{last.lower()}@{domain}",
        f"{first[0].lower()}{last.lower()}@{domain}",
        f"{first.lower()}@{domain}",
    ]
    return random.choice(patterns)


def make_invalid_email(first, last, company):
    domain = COMPANY_DOMAINS[company]
    patterns = [
        f"{first.lower()}.{last.lower()}@{company.lower().replace(' ', '')}",   # missing TLD
        f"{first.lower()}@@{domain}",                                             # double @
        f"{first.lower()}.{last.lower()}@",                                       # no domain
        "",                                                                        # empty
        "N/A",
        "unknown@unknown",
    ]
    return random.choice(patterns)


def make_risky_email(first, last):
    if random.random() < 0.3:
        domain = random.choice(DISPOSABLE_DOMAINS)
    else:
        domain = random.choice(FREE_DOMAINS)
    return f"{first.lower()}.{last.lower()}@{domain}"


# Source profiles: (name, email_bad_rate, phone_missing_rate, title_missing_rate, count)
SOURCE_PROFILES = [
    ("ZoomInfo",      0.38, 0.25, 0.20, 6000),  # villain — highest bad rate
    ("Apollo",        0.22, 0.35, 0.30, 4500),  # also questionable
    ("Legacy CRM",    0.28, 0.50, 0.40, 5500),  # old data, lots of gaps
    ("Manual Import", 0.12, 0.45, 0.35, 4000),  # human entered, fewer bad emails but gaps
    ("Trade Show",    0.15, 0.60, 0.50, 2000),  # scanned badges, lots missing
    ("Website Form",  0.08, 0.70, 0.55, 2000),  # self-submitted, phones usually blank
    ("Referral",      0.05, 0.55, 0.25, 1000),  # best quality
]


def make_contact(source_name, email_bad_rate, phone_missing_rate, title_missing_rate):
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    company = random.choice(COMPANIES)

    # Email
    roll = random.random()
    risky_rate = email_bad_rate * 0.35
    invalid_rate = email_bad_rate * 0.65
    if roll < (1 - email_bad_rate):
        email = make_valid_email(first, last, company)
    elif roll < (1 - email_bad_rate + risky_rate):
        email = make_risky_email(first, last)
    else:
        email = make_invalid_email(first, last, company)

    # Phone
    phone_roll = random.random()
    if phone_roll < phone_missing_rate:
        phone = ""
    elif phone_roll < phone_missing_rate + 0.08:
        phone = make_invalid_phone()
    elif phone_roll < phone_missing_rate + 0.13:
        phone = make_toll_free_phone()
    else:
        phone = make_valid_phone()

    # Title
    title = "" if random.random() < title_missing_rate else random.choice(TITLES)

    return {
        "first_name": first,
        "last_name": last,
        "company": company,
        "title": title,
        "email": email,
        "phone": phone,
        "source": source_name,
    }


def generate_demo_dataset():
    rows = []

    for source_name, email_bad_rate, phone_missing_rate, title_missing_rate, count in SOURCE_PROFILES:
        for _ in range(count):
            rows.append(make_contact(source_name, email_bad_rate, phone_missing_rate, title_missing_rate))

    df = pd.DataFrame(rows)

    # Inject ~120 email duplicates (realistic CRM bloat)
    dupe_pool = df[df["email"].str.contains("@") & (df["email"] != "")].sample(600, random_state=42)
    dupes = dupe_pool.copy()
    dupes["source"] = dupes["source"].apply(lambda s: random.choice(["ZoomInfo", "Apollo", "Legacy CRM"]))
    df = pd.concat([df, dupes], ignore_index=True)

    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    return df


if __name__ == "__main__":
    df = generate_demo_dataset()
    df.to_csv("demo_contacts.csv", index=False)

    # Quick stats preview
    from backend.scoring import email_risk
    risks = [email_risk(e)[0] for e in df["email"].tolist()]
    invalid = risks.count("invalid")
    risky = risks.count("risky")
    total = len(df)
    print(f"Generated {total} contacts")
    print(f"Invalid emails: {invalid} ({invalid/total*100:.1f}%)")
    print(f"Risky emails:   {risky} ({risky/total*100:.1f}%)")
    print(f"Combined risk:  {(invalid+risky)/total*100:.1f}%")
    print(f"Missing phones: {(df['phone'] == '').sum()} ({(df['phone'] == '').sum()/total*100:.1f}%)")
    print(f"Missing titles: {(df['title'] == '').sum()} ({(df['title'] == '').sum()/total*100:.1f}%)")
    print(f"\nSource breakdown:")
    print(df.groupby("source").size().sort_values(ascending=False))
