# SuperAdmin Game Type and Price System

تم إضافة نظام النوع والسعر للعاب في SuperAdmin، حيث أن العاب Steam تتطلب سعراً إجبارياً.

## الأنواع المتاحة

- `steam` - للعاب Steam (تتطلب سعراً إجبارياً)
- `games` - للألعاب العامة (لا تتطلب سعراً)
- `subscription` - للاشتراكات (لا تتطلب سعراً)

## قواعد النظام

### للعاب Steam:
- **السعر إجباري** ويجب أن يكون أكبر من 0
- إذا لم يتم إدخال السعر أو كان 0، سيتم رفض الطلب

### للعاب أخرى:
- السعر اختياري
- يمكن ترك السعر فارغاً

## SuperAdmin API Endpoints

### إضافة لعبة جديدة

```json
POST /game/dashboard
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "name": "Counter-Strike 2",
  "description": "لعبة إطلاق نار تنافسية",
  "type": "steam",
  "price": 29.99,
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "accountInfoFields": [
    {
      "fieldName": "Steam Username",
      "isRequired": true
    },
    {
      "fieldName": "Steam Password", 
      "isRequired": true
    }
  ]
}
```

### تحديث لعبة

```json
PUT /game/dashboard/:gameId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Counter-Strike 2 Updated",
  "type": "steam",
  "price": 39.99
}
```

### حذف لعبة

```json
DELETE /game/dashboard/:gameId
Authorization: Bearer <token>
```

### رفع صورة للعبة

```json
PATCH /game/dashboard/:gameId/upload-image
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [image file]
```

### تبديل حالة اللعبة

```json
PATCH /game/dashboard/:gameId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "isActive": true
}
```

### تبديل حالة الشعبية

```json
PATCH /game/dashboard/:gameId/popular
Authorization: Bearer <token>
```

### قائمة العاب

```json
GET /game/dashboard?type=steam&status=active&isPopular=true
Authorization: Bearer <token>
```

## أمثلة على الاستخدام

### لعبة Steam (مع سعر إجباري)
```json
{
  "name": "Dota 2",
  "description": "لعبة MOBA شهيرة",
  "type": "steam",
  "price": 0,
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "accountInfoFields": [
    {
      "fieldName": "Steam Username",
      "isRequired": true
    }
  ]
}
```

### لعبة عادية (بدون سعر)
```json
{
  "name": "Minecraft",
  "description": "لعبة بناء وإبداع",
  "type": "games",
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "accountInfoFields": [
    {
      "fieldName": "Minecraft Username",
      "isRequired": true
    }
  ]
}
```

### اشتراك (بدون سعر)
```json
{
  "name": "Netflix Premium",
  "description": "اشتراك Netflix المميز",
  "type": "subscription",
  "categoryId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "accountInfoFields": [
    {
      "fieldName": "Email",
      "isRequired": true
    },
    {
      "fieldName": "Password",
      "isRequired": true
    }
  ]
}
```

## رسائل الخطأ

### خطأ: السعر مطلوب للعاب Steam
```json
{
  "statusCode": 400,
  "message": "Price is required and must be greater than 0 for Steam games"
}
```

### خطأ: اللعبة غير موجودة
```json
{
  "statusCode": 404,
  "message": "Game not found"
}
```

### خطأ: اللعبة موجودة مسبقاً
```json
{
  "statusCode": 400,
  "message": "Game already exists"
}
```

## Query Parameters للبحث

### البحث حسب النوع
```
GET /game/dashboard?type=steam
```

### البحث حسب الحالة
```
GET /game/dashboard?status=active
GET /game/dashboard?status=deleted
GET /game/dashboard?status=all
```

### البحث حسب الشعبية
```
GET /game/dashboard?isPopular=true
```

### البحث بالاسم
```
GET /game/dashboard?search=counter
```

### دمج معايير البحث
```
GET /game/dashboard?type=steam&status=active&isPopular=true&search=cs
```

## ملاحظات مهمة

1. **التحقق التلقائي**: النظام يتحقق تلقائياً من وجود السعر للعاب Steam
2. **التحديث**: عند تحديث نوع اللعبة إلى Steam، يجب إدخال السعر
3. **البحث**: يمكن البحث في العاب حسب النوع باستخدام `?type=steam`
4. **الحماية**: جميع العمليات تتطلب صلاحيات SuperAdmin
5. **التوافق**: النظام متوافق مع البيانات الموجودة
6. **الملفات**: يمكن رفع الصور مع إنشاء اللعبة أو تحديثها لاحقاً
7. **الحقول المطلوبة**: يمكن تحديد الحقول المطلوبة للمعلومات الحسابية لكل لعبة 