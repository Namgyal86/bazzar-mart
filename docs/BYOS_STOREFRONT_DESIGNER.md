# Build Your Own Storefront (BYOS) — Storefront Designer

> This is a **new core feature**. Read this file carefully. It must not diverge from the main platform's auth, product catalog, or deployment architecture.

---

## 1. Feature Overview

**BYOS** is a drag-and-drop website designer built into the seller dashboard. It lets sellers design, preview, and publish a custom public-facing storefront page at:

```
https://platform.com/store/<seller-slug>
```

The storefront is a **marketing and discovery page** — not a full checkout flow. Buyers who click a product on the storefront are taken to the standard product detail page.

---

## 2. User Stories

| As a... | I want to... | So that... |
|---------|-------------|------------|
| Seller | Choose a layout template | I can start with a professional design quickly |
| Seller | Drag sections to reorder them | My page layout matches my brand priorities |
| Seller | Upload my logo and banner image | My storefront feels like my own brand |
| Seller | Pick brand colors and fonts | My storefront matches my offline branding |
| Seller | Add my featured products to the page | Buyers can discover my best items immediately |
| Seller | Preview on desktop and mobile | I know it looks good on every device |
| Seller | Publish with one click | My changes go live without developer help |
| Seller | Roll back to a previous version | I can undo mistakes after publishing |
| Buyer | Visit a seller's storefront URL | I can explore a seller's full brand and catalog |

---

## 3. Frontend — Storefront Designer UI

### 3.1 Tech Stack

- **Framework:** React 18 + TypeScript (part of the main Next.js frontend)
- **Drag-and-drop engine:** `dnd-kit` (preferred over react-dnd for accessibility)
- **State management:** Zustand (lightweight; Redux is overkill for this isolated feature)
- **Rich text editing (for About section):** TipTap
- **Color picker:** `react-colorful`
- **Font picker:** Google Fonts API
- **Preview iframe:** sandboxed `<iframe>` rendering the live HTML output

### 3.2 Designer Layout

```
┌────────────────────────────────────────────────────────────┐
│  TOPBAR: [← Back]  [Storefront Designer]  [Preview] [Publish] │
├───────────────┬───────────────────────────────────────┬─────┤
│               │                                       │     │
│  LEFT PANEL   │         CANVAS (live preview)         │  R  │
│  ─────────    │                                       │  I  │
│  Sections     │   ┌──────────────────────────────┐   │  G  │
│  ─────────    │   │   Hero Banner                │   │  H  │
│  • Hero       │   ├──────────────────────────────┤   │  T  │
│  • Products   │   │   Featured Products Grid     │   │     │
│  • About      │   ├──────────────────────────────┤   │  P  │
│  • Testimonial│   │   About the Seller           │   │  A  │
│  • Newsletter │   ├──────────────────────────────┤   │  N  │
│  • Custom HTML│   │   Testimonials               │   │  E  │
│               │   └──────────────────────────────┘   │  L  │
│  Templates    │                                       │     │
│  ─────────    │   [Desktop] [Tablet] [Mobile]         │     │
│  • Minimal    │                                       │     │
│  • Bold       │                                       │     │
│  • Fashion    │                                       │     │
│  • Tech       │                                       │     │
└───────────────┴───────────────────────────────────────┴─────┘
```

### 3.3 Available Sections

Each section is a **draggable, configurable block**:

| Section ID | Name | Config Options |
|------------|------|---------------|
| `hero_banner` | Hero Banner | Background image/color, headline text, subheading, CTA button text + link |
| `featured_products` | Featured Products | Select up to 12 products from seller's catalog; grid or carousel layout |
| `category_showcase` | Category Showcase | Select categories to highlight with images |
| `about_seller` | About the Seller | Rich-text editor, seller photo, founding year |
| `testimonials` | Customer Testimonials | Pull from top-rated reviews or enter custom quotes |
| `newsletter_signup` | Newsletter Signup | Email capture; integrates with Notification Service |
| `social_links` | Social Media Links | Instagram, TikTok, Facebook, Twitter/X URLs |
| `custom_html` | Custom HTML Block | Raw HTML (sanitized server-side; no `<script>` tags) |
| `announcement_bar` | Announcement Bar | Text + background color; shown at top of page |
| `contact_info` | Contact Info | Email, phone, business address |

### 3.4 Theme Settings (Right Panel)

```typescript
interface StoreTheme {
  primaryColor: string;       // Hex, e.g. "#E63946"
  secondaryColor: string;     // Hex
  backgroundColor: string;    // Hex
  textColor: string;          // Hex
  headingFont: string;        // Google Font name, e.g. "Playfair Display"
  bodyFont: string;           // Google Font name, e.g. "Inter"
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  buttonStyle: 'filled' | 'outlined' | 'ghost';
  logoUrl: string;            // S3 URL after upload
  faviconUrl: string;         // S3 URL after upload
}
```

### 3.5 Templates

Pre-built templates load a default `StoreDesign` JSON (sections + theme):

