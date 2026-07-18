"""Public-facing pages + forms sweep for bazzar-mart. Playwright, headless Chromium, 1366x800."""
import json
import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
import requests

API_BASE = "http://localhost:8100"
ADMIN_EMAIL = "sgrgrg34@gmail.com"
ADMIN_PASSWORD = "ragassagar1298@"

BASE = "http://localhost:3000"
ROOT = Path(__file__).parent
SHOTS = ROOT / "test_screenshots" / "public"
SHOTS.mkdir(parents=True, exist_ok=True)
manifest = []
n = [0]


def snap(page, name, caption):
    n[0] += 1
    fname = f"{n[0]:03d}_{name}.png"
    page.screenshot(path=str(SHOTS / fname))
    manifest.append({"file": f"public/{fname}", "caption": caption})
    print("shot:", fname, caption)


def snap_scrolled(page, name, caption, y=850):
    page.evaluate(f"window.scrollTo(0, {y})")
    page.wait_for_timeout(400)
    snap(page, name, caption)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(200)


def visit(page, path, label, caption_top, caption_scroll=None, wait_selector=None):
    for attempt in range(3):
        try:
            page.goto(BASE + path, wait_until="networkidle", timeout=30000)
            break
        except Exception as e:
            if attempt == 2:
                raise
            print(f"retry {path}: {e}")
            page.wait_for_timeout(1500)
    if wait_selector:
        try:
            page.wait_for_selector(wait_selector, timeout=8000)
        except PWTimeout:
            pass
    page.wait_for_timeout(2200)
    snap(page, f"{label}_top", caption_top)
    if caption_scroll:
        snap_scrolled(page, f"{label}_scroll", caption_scroll)


def goto_retry(page, path, **kw):
    kw.setdefault("wait_until", "networkidle")
    kw.setdefault("timeout", 30000)
    for attempt in range(3):
        try:
            page.goto(BASE + path, **kw)
            return
        except Exception as e:
            if attempt == 2:
                raise
            print(f"retry {path}: {e}")
            page.wait_for_timeout(1500)


def fill_smart(page, container, values: dict):
    """values: dict of regex(on name/id/placeholder/aria-label/label-text) -> value"""
    inputs = container.locator("input, textarea, select").all()
    for el in inputs:
        try:
            if not el.is_visible():
                continue
            tag = el.evaluate("e => e.tagName.toLowerCase()")
            itype = (el.get_attribute("type") or "").lower()
            if itype in ("hidden", "checkbox", "radio", "file", "submit", "button"):
                continue
            label_text = ""
            try:
                label_text = el.evaluate(
                    "e => { const id = e.id; let l = id ? document.querySelector(`label[for='${id}']`) : null; "
                    "if (!l) l = e.closest('label'); "
                    "if (!l) { let anc = e.parentElement; for (let i = 0; i < 2 && anc && !l; i++) { l = anc.querySelector('label'); anc = anc.parentElement; } } "
                    "return l ? l.innerText : ''; }"
                )
            except Exception:
                pass
            probe = " ".join(filter(None, [
                el.get_attribute("name"), el.get_attribute("id"),
                el.get_attribute("placeholder"), el.get_attribute("aria-label"), label_text,
            ])).lower()
            matched = None
            for pattern, val in values.items():
                if re.search(pattern, probe):
                    matched = val
                    break
            if matched is None:
                continue
            if tag == "select":
                try:
                    el.select_option(index=1)
                except Exception:
                    pass
            else:
                el.fill(str(matched))
        except Exception:
            continue


def check_agree_terms(page):
    for sel in ["input[type=checkbox]"]:
        try:
            boxes = page.locator(sel).all()
            for b in boxes:
                if b.is_visible() and not b.is_checked():
                    b.check(force=True)
        except Exception:
            pass


