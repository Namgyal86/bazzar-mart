# Bazzar — Go-Live Checklist

> Everything in this document must be completed before deploying to production.
> Items marked **BLOCKING** will cause broken functionality if skipped.

---

## 1. Secrets & Credentials — `.env` (BLOCKING)

File: `bazzar-mart/.env`

Replace every placeholder value before starting the production stack.

### JWT

```bash
# Generate two independent secrets (run these in your terminal)
openssl rand -hex 32   # → JWT_ACCESS_SECRET
openssl rand -hex 32   # → JWT_REFRESH_SECRET
```

```env
JWT_ACCESS_SECRET=<32+ char random string>
JWT_REFRESH_SECRET=<different 32+ char random string>
```

### Payment Gateways

| Variable | What to do |
|---|---|
| `KHALTI_SECRET_KEY` | Replace `test_secret_key_xxx` with live key from [khalti.com](https://khalti.com) merchant dashboard. Live keys start with `live_secret_key_` |
| `ESEWA_SECRET_KEY` | Replace the UAT default `8gBm/:&EnhH.1/q(` with your production eSewa secret |
| `ESEWA_MERCHANT_CODE` | Change `EPAYTEST` → your live eSewa merchant code |
| `FONEPAY_MERCHANT_CODE` | Fill from Fonepay merchant portal |
| `FONEPAY_SECRET_KEY` | Fill from Fonepay merchant portal |

### Notifications

| Variable | Where to get it |
|---|---|
| `SENDGRID_API_KEY` | SendGrid dashboard → Settings → API Keys |
| `SPARROW_SMS_TOKEN` | Sparrow SMS (Nepal) dashboard → API Token |
| `FIREBASE_PROJECT_ID` | Firebase console → Project settings → General |
| `FIREBASE_CLIENT_EMAIL` | Firebase console → Project settings → Service accounts → Generate new private key |
| `FIREBASE_PRIVATE_KEY` | Same JSON file — keep `\n` literal newlines inside double quotes |

### AWS S3

| Variable | Where to get it |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM → Users → Your deploy user → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | Same IAM user |
| `S3_BUCKET_NAME` | Your S3 bucket name (create in ap-south-1) |
| `CLOUDFRONT_URL` | CloudFront → Distributions → Domain name (e.g. `https://d1234.cloudfront.net`) |

### Public URLs

Change the localhost values to production domains:

```env
WEB_URL=https://bazzar.com.np
API_BASE_URL=https://api.bazzar.com.np
MONOLITH_URL=http://localhost:8100    # leave as-is for local dev; K8s overrides via ConfigMap
```

---

## 2. GitHub Actions Secrets (BLOCKING for CI/CD)

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

Add every secret from section 1, plus these deployment-specific secrets:

| Secret name | How to get it |
|---|---|
| `JWT_ACCESS_SECRET` | Same value as `.env` |
| `JWT_REFRESH_SECRET` | Same value as `.env` |
| `KHALTI_SECRET_KEY` | Live key |
| `ESEWA_SECRET_KEY` | Production value |
| `ESEWA_MERCHANT_CODE` | Live merchant code |
| `FONEPAY_MERCHANT_CODE` | Live value |
| `FONEPAY_SECRET_KEY` | Live value |
| `SENDGRID_API_KEY` | Production value |
| `SPARROW_SMS_TOKEN` | Production value |
| `FIREBASE_PROJECT_ID` | Production value |
| `FIREBASE_CLIENT_EMAIL` | Production value |
| `FIREBASE_PRIVATE_KEY` | Production value (with `\n` newlines) |
| `AWS_DEPLOY_ROLE_ARN` | ARN of the IAM role used for EKS OIDC auth (e.g. `arn:aws:iam::123456789:role/bazzar-deploy`) |
| `VERCEL_TOKEN` | Vercel dashboard → Account settings → Tokens → Create |
| `SLACK_WEBHOOK_URL` | Slack app → Incoming Webhooks → Add new webhook |

---

## 3. Replace `your-org` Placeholder in K8s Manifests (BLOCKING)

Four files contain `ghcr.io/your-org/bazzar/...`. Replace `your-org` with your real GitHub username or organisation name.

### Files to edit

| File | Line | Current value |
|---|---|---|
| `infrastructure/k8s/services/api-monolith.yaml` | 39 | `ghcr.io/your-org/bazzar/api-monolith:latest` |
| `infrastructure/k8s/services/delivery-service.yaml` | 38 | `ghcr.io/your-org/bazzar/delivery-service:latest` |
| `infrastructure/k8s/services/notification-service.yaml` | 37 | `ghcr.io/your-org/bazzar/notification-service:latest` |
| `infrastructure/k8s/ingress.yaml` | 138 | `ghcr.io/your-org/bazzar/web-frontend:latest` |

Also update line 11 of the CI/CD pipeline:

```yaml
# infrastructure/github-actions/deploy.yml  line 11
IMAGE_PREFIX: ghcr.io/YOUR_GITHUB_ORG/bazzar
```

### Quick sed command (run from repo root on Linux/Mac)

```bash
ORG=your-actual-github-org
find infrastructure/k8s -name "*.yaml" -exec \
  sed -i "s|ghcr.io/your-org/|ghcr.io/${ORG}/|g" {} \;
sed -i "s|ghcr.io/\${{ github.repository_owner }}|ghcr.io/${ORG}|g" \
  infrastructure/github-actions/deploy.yml
```

---

## 4. DNS Records (BLOCKING)

Create these records at your domain registrar (or in Route 53) pointing to the EKS Nginx Ingress load balancer.

```
bazzar.com.np      A / CNAME  →  <EKS Nginx Ingress LB hostname or IP>
www.bazzar.com.np  CNAME      →  bazzar.com.np
api.bazzar.com.np  A / CNAME  →  <same EKS Nginx Ingress LB hostname or IP>
```

Get the load balancer address after the EKS cluster is up:

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

---

## 5. Kubernetes Secret Objects (BLOCKING)

The K8s deployments pull from `bazzar-secrets` and `bazzar-db-secrets` via `secretRef`. You must create these before running `kubectl apply`.

### Application secrets

```bash
kubectl create secret generic bazzar-secrets \
  -n bazzar \
  --from-literal=JWT_ACCESS_SECRET=<value> \
  --from-literal=JWT_REFRESH_SECRET=<value> \
  --from-literal=KHALTI_SECRET_KEY=<value> \
  --from-literal=ESEWA_SECRET_KEY=<value> \
  --from-literal=ESEWA_MERCHANT_CODE=<value> \
  --from-literal=FONEPAY_MERCHANT_CODE=<value> \
  --from-literal=FONEPAY_SECRET_KEY=<value> \
  --from-literal=SENDGRID_API_KEY=<value> \
  --from-literal=SPARROW_SMS_TOKEN=<value> \
  --from-literal=FIREBASE_PROJECT_ID=<value> \
  --from-literal=FIREBASE_CLIENT_EMAIL=<value> \
  --from-literal=FIREBASE_PRIVATE_KEY=<value>
```

### Database secrets (delivery-service uses a separate DB)

```bash
kubectl create secret generic bazzar-db-secrets \
  -n bazzar \
  --from-literal=DELIVERY_SERVICE_MONGO_URI=mongodb://<host>:27017/delivery_db
```

### GHCR image pull secret (so K8s can pull private images)

```bash
kubectl create secret docker-registry ghcr-pull-secret \
  -n bazzar \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT
```

> Create the GitHub PAT at: GitHub → Settings → Developer settings → Personal access tokens → with `read:packages` scope.

---

## 6. Mobile Apps — Production Builds (BLOCKING for mobile)

All 4 Flutter apps default to `http://10.0.2.2:3000` (Android emulator localhost). The production URL must be injected at build time via `--dart-define`.

### Android APK

```bash
# Buyer app
cd mobile/buyer_app
flutter build apk --release --dart-define=API_BASE_URL=https://bazzar.com.np

# Seller app
cd mobile/seller_app
flutter build apk --release --dart-define=API_BASE_URL=https://bazzar.com.np

# Admin app
cd mobile/admin_app
flutter build apk --release --dart-define=API_BASE_URL=https://bazzar.com.np

# Delivery app
cd mobile/delivery_app
flutter build apk --release --dart-define=API_BASE_URL=https://bazzar.com.np
```

### iOS IPA

```bash
flutter build ipa --release --dart-define=API_BASE_URL=https://bazzar.com.np
```

### App Bundle (Play Store)

```bash
flutter build appbundle --release --dart-define=API_BASE_URL=https://bazzar.com.np
```

---

## 7. AWS Infrastructure Setup (one-time, before first deploy)

Run these steps once when setting up the cluster for the first time.

```bash
# 1. Create EKS cluster
eksctl create cluster \
  --name bazzar-eks-cluster \
  --region ap-south-1 \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 5

# 2. Install Nginx Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/aws/deploy.yaml

# 3. Install cert-manager (handles Let's Encrypt TLS)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# 4. Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF

# 5. Create bazzar namespace
kubectl apply -f infrastructure/k8s/namespace.yaml

# 6. Create secrets (see section 5 above)

# 7. Apply config and services
kubectl apply -f infrastructure/k8s/configmap.yaml
kubectl apply -f infrastructure/k8s/services/api-monolith.yaml
kubectl apply -f infrastructure/k8s/services/delivery-service.yaml
kubectl apply -f infrastructure/k8s/services/notification-service.yaml
kubectl apply -f infrastructure/k8s/ingress.yaml
```

---

## 8. Upload Storage — Migrate to S3 (Recommended)

The current `api-monolith` K8s deployment uses a `ReadWriteOnce` PVC (only one pod can write at a time). With 2+ replicas this causes issues.

**Fix:** Replace `multer` disk storage with `multer-s3` in `services/api-monolith/src/modules/upload/upload.routes.ts`.

```bash
npm install multer-s3 @aws-sdk/client-s3
```

Then update `upload.routes.ts` to store directly to S3 and return the CloudFront URL. Once done, remove the PVC section from `infrastructure/k8s/services/api-monolith.yaml` and serve images from `CLOUDFRONT_URL` instead of `/uploads`.

---

## Deployment Order

Follow this order to avoid dependency failures:

```
1. Set up AWS (EKS, S3, IAM roles)
2. Configure DNS
3. Add all GitHub Secrets
4. Push to main → CI/CD runs automatically:
     test → build (pushes images to GHCR) → deploy EKS → deploy Vercel
5. Create K8s secrets (bazzar-secrets, bazzar-db-secrets, ghcr-pull-secret)
6. Verify rollout: kubectl get pods -n bazzar
7. Build and release mobile apps with --dart-define=API_BASE_URL=https://bazzar.com.np
```

---

## Quick Status Summary

| Area | Status |
|---|---|
| `.env` secrets | Placeholders — must fill before deploying |
| GitHub Actions secrets | Not set — must add before pushing to main |
| K8s image names (`your-org`) | 4 files need real org name |
| DNS records | Not configured |
| K8s secret objects | Not created |
| Mobile production builds | Not built — need `--dart-define` |
| EKS cluster | Not set up |
| cert-manager / TLS | Not installed |
| S3 upload storage | Optional but recommended for multi-replica |
