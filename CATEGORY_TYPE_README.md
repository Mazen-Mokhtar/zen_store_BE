# Category Type Field

تم إضافة حقل `type` إلى Category schema لتصنيف الفئات حسب نوعها.

## الأنواع المتاحة

- `steam` - للفئات المتعلقة بـ Steam
- `games` - للفئات المتعلقة بالألعاب العامة
- `subscription` - للفئات المتعلقة بالاشتراكات

## كيفية الاستخدام

### إنشاء فئة جديدة

```json
POST /category
{
  "name": "Steam Games",
  "type": "steam"
}
```

### تحديث فئة موجودة

```json
PATCH /category/update/:categoryId
{
  "name": "Updated Name",
  "type": "games"
}
```

### البحث حسب النوع

```json
GET /category/AllCategory?type=steam
```

### البحث حسب الاسم والنوع معاً

```json
GET /category/AllCategory?name=steam&type=steam
```

## ملاحظات

- إذا لم يتم تحديد `type` عند الإنشاء، سيتم تعيين القيمة الافتراضية `games`
- حقل `type` إجباري في الـ schema ولكن اختياري في الـ DTO للتوافق مع البيانات الموجودة
- يمكن البحث في الفئات حسب النوع باستخدام query parameter `type` 