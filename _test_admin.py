"""Admin panel sweep for bazzar-mart. Playwright, headless Chromium, 1366x800."""
import json
import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

BASE = "http://localhost:3000"
ROOT = Path(__file__).parent
SHOTS = ROOT / "test_screenshots" / "admin"
SHOTS.mkdir(parents=True, exist_ok=True)
manifest = []
n = [0]

ADMIN_EMAIL = "sgrgrg34@gmail.com"
ADMIN_PASSWORD = "ragassagar1298@"
_SUFFIX = str(int(time.time()) % 100000)
_PRODUCT_NAME = f"Premium Basmati Rice (5kg) {_SUFFIX}"


def snap(page, name, caption):
    n[0] += 1
    fname = f"{n[0]:03d}_{name}.png"
    page.screenshot(path=str(SHOTS / fname))
    manifest.append({"file": f"admin/{fname}", "caption": caption})
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
    page.wait_for_timeout(3200)
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
                if itype == "date":
                    matched = "2027-12-31"
                else:
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


def login_admin(page):
    goto_retry(page, "/auth/login")
    page.wait_for_timeout(500)
    fill_smart(page, {r"email": ADMIN_EMAIL, r"password": ADMIN_PASSWORD})
    page.get_by_role("button", name=re.compile("^log ?in$|sign in", re.I)).first.click(timeout=5000)
    page.wait_for_timeout(2000)
    goto_retry(page, "/admin/dashboard")
    page.wait_for_timeout(3200)


