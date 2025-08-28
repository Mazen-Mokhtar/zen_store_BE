# Steam Order Validation System

## نظام التحقق من طلبات ألعاب Steam

تم تطوير نظام شامل للتحقق من صحة البيانات المطلوبة عند إنشاء طلبات لألعاب Steam، مع التركيز على التأكد من وجود جميع الحقول المطلوبة والتحقق من صحة تنسيق البريد الإلكتروني.

## الميزات الجديدة

### 1. التحقق من الحقول المطلوبة (Required Fields Validation)
- يتم التحقق من وجود جميع الحقول المطلوبة في `accountInfoFields` قبل إنشاء الطلب
- يتم رفض الطلب إذا كان أي حقل مطلوب مفقود أو فارغ
- رسائل خطأ واضحة تحدد الحقول المفقودة

### 2. التحقق من تنسيق البريد الإلكتروني (Email Format Validation)
- يتم التحقق تلقائياً من صحة تنسيق البريد الإلكتروني لأي حقل يحتوي على كلمة "email"
- يستخدم regex pattern قوي للتحقق من صحة البريد الإلكتروني
- رسائل خطأ محددة لكل حقل بريد إلكتروني غير صحيح

### 3. التحقق من صحة الحقول (Field Validation)
- يتم التحقق من أن جميع الحقول المرسلة موجودة في `accountInfoFields` الخاصة باللعبة
- رفض الحقول غير المعرفة مع عرض الحقول الصحيحة المتاحة

## كيفية العمل

### 1. على مستوى DTO (Data Transfer Object)
```typescript
@IsValidAccountInfo({
    message: 'Account info validation failed. Please ensure all required fields are provided and email format is correct.'
})
accountInfo: AccountInfoDTO[];
```

### 2. على مستوى Service
```typescript
// التحقق من الحقول المطلوبة
if (game.type === GameType.STEAM && game.accountInfoFields) {
    const missingFields: string[] = [];
    for (const field of game.accountInfoFields) {
        if (field.isRequired) {
            const fieldExists = body.accountInfo.some(
                (info) => info.fieldName === field.fieldName && 
                         info.value && 
                         info.value.trim() !== ''
            );
            if (!fieldExists) {
                missingFields.push(field.fieldName);
            }
        }
    }
}
```

### 3. على مستوى Database Schema
```typescript
// Pre-save middleware في order.schema.ts
orderSchema.pre('save', async function (next) {
    // التحقق من صحة accountInfo مقابل gameAccountTypes
    const game = await this.model('Game').findById(this.gameId);
    // ... validation logic
});
```

## أمثلة الاستخدام

### مثال 1: طلب صحيح لعبة Steam
```json
POST /order
{
  "gameId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "accountInfo": [
    {
      "fieldName": "email",
      "value": "user@example.com"
    },
    {
      "fieldName": "Steam Username",
      "value": "mysteamuser"
    }
  ],
  "paymentMethod": "card"
}
```

### مثال 2: طلب خاطئ - حقل مطلوب مفقود
```json
POST /order
{
  "gameId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "accountInfo": [
    {
      "fieldName": "Steam Username",
      "value": "mysteamuser"
    }
  ],
  "paymentMethod": "card"
}
```
**Response:**
```json
{
  "statusCode": 400,
  "message": "Missing required account fields for Steam game: email",
  "error": "Bad Request"
}
```

### مثال 3: طلب خاطئ - تنسيق بريد إلكتروني غير صحيح
```json
POST /order
{
  "gameId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "accountInfo": [
    {
      "fieldName": "email",
      "value": "invalid-email"
    },
    {
      "fieldName": "Steam Username",
      "value": "mysteamuser"
    }
  ],
  "paymentMethod": "card"
}
```
**Response:**
```json
{
  "statusCode": 400,
  "message": "Invalid email format for field: email. Please provide a valid email address.",
  "error": "Bad Request"
}
```

## الملفات المضافة/المحدثة

### ملفات جديدة:
1. `src/modules/order/validators/email-format.validator.ts` - validator للتحقق من تنسيق البريد الإلكتروني
2. `src/modules/order/validators/account-info.validator.ts` - validator شامل للتحقق من accountInfoFields

### ملفات محدثة:
1. `src/modules/order/dto/index.ts` - إضافة التحقق الجديد
2. `src/modules/order/order.module.ts` - تسجيل الـ validators الجديدة
3. `src/modules/order/order.service.ts` - إضافة التحقق في createOrder method

## نمط التحقق من البريد الإلكتروني

```javascript
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
```

هذا النمط يتحقق من:
- وجود أحرف وأرقام ورموز مسموحة قبل @
- وجود @ واحد فقط
- وجود domain صحيح
- وجود extension بطول 2 أحرف على الأقل

## الأمان والحماية

1. **التحقق المتعدد المستويات**: يتم التحقق على مستوى DTO، Service، وDatabase Schema
2. **رسائل خطأ واضحة**: تساعد المطور والمستخدم على فهم المشكلة
3. **منع البيانات الخاطئة**: يتم رفض الطلبات التي تحتوي على بيانات غير صحيحة قبل الوصول للقاعدة
4. **التحقق من الصلاحيات**: يتم التأكد من أن الحقول المرسلة مطابقة لما هو مطلوب في اللعبة

## ملاحظات مهمة

- يتم تطبيق هذا التحقق فقط على ألعاب Steam
- التحقق من البريد الإلكتروني يتم تلقائياً لأي حقل يحتوي على كلمة "email" (غير حساس لحالة الأحرف)
- يمكن إضافة المزيد من أنماط التحقق للحقول الأخرى حسب الحاجة
- النظام متوافق مع البيانات الموجودة ولا يؤثر على الطلبات السابقة