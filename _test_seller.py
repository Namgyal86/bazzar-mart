"""Seller Hub sweep for bazzar-mart. Playwright, headless Chromium, 1366x800."""
import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
import json
import requests

API_BASE = "http://localhost:8100"

BASE = "http://localhost:3000"
ROOT = Path(__file__).parent
SHOTS = ROOT / "test_screenshots" / "seller"
SHOTS.mkdir(parents=True, exist_ok=True)
manifest = []
n = [0]

SELLER_EMAIL = "bikash.debug.test@everestorganic.com"
SELLER_PASSWORD = "Seller@Secure123"
_SUFFIX = str(int(time.time()) % 100000)
_PRODUCT_NAME = f"Organic Dalle Khursani Pickle {_SUFFIX}"


def snap(page, name, caption):
    n[0] += 1
    fname = f"{n[0]:03d}_{name}.png"
    page.screenshot(path=str(SHOTS / fname))
    manifest.append({"file": f"seller/{fname}", "caption": caption})
    print("shot:", fname, caption)


def snap_scrolled(page, name, caption, y=850):
    page.evaluate(f"window.scrollTo(0, {y})")
    page.wait_for_timeout(400)
    snap(page, name, caption)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(200)


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


def visit(page, path, label, caption_top, caption_scroll=None):
    goto_retry(page, path)
    page.wait_for_timeout(2800)
    snap(page, f"{label}_top", caption_top)
    if caption_scroll:
        snap_scrolled(page, f"{label}_scroll", caption_scroll)


def fill_smart(page, values: dict):
    inputs = page.locator("input, textarea, select").all()
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


