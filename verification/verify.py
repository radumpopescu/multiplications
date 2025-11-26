from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_app(page: Page):
    # 1. Go to the app
    page.goto("http://localhost:5173")
    
    # 2. Create a new user
    page.get_by_role("button", name="New Profile").click()
    page.fill("input[type='text']", "JulesTest")
    page.click("button:has-text('Save')")
    
    # 3. Select the user
    page.click("button:has-text('JulesTest')")
    
    # 4. Verify we are on the quiz page
    expect(page.locator(".text-8xl")).to_be_visible()
    
    # 5. Interact with numpad (answer randomly or just type)
    page.click("button:has-text('1')")
    page.click("button:has-text('2')")
    
    # 6. Check screenshot of Quiz
    page.screenshot(path="/app/verification/quiz.png")
    
    # 7. Go to Stats
    page.click(".lucide-bar-chart-2") # relying on class name or use get_by_role if accessible
    
    # 8. Check screenshot of Stats
    time.sleep(1) # wait for fetch
    page.screenshot(path="/app/verification/stats.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_app(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/app/verification/error.png")
        finally:
            browser.close()
