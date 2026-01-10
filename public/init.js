// Initialize dynamic content and lead magnet logic
import { initDynamicContent, subscribeToNewsletter } from './dynamic-content.js?v=16';

console.log("init.js: Initialized (ES Module).");

function initNewsletter() {
    const modal = document.getElementById('newsletter-modal');
    // Triggers
    const triggers = [
        document.getElementById('newsletter-trigger'),
        document.getElementById('newsletter-trigger-mobile')
    ];
    const closeBtn = document.getElementById('newsletter-modal-close-btn');
    const backdrop = document.getElementById('newsletter-modal-close');
    const successView = document.getElementById('newsletter-success');

    // Forms
    const modalForm = document.getElementById('newsletter-form');
    const footerForm = document.getElementById('footer-newsletter-form');

    const openModal = () => {
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    };

    const closeModal = () => {
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            // Reset form and views
            if (modalForm) modalForm.classList.remove('hidden');
            if (successView) successView.classList.add('hidden');
            if (modalForm) modalForm.reset();
        }
    };

    triggers.forEach(t => t?.addEventListener('click', openModal));
    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);

    // Generic Handler
    const handleSubscription = async (e, formType) => {
        e.preventDefault();
        const form = e.target;

        let email, firstName = "", lastName = "";

        if (formType === 'modal') {
            email = document.getElementById('nl-email').value;
            firstName = document.getElementById('nl-first-name').value;
            lastName = document.getElementById('nl-last-name').value;
        } else {
            // Footer form usually just has email
            const emailInput = form.querySelector('input[type="email"]');
            email = emailInput ? emailInput.value : "";
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;

        try {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Sending...';

            // Use imported function directly
            const result = await subscribeToNewsletter(email, firstName, lastName);

            if (result.success) {
                if (formType === 'modal') {
                    form.classList.add('hidden');
                    if (successView) successView.classList.remove('hidden');
                    setTimeout(closeModal, 3000);
                } else {
                    // Success UI for footer
                    const footerContainer = form.parentElement;
                    const successUI = footerContainer.querySelector('.form-success-inline');
                    if (successUI) {
                        form.classList.add('hidden');
                        successUI.classList.remove('hidden');
                        setTimeout(() => {
                            successUI.classList.add('hidden');
                            form.classList.remove('hidden');
                            form.reset();
                        }, 5000);
                    } else {
                        // Fallback but better than alert
                        form.reset();
                        submitBtn.innerText = 'Thanks!';
                        setTimeout(() => { submitBtn.innerText = originalText; }, 3000);
                    }
                }
            } else {
                console.error("Subscription failed:", result.message);
                submitBtn.innerText = 'Error';
                setTimeout(() => { submitBtn.innerText = originalText; }, 3000);
            }
        } catch (err) {
            console.error("Newsletter Subscription Error:", err);
            submitBtn.innerText = 'Error';
            setTimeout(() => { submitBtn.innerText = originalText; }, 3000);
        } finally {
            submitBtn.disabled = false;
        }
    };

    modalForm?.addEventListener('submit', (e) => handleSubscription(e, 'modal'));
    footerForm?.addEventListener('submit', (e) => handleSubscription(e, 'footer'));
}

