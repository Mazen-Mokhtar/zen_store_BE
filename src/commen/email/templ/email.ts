export function generateOTPEmail(otp, userName) {
  return `
<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome Email</title>
  <style>
    body {
      background-color: #1a1f2e;
      color: #ffffff;
      font-family: 'Segoe UI', Arial, sans-serif;
      padding: 20px;
    }
    .content {
      background: linear-gradient(135deg, #2c2f3e, #1a1f2e);
      padding: 30px;
      border-radius: 20px;
      text-align: center;
      max-width: 600px;
      margin: 0 auto;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
      border: 2px solid #bb86fc;
    }
    h2 {
      color: #bb86fc;
      font-size: 26px;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: bold;
    }
    .username {
      color: #ffcc00;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 10px;
      text-decoration: underline;
    }
    .otp {
      font-size: 22px;
      font-weight: bold;
      color: #00ffcc;
      background-color: rgba(0, 255, 204, 0.2);
      padding: 10px 20px;
      border-radius: 10px;
      display: inline-block;
      border: 2px dashed #00ffcc;
      letter-spacing: 3px;
    }
  </style>
</head>
<body>
  <div class="content">
    <h2>مرحبًا</h2>
    <div class="username">${userName}</div>
    <div class="otp">${otp}</div>
  </div>
</body>
</html>
    `;
}
