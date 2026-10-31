# TradePulse V2

A responsive, installable Progressive Web App (PWA) for **trading education and virtual-money practice**. It is designed for Android browsers and desktop web.

## Included in this project

- Luxury black-and-gold responsive interface
- Overview dashboard and illustrative chart
- Six fictional/demo instruments in the market watchlist
- Virtual UP/DOWN practice rounds (30 seconds, 1 minute, or 2 minutes)
- Local virtual balance, practice history, and win-rate summary
- Six beginner learning lessons with completion tracking
- Starter, Plus, and Pro membership preview
- M-Pesa and card payment integration preview
- Local profile, data export, and reset controls
- PWA manifest, icon, and service worker for install/offline caching

## Important: what this is — and is not

TradePulse V2 is an **educational simulation prototype**. It does not connect to a broker, place trades, provide live prices, give financial signals, accept deposits, or pay withdrawals. Prices are illustrative and round outcomes are randomly generated game mechanics. The displayed 80% practice reward is not a real payout, expected return, or forecast.

The subscription screen is also a demo. Clicking a plan does not charge a card or initiate an M-Pesa STK push. There is no payment credential, merchant account, subscription billing engine, or backend in this ZIP.

## Run locally

### Quickest method
Open `index.html` in a modern browser. Core features work locally. PWA installation and service-worker caching require serving the files over `localhost` or HTTPS.

### Run a local web server
If Python 3 is installed, open a terminal in this folder and run:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

### Install on Android
1. Deploy the project to an HTTPS host (or use a local development server).
2. Open the URL in Chrome on Android.
3. Open the browser menu and choose **Install app** or **Add to Home screen** (wording varies).
4. Launch TradePulse from the home screen.

This is a PWA, not a signed native APK. To publish a native Android app, package the PWA with a suitable Android wrapper (for example, Bubblewrap/TWA), then sign and test the resulting Android App Bundle.

## Where data is stored

The prototype stores profile, virtual balance, practice history, and lesson progress in the browser's `localStorage` under:

```text
tradepulse_v2_state
```

Data is local to that browser/device. It is not synced, backed up, or protected by an account system. Use **Profile & settings → Export my practice data** to download a JSON copy.

## Production roadmap

Before public launch, add and test the following:

1. **Backend and identity:** secure API, database, account registration, password reset, session management, server-side authorization, rate limiting, backups, audit logs, and privacy controls.
2. **M-Pesa:** a registered business Paybill/Till and approved Safaricom Daraja credentials. Implement server-side STK Push, callback validation, idempotency, transaction reconciliation, reversals/refunds, and subscription status updates. Never put Daraja secrets in browser JavaScript.
3. **Card payments:** select a payment service available to your business and region. Use hosted/tokenized checkout; verify signed webhooks server-side. Do not store raw card details.
4. **Subscriptions:** create products/prices with the payment providers, implement renewals, cancellations, grace periods, failed-payment handling, receipts, and server-authoritative entitlements.
5. **Advertising:** integrate an approved ad network only after policy and app review. Add consent/privacy controls where required.
6. **Market data:** obtain a properly licensed data feed if you want real quotes. Clearly label delayed/indicative data and show source/time.
7. **Security and operations:** HTTPS, secure headers, dependency updates, monitoring, incident response, and independent security testing.
8. **Legal review:** obtain Kenyan legal/regulatory advice before introducing brokerage, financial recommendations/signals, deposits, withdrawals, real-money predictions, or products that may fall under financial-services or gambling rules. This prototype intentionally excludes those functions.

## Suggested low-cost deployment

A static host can serve this PWA at little or no initial cost within its free tier. A production subscription service will still need backend hosting, a database, provider approval, and transaction fees. Confirm current hosting limits and payment-provider terms before launch.

## Project structure

```text
tradepulse-v2/
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── sw.js
├── icon.svg
└── README.md
```

## Customisation

- Edit `markets` and `lessons` in `app.js` to change the demo instruments and academy content.
- Edit plan names/prices in `index.html`.
- Edit the palette at the top of `styles.css`.
- Update the cache name in `sw.js` whenever you deploy a new version.

TradePulse V2 is a starter project, not a certified financial product or production payment application.
