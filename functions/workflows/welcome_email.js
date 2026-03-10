const ghl = require('../lib/ghl');
const CONFIG = require('../config');

/**
 * Welcome Email Workflow
 * Sends a warm, engaging welcome email to new newsletter subscribers
 * 
 * TEST MODE: Set testMode: true to send to admin email only
 */

async function sendWelcomeEmail(contactId, email, firstName = '', testMode = true) {
    console.log(`📧 Preparing welcome email for ${email}...`);

    // Override email for testing
    const recipientEmail = testMode ? 'mdesautel@gmail.com' : email;
    const subjectPrefix = testMode ? '[TEST] ' : '';

    // Generate welcome email HTML
    const html = createWelcomeEmailHTML(firstName || 'Friend');

    try {
        await ghl.sendEmail({
            contactId: contactId,
            email: recipientEmail,
            subject: `${subjectPrefix}Welcome to Good Day Bend! 🌄`,
            message: `Welcome ${firstName}! We're excited to have you.`,
            html: html
        });

        console.log(`✅ Welcome email sent to ${recipientEmail}`);
        return { success: true, email: recipientEmail };
    } catch (error) {
        console.error('❌ Welcome email failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create beautiful HTML email template matching website quality
 */
function createWelcomeEmailHTML(firstName) {
    const now = new Date();
    const todayDate = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        /* Reset & Basics */
        body {
            margin: 0;
            padding: 0;
            background-color: #f6f8f6; /* background-light */
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0d1b12; /* text-slate-900 equivalent */
            -webkit-font-smoothing: antialiased;
        }
        table {
            border-spacing: 0;
            width: 100%;
        }
        td {
            padding: 0;
        }
        img {
            border: 0;
        }

        /* Container matching website width constraints */
        .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f6f8f6; /* background-light */
            padding-bottom: 40px;
        }
        .main-content {
            background-color: #ffffff; /* surface-light */
            margin: 0 auto;
            width: 100%;
            max-width: 600px;
            border: 1px solid #e2e8f0; /* slate-200 */
            border-radius: 12px; 
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        /* Header Logo Section - Matches Navbar */
        .header {
            padding: 24px;
            background-color: #ffffff; 
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
        }
        .logo-container {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
        }
        .logo-icon {
            width: 32px;
            height: 32px;
            background-color: #13ec5b; /* primary */
            border-radius: 8px; /* rounded-lg */
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo-symbol {
            color: #0d1b12;
        }
        .logo-text {
            color: #0d1b12; /* slate-900 */
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.025em;
            line-height: 1.2;
        }

        /* Hero Text */
        .hero {
            padding: 40px 24px;
            text-align: center;
            background-color: #ffffff;
        }
        .hero h1 {
            font-size: 36px;
            font-weight: 800;
            color: #0d1b12; /* slate-900 */
            margin: 0 0 10px 0;
            line-height: 1.1;
            letter-spacing: -0.025em;
        }
        .date {
            color: #4c9a66; /* green shade from footer */
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 20px;
        }

        /* Content Body */
        .body-text {
            padding: 0 30px 30px 30px;
            font-size: 16px;
            line-height: 1.6;
            color: #475569; /* slate-600 */
            background-color: #ffffff;
        }
        .greeting {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 16px;
            color: #0d1b12; /* slate-900 */
        }
        
        /* Features List w/ Green Icons */
        .features {
            background-color: #f8fafc; /* slate-50 */
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border: 1px solid #e2e8f0;
        }
        .feature-row {
            padding-bottom: 16px;
        }
        .feature-icon-box {
            width: 24px;
            vertical-align: top;
            padding-right: 12px;
            padding-top: 4px;
        }
        .feature-dot {
            height: 8px;
            width: 8px;
            background-color: #13ec5b;
            border-radius: 50%;
            display: inline-block;
        }
        .feature-content {
            font-size: 15px;
            line-height: 1.5;
            color: #475569; /* slate-600 */
        }
        .highlight {
            color: #0d1b12; /* bold text dark */
            font-weight: 700;
        }

        /* Button - Exact Website Style */
        .btn-container {
            text-align: center;
            margin: 32px 0;
        }
        .btn {
            background-color: #13ec5b; /* primary */
            color: #0d1b12; /* dark text */
            font-size: 14px;
            font-weight: 700;
            text-decoration: none;
            padding: 12px 32px;
            border-radius: 8px; /* rounded-lg */
            display: inline-block;
            transition: opacity 0.2s;
            box-shadow: 0 4px 6px -1px rgba(19, 236, 91, 0.4);
        }
        .btn:hover {
            background-color: #4ade80; /* green-400 */
        }

        /* Footer - Matches Website */
        .footer {
            background-color: #ffffff; 
            padding: 40px 24px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
        }
        .footer-logo {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 24px;
        }
        .footer-text {
            color: #4c9a66;
            font-size: 13px;
            line-height: 1.5;
            margin-bottom: 24px;
        }
        .social-link {
            display: inline-block;
            margin: 0 10px;
            color: #4c9a66;
            text-decoration: none;
        }
        .social-link svg {
            width: 24px;
            height: 24px;
            vertical-align: middle;
            fill: currentColor;
        }
        .social-link:hover {
            color: #13ec5b;
        }
        .legal {
            color: #94a3b8; /* slate-400 */
            font-size: 11px;
            margin-top: 24px;
        }
        .legal a {
            color: #64748b; /* slate-500 */
            text-decoration: none;
        }

        @media only screen and (max-width: 600px) {
            .hero h1 { font-size: 30px; }
            .body-text { padding: 0 20px 20px 20px; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <center>
            <div class="main-content">
                <!-- Logo Header -->
                <div class="header">
                    <a href="https://good-day-bend-v6.web.app" class="logo-container">
                        <div class="logo-icon">
                            <!-- SVG Landscape Icon from index.html -->
                            <span class="logo-symbol" style="font-family: 'Material Symbols Outlined', sans-serif; font-size: 20px;">⛰️</span>
                        </div>
                        <span class="logo-text">Good Day Bend</span>
                    </a>
                </div>

                <!-- Hero Section -->
                <div class="hero">
                    <p class="date">${todayDate}</p>
                    <h1>Welcome to the <span style="background: linear-gradient(to right, #13ec5b, #0b8e36); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Loop</span>!</h1>
                </div>

                <!-- Content -->
                <div class="body-text">
                    <p class="greeting">Hey ${firstName}! 👋</p>
                    
                    <p>We're so glad you're here. You just joined a community of Bend locals who start every morning with the scoop on what's happening in Central Oregon.</p>
                    
                    <p>No fluff. No spam. Just the good stuff, delivered to your inbox every morning at 7am.</p>

                    <!-- Features Box -->
                    <div class="features">
                        <table>
                            <tr class="feature-row">
                                <td class="feature-icon-box"><span class="feature-dot"></span></td>
                                <td class="feature-content"><span class="highlight">Daily Morning Updates</span><br>Fresh content everyday at 7am with local news & vibes.</td>
                            </tr>
                            <tr><td height="12"></td></tr>
                            <tr class="feature-row">
                                <td class="feature-icon-box"><span class="feature-dot"></span></td>
                                <td class="feature-content"><span class="highlight">Weekend Picks</span><br>Curated concerts, markets, and happenings.</td>
                            </tr>
                            <tr><td height="12"></td></tr>
                            <tr class="feature-row">
                                <td class="feature-icon-box"><span class="feature-dot"></span></td>
                                <td class="feature-content"><span class="highlight">Local Favorites</span><br>Spotlights on the best businesses & hidden gems.</td>
                            </tr>
                        </table>
                    </div>

                    <div class="btn-container">
                        <a href="https://good-day-bend-v6.web.app/daily-updates" class="btn">
                            READ TODAY'S UPDATE
                        </a>
                    </div>
                    
                    <p style="color: #4c9a66; font-size: 14px; text-align: center;">
                        See you tomorrow morning,<br>
                        <strong>The Good Day Bend Team</strong>
                    </p>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <div class="footer-logo">
                        <div class="logo-icon" style="width: 24px; height: 24px; border-radius: 6px;">
                           <span style="font-size: 14px;">⛰️</span>
                        </div>
                        <span style="color: #0d1b12; font-weight: 700; font-size: 16px; margin-left: 8px;">Good Day Bend</span>
                    </div>
                    
                    <p class="footer-text">
                        Connecting the community with the best events, businesses, and experiences in Bend, Oregon.
                    </p>
                    
                    <div style="margin: 20px 0;">
                        <a href="https://www.instagram.com/gooddaybend" class="social-link" target="_blank">
                           <!-- Correct Instagram SVG Path -->
                           <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path fill-rule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465 1.067-.047 1.407-.06 3.808-.06zm0 1.8c-2.67 0-2.977.01-4.042.059-.732.033-1.13.154-1.395.257-.354.138-.606.303-.868.566-.263.262-.428.514-.566.868-.103.265-.224.663-.257 1.394-.049 1.065-.059 1.372-.059 4.042 0 2.67.01 2.977.059 4.042.033.732.154 1.13.257 1.395.138.354.303.606.566.868.262.263.514.428.868.566.265.103.663.224 1.394.257 1.065.049 1.372.059-4.042-.059zm0 4.383a5.417 5.417 0 110 10.834 5.417 5.417 0 010-10.834zm0 1.8a3.617 3.617 0 100 7.234 3.617 3.617 0 000-7.234zm5.378-4.275a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clip-rule="evenodd" />
                           </svg>
                        </a>
                    </div>

                    <p class="legal">
                        You're receiving this because you subscribed to Good Day Bend.<br>
                        <a href="#">Unsubscribe</a>
                    </p>
                </div>
            </div>
        </center>
    </div>
</body>
</html>
    `;
}

module.exports = sendWelcomeEmail;