def click_add_new(page):
    for pat in ["add new", "add product", "add category", "add banner", "add coupon",
                "^add$", "^new$", "^create$", "create new", r"^create \w+$", r"^add \w+$", r"^\+ ?add"]:
        try:
            btn = page.get_by_role("button", name=re.compile(pat, re.I)).first
            if btn.is_visible(timeout=1000):
                btn.click(timeout=3000)
                return True
        except Exception:
            continue
    return False


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1366, "height": 800})
        page = ctx.new_page()

        login_admin(page)
        snap(page, "login_as_admin", "Admin successfully logged in and redirected to the admin panel.")

        # ── Dashboard ──────────────────────────────────────────────
        visit(page, "/admin/dashboard", "dashboard", "Admin Dashboard showing key store metrics.",
              "Admin Dashboard scrolled to show additional charts and recent activity.")

        # ── Orders (list -> detail -> status tabs) ────────────────
        goto_retry(page, "/admin/orders")
        page.wait_for_timeout(3200)
        snap(page, "orders_list", "Orders module showing the full list of customer orders.")
        try:
            page.locator("table tbody tr, [class*=order-row], [class*=OrderRow]").first.click(timeout=5000)
            page.wait_for_timeout(700)
            snap(page, "orders_detail", "Orders module — detail panel for the first order in the list.")
            page.locator("button:has(svg.lucide-x)").first.click(timeout=3000)
            page.wait_for_timeout(400)
        except Exception as e:
            print("orders detail click/close failed:", e)
        for tab in ["PENDING", "DELIVERED"]:
            try:
                page.get_by_role("button", name=re.compile(f"^{tab}", re.I)).first.click(timeout=4000)
                page.wait_for_timeout(500)
                snap(page, f"orders_tab_{tab.lower()}", f"Orders module — {tab.capitalize()} status tab filtered view.")
            except Exception as e:
                print(f"orders {tab} tab skipped:", e)

        # ── Sellers (list -> approve pending seller) ──────────────
        goto_retry(page, "/admin/sellers")
        page.wait_for_timeout(3200)
        snap(page, "sellers_list", "Sellers module showing registered sellers awaiting or holding approval.")
        try:
            page.get_by_role("button", name=re.compile(r"^\W*approve\W*$", re.I)).first.click(timeout=5000)
            page.wait_for_timeout(800)
            snap(page, "sellers_approved", "Sellers module — after approving a pending seller application.")
        except Exception as e:
            print("seller approve click failed:", e)

        # ── Support (list -> expand -> resolve) ───────────────────
        goto_retry(page, "/admin/support")
        page.wait_for_timeout(3200)
        snap(page, "support_list", "Support module showing customer enquiries received via the Contact Us form.")
        try:
            page.get_by_text(re.compile("delivery times", re.I)).first.click(timeout=5000)
            page.wait_for_timeout(600)
            snap(page, "support_expanded", "Support module — expanded view of a customer enquiry submitted via the Contact Us form.")
            page.get_by_role("button", name=re.compile("mark.*resolved", re.I)).first.click(timeout=5000)
            page.wait_for_timeout(600)
            snap(page, "support_resolved", "Support module — enquiry marked as resolved after being handled.")
        except Exception as e:
            print("support workflow failed:", e)

        # ── Users (list + role/status management + role tabs) ─────
        goto_retry(page, "/admin/users")
        page.wait_for_timeout(3200)
        snap(page, "users_list", "Users module showing all registered platform users.")
        snap_scrolled(page, "users_scroll", "Users module scrolled to show additional accounts and role/status controls.")
        for tab in ["SELLER", "BUYER"]:
            try:
                page.get_by_role("button", name=re.compile(f"^{tab}$", re.I)).first.click(timeout=4000)
                page.wait_for_timeout(500)
                snap(page, f"users_tab_{tab.lower()}", f"Users module — {tab.capitalize()} role tab filtered view.")
            except Exception as e:
                print(f"users {tab} tab skipped:", e)

        # ── Products (list + Add New form) ────────────────────────
        goto_retry(page, "/admin/products")
        page.wait_for_timeout(3200)
        snap(page, "products_list", "Products module showing the full product catalogue.")

        goto_retry(page, "/admin/products/new")
        page.wait_for_timeout(700)
        snap(page, "products_new_empty", "Add New Product form shown empty.")
        fill_smart(page, {
            r"product name|^name": _PRODUCT_NAME,
            r"description": "Long-grain aromatic basmati rice, aged for 12 months, imported and repacked for the Nepali market.",
            r"sale.*price": "850",
            r"^price": "950",
            r"stock|quantity": "75",
            r"brand": "Himalayan Harvest",
            r"tag": "rice, premium, grains",
        })
        try:
            page.locator("select").first.select_option(index=1)
        except Exception as e:
            print("category select failed:", e)
        page.wait_for_timeout(300)
        snap(page, "products_new_filled", "Add New Product form filled with realistic product details.")
        try:
            page.get_by_role("button", name=re.compile("^create product$", re.I)).first.click(timeout=5000)
            page.wait_for_function("() => location.pathname === '/admin/products'", timeout=8000)
        except Exception as e:
            print("product create submit / redirect wait:", e)
        page.wait_for_timeout(1000)
        snap(page, "products_new_result", "Result after submitting the Add New Product form — product added to the catalogue.")

        # ── Categories ─────────────────────────────────────────────
        goto_retry(page, "/admin/categories")
        page.wait_for_timeout(3200)
        snap(page, "categories_top", "Categories module showing all store categories.")
        if click_add_new(page):
            page.wait_for_timeout(500)
            snap(page, "categories_add_empty", "Add New Category form shown empty.")
            fill_smart(page, {r"name": f"Beverages & Juices {_SUFFIX}", r"description": "Cold drinks, juices, and refreshments.", r"slug": f"beverages-juices-{_SUFFIX}"})
            page.wait_for_timeout(300)
            snap(page, "categories_add_filled", "Add New Category form filled with realistic details.")
            try:
                page.get_by_role("button", name=re.compile("save|create|submit|add", re.I)).last.click(timeout=5000)
                page.wait_for_timeout(1000)
            except Exception as e:
                print("category submit failed:", e)
            snap(page, "categories_add_result", "Result after submitting the Add New Category form.")

        # ── Banners ────────────────────────────────────────────────
        goto_retry(page, "/admin/banners")
        page.wait_for_timeout(3200)
        snap(page, "banners_top", "Banners module showing homepage promotional banners.",)
        if click_add_new(page):
            page.wait_for_timeout(500)
            snap(page, "banners_add_empty", "Add New Banner form shown empty.")
            fill_smart(page, {
                r"title": "Monsoon Grocery Sale",
                r"subtitle": "Up to 25% off",
                r"description": "Stock up on fresh produce and pantry staples this monsoon season with storewide discounts.",
                r"cta": "Shop the Sale",
                r"link": "/deals",
            })
            page.wait_for_timeout(300)
            snap(page, "banners_add_filled", "Add New Banner form filled with realistic promotional copy.")
            try:
                page.get_by_role("button", name=re.compile("save|create|submit|add", re.I)).last.click(timeout=5000)
                page.wait_for_timeout(1000)
            except Exception as e:
                print("banner submit failed:", e)
            snap(page, "banners_add_result", "Result after submitting the Add New Banner form.")

        # ── Coupons ────────────────────────────────────────────────
        goto_retry(page, "/admin/coupons")
        page.wait_for_timeout(3200)
        snap(page, "coupons_top", "Coupons module showing active discount codes.")
        if click_add_new(page):
            page.wait_for_timeout(500)
            snap(page, "coupons_add_empty", "Add New Coupon form shown empty.")
            fill_smart(page, {
                r"code": f"MONSOON{_SUFFIX}",
                r"description": "25% off for monsoon season grocery orders",
                r"value|discount|percent|amount": "25",
                r"min.*(order|purchase|spend)": "500",
                r"usage|limit": "100",
            })
            page.wait_for_timeout(300)
            snap(page, "coupons_add_filled", "Add New Coupon form filled with realistic promotional details.")
            try:
                page.get_by_role("button", name=re.compile("save|create|submit|add", re.I)).last.click(timeout=5000)
                page.wait_for_timeout(1000)
            except Exception as e:
                print("coupon submit failed:", e)
            snap(page, "coupons_add_result", "Result after submitting the Add New Coupon form.")

        # ── Flash Deals ────────────────────────────────────────────
        visit(page, "/admin/flash-deals", "flash_deals", "Flash Deals module showing time-limited product offers.",
              "Flash Deals module scrolled to show additional deal listings.")

        # ── Remaining read-only modules — top + scroll ────────────
        for path, label, desc in [
            ("/admin/payments", "payments", "Payments module showing transaction records."),
            ("/admin/reviews", "reviews", "Reviews module showing customer product reviews."),
            ("/admin/referrals", "referrals", "Referrals module showing the referral program overview."),
            ("/admin/analytics", "analytics", "Analytics module showing store performance metrics."),
            ("/admin/delivery", "delivery", "Delivery module showing delivery tracking and assignment."),
            ("/admin/notifications", "notifications", "Notifications module showing system notification settings."),
            ("/admin/settings", "settings", "Settings module showing store configuration options."),
        ]:
            visit(page, path, label, f"{desc}", f"{desc} — scrolled to show further detail.")

        ctx.close()
        browser.close()

    (ROOT / "test_screenshots" / "admin_manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\nDone. {len(manifest)} screenshots captured.")


if __name__ == "__main__":
    main()