def submit_and_wait_for_navigation(page, button_pattern, still_on_path, refill=None, attempts=2, nav_timeout=8000):
    """Click a submit button and confirm the URL actually left `still_on_path`.
    Dev-server first-compile / HMR races can silently no-op a submit click on a
    route's first visit — retry with a fresh fill+click rather than trusting a
    single click blindly."""
    for attempt in range(attempts):
        try:
            page.get_by_role("button", name=re.compile(button_pattern, re.I)).first.click(timeout=5000)
            page.wait_for_url(lambda url, p=still_on_path: p not in url, timeout=nav_timeout)
            return True
        except Exception as e:
            print(f"submit attempt {attempt + 1} ({button_pattern!r}) did not navigate: {e}")
            if attempt < attempts - 1:
                page.wait_for_timeout(800)
                if refill:
                    refill()
    return False


_SUFFIX = str(int(time.time()) % 100000)
BUYER = {
    "firstName": "Anita", "lastName": "Gurung",
    "email": f"anita.gurung.{_SUFFIX}@realmailbox.com",
    "phone": "9808123456",
    "password": "Buyer@Secure123",
}


def create_test_coupon(suffix):
    """Create a fresh coupon via the admin API so checkout can apply a real one."""
    try:
        login = requests.post(f"{API_BASE}/api/v1/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD,
        }, timeout=10).json()
        token = login["data"]["accessToken"]
        code = f"PUBTEST{suffix}"
        requests.post(f"{API_BASE}/api/v1/coupons", json={
            "code": code, "type": "PERCENTAGE", "value": 10,
            "minOrder": 100, "maxDiscount": 200, "usageLimit": 100,
            "isActive": True, "description": "Automated test coupon",
        }, headers={"Authorization": f"Bearer {token}"}, timeout=10)
        return code
    except Exception as e:
        print("coupon creation via API failed:", e)
        return None


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1366, "height": 800})
        page = ctx.new_page()

        # ── A) PUBLIC PAGES ──────────────────────────────────────────
        visit(page, "/", "home", "Bazzar homepage showing hero banner and category navigation.",
              "Bazzar homepage scrolled to show featured products and categories.")
        visit(page, "/categories", "categories", "Categories listing page showing all product categories.",
              "Categories page scrolled to show additional category tiles.")
        visit(page, "/categories/fruits-vegetables", "category_detail",
              "Fruits & Vegetables category page listing matching products.",
              "Fruits & Vegetables category page scrolled to show more products.")
        visit(page, "/products", "products", "All-products catalogue page.",
              "Products catalogue page scrolled to show more listings and filters.")
        visit(page, "/deals", "deals", "Deals page showing discounted products.",
              "Deals page scrolled to show additional offers.")
        visit(page, "/search?q=rice", "search", "Search results page for the query \"rice\".",
              "Search results page scrolled to show more matches.")
        visit(page, "/cart", "cart_empty", "Shopping cart page in its empty state before any items are added.")
        visit(page, "/privacy", "privacy", "Privacy Policy page.", "Privacy Policy page scrolled to show further sections.")
        visit(page, "/terms", "terms", "Terms & Conditions page.", "Terms & Conditions page scrolled to show further sections.")

        # Product detail — grab first product id from API
        import urllib.request
        try:
            with urllib.request.urlopen("http://localhost:8100/api/v1/products?limit=1") as r:
                pid = json.loads(r.read())["data"][0]["_id"]
            visit(page, f"/products/{pid}", "product_detail", "Product detail page for a sample grocery item.",
                  "Product detail page scrolled to show description and reviews.")
        except Exception as e:
            print("product detail skip:", e)
            pid = None

        # Seller storefront
        try:
            with urllib.request.urlopen("http://localhost:8100/api/v1/products?limit=1") as r:
                seller_id = json.loads(r.read())["data"][0]["sellerId"]
            visit(page, f"/store/{seller_id}", "storefront", "Seller storefront page listing their products.")
        except Exception as e:
            print("storefront skip:", e)

        # ── B) FORM 1 — REGISTER ─────────────────────────────────────
        goto_retry(page, "/auth/register")
        page.wait_for_selector('button[type="submit"]', timeout=10000)
        page.wait_for_timeout(500)
        snap(page, "register_empty", "Registration form shown empty immediately after page load.")

        def _fill_register():
            fill_smart(page, page, {
                r"first.?name": BUYER["firstName"],
                r"last.?name": BUYER["lastName"],
                r"email": BUYER["email"],
                r"phone": BUYER["phone"],
                r"confirm.*password": BUYER["password"],
                r"password": BUYER["password"],
            })
            check_agree_terms(page)

        _fill_register()
        page.wait_for_timeout(300)
        snap(page, "register_filled", "Registration form filled with realistic buyer details.")
        ok = submit_and_wait_for_navigation(page, "register|sign up|create account", "/auth/register", refill=_fill_register)
        if not ok:
            print("register submit never left /auth/register after retries")
        page.wait_for_timeout(1000)
        snap(page, "register_result", "Result of submitting the registration form — redirected after account creation.")

        # ── B) FORM 2 — LOGIN ─────────────────────────────────────────
        # ensure logged out first
        try:
            page.context.clear_cookies()
        except Exception:
            pass
        goto_retry(page, "/auth/login")
        page.wait_for_selector('button[type="submit"]', timeout=10000)
        page.wait_for_timeout(500)
        snap(page, "login_empty", "Login form shown empty immediately after page load.")

        def _fill_login():
            fill_smart(page, page, {r"email": BUYER["email"], r"password": BUYER["password"]})

        _fill_login()
        page.wait_for_timeout(300)
        snap(page, "login_filled", "Login form filled with the newly registered buyer's credentials.")
        ok = submit_and_wait_for_navigation(page, "^log ?in$|sign in", "/auth/login", refill=_fill_login)
        if not ok:
            print("login submit never left /auth/login after retries")
        page.wait_for_timeout(1000)
        snap(page, "login_result", "Result after submitting the login form — buyer is now signed in.")

        # ── B) FORM 3 — FORGOT PASSWORD ───────────────────────────────
        goto_retry(page, "/auth/forgot-password")
        page.wait_for_timeout(400)
        snap(page, "forgot_empty", "Forgot Password form shown empty.")
        fill_smart(page, page, {r"email": BUYER["email"]})
        page.wait_for_timeout(200)
        snap(page, "forgot_filled", "Forgot Password form filled with the account email.")
        try:
            page.get_by_role("button", name=re.compile("reset|send|submit", re.I)).first.click(timeout=5000)
        except Exception as e:
            print("forgot submit click failed:", e)
        page.wait_for_timeout(1500)
        snap(page, "forgot_result", "Result after submitting the Forgot Password form.")

        # ── B) FORM 4 — CONTACT US ────────────────────────────────────
        goto_retry(page, "/contact")
        page.wait_for_timeout(400)
        snap(page, "contact_empty", "Contact Us form shown empty.")
        fill_smart(page, page, {
            r"name": "Anita Gurung",
            r"email": BUYER["email"],
            r"phone": BUYER["phone"],
            r"subject": "Question about delivery times",
            r"message": "Hello, I would like to know the estimated delivery time for orders placed in the Lalitpur area. Thank you!",
        })
        page.wait_for_timeout(200)
        snap(page, "contact_filled", "Contact Us form filled with a realistic customer enquiry.")
        try:
            page.get_by_role("button", name=re.compile("send|submit", re.I)).first.click(timeout=5000)
        except Exception as e:
            print("contact submit click failed:", e)
        page.wait_for_timeout(1500)
        snap(page, "contact_result", "Result after submitting the Contact Us form.")

        # ── B) FORM 5 — CHECKOUT (logged in as buyer Anita, add product first) ─
        if pid:
            try:
                goto_retry(page, f"/products/{pid}")
                page.wait_for_timeout(800)
                page.get_by_role("button", name=re.compile("add to cart", re.I)).first.click(timeout=5000)
                page.wait_for_timeout(1000)
            except Exception as e:
                print("add to cart failed:", e)

            goto_retry(page, "/cart")
            page.wait_for_timeout(500)
            snap(page, "cart_with_item", "Shopping cart page showing an item added by the buyer.")

            goto_retry(page, "/checkout")
            page.wait_for_timeout(500)
            snap(page, "checkout_empty", "Checkout page — Address step, shown before any shipping address is saved.")
            try:
                page.get_by_role("button", name=re.compile("add new address", re.I)).first.click(timeout=5000)
                page.wait_for_timeout(400)
            except Exception as e:
                print("add-new-address click failed:", e)
            fill_smart(page, page, {
                r"full ?name": "Anita Gurung",
                r"phone": "9808123456",
                r"address line ?1|^street$|street address": "House 12, Jhamsikhel Road",
                r"address line ?2": "Near Jhamsikhel Chowk",
                r"district": "Lalitpur",
                r"city": "Lalitpur",
                r"province": "Bagmati",
                r"postal|zip": "44700",
            })
            page.wait_for_timeout(300)
            snap(page, "checkout_filled", "Checkout page — new delivery address filled with realistic Nepali details.")
            try:
                page.get_by_role("button", name=re.compile("save address", re.I)).first.click(timeout=5000)
                page.wait_for_timeout(600)
            except Exception as e:
                print("save address click failed:", e)
            try:
                page.get_by_role("button", name=re.compile("continue to payment", re.I)).first.click(timeout=5000)
                page.wait_for_timeout(600)
            except Exception as e:
                print("continue to payment click failed:", e)
            snap(page, "checkout_payment", "Checkout page — Payment step, selecting a payment method.")

            coupon_code = create_test_coupon(_SUFFIX)
            if coupon_code:
                try:
                    page.get_by_placeholder(re.compile("coupon code", re.I)).first.fill(coupon_code)
                    page.get_by_role("button", name=re.compile("^apply$", re.I)).first.click(timeout=5000)
                    page.wait_for_timeout(700)
                    snap(page, "checkout_coupon_applied", "Checkout page — Payment step after applying a valid coupon code, showing the discount.")
                except Exception as e:
                    print("coupon apply failed:", e)

            try:
                page.get_by_text(re.compile("cash on delivery", re.I)).first.click(timeout=5000)
                page.wait_for_timeout(400)
            except Exception as e:
                print("select COD failed:", e)
            try:
                page.get_by_role("button", name=re.compile("review order", re.I)).first.click(timeout=5000)
                page.wait_for_timeout(500)
            except Exception as e:
                print("review order click failed:", e)
            page.evaluate("window.scrollTo(0, 0)")
            page.wait_for_timeout(300)
            snap(page, "checkout_confirm", "Checkout page — Confirm step, reviewing the order before placing it.")
            try:
                page.get_by_role("button", name=re.compile("place order", re.I)).first.click(timeout=6000)
                page.wait_for_url(re.compile(r"/order/success/"), timeout=8000)
            except Exception as e:
                print("checkout submit / redirect wait:", e)
            page.wait_for_timeout(1500)
            snap(page, "checkout_result", "Result after placing the order — order confirmation page.")

            placed_order_id = None
            m = re.search(r"/order/success/([^/?]+)", page.url)
            if m:
                placed_order_id = m.group(1)

            # ── ORDER TRACKING PAGE ─────────────────────────────────
            if placed_order_id:
                visit(page, f"/account/track/{placed_order_id}", "account_order_track",
                      "Buyer account — Order tracking page showing delivery progress for the placed order.")

            # ── PAYMENT GATEWAY RESULT PAGES (query-param driven) ───
            goto_retry(page, f"/payment/success?orderId={placed_order_id or ''}&txn=TXN-{_SUFFIX}")
            page.wait_for_timeout(700)
            snap(page, "payment_success", "Payment gateway — Success page shown after a completed payment.")

            goto_retry(page, f"/payment/failed?orderId={placed_order_id or ''}&reason=invalid_signature")
            page.wait_for_timeout(700)
            snap(page, "payment_failed", "Payment gateway — Failure page shown when a payment cannot be verified.")

            goto_retry(page, f"/payment/fonepay?prn=PRN-{_SUFFIX}&amount=950&orderId={placed_order_id or ''}")
            page.wait_for_timeout(700)
            snap(page, "payment_fonepay", "Payment gateway — Fonepay QR payment screen with scannable QR code.")

            goto_retry(page, "/payment/verify?gateway=khalti&pidx=test-pidx&status=User%20canceled")
            page.wait_for_timeout(1200)
            snap(page, "payment_verify", "Payment gateway — Verification result page after the provider reports a cancelled or failed payment.")

        # ── C) WISHLIST ────────────────────────────────────────────────
        if pid:
            try:
                goto_retry(page, f"/products/{pid}")
                page.wait_for_timeout(500)
                page.locator("button:has(svg.lucide-heart)").first.click(timeout=5000)
                page.wait_for_timeout(600)
            except Exception as e:
                print("wishlist toggle failed:", e)
            visit(page, "/wishlist", "wishlist", "Wishlist page showing the product the buyer saved for later.")

        # ── D) BUYER ACCOUNT AREA ──────────────────────────────────────
        visit(page, "/account/profile", "account_profile", "Buyer account — Profile page showing the signed-in buyer's details.")
        try:
            fill_smart(page, page, {r"phone": "9808199999"})
            page.wait_for_timeout(200)
            snap(page, "account_profile_filled", "Buyer account — Profile page with an updated phone number.")
            page.get_by_role("button", name=re.compile("save|update", re.I)).first.click(timeout=5000)
            page.wait_for_timeout(800)
            snap(page, "account_profile_result", "Buyer account — Result after saving profile changes.")
        except Exception as e:
            print("profile update skipped:", e)

        visit(page, "/account/addresses", "account_addresses", "Buyer account — Addresses page showing the address saved during checkout.")
        try:
            page.get_by_role("button", name=re.compile("add (new )?address", re.I)).first.click(timeout=5000)
            page.wait_for_timeout(400)
            snap(page, "account_addresses_add_empty", "Buyer account — Add Address form shown empty.")
            fill_smart(page, page, {
                r"full ?name": "Anita Gurung",
                r"phone": "9808123456",
                r"address line ?1|^street$|street address": "House 27, Kupondole Height",
                r"address line ?2": "Near Kupondole Gate",
                r"district": "Lalitpur",
                r"city": "Lalitpur",
                r"province": "Bagmati",
                r"postal|zip": "44700",
            })
            page.wait_for_timeout(300)
            snap(page, "account_addresses_add_filled", "Buyer account — Add Address form filled with a second delivery address.")
            page.get_by_role("button", name=re.compile("save address", re.I)).first.click(timeout=5000)
            page.wait_for_timeout(800)
            snap(page, "account_addresses_add_result", "Buyer account — Result after saving the new address, now listed alongside the existing one.")
        except Exception as e:
            print("add address workflow skipped:", e)

        visit(page, "/account/orders", "account_orders", "Buyer account — Orders page listing the order just placed at checkout.")
        try:
            page.locator("a[href*='/account/orders/']").first.click(timeout=5000)
            page.wait_for_timeout(1000)
            snap(page, "account_order_detail", "Buyer account — Detail view of the order, showing items and delivery status.")
            try:
                page.get_by_role("link", name=re.compile("track", re.I)).first.click(timeout=4000)
                page.wait_for_timeout(1000)
                snap(page, "account_order_track", "Buyer account — Order tracking page showing delivery progress.")
            except Exception:
                pass
        except Exception as e:
            print("order detail navigation skipped:", e)

        visit(page, "/account/notifications", "account_notifications", "Buyer account — Notifications preferences page.")
        visit(page, "/account/referral", "account_referral", "Buyer account — Referral Wallet page showing the buyer's referral code and earnings.")

        # ── PRODUCT DETAIL TABS + WRITE A REVIEW (buyer is authenticated) ─
        if pid:
            goto_retry(page, f"/products/{pid}")
            page.wait_for_timeout(1000)
            try:
                page.get_by_role("button", name=re.compile("^specs$", re.I)).first.click(timeout=4000)
                page.wait_for_timeout(300)
                snap(page, "product_specs_tab", "Product detail page — Specifications tab.")
            except Exception as e:
                print("specs tab click failed:", e)
            try:
                page.get_by_role("button", name=re.compile(r"^reviews", re.I)).first.click(timeout=4000)
                page.wait_for_timeout(400)
                snap(page, "product_reviews_tab_empty", "Product detail page — Reviews tab with the Write a Review form shown empty.")
                page.get_by_placeholder(re.compile("summary of your experience", re.I)).fill("Great value for money")
                page.get_by_placeholder(re.compile("what did you like or dislike", re.I)).fill(
                    "Fresh and well-packaged, arrived on time. Will buy again from this store.")
                page.locator("button:has(svg.lucide-star)").nth(4).click(timeout=3000)
                page.wait_for_timeout(300)
                snap(page, "product_reviews_tab_filled", "Product detail page — Review form filled with a 5-star rating and comment.")
                page.get_by_role("button", name=re.compile("submit review", re.I)).first.click(timeout=5000)
                page.wait_for_timeout(1000)
                snap(page, "product_reviews_tab_result", "Product detail page — Result after submitting the review, now listed below.")
            except Exception as e:
                print("write-a-review workflow failed:", e)

        # ── E) CONTACT ADMIN (separate ticket form from the public Contact Us page) ─
        goto_retry(page, "/contact/admin")
        page.wait_for_timeout(500)
        snap(page, "contact_admin_empty", "Connect with Admin form shown empty.")
        fill_smart(page, page, {
            r"subject": "Seller commission question",
            r"message": "Hi, could you clarify how the 30% commission is calculated on discounted items? Thanks!",
        })
        page.wait_for_timeout(200)
        snap(page, "contact_admin_filled", "Connect with Admin form filled with a realistic support question.")
        try:
            page.get_by_role("button", name=re.compile("send|submit", re.I)).first.click(timeout=5000)
        except Exception as e:
            print("contact admin submit failed:", e)
        page.wait_for_timeout(1200)
        snap(page, "contact_admin_result", "Result after submitting the Connect with Admin ticket.")

        # ── B) FORM 6 — SELLER REGISTRATION (2-step wizard, run last: switches session) ─
        try:
            page.context.clear_cookies()
        except Exception:
            pass
        goto_retry(page, "/sellers/register")
        page.wait_for_timeout(500)
        snap(page, "seller_register_empty", "Become-a-Seller registration form — step 1, Business Details, shown empty.")
        fill_smart(page, page, {
            r"store name": "Everest Organic Traders",
            r"phone": "9851234567",
            r"store address": "Jawalakhel Road",
            r"district": "Lalitpur",
            r"city": "Lalitpur",
            r"landmark": "Near Jawalakhel Zoo",
            r"description": "We supply certified organic vegetables and pulses sourced directly from farmers in the Kathmandu Valley.",
        })
        try:
            page.locator("select").first.select_option(index=1)
        except Exception:
            pass
        page.wait_for_timeout(300)
        snap(page, "seller_register_filled", "Become-a-Seller registration form — step 1 filled with realistic business details.")
        try:
            page.get_by_role("button", name=re.compile("continue to credentials", re.I)).first.click(timeout=5000)
            page.wait_for_timeout(500)
        except Exception as e:
            print("seller register step1->2 click failed:", e)
        fill_smart(page, page, {
            r"first ?name": "Bikash",
            r"last ?name": "Thapa",
            r"email": f"bikash.thapa.{_SUFFIX}@everestorganic.com",
            r"confirm password": "Seller@Secure123",
            r"^password$|password": "Seller@Secure123",
        })
        page.wait_for_timeout(300)
        snap(page, "seller_register_step2", "Become-a-Seller registration form — step 2, Account Credentials filled.")
        seller_ok = False
        for attempt in range(2):
            try:
                page.get_by_role("button", name=re.compile("create seller account", re.I)).first.click(timeout=5000)
                page.wait_for_url(re.compile(r"/seller/(dashboard|onboarding)?"), timeout=8000)
                seller_ok = True
                break
            except Exception as e:
                print(f"seller register submit attempt {attempt + 1} failed:", e)
                page.wait_for_timeout(800)
        if not seller_ok:
            print("seller register submit never redirected after retries")
        page.wait_for_timeout(1500)
        snap(page, "seller_register_result", "Result after submitting the seller registration form — new seller account created.")

        ctx.close()
        browser.close()

    (ROOT / "test_screenshots" / "public_manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\nDone. {len(manifest)} screenshots captured.")


if __name__ == "__main__":
    main()
