# سيناريو استخدام الكوبونات في الفرونت إند - دليل شامل

## نظرة عامة
هذا الدليل يوضح كيفية تطبيق الكوبونات في جميع أنواع الطلبات المختلفة في النظام.

## أنواع طرق الدفع المدعومة
- `card` - الدفع بالبطاقة الائتمانية
- `cash` - الدفع نقداً
- `wallet-transfer` - التحويل عبر المحفظة الإلكترونية
- `insta-transfer` - التحويل عبر إنستاجرام
- `fawry-transfer` - التحويل عبر فوري

---

## السيناريو الأساسي لإنشاء طلب مع كوبون

### 1. إنشاء طلب جديد (Create Order)

**Endpoint:** `POST /order`

**Request Body:**
```json
{
  "gameId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "packageId": "64f1a2b3c4d5e6f7g8h9i0j2", // اختياري للألعاب غير Steam
  "accountInfo": [
    {
      "fieldName": "email",
      "value": "user@example.com"
    },
    {
      "fieldName": "password",
      "value": "userpassword123"
    }
  ],
  "paymentMethod": "card", // أو أي طريقة دفع أخرى
  "couponCode": "SAVE20", // الكوبون يُرسل هنا
  "note": "ملاحظة اختيارية"
}
```

**ما يحدث في الباك إند:**
1. التحقق من صحة الكوبون
2. حساب المبلغ الأصلي
3. تطبيق الخصم
4. حفظ الطلب مع تفاصيل الكوبون

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "64f1a2b3c4d5e6f7g8h9i0j3",
    "originalAmount": 100,
    "discountAmount": 20,
    "totalAmount": 80,
    "couponId": "64f1a2b3c4d5e6f7g8h9i0j4",
    "status": "pending"
  }
}
```

---

## السيناريوهات المختلفة حسب طريقة الدفع

### 2. الدفع بالبطاقة الائتمانية (Card Payment)

**الخطوات:**
1. إنشاء الطلب مع الكوبون (كما هو موضح أعلاه)
2. استدعاء checkout للحصول على Stripe session

**Checkout Endpoint:** `POST /order/{orderId}/checkout`

```json
// Request Headers
{
  "Authorization": "Bearer {jwt_token}"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionUrl": "https://checkout.stripe.com/pay/cs_...",
    "sessionId": "cs_test_...",
    "finalAmount": 80 // المبلغ بعد الخصم
  }
}
```

**في الفرونت إند:**
```javascript
// إنشاء الطلب
const createOrderResponse = await fetch('/api/order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    gameId: selectedGame.id,
    packageId: selectedPackage?.id,
    accountInfo: accountData,
    paymentMethod: 'card',
    couponCode: appliedCoupon // الكوبون المطبق
  })
});

const orderData = await createOrderResponse.json();

// الحصول على Stripe session
const checkoutResponse = await fetch(`/api/order/${orderData.data.orderId}/checkout`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const checkoutData = await checkoutResponse.json();

// توجيه المستخدم إلى Stripe
window.location.href = checkoutData.data.sessionUrl;
```

### 3. الدفع نقداً (Cash Payment)

**الخطوات:**
1. إنشاء الطلب مع الكوبون
2. عرض تفاصيل الطلب للمستخدم
3. انتظار موافقة الأدمن

```javascript
const createOrderResponse = await fetch('/api/order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    gameId: selectedGame.id,
    packageId: selectedPackage?.id,
    accountInfo: accountData,
    paymentMethod: 'cash',
    couponCode: appliedCoupon
  })
});

// عرض رسالة للمستخدم
showMessage({
  type: 'success',
  title: 'تم إنشاء الطلب بنجاح',
  message: `المبلغ المطلوب: ${orderData.data.totalAmount} جنيه (بعد خصم ${orderData.data.discountAmount} جنيه)`
});
```

### 4. التحويل عبر المحفظة الإلكترونية (Wallet Transfer)

**الخطوات:**
1. إنشاء الطلب مع الكوبون
2. رفع صورة التحويل مع رقم العملية

```javascript
// إنشاء الطلب
const createOrderResponse = await fetch('/api/order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    gameId: selectedGame.id,
    packageId: selectedPackage?.id,
    accountInfo: accountData,
    paymentMethod: 'wallet-transfer',
    couponCode: appliedCoupon
  })
});

const orderData = await createOrderResponse.json();

// رفع تفاصيل التحويل
const formData = new FormData();
formData.append('walletTransferNumber', transferNumber);
formData.append('walletTransferImage', imageFile);

const transferResponse = await fetch(`/api/order/${orderData.data.orderId}/wallet-transfer`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### 5. التحويل عبر إنستاجرام (Insta Transfer)

**الخطوات:**
1. إنشاء الطلب مع الكوبون
2. رفع صورة التحويل مع اسم المستخدم في إنستاجرام

```javascript
// إنشاء الطلب
const createOrderResponse = await fetch('/api/order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    gameId: selectedGame.id,
    packageId: selectedPackage?.id,
    accountInfo: accountData,
    paymentMethod: 'insta-transfer',
    couponCode: appliedCoupon
  })
});

const orderData = await createOrderResponse.json();

// رفع تفاصيل التحويل
const formData = new FormData();
formData.append('walletTransferNumber', '000'); // رقم وهمي للتحويل عبر إنستا
formData.append('nameOfInsta', instagramUsername);
formData.append('walletTransferImage', imageFile);

const transferResponse = await fetch(`/api/order/${orderData.data.orderId}/wallet-transfer`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### 6. التحويل عبر فوري (Fawry Transfer)

**الخطوات:**
1. إنشاء الطلب مع الكوبون
2. رفع صورة التحويل مع رقم العملية

```javascript
// إنشاء الطلب
const createOrderResponse = await fetch('/api/order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    gameId: selectedGame.id,
    packageId: selectedPackage?.id,
    accountInfo: accountData,
    paymentMethod: 'fawry-transfer',
    couponCode: appliedCoupon
  })
});