| Template | Best For | Color Palette |
|----------|----------|---------------|
| `minimal` | Clean, modern brands | White + black |
| `bold` | High-impact retail | Vibrant primaries |
| `fashion` | Clothing & lifestyle | Muted, elegant tones |
| `tech` | Electronics, software | Dark mode, blue accents |

---

## 4. Data Model

### 4.1 StoreDesign JSON Schema

This is the **single source of truth** for a storefront design. It is stored in the database and used to render the static HTML.

```typescript
interface StoreDesign {
  id: string;                    // UUID
  sellerId: string;              // FK to Seller
  version: number;               // Auto-incremented on publish
  isDraft: boolean;
  theme: StoreTheme;
  sections: Section[];           // Ordered array (index = render order)
  seoTitle: string;
  seoDescription: string;
  createdAt: string;             // ISO datetime
  updatedAt: string;
}

interface Section {
  id: string;                    // UUID
  type: SectionType;             // 'hero_banner' | 'featured_products' | etc.
  isVisible: boolean;
  config: Record<string, any>;   // Type-specific config (see section specs above)
}
```

### 4.2 Database Tables (storefront_db — PostgreSQL)

```sql
-- Storefront designs (one per seller, versioned)
CREATE TABLE storefront_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id),
    version INTEGER NOT NULL DEFAULT 1,
    is_published BOOLEAN DEFAULT FALSE,
    design_json JSONB NOT NULL,           -- Full StoreDesign object
    published_url TEXT,                    -- S3/CDN URL of rendered HTML
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version history
CREATE TABLE storefront_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID REFERENCES storefront_designs(id),
    version INTEGER NOT NULL,
    design_json JSONB NOT NULL,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    published_by UUID NOT NULL             -- user_id
);

-- Asset uploads (logos, banners, etc.)
CREATE TABLE storefront_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL,
    asset_type VARCHAR(50),               -- 'logo' | 'banner' | 'photo'
    s3_key TEXT NOT NULL,
    cdn_url TEXT NOT NULL,
    file_size_bytes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_storefront_designs_seller_id ON storefront_designs(seller_id);
CREATE INDEX idx_storefront_versions_design_id ON storefront_versions(design_id);
```

---

## 5. Backend — Storefront Designer Service

### 5.1 Service Structure

```
storefront-designer-service/
├── src/
│   ├── config/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── apps/
│   │   └── designer/
│   │       ├── models/
│   │       │   └── storefront.py
│   │       ├── services/
│   │       │   ├── design_service.py       # Core business logic
│   │       │   ├── render_service.py       # JSON → HTML rendering
│   │       │   ├── publish_service.py      # S3 upload + CDN invalidation
│   │       │   └── version_service.py      # Version history management
│   │       ├── repositories/
│   │       │   └── storefront_repository.py
│   │       ├── api/
│   │       │   ├── views.py
│   │       │   ├── serializers.py
│   │       │   └── urls.py
│   │       └── tasks/
│   │           └── render_tasks.py         # Async rendering via Celery
│   └── infrastructure/
│       ├── s3/
│       │   └── s3_client.py
│       └── kafka/
│           └── producer.py
```

### 5.2 API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/storefront/design/` | SELLER | Get current draft design |
| `PUT` | `/api/v1/storefront/design/` | SELLER | Save/autosave draft design |
| `POST` | `/api/v1/storefront/design/publish/` | SELLER | Publish current draft |
| `GET` | `/api/v1/storefront/design/versions/` | SELLER | List version history |
| `POST` | `/api/v1/storefront/design/rollback/{version}/` | SELLER | Roll back to a version |
| `POST` | `/api/v1/storefront/assets/upload/` | SELLER | Upload logo/banner image |
| `GET` | `/api/v1/storefront/templates/` | SELLER | List available templates |
| `POST` | `/api/v1/storefront/preview/` | SELLER | Render preview HTML (no publish) |
| `GET` | `/store/{seller-slug}/` | PUBLIC | Serve published storefront page |

### 5.3 Rendering Logic

The **Render Service** converts `StoreDesign` JSON → static HTML:

```python
class RenderService:
    """
    Converts a StoreDesign JSON object into a complete HTML page.
    Uses Jinja2 templates per section type.
    Inlines CSS variables from StoreTheme.
    Embeds Google Fonts link tags from theme.headingFont and theme.bodyFont.
    Sanitizes all custom HTML blocks (strips <script>, on* attributes).
    Outputs a single self-contained HTML file.
    """

    def render(self, design: StoreDesign) -> str:
        ...

    def _render_section(self, section: Section, theme: StoreTheme) -> str:
        template = self.templates[section.type]
        return template.render(config=section.config, theme=theme)

    def _sanitize_custom_html(self, raw_html: str) -> str:
        # Use bleach library; allow only safe tags and attributes
        ...
```

**Rendering is async:** When the seller clicks Publish, the frontend shows a "Publishing..." spinner. The API enqueues a Celery task. When done, the task returns the live URL via WebSocket notification.

### 5.4 Publishing Flow (Detailed)

