# VERTIGO — خطة التحول الكامل (نواة → مكتبة)

> الحالة: النواة F0-F3 تعمل (تحكم مباشر + تتبع + حلقة + تصفير). الهدف: هيكل مكتبة مغلق، ثم كيفريمز، ثم بريسات.

## 1. الهيكل المستهدف

```
VERTIGO/
├── CSXS/manifest.xml        # ثابت (لا يُلمس إلا لإصدار)
├── index.html               # هيكل فقط + <link> + <script> (بلا CSS/JS مضمن)
├── css/                     # نظام التصميم (HS Industrial Slate)
│   ├── tokens.css           # متغيرات فقط — مجمدة
│   ├── base.css             # reset/body/scrollbar/footer/status
│   ├── header.css           # الهيدر والشعار
│   ├── buttons.css          # .ibtn ومتغيراته والحالات
│   ├── forms.css            # inputs/labels/focus/disabled
│   ├── cards.css            # المجموعات والصفوف (prow/prow3/axis/rst/grst)
│   ├── debug.css            # درج السجل
│   └── panel.css            # @import بالترتيب أعلاه فقط — عقد التتالي
├── js/
│   ├── CSInterface.js       # vendor — ممنوع اللمس
│   ├── vrt-bridge.js        # البيئة + evalScript + الحالة (يسجل window.VRT)
│   ├── vrt-log.js           # السجل + الدرج + النسخ
│   ├── vrt-cam.js           # الزوايا + الحقول + القراءة/الكتابة + Build/Link/Read
│   ├── vrt-track.js         # الشريط + Track/Untrack + عرض الاسم
│   ├── vrt-rail.js          # سلايدرات + أزرار الحلقة الستة + المزامنة
│   ├── vrt-reset.js         # لقطات + ↺ فردي/جماعي
│   └── vrt.js               # المنسق فقط: inits بالترتيب (لا منطق فيه)
├── jsx/
│   ├── vrt-core.jsx         # مساعدات مشتركة فقط
│   ├── vrt-camera.jsx       # Ensure/Link/Get/Set + جدول الخصائص
│   ├── vrt-track.jsx        # Set/Clear/Status
│   ├── vrt-rail.jsx         # Build/Set/Get/Clear/Look/Focus/Plane + أدوات الشكل
│   └── hostscript.jsx       # 4 سطور #include — نقطة الدخول الوحيدة
├── icons/  README.md  .debug(dev)  docs/USER-GUIDE.md
```

## 2. سياسة الإغلاق (Freeze)

1. **API مجمد**: 16 دالة بتوقيعاتها — إضافة فقط، الكسر = نسخة رئيسية.
2. **التوكنز مجمدة**: أي لون جديد بتبرير موثق.
3. **الملكية**: كل وحدة JSX تملك طبقاتها/تعبيراتها — واللوحة المدخل الوحيد للكتابة.
4. **قالب الصف الواحد**: كلمة + سلايدر + خانة + ↺ — لا أنماط جديدة إلا لسبب.
5. **لغة الحالات**: `✓/!/…` + سطور `call → ok/err` — كل زر يتكلمها.

## 3. البوابات

- الهيكل: نفس السجلات الخضراء + `vrtPing` + صفر تغيير مرئي (سكرينشوت قبل/بعد).
- الكيفريمز: مفاتيح على السلايدرات + Bake + زرّا تجربة بسجل أخضر.
- البريسات: حفظ/تحميل `.vrt.json` ذهاباً وإياباً بلا فقدان.

## 5. مرجع تقني (محفوظ من خطة النواة — لا يتغير)

- Transform: `ADBE Transform Group` > Position/Anchor/Scale/Orientation/Rotate X·Y·Z/Opacity.
- Camera: `ADBE Camera Options Group` (**شقيق** Transform) > `ADBE Camera Zoom` / `ADBE Camera Focus Distance` / Aperture / Blur / Iris…/Highlight… (غير المؤكد يُرمَّد).
- الشكل: `ADBE Root Vectors Group` + بحث عميق (لا افتراض بنية).
- الجسر: `fn("a","b")` ← JSON string يدوي، guard + معاينة، throttle حي 120ms، سجل 80 مدخلاً.
- ES3 صارم + `valueAtTime(t,true)` بوسيطين + `setTemporalEaseAtKey` بعنصر واحد + أرقام التعبيرات بصيغة `-(n)`.
- Manifest 6.0 ثابت — الرفع قد يُخفي اللوحة.
- أي `property()` عبر مساعد مسمى يرمي خطأ مسمى — لا null مبهمة.

## 6. الترتيب

1. مجلد CSS + استخراج (هذه الدفعة) 2. تقسيم JSX 3. الكيفريمز 4. البريسات 5. الشحن (حذف .debug + نسخة + ZXP).
