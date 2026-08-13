# Sprint 3 — CookieYes + consent-gated `kkd_ref`

> GitHub [#26](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/26) (execution) · [#23](https://github.com/aiiiinerv-ctrl/kkd_prop_web/issues/23) (มติ 5 ข้อ) · part of #10
> แผนฉบับเต็มควร commit ลง `docs/plans/sprint-3-cookie-consent-tasks.md` ก่อนเริ่ม implement ตามกติกา repo

## Context

ใบเสนอราคาลงวันที่ 21/06/2026 **รายการที่ 7: "บริการตั้งค่า Cookie Consent (CookieYes.com) — 1 บัญชี"** (หมายเหตุข้อ 5: ใช้ Plan Free) — เป็นของที่รับเงินมาแล้วและยังไม่ได้ส่งมอบ ไม่ใช่ข้อเสนอแนะเชิงกฎหมายที่จะเลือกทำหรือไม่ทำ

สภาพจริงที่ยืนยันแล้ววันนี้:
- กราด repo ทั้งก้อน **ไม่มีคำว่า `COOKIEYES` ที่ไหนเลย** — สปรินต์ยังไม่เริ่มเขียนโค้ด
- ยิง `curl -sI "https://kkdproperty.co.th/th?ref=CH001"` บน production ตอนนี้ยังได้ `set-cookie: kkd_ref=CH001; Max-Age=2592000` **ทันทีโดยไม่ขอความยินยอม** — cookie การตลาด 30 วัน ตั้งโดยไม่มี CMP
- ลิงก์นโยบายทั้งสามที่ footer เป็น `href="#"` — ประกาศว่ามีแล้วพาไปสู่ความว่างเปล่า
- deploy เมื่อคืน (2026-08-12) ลงเรียบร้อย `/api/admin/leads` = 401 ปกติ ไม่ใช่ 500 → ไม่มี migration ค้าง สปรินต์นี้เริ่มจากฐานที่สะอาด

**ผลลัพธ์ที่ต้องการ:** แบนเนอร์ consent ทำงานจริงบน production, `kkd_ref` รอความยินยอมก่อนตั้ง, หน้านโยบายคุกกี้มีอยู่จริงทั้ง TH/EN, ปุ่ม Verify ในแดชบอร์ด CookieYes ขึ้นเขียว = หลักฐานส่งมอบรายการที่ 7

**ค่าจริง (public identifier ไม่ลับ):** `NEXT_PUBLIC_COOKIEYES_ID = ebaf06b6a5fed3292f124e8e29195a7c` · script = `https://cdn-cookieyes.com/client_data/${id}/script.js` · websiteId แดชบอร์ด `1438634`

---

## ปัญหาที่ #26 เขียนไว้ไม่ครบ (เจอตอนวางแผน)

**R1 — attribution จะหายเกือบหมด ไม่ใช่แค่ "ลดลงส่วนหนึ่ง" ตามที่ issue เขียน**

ลำดับเหตุการณ์จริง: ลูกค้าเปิด `/th?ref=CH001` → middleware ไม่เห็น consent → ไม่ตั้ง cookie → แบนเนอร์ขึ้น → ลูกค้ากดยอมรับ → CookieYes ตั้ง `cookieyes-consent` **ฝั่ง client โดยไม่มี request ใหม่ที่พก `?ref=` มาให้ middleware อ่าน** → `kkd_ref` ไม่เคยถูกตั้งเลย **แม้ลูกค้ายินยอมแล้ว** เหลือเก็บได้เฉพาะคนที่เคยยินยอมมาก่อนแล้วกลับมาด้วยลิงก์โปรโมทรอบสอง

**R6 — `scripts/e2e-channel-tracking.mts` จะแดงทันที** (บรรทัด 58-60, 144, 165 assert ตรง ๆ ว่า `?ref=` ต้องได้ `kkd_ref`) #26 ไม่ได้พูดถึงสคริปต์นี้เลย

---

## การตัดสินใจที่ผู้ใช้อนุมัติแล้ว (2026-08-13)

| # | เรื่อง | มติ |
|---|---|---|
| 1 | กู้ attribution | **เปิด "reload after consent" ในแดชบอร์ด CookieYes ก่อน** (ศูนย์บรรทัดโค้ด — หน้ารีโหลด URL เดิมที่ยังมี `?ref=` middleware จึงเห็น consent) ; ถ้า Free plan ไม่มีสวิตช์นี้ → **fallback เป็น `/api/ref` route อัตโนมัติ ไม่ต้องหยุดถาม** |
| 2 | หน้า cookie-policy ฝั่ง EN | **เขียนตารางข้อเท็จจริงเอง TH/EN** (ชื่อ cookie / วัตถุประสงค์ / อายุ / หมวด ของ 3 ตัวที่เว็บตั้งจริง) ไม่ใช่ข้อความกฎหมาย จึงแปลเองได้โดยไม่รับความเสี่ยงแทนลูกค้า |
| 3 | deploy | **สองจังหวะในสปรินต์นี้** — จังหวะแรกขึ้นโค้ดโดยยังไม่ใส่ env (ไม่มีค่า = ไม่เรนเดอร์อะไร ความเสี่ยงเป็นศูนย์) จังหวะสองผู้ใช้ใส่ค่าในแพเนลเมื่อสะดวก |
| 4 | `httpOnly` บน `kkd_ref` | **เพิ่มในคอมมิตเดียวกับ task 3** (ค้างจาก #23 ข้อ 4) — ผู้อ่านเดียวคือ `resolveRefAttribution()` ฝั่ง server, Playwright ยังเห็น httpOnly cookie ได้ e2e ไม่พัง |
| 5 | หมวดใน CookieYes | เปิด **necessary + advertisement** ก่อน ; analytics ไปเปิดพร้อม GA (#25) — หลักการ #23 ข้อ 3 คือทุกหมวดที่โชว์ต้องมีของจริง |
| 6 | พ่วงรีวิวซ้ำ #20 / G9 (#21) | **ไม่พ่วง** คนละ vertical ทำให้ verify gate เบลอ ; ขนานได้ถ้าต้องการ throughput |

---

## Task list

ทำได้ทันทีขนานกัน: **T1, T2, T4** + งานผู้ใช้ **T14**

| # | ไฟล์ | ทำอะไร | agent | รอ |
|---|---|---|---|---|
| T1 | `src/app/[locale]/layout.tsx` | `<Script id="cookieyes" strategy="beforeInteractive" src={...}/>` อ่าน `process.env.NEXT_PUBLIC_COOKIEYES_ID` **ในตัว server layout เท่านั้น** ; ไม่มีค่า → ไม่เรนเดอร์อะไรเลย ; **ห้ามแตะ `src/app/admin/layout.tsx`** | nextjs-dev | — |
| T2 | `src/lib/ref-cookie.ts` | เพิ่ม `CONSENT_COOKIE = "cookieyes-consent"` + `hasAdvertisementConsent(value?: string)` เป็น pure function (parse `,advertisement:yes,`) แยกออกมาเพื่อให้ทดสอบ/รีวิวได้ | nextjs-dev | — |
| T3 | `src/proxy.ts:16-27` | `applyRefCookie()` ตั้ง `kkd_ref` **ก็ต่อเมื่อ** `hasAdvertisementConsent()` จริง + เพิ่ม `httpOnly: true` ; **ห้าม `res.cookies.delete()`** ของเก่า (มติ #23 ข้อ 3 ปล่อยหมดอายุเอง) ; คอมเมนต์อธิบายว่าทำไมต้องเช็คที่นี่แทนให้ CookieYes บล็อก (มันบล็อกได้เฉพาะ script ฝั่ง client) | nextjs-dev | T2 |
| T4 | `src/lib/seo.ts:7-16` | เพิ่ม `"cookiePolicy"` เข้า union `MetaKey` | nextjs-dev | — |
| T5 | `src/messages/{th,en}.json` | เพิ่ม `meta.cookiePolicyTitle`/`cookiePolicyDesc` + namespace เนื้อหาหน้า **ทั้งสองไฟล์** ; **ลบ** `footer.privacyPolicy` และ `footer.termsOfUse` ทั้งสองไฟล์ อย่าทิ้งไว้ลอย ๆ | nextjs-dev | T4 |
| T6 | `src/app/[locale]/cookie-policy/page.tsx` (ใหม่) | RSC ตาม pattern `contact/page.tsx` — `setRequestLocale()`, `pageMetadata(locale,"cookiePolicy","/cookie-policy")` แล้ว spread `robots:{index:false,follow:true}` ; ตาราง cookie ข้อเท็จจริง TH/EN (มติ 2) ; `py-16` ตาม convention ; **ไม่เพิ่มเข้า `src/app/sitemap.ts`** (noindex + sitemap ขัดกันเอง) | nextjs-dev | T4, T5 |
| T7 | `src/components/site/site-footer.tsx:143-152` | ลบ `<a href="#">` ของ privacyPolicy + termsOfUse ; cookiePolicy → `<Link href="/cookie-policy">` (import `Link` จาก `@/i18n/navigation` มีอยู่แล้วในไฟล์) ; `siteMap` คงเป็น `<a>` ตามเดิม | nextjs-dev | T6 |
| T8 | `scripts/e2e-channel-tracking.mts` | ทุกเคสที่คาด `kkd_ref` ต้อง `context.addCookies()` ตั้ง `cookieyes-consent` ที่มี `advertisement:yes` ก่อน + **เพิ่มเคส negative**: ไม่มี consent → ต้องไม่มี `kkd_ref` และ lead ที่ได้ต้อง fallback เป็น DIRECT | nextjs-dev | T3 |
| T9 | baseline | นับ lead ที่ `autoSourceChannelId` ไม่ null ใน 30 วันล่าสุด → คอมเมนต์ลง #26 (ไว้เทียบที่ 7/30 วัน — R2) | nextjs-dev | — |
| **G1** | gate | `i18n-parity-checker` — key ที่เพิ่มครบสองไฟล์ และ `privacyPolicy`/`termsOfUse` ถูกลบครบสองไฟล์ | i18n-parity-checker | T5 |
| **G2** | gate | verify skill เต็ม (ดูหัวข้อ Verification) | nextjs-dev | T1-T8 |
| **G3** | gate | `design-business-reviewer` บน local prod render — footer เหลือ 2 ลิงก์ยังสมดุลไหม, หน้า cookie-policy ทั้งสอง locale น่าเชื่อถือไหม | design-business-reviewer | G2 |
| T10 | deploy จังหวะ 1 | ตาม `docs/plans/kkd-shared-hosting-redeploy-runbook.md` — build ใน docker → **FTP upload ผู้ใช้รันเองผ่าน `!` เท่านั้น** → extract → touch restart ; **ยังไม่ใส่ env** | hosting-deploy-specialist | G3 |
| T11 | เปิดใช้งาน | ผู้ใช้ใส่ `NEXT_PUBLIC_COOKIEYES_ID` ในแพเนล → touch restart → **รอ ≥5 นาที** ให้ ISR regenerate (R3) | **ผู้ใช้** | T10, T14 |
| T12 | verify production | view-source เห็น `cdn-cookieyes.com` มาก่อน `/_next/static/chunks/*` · `smoke-test-production.mts --check /th/cookie-policy` · ทดสอบมือสองทาง · กด **Verify** ในแดชบอร์ด | hosting-deploy-specialist + ผู้ใช้ | T11 |
| **G4** | gate | `design-business-reviewer` บนแบนเนอร์จริง — ทับ CTA ไหม, mobile, ปุ่มปฏิเสธเห็นชัดเท่ายอมรับไหม (PDPA) | design-business-reviewer | T12 |

**งานที่ agent ทำแทนไม่ได้ — ผู้ใช้ทำได้เลยตอนนี้ ขนานกับ T1-T9 (T14):**
1. **แก้โดเมนในแดชบอร์ด CookieYes จาก `http://www.kkdproperty.co.th` → `https://kkdproperty.co.th`** (ไม่มี www) — ถ้าไม่แก้ แบนเนอร์จะไม่ขึ้นและอาการเหมือน R3 ทุกประการ
2. **เช็คว่า Free plan มีสวิตช์ "reload after consent" ไหม** — คำตอบชี้ขาดว่าต้องทำ fallback `/api/ref` หรือไม่ (มติ 1)
3. ตั้งหมวด necessary + advertisement, แบนเนอร์ภาษาไทย, เพิ่ม `kkd_ref` เข้าหมวด advertisement ด้วยมือ (scan หาไม่เจอ เพราะตั้งจาก server)

**`audit-compliance-reviewer` ไม่ต้องเรียกในสปรินต์นี้** — ไม่แตะ `src/actions/` เลย ไม่มี mutation/audit snapshot ใหม่ ; การ์ด `/admin` ใน `src/proxy.ts:32-42` เป็นคนละ branch กับ `applyRefCookie()` และไม่ถูกแตะ — ครอบด้วย `e2e-admin.mts` ใน verify skill แล้ว

**Commit plan** (หนึ่ง type ต่อคอมมิต ตาม Conventional Commits):
`feat(site): load the cookieyes banner when an id is configured` · `feat(site): gate the ref cookie behind advertisement consent` · `feat(site): add a cookie policy page` · `fix(site): drop footer links that go nowhere` · `test(e2e): cover consent-gated ref capture`

---

## ข้อเท็จจริงเชิงเทคนิคที่ยืนยันจากไฟล์จริงแล้ว — ไม่ต้องค้นซ้ำ

- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md:75` — `beforeInteractive` **ต้องอยู่ใน root layout เท่านั้น** และ `src/app/[locale]/layout.tsx` เป็น root layout จริง (owns `<html>`) → ใช้ได้
- `environment-variables.md:166` — `NEXT_PUBLIC_*` **ถูก inline ตอน build เฉพาะใน bundle ที่ส่งไป browser** ; ทดสอบแล้วว่าฝั่ง server อ่านค่า runtime จากแพเนลได้จริง (canonical บน production เป็น `https://kkdproperty.co.th/th` ทั้งที่ `.env` local เป็น `localhost:3000`) → กลยุทธ์ "deploy ก่อน ค่อยใส่ค่าทีหลัง" ใช้ได้ **ตราบใดที่อ่าน env ใน server component เท่านั้น ห้ามอ่านใน client component**
- `pageMetadata()` ใน `src/lib/seo.ts` รับ `MetaKey` เป็น union ปิด → หน้าใหม่ต้องเพิ่ม key ก่อน
- `src/app/admin/layout.tsx:21` เป็นที่เดียวในโปรเจกต์ที่ใช้ `robots:{index:false}` → ลอก pattern จากตรงนั้น
- `kkd_ref` มีผู้อ่านเดียวคือ `src/lib/ref-attribution.ts:24` (server)

## ความเสี่ยงที่เหลือ + วิธีลด

| | ความเสี่ยง | วิธีลด |
|---|---|---|
| R2 🟡 | ตัวเลข attribution ตกแล้วเถียงกันไม่ได้ว่าเพราะ consent หรือเพราะบั๊ก | T9 บันทึก baseline ก่อน deploy แล้วนับซ้ำที่ 7 และ 30 วัน |
| R3 🟡 | `[locale]/layout.tsx` เป็น prerender (`revalidate = 300`) → ใส่ env แล้วแบนเนอร์ไม่ขึ้นทันที แล้วสรุปผิดว่าพัง | T11 ระบุชัด: ใส่ env → touch → **รอ ≥5 นาที** ; เกิน 10 นาทีค่อยไปดู R4/R5 |
| R4 🟡 | โดเมนในแดชบอร์ดเป็น `www.` แต่เว็บจริงไม่มี `www` → script โหลดแต่แบนเนอร์ไม่ขึ้น อาการเหมือน R3 เป๊ะ | T14 ข้อ 1 แก้ **ก่อน** deploy ตัดตัวแปรนี้ทิ้ง |
| R5 🟡 | Next แทรก preload ของตัวเองก่อน → auto-blocking ของ CookieYes บล็อกไม่ทัน | verify ด้วย view-source จริง ; ถ้าลำดับผิด ลองเรนเดอร์ `<script>` ตรง ๆ (React 19 hoist ให้) เทียบกับ `next/script` แล้วเลือกอันที่วางถูก — อยู่ไฟล์เดียวกัน สลับง่าย |
| R7 🟢 | ทดสอบบน production ที่ไม่มี staging | **rollback = ลบค่า env var แล้ว touch** ไม่ต้อง deploy ซ้ำ — เขียนบรรทัดนี้ไว้ในคอมเมนต์ #26 ก่อน deploy ให้ผู้ใช้กดเองได้โดยไม่ต้องเรียก agent |

---

## Verification

**ก่อน deploy (local) — ตาม `.claude/skills/verify/SKILL.md`**

1. `npm run build` → ต้องได้ `✓ Compiled successfully` **และ** `Finished TypeScript` ไม่มี error
2. `npm run start` แล้ว:
   - `curl -s localhost:3000/th | grep -c cookieyes` → **ต้องเป็น 0** เมื่อไม่มี env (สวิตช์ปิดฉุกเฉินทำงาน)
   - `npx tsx scripts/e2e-booking.mts` → ผ่าน แปลว่าเว็บไม่พังเมื่อไม่มี env
   - ใส่ `NEXT_PUBLIC_COOKIEYES_ID` แล้ว build ใหม่ → view-source `/th` ต้องเห็น `cdn-cookieyes.com` **มาก่อน** `/_next/static/chunks/*`
   - `/th/cookie-policy` และ `/en/cookie-policy` → 200 ทั้งคู่ + `<meta name="robots" content="noindex">`
   - `curl -s localhost:3000/sitemap.xml | grep -c cookie-policy` → **ต้องเป็น 0**
   - footer ไม่มี `href="#"` เหลือเลย
3. `npx tsx scripts/e2e-channel-tracking.mts` → เขียวทั้งเคส **positive** (มี `cookieyes-consent` → มี `kkd_ref`) และ **negative** (ไม่มี consent → ไม่มี `kkd_ref`, lead เป็น DIRECT)
4. `npx tsx scripts/verify-all.mts` → เขียวทั้งชุด
5. `i18n-parity-checker` → ผ่าน

**หลัง deploy (production)**

```bash
curl -s https://kkdproperty.co.th/th | grep -c "cdn-cookieyes.com"     # ≥1
curl -sI "https://kkdproperty.co.th/th?ref=CH001" | grep -i set-cookie  # ต้องไม่มี kkd_ref
curl -s -o /dev/null -w "%{http_code}\n" https://kkdproperty.co.th/th/cookie-policy   # 200
npx tsx scripts/smoke-test-production.mts --check /th/cookie-policy
```

แล้วทดสอบมือด้วย browser: เปิด `https://kkdproperty.co.th/th?ref=<code>` → ยังไม่กด = ไม่มี `kkd_ref` → กดยอมรับ = **ต้องมี** `kkd_ref` (นี่คือข้อพิสูจน์ว่ามติ 1 ทำงาน) → ส่ง lead ทดสอบชื่อ `[TEST] ...` แล้วเช็คว่า `autoSourceChannelId` ติดจริง แล้วลบทิ้ง

## เกณฑ์ปิดสปรินต์

ครบทุกข้อข้างบน **บวก**:
- ปุ่ม **Verify ในแดชบอร์ด CookieYes ขึ้นเขียว** ← หลักฐานส่งมอบรายการที่ 7 ของใบเสนอราคา
- `design-business-reviewer` ผ่านบน production render จริง (G4) ไม่ใช่ mockup
- คอมเมนต์ปิดใน #26: baseline attribution (T9) + คำสั่ง rollback + สิ่งที่ต้องแจ้งลูกค้า (ต้องส่งเนื้อหา privacy policy + terms มา TH/EN, บัญชี CookieYes เป็นของลูกค้าเพื่อดูแลต่อหลังหมดประกัน)

**จงใจไม่ทำในสปรินต์นี้:** ร่างเนื้อหา privacy policy / terms (มติ #23 ข้อ 4 — ต้องมาจากฝ่ายกฎหมายลูกค้า) · อัปเป็น Basic plan เพื่อแบนเนอร์ EN (เปลี่ยนเงื่อนไขการเงินฝ่ายเดียว) · GA (#25) · UTM/gclid (#24) · G9 (#21) · รีวิวซ้ำ #20 · ล้าง `kkd_ref` เก่า (มติ #23 ข้อ 3)

---

## Go-live checklist (เพิ่มหลัง implement — สิ่งที่พิสูจน์แล้วบนเครื่องจริงและที่ review เจอ)

**ต้องทำในแดชบอร์ด CookieYes ก่อนใส่ env var** (agent ทำแทนไม่ได้ ต้องใช้ browser จริง)

1. แก้โดเมนจาก `http://www.kkdproperty.co.th` → `https://kkdproperty.co.th` (ไม่มี www) — ถ้าไม่แก้ แบนเนอร์ไม่ขึ้น และอาการแยกไม่ออกจาก "รอ ISR ไม่ครบ"
2. เช็คว่า Free plan มีสวิตช์ **"reload after consent"** ไหม — ถ้าไม่มี ต้องเขียน `/api/ref` route กู้ attribution (อนุมัติล่วงหน้าแล้ว)
3. **ปิดลิงก์ "Privacy Policy" ในแบนเนอร์ หรือชี้ไป `/th/cookie-policy`** — แบนเนอร์ CookieYes ตาม default มีลิงก์นี้ แต่เว็บไม่มีหน้า privacy policy แล้ว (ถอดออกตามมติ #23 ข้อ 4) ถ้าไม่ปิด จะได้แบนเนอร์ที่กดแล้ว 404 ตั้งแต่วันแรก
4. เปิดหมวด **necessary + advertisement** เท่านั้น ; เพิ่ม `kkd_ref` เข้าหมวด advertisement ด้วยมือ (scan หาไม่เจอ เพราะตั้งจาก server)
5. ยืนยันว่ามี **ปุ่มตั้งค่าคุกกี้ (revisit consent)** จริงบน Free plan — หน้านโยบายอ้างถึงปุ่มนี้ ถ้าไม่มีต้องแก้ข้อความ `cookiePolicy.manageBody` ทั้ง TH/EN (มีทางสำรอง "ลบคุกกี้ในเบราว์เซอร์" อยู่แล้ว จึงไม่ถึงกับใช้ไม่ได้)

**ลำดับตอนเปิดใช้งาน**

ใส่ `NEXT_PUBLIC_COOKIEYES_ID=ebaf06b6a5fed3292f124e8e29195a7c` ในแพเนล → touch `tmp/restart.txt` → **รอ ≥5 นาที แล้วโหลดหน้าสองครั้ง** (`revalidate = 300` — ครั้งแรกได้ของเก่าและสั่ง regenerate ครั้งที่สองถึงได้ของใหม่ ทดสอบยืนยันกลไกนี้บน local แล้ว) ตัดสินว่าพังก่อนครบเวลานี้คือตัดสินผิด

**Rollback:** ลบค่า env var → touch restart → รอ 5 นาที แบนเนอร์หายโดยไม่ต้อง deploy ซ้ำ

**Baseline attribution:** อ่านจาก `/admin/reports` บน production **ก่อน** deploy (MySQL ต่อจากข้างนอกไม่ได้ ตัวเลข dev DB เป็นขยะ e2e ใช้เทียบไม่ได้) แล้วเทียบซ้ำที่ 7 และ 30 วัน

**ยกออกเป็น ticket แยก:** #27 — Google Maps iframe บนหน้าติดต่อเราตั้งคุกกี้ third-party โดยไม่ขอความยินยอม (พบตอน design review ; หน้านโยบายแก้ถ้อยคำให้ตรงความจริงแล้ว แต่ตัวคุกกี้ยังถูกตั้งอยู่)