function initForms() {
    const modal = document.getElementById('form-modal');
    const content = document.getElementById('form-content');
    const successView = document.getElementById('form-success');

    const triggers = {
        'footer-submit-event': {
            title: 'Submit an Event',
            desc: 'Tell us what is happening in Bend.',
            fields: [
                { name: 'eventName', label: 'Event Name', type: 'text', placeholder: 'e.g. Mirror Pond Concert', required: true },
                { name: 'eventDate', label: 'Date', type: 'date', required: true },
                { name: 'venue', label: 'Venue/Location', type: 'text', placeholder: 'e.g. Drake Park', required: true },
                { name: 'description', label: 'Event Description', type: 'textarea', placeholder: 'Tell us more...', required: true },
                { name: 'submitterEmail', label: 'Your Email', type: 'email', placeholder: 'For confirmation', required: true }
            ]
        },
        'footer-partner': {
            title: 'Partner With Us',
            desc: 'Grow your business with Good Day Bend.',
            fields: [
                { name: 'bizName', label: 'Business Name', type: 'text', required: true },
                { name: 'contactName', label: 'Contact Name', type: 'text', required: true },
                { name: 'email', label: 'Email', type: 'email', required: true },
                { name: 'phone', label: 'Phone', type: 'tel' },
                { name: 'message', label: 'Tell us about your goals', type: 'textarea', required: true }
            ]
        },
        'footer-contact': {
            title: 'Contact Us',
            desc: 'How can we help you?',
            fields: [
                { name: 'name', label: 'Name', type: 'text', required: true },
                { name: 'email', label: 'Email', type: 'email', required: true },
                { name: 'subject', label: 'Subject', type: 'text', required: true },
                { name: 'message', label: 'Message', type: 'textarea', required: true }
            ]
        }
    };

    const openModal = (id) => {
        const config = triggers[id];
        if (!config || !modal) return;

        successView.classList.add('hidden');
        content.classList.remove('hidden');

        content.innerHTML = `
            <div class="flex flex-col items-center text-center mb-6">
                <h2 class="text-3xl font-black text-slate-900 dark:text-white mb-2">${config.title}</h2>
                <p class="text-slate-600 dark:text-slate-400">${config.desc}</p>
            </div>
            <form id="dynamic-form" class="space-y-4">
                <input type="hidden" name="formType" value="${config.title}">
                ${config.fields.map(f => `
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">${f.label}</label>
                        ${f.type === 'textarea' ? `
                            <textarea name="${f.name}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''}
                                class="w-full h-24 px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 transition-all"></textarea>
                        ` : `
                            <input type="${f.type}" name="${f.name}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''}
                                class="w-full h-12 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 transition-all">
                        `}
                    </div>
                `).join('')}
                <button type="submit"
                    class="w-full h-14 bg-primary hover:bg-green-400 text-[#0d1b12] font-black rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Submit
                </button>
            </form>
        `;

        const form = document.getElementById('dynamic-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.innerText;

            try {
                btn.disabled = true;
                btn.innerText = 'Sending...';

                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                // Call Firebase function
                const response = await fetch('https://us-central1-good-day-bend-v6.cloudfunctions.net/main?type=submit_form', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    content.classList.add('hidden');
                    successView.classList.remove('hidden');
                    setTimeout(closeModal, 4000);
                } else {
                    btn.innerText = 'Error';
                    setTimeout(() => { btn.innerText = originalText; }, 3000);
                }
            } catch (err) {
                console.error("Form error:", err);
                btn.innerText = 'Error';
                setTimeout(() => { btn.innerText = originalText; }, 3000);
            } finally {
                btn.disabled = false;
            }
        });

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    };

    Object.keys(triggers).forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => openModal(id));
    });

    // Reuse newsletter logic for simplicity or handle separately
    document.getElementById('footer-newsletter')?.addEventListener('click', () => {
        // Trigger the newsletter modal (if it was still there) 
        // Or just repurpose the new one
        const newsletterTrigger = document.getElementById('newsletter-trigger');
        if (newsletterTrigger) newsletterTrigger.click();
    });

    modal?.querySelector('.modal-close-btn')?.addEventListener('click', closeModal);
    modal?.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);
}

// Ensure DOM is ready before initializing
try {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log("init.js: DOMContentLoaded. calling initDynamicContent()...");
            initDynamicContent().catch(err => console.error("❌ initDynamicContent failed:", err));
            initNewsletter();
            initForms();
            initSEO();
        });
    } else {
        console.log("init.js: DOM ready. calling initDynamicContent()...");
        initDynamicContent().catch(err => console.error("❌ initDynamicContent failed:", err));
        initNewsletter();
        initForms();
        initSEO();
    }
} catch (e) {
    console.error("❌ Critical error in init.js execution:", e);
}

/**
 * Initializes Dynamic SEO Tags (Canonical)
 * Ensures search engines know the preferred domain is gooddaybend.com
 */
function initSEO() {
    const DOMAIN = 'https://gooddaybend.com';

    // 1. Get current clean path (remove index.html, trailing slashes)
    let path = window.location.pathname;
    if (path.endsWith('index.html')) path = path.replace('index.html', '');
    if (path.endsWith('/') && path.length > 1) path = path.slice(0, -1);

    // 2. Construct Canonical URL
    const search = window.location.search;
    const canonicalUrl = `${DOMAIN}${path}${search}`;

    // 3. Find or Create Canonical Link Tag
    let link = document.querySelector("link[rel='canonical']");
    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
    }
    link.setAttribute('href', canonicalUrl);

    console.log("SEO: Canonical set to", canonicalUrl);
}
