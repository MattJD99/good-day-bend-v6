
from agent import publisher_tools
import sys

if __name__ == "__main__":
    date = "2026-01-23"
    print(f"Seeding events for {date}...")
    publisher_tools.seed_test_events(date)
    print("Done.")
