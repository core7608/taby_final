# دليل رفع Taby على GitHub وبناء الإصدارات

## 🔑 مفاتيح التوقيع الرقمي (احتفظ بها في مكان آمن)

### Public Key (موجود في tauri.conf.json - لا بأس بمشاركته):
```
RhnhGTLYyattCRE7WCWcdh/FjYEw9MS/qvgAHr8YQiU=
```

### Private Key (للـ GitHub Secret فقط - لا تشاركه):
```
V6hfcxT7++sejelDs/wNL3fzEdbsvlIW27N32bJheTDhRkz6IIPdqDgh84+rZv6ksT6XutPb/i88VbQvxXeGlw==
```

---

## الخطوة 1: رفع الكود على GitHub

```bash
cd taby

# تهيئة git
git init
git add .
git commit -m "feat: Taby Browser v1.0.0 initial release"

# ربط بـ GitHub (غيّر YOUR_USERNAME)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/taby.git
git push -u origin main
```

---

## الخطوة 2: إضافة Secrets في GitHub

اذهب إلى: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| اسم الـ Secret | القيمة |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | (الـ Private Key من فوق) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | (اتركه فارغاً) |

---

## الخطوة 3: تفعيل GitHub Actions Permissions

اذهب إلى: **Settings → Actions → General → Workflow permissions**
- اختر: **Read and write permissions** ✅
- فعّل: **Allow GitHub Actions to create and approve pull requests** ✅

---

## الخطوة 4: بناء أول إصدار

```bash
# أنشئ tag لتشغيل الـ workflow
git tag v1.0.0
git push origin v1.0.0
```

بعدها اذهب إلى **Actions** في GitHub وشوف الـ build يشتغل!

---

## ✅ ما سيتم بناؤه تلقائياً:

| النظام | الملف |
|--------|-------|
| 🪟 Windows | `Taby_1.0.0_x64-setup.exe` + `Taby_1.0.0_x64.msi` |
| 🍎 macOS | `Taby_1.0.0_universal.dmg` |
| 🐧 Linux | `taby_1.0.0_amd64.deb` + `Taby_1.0.0_amd64.AppImage` |
| 🤖 Android | `app-debug.apk` |
| 🍏 iOS | `Taby.ipa` (يحتاج Apple Developer) |

---

## 🔄 كيف يعمل Auto-Update:

1. عند release جديد → ينشئ GitHub Actions ملف `latest.json`
2. المتصفح يفحص هذا الملف كل 4 ساعات
3. إذا وجد نسخة جديدة → يظهر بانر تحديث
4. المستخدم يضغط "تحديث الآن" → تنزيل وتثبيت وإعادة تشغيل

---

## ⚠️ للبناء المحلي على macOS:

```bash
# ضع الـ private key كـ environment variable
export TAURI_SIGNING_PRIVATE_KEY="V6hfcxT7++sejelDs/wNL3fzEdbsvlIW27N32bJheTDhRkz6IIPdqDgh84+rZv6ksT6XutPb/i88VbQvxXeGlw=="
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""

# بناء
npm run tauri:build
```

## ⚠️ للبناء المحلي على Windows:

```cmd
set TAURI_SIGNING_PRIVATE_KEY=V6hfcxT7++sejelDs/wNL3fzEdbsvlIW27N32bJheTDhRkz6IIPdqDgh84+rZv6ksT6XutPb/i88VbQvxXeGlw==
set TAURI_SIGNING_PRIVATE_KEY_PASSWORD=
npm run tauri:build
```
