import os
from apify_client import ApifyClient
from dotenv import load_dotenv

load_dotenv()

APIFY_TOKEN = os.getenv("APIFY_TOKEN")
client = ApifyClient(APIFY_TOKEN)

def scrape_twitter_mentions(politician_name: str):
    """
    Mock integration for scraping Twitter/X data using Apify's Twitter scrapers.
    It separates rumoured tweets from verified facts based on simple heuristics or AI tagging (mocked here).
    """
    print(f"Scraping Twitter for mentions of: {politician_name}...")
    
    # run_input = { "searchTerms": [politician_name], "maxTweets": 10 }
    # run = client.actor("apidojo/tweet-scraper").call(run_input=run_input)
    # results = client.dataset(run["defaultDatasetId"]).iterate_items()
    
    # Mocking data to represent public sentiment.
    results = [
        {
            "platform": "Twitter",
            "content": f"{politician_name} was seen allegedly bribing voters in the county center.",
            "url": f"https://twitter.com/user/status/12345{abs(hash(politician_name))}",
            "postedAt": "2024-02-10T14:30:00Z",
            # Since this lacks proof or official court references, mark as rumour
            "isRumour": True
        },
        {
            "platform": "Twitter",
            "content": f"EACC has officially forwarded the file to the DPP concerning {politician_name}.",
            "url": f"https://twitter.com/EACCKenya/status/54321{abs(hash(politician_name))}",
            "postedAt": "2024-02-12T09:15:00Z",
            # Coming from an official handle or fact-checked source, mark as verified/not rumour
            "isRumour": False
        }
    ]
    
    return results

if __name__ == "__main__":
    tweets = scrape_twitter_mentions("John Doe")
    print(tweets)