```python
# publish_service.py

class PublishService:
    def publish(self, seller_id: str) -> str:
        """
        1. Load current draft design from DB
        2. Render full HTML via RenderService
        3. Upload HTML to S3: s3://bucket/storefronts/{seller_slug}/index.html
        4. Upload all referenced assets (already on S3, just confirm paths)
        5. Invalidate CloudFront distribution for /store/{seller_slug}/*
        6. Save version snapshot to storefront_versions table
        7. Update storefront_designs: is_published=True, version++, published_url=CDN_URL
        8. Publish STOREFRONT_PUBLISHED event to Kafka
        9. Return CDN URL
        """
```

### 5.5 Security Constraints

- **Authentication:** SELLER role JWT required for all write endpoints
- **Authorization:** Sellers can only read/write their own design (enforced by `seller_id` from JWT)
- **Asset uploads:** Max 5MB per file; allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`
- **Custom HTML sanitization:** Server-side with `bleach`; strip all `<script>`, `<iframe>`, `on*` event attributes
- **Rate limiting:** Publish endpoint limited to 10 publishes/hour per seller

---

## 6. Public Storefront Page Serving

Published storefronts are **static HTML served from CloudFront**, not from the Django service. This means:

- Zero server load for buyer page views
- Global low-latency delivery
- No Django process involved in serving buyer traffic

**URL routing:**
```nginx
# API Gateway routes:
/api/*          → Kubernetes services
/store/*        → CloudFront (static S3 bucket)
```

**Fallback (if CDN fails):** The Storefront Designer Service can serve the design dynamically as a fallback:
```python
# api/views.py
class PublicStorefrontView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, seller_slug):
        design = self.design_service.get_published_design(seller_slug)
        html = self.render_service.render(design)
        return HttpResponse(html, content_type='text/html')
```

---

## 7. Frontend Integration Points

The Storefront Designer is a **tab inside the Seller Dashboard** (`/dashboard/storefront`).

### 7.1 State Management (Zustand)

```typescript
interface StorefrontStore {
  design: StoreDesign | null;
  isDirty: boolean;                        // Unsaved changes flag
  isPublishing: boolean;
  previewMode: 'desktop' | 'tablet' | 'mobile';

  // Actions
  loadDesign: () => Promise<void>;
  updateSection: (sectionId: string, config: Partial<Section>) => void;
  addSection: (type: SectionType, afterIndex: number) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;
  updateTheme: (theme: Partial<StoreTheme>) => void;
  saveDraft: () => Promise<void>;          // Debounced autosave (2s)
  publish: () => Promise<string>;          // Returns live URL
  loadTemplate: (templateId: string) => void;
}
```

### 7.2 Autosave

The designer **autosaves** the current draft 2 seconds after the user stops making changes:

```typescript
// Debounced autosave — fires after 2000ms of inactivity
const debouncedSave = useMemo(
  () => debounce(() => store.saveDraft(), 2000),
  [store]
);

useEffect(() => {
  if (store.isDirty) debouncedSave();
}, [store.design, store.isDirty]);
```

### 7.3 Drag-and-Drop (dnd-kit)

```typescript
// Each section in the canvas is a DraggableSection
// Sections panel shows DroppableSection targets
// On drag end → dispatch reorderSections action

<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={design.sections.map(s => s.id)}>
    {design.sections.map((section, index) => (
      <SortableSection key={section.id} section={section} index={index} />
    ))}
  </SortableContext>
</DndContext>
```

---

## 8. What the Coding Agent Must Build

### Backend Tasks
- [ ] `storefront-designer-service` Django project with full clean architecture
- [ ] PostgreSQL models per the schema above
- [ ] All 9 API endpoints with proper auth and validation
- [ ] `RenderService` with Jinja2 templates for all 10 section types
- [ ] `PublishService` with S3 upload + CloudFront invalidation
- [ ] `VersionService` for version history and rollback
- [ ] Celery task for async rendering
- [ ] Kafka producer for `STOREFRONT_PUBLISHED` event
- [ ] Asset upload endpoint with file type + size validation
- [ ] Sanitization middleware for custom HTML blocks
- [ ] Unit tests for all service-layer methods

### Frontend Tasks
- [ ] Seller Dashboard tab: `/dashboard/storefront`
- [ ] Left panel: draggable section list + template picker
- [ ] Canvas: sortable section preview with dnd-kit
- [ ] Right panel: theme editor (color pickers, font selectors)
- [ ] Per-section config panels (shown when a section is selected)
- [ ] Desktop / Tablet / Mobile preview toggle (iframe resize)
- [ ] Publish button with loading state and success modal showing live URL
- [ ] Version history drawer with rollback confirmation
- [ ] Asset upload modal (logo, banner)
- [ ] Unsaved changes warning before navigating away

### Jinja2 HTML Templates (per section)
- [ ] `hero_banner.html`
- [ ] `featured_products.html`
- [ ] `category_showcase.html`
- [ ] `about_seller.html`
- [ ] `testimonials.html`
- [ ] `newsletter_signup.html`
- [ ] `social_links.html`
- [ ] `custom_html.html`
- [ ] `announcement_bar.html`
- [ ] `contact_info.html`
- [ ] `base_storefront.html` (wraps all sections with `<head>`, fonts, CSS vars)
