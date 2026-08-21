const emailTemplate = ({ name, otp, expireMinutes = 10 }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">

<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Smart Playground OTP</title>

<style>

*{
margin:0;
padding:0;
box-sizing:border-box;
}

body{
background:#f3f6fb;
font-family:Arial,Helvetica,sans-serif;
padding:40px 15px;
}

.wrapper{
max-width:680px;
margin:auto;
background:#ffffff;
border-radius:22px;
overflow:hidden;
box-shadow:0 18px 45px rgba(0,0,0,.08);
}

.header{
background:linear-gradient(135deg,#22c55e,#15803d);
padding:60px 40px;
text-align:center;
}

.logo{
width:90px;
height:90px;
margin:auto;
border-radius:50%;
background:rgba(255,255,255,.15);
display:flex;
align-items:center;
justify-content:center;
font-size:42px;
margin-bottom:20px;
}

.brand{
font-size:34px;
font-weight:700;
color:#fff;
}

.subtitle{
margin-top:10px;
font-size:16px;
line-height:28px;
color:#dcfce7;
}

.content{
padding:50px;
}

.badge{
display:inline-block;
background:#dcfce7;
color:#15803d;
padding:8px 18px;
font-size:13px;
font-weight:bold;
border-radius:30px;
margin-bottom:25px;
}

.greeting{
font-size:18px;
font-weight:bold;
color:#111827;
margin-bottom:18px;
}

.heading{
font-size:34px;
font-weight:bold;
line-height:45px;
color:#111827;
margin-bottom:20px;
}

.description{
font-size:16px;
line-height:32px;
color:#4b5563;
margin-bottom:40px;
}

.otp-section{
background:#f8fffb;
border:1px solid #dcfce7;
border-radius:20px;
padding:40px;
text-align:center;
margin-bottom:40px;
}

.otp-title{
font-size:18px;
font-weight:bold;
color:#15803d;
margin-bottom:15px;
}

.otp{
display:inline-block;
padding:18px 35px;
background:#ffffff;
border:2px dashed #22c55e;
border-radius:16px;
font-size:42px;
font-weight:bold;
letter-spacing:14px;
color:#16a34a;
margin:20px 0;
}

.expire{
font-size:15px;
font-weight:bold;
color:#ef4444;
}

.note{
margin-top:15px;
font-size:14px;
line-height:26px;
color:#6b7280;
}
.security-box{
background:#fff8f8;
border:1px solid #fecaca;
border-left:6px solid #ef4444;
border-radius:18px;
padding:25px;
margin-bottom:40px;
}

.security-title{
font-size:20px;
font-weight:700;
color:#b91c1c;
margin-bottom:12px;
}

.security-text{
font-size:15px;
line-height:28px;
color:#555;
}

.features-title{
font-size:26px;
font-weight:700;
color:#111827;
margin-bottom:25px;
}

.feature-card{
background:#fff;
border:1px solid #e5e7eb;
border-radius:18px;
padding:22px;
margin-bottom:18px;
box-shadow:0 8px 18px rgba(0,0,0,.05);
}

.feature-icon{
font-size:34px;
margin-bottom:10px;
}

.feature-heading{
font-size:19px;
font-weight:700;
color:#111827;
margin-bottom:10px;
}

.feature-text{
font-size:15px;
line-height:28px;
color:#6b7280;
}

.button{
display:inline-block;
background:#16a34a;
color:#fff !important;
text-decoration:none;
padding:15px 35px;
border-radius:12px;
font-size:16px;
font-weight:700;
margin-top:25px;
}

.footer{
background:#f8fafc;
padding:35px;
text-align:center;
border-top:1px solid #e5e7eb;
}

.footer-title{
font-size:20px;
font-weight:700;
color:#111827;
margin-bottom:10px;
}

.footer-text{
font-size:14px;
line-height:26px;
color:#6b7280;
}

.copyright{
margin-top:20px;
font-size:13px;
color:#9ca3af;
line-height:24px;
}

@media only screen and (max-width:600px){

.content{
padding:30px 20px;
}

.brand{
font-size:28px;
}

.heading{
font-size:26px;
line-height:36px;
}

.otp{
font-size:30px;
letter-spacing:8px;
padding:18px 20px;
}

.logo{
width:70px;
height:70px;
font-size:34px;
}

}

</style>

</head>

<body>

<div class="wrapper">

<div class="header">

<div class="logo">
🏟️
</div>

<div class="brand">
Smart Playground
</div>

<div class="subtitle">
Book • Play • Compete
</div>

</div>

<div class="content">

<div class="badge">
EMAIL VERIFICATION
</div>

<div class="greeting">
Hello ${name},
</div>

<div class="heading">
Verify Your Email Address
</div>

<div class="description">
Thank you for joining <strong>Smart Playground</strong>.
Please use the verification code below to activate your account.
Do not share this code with anyone.
</div>

<div class="otp-section">

<div class="otp-title">
Your Verification Code
</div>

<div class="otp">
${otp}
</div>

<div class="expire">
Valid for ${expireMinutes} minutes
</div>

<div class="note">
If you didn't request this verification, you can safely ignore this email.
</div>

</div>
<div class="security-box">

<div class="security-title">
🔒 Keep Your Account Secure
</div>

<div class="security-text">
Never share this OTP with anyone. Smart Playground will never ask for your verification code through phone calls, SMS, WhatsApp, Messenger, or email.
If someone requests this code, please ignore the request immediately.
</div>

</div>

<div class="features-title">
Why Smart Playground?
</div>

<div class="feature-card">

<div class="feature-icon">
🏟️
</div>

<div class="feature-heading">
Book Playgrounds
</div>

<div class="feature-text">
Reserve football, cricket, and badminton playgrounds anytime with secure online booking and instant confirmation.
</div>

</div>

<div class="feature-card">

<div class="feature-icon">
🏆
</div>

<div class="feature-heading">
Join Tournaments
</div>

<div class="feature-text">
Register your team, pay tournament entry fees securely, receive QR passes, and follow live fixtures.
</div>

</div>

<div class="feature-card">

<div class="feature-icon">
👥
</div>

<div class="feature-heading">
Build Your Team
</div>

<div class="feature-text">
Invite teammates, manage players, organize squads, and compete to become champions.
</div>

</div>

<div style="text-align:center">

<a href="https://smartplayground.com" class="button">
Open Smart Playground
</a>

</div>

</div>

<div class="footer">

<div class="footer-title">
Smart Playground
</div>

<div class="footer-text">
Booking & Tournament Management System
</div>

<div style="margin-top:18px;font-size:26px">
⚽ 🏏 🏸
</div>

<div class="copyright">
© 2026 Smart Playground. All rights reserved.
<br><br>
This is an automated email. Please do not reply to this message.
</div>

</div>

</div>

</body>

</html>
`;
};

module.exports = emailTemplate;