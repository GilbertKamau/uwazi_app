import asyncio
from datetime import datetime
from prisma import Prisma
from scrapers.iebc_scraper import scrape_iebc_cleared_politicians
from scrapers.judiciary_scraper import scrape_judiciary_cases
from scrapers.twitter_scraper import scrape_twitter_mentions

async def main():
    print("Initializing Prisma Client...")
    db = Prisma()
    await db.connect()

    print("--- 1. Scraping IEBC Candidates ---")
    candidates = scrape_iebc_cleared_politicians()
    
    for candidate in candidates:
        # Upsert Politician to ensure we don't have duplicates
        politician = await db.politician.upsert(
            where={
                "id": candidate.get("id", "none") # we don't have a unique field so let's rely on name matching or create
            },
            data={
                "create": {
                    "name": candidate["name"],
                    "office": candidate["office"],
                    "county": candidate.get("county"),
                    "party": candidate.get("party"),
                    "isCleared": candidate["isCleared"]
                },
                "update": {
                    "office": candidate["office"],
                    "isCleared": candidate["isCleared"]
                }
            }
        )
        
        # If upsert by ID is tricky without unique constraints on name,
        # let's write a safer way: check if name exists, otherwise create.
        existing_pol = await db.politician.find_first(where={"name": candidate["name"]})
        if not existing_pol:
            existing_pol = await db.politician.create(
                data={
                    "name": candidate["name"],
                    "office": candidate["office"],
                    "county": candidate.get("county"),
                    "party": candidate.get("party"),
                    "isCleared": candidate["isCleared"]
                }
            )

        print(f"--- 2. Scraping Judiciary for {existing_pol.name} ---")
        cases = scrape_judiciary_cases(existing_pol.name)
        for case in cases:
            # Check for unique case number
            existing_case = await db.courtcase.find_unique(where={"caseNumber": case["caseNumber"]})
            if not existing_case:
                await db.courtcase.create(
                    data={
                        "caseNumber": case["caseNumber"],
                        "courtName": case["courtName"],
                        "description": case["description"],
                        "status": case["status"],
                        "dateFiled": datetime.fromisoformat(case["dateFiled"].replace("Z", "+00:00")),
                        "url": case.get("url"),
                        "isVerified": case["isVerified"],
                        "politicianId": existing_pol.id
                    }
                )

        print(f"--- 3. Scraping Twitter Mentions for {existing_pol.name} ---")
        tweets = scrape_twitter_mentions(existing_pol.name)
        for tweet in tweets:
            existing_tweet = await db.socialmention.find_unique(where={"url": tweet["url"]})
            if not existing_tweet:
                await db.socialmention.create(
                    data={
                        "platform": tweet["platform"],
                        "content": tweet["content"],
                        "url": tweet["url"],
                        "postedAt": datetime.fromisoformat(tweet["postedAt"].replace("Z", "+00:00")),
                        "isRumour": tweet["isRumour"],
                        "politicianId": existing_pol.id
                    }
                )

    await db.disconnect()
    print("Daily Scraping Completed Successfully.")

if __name__ == "__main__":
    asyncio.run(main())