const orderData = await createOrderResponse.json();

// رفع تفاصيل التحويل
const formData = new FormData();
formData.append('walletTransferNumber', fawryTransferNumber);
formData.append('walletTransferImage', imageFile);

const transferResponse = await fetch(`/api/order/${orderData.data.orderId}/wallet-transfer`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

## التحقق من صحة الكوبون قبل الإرسال

```javascript
// التحقق من الكوبون قبل إنشاء الطلب
const validateCoupon = async (couponCode, gameId, packageId) => {
  try {
    const response = await fetch('/api/coupon/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        couponCode,
        gameId,
        packageId
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      return {
        valid: true,
        discount: result.data.discount,
        discountType: result.data.discountType
      };
    } else {
      return {
        valid: false,
        error: result.message
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: 'حدث خطأ في التحقق من الكوبون'
    };
  }
};
```

---

## معالجة الأخطاء المحتملة

### أخطاء الكوبون:
- `COUPON_NOT_FOUND` - الكوبون غير موجود
- `COUPON_EXPIRED` - الكوبون منتهي الصلاحية
- `COUPON_USAGE_LIMIT_EXCEEDED` - تم تجاوز حد الاستخدام
- `COUPON_NOT_APPLICABLE` - الكوبون غير قابل للتطبيق على هذا المنتج
- `USER_ALREADY_USED_COUPON` - المستخدم استخدم الكوبون من قبل

### مثال على معالجة الأخطاء:

```javascript
const handleCouponError = (error) => {
  const errorMessages = {
    'COUPON_NOT_FOUND': 'الكوبون غير موجود',
    'COUPON_EXPIRED': 'الكوبون منتهي الصلاحية',
    'COUPON_USAGE_LIMIT_EXCEEDED': 'تم تجاوز حد استخدام الكوبون',
    'COUPON_NOT_APPLICABLE': 'الكوبون غير قابل للتطبيق على هذا المنتج',
    'USER_ALREADY_USED_COUPON': 'لقد استخدمت هذا الكوبون من قبل'
  };
  
  return errorMessages[error] || 'حدث خطأ في تطبيق الكوبون';
};
```

---

## ملاحظات مهمة للفرونت إند

1. **التحقق من الكوبون:** يُفضل التحقق من صحة الكوبون قبل إنشاء الطلب لتحسين تجربة المستخدم

2. **عرض الخصم:** اعرض للمستخدم المبلغ الأصلي ومبلغ الخصم والمبلغ النهائي بوضوح

3. **حفظ الحالة:** احفظ معلومات الكوبون في الحالة المحلية لتجنب فقدانها

4. **التعامل مع الأخطاء:** تعامل مع جميع أنواع أخطاء الكوبون بشكل مناسب

5. **التحديث التلقائي:** حدث المبلغ النهائي تلقائياً عند تطبيق أو إزالة الكوبون

6. **التحقق من الصلاحية:** تحقق من صلاحية الكوبون بشكل دوري أثناء عملية الشراء

---

## مثال شامل لمكون React

```jsx
import React, { useState, useEffect } from 'react';

const OrderForm = ({ gameId, packageId }) => {
  const [couponCode, setCouponCode] = useState('');
  const [couponValid, setCouponValid] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('card');
  
  const validateCoupon = async () => {
    if (!couponCode) return;
    
    const result = await validateCoupon(couponCode, gameId, packageId);
    
    if (result.valid) {
      setCouponValid(true);
      setDiscount(result.discount);
      calculateFinalAmount(originalAmount, result.discount);
    } else {
      setCouponValid(false);
      setDiscount(0);
      setFinalAmount(originalAmount);
      alert(result.error);
    }
  };
  
  const calculateFinalAmount = (original, discountAmount) => {
    setFinalAmount(original - discountAmount);
  };
  
  const createOrder = async () => {
    const orderData = {
      gameId,
      packageId,
      accountInfo: getAccountInfo(),
      paymentMethod,
      couponCode: couponValid ? couponCode : undefined
    };
    
    // إنشاء الطلب...
  };
  
  return (
    <div className="order-form">
      {/* نموذج الطلب */}
      
      <div className="coupon-section">
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          placeholder="أدخل كود الكوبون"
        />
        <button onClick={validateCoupon}>تطبيق الكوبون</button>
      </div>
      
      {couponValid && (
        <div className="discount-info">
          <p>المبلغ الأصلي: {originalAmount} جنيه</p>
          <p>الخصم: {discount} جنيه</p>
          <p>المبلغ النهائي: {finalAmount} جنيه</p>
        </div>
      )}
      
      <select 
        value={paymentMethod} 
        onChange={(e) => setPaymentMethod(e.target.value)}
      >
        <option value="card">بطاقة ائتمانية</option>
        <option value="cash">نقداً</option>
        <option value="wallet-transfer">تحويل محفظة</option>
        <option value="insta-transfer">تحويل إنستاجرام</option>
        <option value="fawry-transfer">تحويل فوري</option>
      </select>
      
      <button onClick={createOrder}>إنشاء الطلب</button>
    </div>
  );
};

export default OrderForm;
```

هذا الدليل يغطي جميع السيناريوهات المطلوبة لاستخدام الكوبونات في النظام مع جميع طرق الدفع المختلفة.