def login_seller(page):
    goto_retry(page, "/auth/login")
    page.wait_for_selector('button[type="submit"]', timeout=10000)
    page.wait_for_timeout(500)
    fill_smart(page, {r"email": SELLER_EMAIL, r"password": SELLER_PASSWORD})
    for attempt in range(2):
        try:
            page.get_by_role("button", name=re.compile("^log ?in$|sign in", re.I)).first.click(timeout=5000)
            page.wait_for_url(lambda url: "/auth/login" not in url, timeout=8000)
            break
        except Exception as e:
            print(f"seller login attempt {attempt + 1} failed:", e)
            page.wait_for_timeout(800)
    goto_retry(page, "/seller/dashboard")
    page.wait_for_timeout(2800)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1366, "height": 800})
        page = ctx.new_page()

        login_seller(page)
        snap(page, "login_as_seller", "Seller successfully logged in and redirected to the Seller Hub dashboard.")

        # ── Dashboard ──────────────────────────────────────────────
        snap_scrolled(page, "dashboard_scroll", "Seller Dashboard scrolled to show top products and recent orders.")

        # ── Analytics ──────────────────────────────────────────────
        visit(page, "/seller/analytics", "analytics", "Seller Analytics page showing store performance metrics.",
              "Seller Analytics page scrolled to show further detail.")

        # ── Products (list -> Add New -> edit first product) ──────
        goto_retry(page, "/seller/products")
        page.wait_for_timeout(2800)
        snap(page, "products_list", "Seller Products page showing this store's product catalogue.")

        goto_retry(page, "/seller/products/new")
        page.wait_for_timeout(700)
        snap(page, "products_new_empty", "Seller — Add Product form shown empty.")
        fill_smart(page, {
            r"product name|^name": _PRODUCT_NAME,
            r"description": "Handmade dalle khursani pickle, sun-dried and prepared in small batches using a traditional family recipe.",
            r"sale.*price": "320",
            r"^price": "380",
            r"stock|quantity": "60",
            r"brand": "Everest Organic Traders",
            r"tag": "pickle, organic, handmade",
        })
        try:
            page.locator("select").first.select_option(label="Spices & Condiments")
        except Exception as e:
            print("category select failed:", e)
        page.wait_for_timeout(300)
        snap(page, "products_new_filled", "Seller — Add Product form filled with realistic product details.")
        try:
            page.get_by_role("button", name=re.compile("create product|add product|save", re.I)).first.click(timeout=5000)
            page.wait_for_function("() => location.pathname === '/seller/products'", timeout=8000)
        except Exception as e:
            print("seller product create submit / redirect wait:", e)
        page.wait_for_timeout(1000)
        snap(page, "products_new_result", "Seller — Result after adding the new product, now listed in the catalogue.")

        new_product_id = None
        try:
            edit_link = page.locator("a[href*='/seller/products/'][href*='/edit']").first
            href = edit_link.get_attribute("href")
            m = re.search(r"/seller/products/([^/]+)/edit", href or "")
            if m:
                new_product_id = m.group(1)
            edit_link.click(timeout=5000)
            page.wait_for_url(re.compile(r"/seller/products/.+/edit"), timeout=6000)
            page.wait_for_timeout(800)
            snap(page, "products_edit", "Seller — Edit Product page for the newly added product.")
        except Exception as e:
            print("seller product edit navigation failed:", e)

        # ── Inventory ────────────────────────────────────────────────
        visit(page, "/seller/inventory", "inventory", "Seller Inventory page showing stock levels across products.")

        # ── Seed a real order for the new product via API, so Orders/Customers/Reviews show real data ──
        if new_product_id:
            try:
                prod = requests.get(f"{API_BASE}/api/v1/products/{new_product_id}", timeout=10).json()["data"]
                ts = str(int(time.time() % 100000))
                reg = requests.post(f"{API_BASE}/api/v1/auth/register", json={
                    "firstName": "Sunita", "lastName": "Shrestha",
                    "email": f"sunita.shrestha.{ts}@realmailbox.com",
                    "password": "Buyer@Secure123", "phone": "9812345678",
                }, timeout=10).json()
                token = reg["data"]["accessToken"]
                order_resp = requests.post(f"{API_BASE}/api/v1/orders", json={
                    "items": [{
                        "productId": new_product_id,
                        "productName": prod["name"],
                        "sellerId": prod["sellerId"],
                        "sellerName": prod.get("sellerName", "Seller"),
                        "unitPrice": prod.get("salePrice") or prod["price"],
                        "quantity": 2,
                    }],
                    "shippingAddress": {
                        "fullName": "Sunita Shrestha", "phone": "9812345678",
                        "addressLine1": "Baneshwor Chowk", "city": "Kathmandu",
                        "district": "Kathmandu", "province": "Bagmati", "postalCode": "44600",
                    },
                    "paymentMethod": "COD",
                }, headers={"Authorization": f"Bearer {token}"}, timeout=10).json()
                print("seeded order:", order_resp.get("data", {}).get("orderNumber", order_resp))

                review_resp = requests.post(
                    f"{API_BASE}/api/v1/products/{new_product_id}/reviews",
                    json={
                        "rating": 5, "title": "Delicious and authentic!",
                        "body": "Tastes just like homemade pickle from the hills. Will definitely order again.",
                        "userName": "Sunita Shrestha", "productName": prod["name"],
                    },
                    headers={"Authorization": f"Bearer {token}"}, timeout=10,
                ).json()
                print("seeded review:", review_resp.get("success", review_resp))
            except Exception as e:
                print("order/review seeding via API failed:", e)

        # ── Orders (list -> advance status) ───────────────────────────
        goto_retry(page, "/seller/orders")
        page.wait_for_timeout(2800)
        snap(page, "orders_list", "Seller Orders page showing orders placed for this store's products, awaiting confirmation.")
        try:
            page.get_by_role("button", name=re.compile("confirm order|start processing|mark shipped|mark delivered", re.I)).first.click(timeout=4000)
            page.wait_for_timeout(900)
            snap(page, "orders_status_advanced", "Seller Orders — order status advanced after the seller actioned it.")
        except Exception as e:
            print("seller order status advance skipped:", e)

        # ── Customers ──────────────────────────────────────────────
        visit(page, "/seller/customers", "customers", "Seller Customers page showing buyers who purchased from this store.")

        # ── Reviews (tab navigation) ───────────────────────────────
        goto_retry(page, "/seller/reviews")
        page.wait_for_timeout(2800)
        snap(page, "reviews_all_tab", "Seller Reviews page — All tab showing every customer review.")
        for tab_label, tab_name in [("approved", "approved_tab"), ("pending", "pending_tab")]:
            try:
                page.get_by_role("button", name=re.compile(f"^{tab_label}$", re.I)).first.click(timeout=3000)
                page.wait_for_timeout(500)
                snap(page, f"reviews_{tab_name}", f"Seller Reviews page — {tab_label.capitalize()} tab filtered view.")
            except Exception as e:
                print(f"reviews {tab_label} tab skipped:", e)

        # ── Payouts ──────────────────────────────────────────────────
        visit(page, "/seller/payouts", "payouts", "Seller Payouts page showing earnings and payout history.")

        # ── Storefront settings ──────────────────────────────────────
        goto_retry(page, "/seller/storefront")
        page.wait_for_timeout(2800)
        snap(page, "storefront_top", "Seller Storefront settings page showing this store's public profile.")
        try:
            fill_smart(page, {r"description|about|bio": "Certified organic vegetables, pulses, and handmade pickles sourced directly from Kathmandu Valley farmers."})
            page.wait_for_timeout(200)
            snap(page, "storefront_filled", "Seller Storefront settings — updated store description.")
            page.get_by_role("button", name=re.compile("save|update", re.I)).first.click(timeout=5000)
            page.wait_for_timeout(800)
            snap(page, "storefront_result", "Seller Storefront settings — result after saving changes.")
        except Exception as e:
            print("storefront update skipped:", e)

        # ── Notifications ──────────────────────────────────────────
        visit(page, "/seller/notifications", "notifications", "Seller Notifications page showing store alert preferences.")

        # ── Settings ─────────────────────────────────────────────────
        visit(page, "/seller/settings", "settings", "Seller Settings page showing account and store configuration.")

        ctx.close()
        browser.close()

    (ROOT / "test_screenshots" / "seller_manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\nDone. {len(manifest)} screenshots captured.")


if __name__ == "__main__":
    main()
