import { db } from './firebase-config.js';
import { collection, getDocs, query, limit, orderBy, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const DEFAULT_IMAGE = "https://placehold.co/600x400/102216/13ec5b?text=Good+Day+Bend&font=montserrat";

// MOCK DATA (Fallback if Firebase is empty or fails)
const MOCK_EVENTS = [
    {
        id: "1",
        title: "Pine Mountain Pedal Fest",
        category: "Sports",
        image: "https://images.unsplash.com/photo-1533174072545-e8d4aa97d848?w=800",
        description: "Join hundreds of riders for a weekend of trails, camping, and good times.",
        date: "2025-10-12",
        featured: true
    },
    {
        id: "2",
        title: "Riverfront Music Series",
        category: "Music",
        image: "https://images.unsplash.com/photo-1501612780327-45045538702b?w=800",
        description: "An evening of live music under the stars at the amphitheater.",
        date: "2025-10-14",
        featured: true
    },
    {
        id: "3",
        title: "Downtown Farmer's Market",
        category: "Food & Drink",
        image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800",
        description: "Discover local produce, artisanal goods, and delicious street food.",
        date: "2025-10-18",
        featured: true
    }
];

// ... (existing code)

// Helper for robust date parsing (Strings or Timestamps)
const parseEventDate = (val) => {
    if (!val) return null;
    if (val.seconds) return new Date(val.seconds * 1000); // Firestore Timestamp

    // Handle YYYY-MM-DD String (Force Local Midnight)
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        // Append T00:00:00 to force local time interpretation
        return new Date(val + 'T00:00:00');
    }

    return new Date(val); // Other formats or Fallback
};

// CALENDAR PAGE LOGIC
async function initCalendarPage() {
    const calendarContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-3');
    if (!calendarContainer) return;

    console.log("Initializing Calendar Page...");

    // 1. Fetch ALL Events
    // Reuse existing fetchEvents (maybe remove limit if needed, or fetch more)
    // For now, let's assume allEventsData is populated by main init
    if (allEventsData.length === 0) {
        allEventsData = await fetchEvents();
    }

    // 2. Setup Filter Listeners
    setupCalendarFilters();

    // 3. Initial Render (Default: Today onwards)
    calendarEventsVisibleCount = 10;

    // Load More Listener
    const loadMoreBtn = document.getElementById('load-more-calendar-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            calendarEventsVisibleCount += 10;
            filterAndRenderCalendarEvents();
        });
    }

    filterAndRenderCalendarEvents();
}

function setupCalendarFilters() {
    // Date Radios
    const dateRadios = document.querySelectorAll('input[name="date"]');
    dateRadios.forEach(r => r.addEventListener('change', () => {
        // Clear specific date input if it exists
        const dateInput = document.querySelector('input[type="date"]');
        if (dateInput) dateInput.value = '';

        calendarEventsVisibleCount = 10;
        filterAndRenderCalendarEvents();
    }));

    // Category Buttons
    const catContainer = document.getElementById('calendar-category-filter');
    if (catContainer) {
        const catBtns = catContainer.querySelectorAll('button');
        catBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Toggle active state
                catBtns.forEach(b => {
                    b.classList.remove('bg-primary', 'text-text-dark', 'border-primary');
                    b.classList.add('bg-white', 'text-gray-600', 'border-border-light');
                });
                e.target.classList.remove('bg-white', 'text-gray-600', 'border-border-light');
                e.target.classList.add('bg-primary', 'text-text-dark', 'border-primary');

                calendarEventsVisibleCount = 10;
                filterAndRenderCalendarEvents();
            });
        });
    }

    // Location Checkboxes
    const locCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    locCheckboxes.forEach(cb => cb.addEventListener('change', () => {
        calendarEventsVisibleCount = 10;
        filterAndRenderCalendarEvents();
    }));

    // Specific Date Input
    const dateInput = document.querySelector('input[type="date"]');
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            // Uncheck other date radios to avoid confusion visually (optional but good UX)
            // Actually, we can keep them checked but let the input override in logic, 
            // OR uncheck them. Let's uncheck them so it's clear.
            const dateRadios = document.querySelectorAll('input[name="date"]');
            dateRadios.forEach(r => r.checked = false);

            calendarEventsVisibleCount = 10;
            filterAndRenderCalendarEvents();
        });
    }
}

function filterAndRenderCalendarEvents() {
    const container = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-3');
    if (!container) return; // Silent return

    let filtered = [...allEventsData];

    // 1. Date Filter
    // 1. Date Filter
    const selectedDateRadio = document.querySelector('input[name="date"]:checked');
    const dateInputVal = document.querySelector('input[type="date"]')?.value; // Get specific date

    // Check specific date input FIRST
    if (dateInputVal) {
        const targetDate = parseEventDate(dateInputVal);
        if (targetDate) {
            targetDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter(e => {
                const d = parseEventDate(e.eventDate || e.date);
                if (!d) return false;
                d.setHours(0, 0, 0, 0);
                return d.getTime() === targetDate.getTime();
            });
        }
    }
    // Otherwise check radios
    else if (selectedDateRadio) {
        const labelText = selectedDateRadio.nextElementSibling.innerText.trim();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (labelText === 'Any Date') {
            // Show Upcoming (Today + Future)
            filtered = filtered.filter(e => {
                const d = parseEventDate(e.eventDate || e.date);
                if (!d) return false;
                // Keep if date is >= today (midnight)
                return d >= today;
            });

        } else if (labelText === 'Today') {
            filtered = filtered.filter(e => {
                const d = parseEventDate(e.eventDate || e.date);
                if (!d) return false;
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            });
        } else if (labelText === 'This Weekend') {
            const currentDay = today.getDay(); // 0 is Sunday, 6 is Saturday
            const diffToSaturday = (6 - currentDay + 7) % 7;
            // If today is Sunday (0), diff is 6... wait. 
            // If today is Saturday (6), diff is 0.
            // If today is Friday (5), diff is 1.

            // Logic: Weekend is Saturday and Sunday. 
            // If today is Sunday, "This Weekend" probably means TODAY (Sunday).

            const nextSaturday = new Date(today);
            nextSaturday.setDate(today.getDate() + diffToSaturday);
            nextSaturday.setHours(0, 0, 0, 0);

            const nextSunday = new Date(nextSaturday);
            nextSunday.setDate(nextSaturday.getDate() + 1);
            nextSunday.setHours(23, 59, 59, 999); // End of Sunday

            filtered = filtered.filter(e => {
                const d = parseEventDate(e.eventDate || e.date);
                if (!d) return false;
                // Check if it falls between Sat 00:00 and Sun 23:59
                // Note: if today is Monday, we show next Sat/Sun.
                // If today is Saturday, we show Today and Tomorrow.
                // If today is Sunday, we show Today. (Usually)

                // Let's refine:
                // If today IS Saturday or Sunday, "This Weekend" includes today.
                // If today is weekday, it's the upcoming Sat/Sun.

                // My calculation above finds NEXT Saturday. 
                // If today is Sunday (0), (6-0+7)%7 = 6. Sat + 6 days = Next Saturday. 
                // That might be wrong if "This Weekend" implies "Remaining weekend".
                // But typically users mean the *entire* weekend event set or upcoming.

                // Let's stick to "upcoming Saturday and Sunday" (or today if today is Sat/Sun).

                return d >= nextSaturday && d <= nextSunday;
            });
        }
    }

    // 2. Category Filter
    const activeCatBtn = document.querySelector('.bg-white.p-5.rounded-xl button.bg-primary');
    if (activeCatBtn && activeCatBtn.innerText !== 'All') {
        const cat = activeCatBtn.innerText;
        filtered = filtered.filter(e => (e.category && e.category.includes(cat)) || (e.tags && e.tags.includes(cat)));
    }

    // 3. Location Filter
    const checkedLocs = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.nextElementSibling.innerText.trim());
    if (checkedLocs.length > 0) {
        filtered = filtered.filter(e => {
            // Rough match on location string
            if (!e.location && !e.venue) return false;
            const openSearch = (e.location || "") + " " + (e.venue || "");
            return checkedLocs.some(loc => openSearch.toLowerCase().includes(loc.toLowerCase()));
        });
    }

    // Sort by Date
    filtered.sort((a, b) => {
        const da = parseEventDate(a.eventDate || a.date);
        const db = parseEventDate(b.eventDate || b.date);
        if (!da) return 1;
        if (!db) return -1;

        // Ascending (Soonest -> Future)
        return da - db;
    });

    // Pagination Slicing
    const totalEvents = filtered.length;
    const eventsToShow = filtered.slice(0, calendarEventsVisibleCount);

    // Toggle Load More Button
    const loadMoreBtn = document.getElementById('load-more-calendar-btn');
    if (loadMoreBtn) {
        console.log(`Calendar Pagination: showing ${calendarEventsVisibleCount} of ${totalEvents} events.`);
        if (totalEvents > calendarEventsVisibleCount) {
            loadMoreBtn.style.display = 'flex';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    // Render
    if (eventsToShow.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500">No events found matching your current filters.</div>`;
    } else {
        container.innerHTML = eventsToShow.map(createEventCard).join('');
    }
}


// RENDER FUNCTIONS

// GLOBAL STATE
let allEventsData = [];

// RENDER FUNCTIONS

function createEventCard(event) {
    // Fix "SCRAPED" Category
    let displayCategory = event.category;
    if (!displayCategory || displayCategory === 'SCRAPED') {
        if (event.tags && event.tags.length > 0) {
            displayCategory = event.tags[0];
        } else {
            displayCategory = 'General';
        }
    }

    // Image: Try imageUrl first (Firestore standard), then image, then default
    // Handle empty strings explicitly — '' is falsy but could slip through
    const rawImg = event.imageUrl || event.image;
    const eventImage = (rawImg && rawImg.length > 0) ? rawImg : DEFAULT_IMAGE;

    // Format Date - Handle both string dates and Firestore timestamps
    let dateStr = event.eventDate || event.date;
    let dateObj;

    if (!dateStr) {
        // No date available
        dateObj = null;
    } else if (dateStr.seconds) {
        // Firestore Timestamp object
        dateObj = new Date(dateStr.seconds * 1000);
    } else if (typeof dateStr === 'string') {
        // String date (YYYY-MM-DD format)
        // Correct for timezone offset if it's a pure YYYY-MM-DD string to avoid off-by-one errors
        if (dateStr.length === 10) {
            dateObj = new Date(dateStr + "T12:00:00");
        } else {
            dateObj = new Date(dateStr);
        }
    } else {
        // Fallback
        dateObj = new Date(dateStr);
    }

    let month = '';
    let day = 'TBD';

    if (dateObj && !isNaN(dateObj.getTime())) {
        month = dateObj.toLocaleString('default', { month: 'short' });
        day = dateObj.getDate();
    }

    return `
    <article class="group flex flex-col rounded-xl bg-white dark:bg-[#1a2e22] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 overflow-hidden border border-transparent hover:border-primary/30" onclick="window.location.href='/event-details?id=${event.id}'" style="cursor: pointer;">
        <div class="relative w-full aspect-video overflow-hidden">
            <div class="absolute top-3 left-3 bg-white/90 dark:bg-[#0d1b12]/90 backdrop-blur-sm rounded-lg px-3 py-1.5 flex flex-col items-center shadow-sm z-10 border border-black/5">
                <span class="text-xs font-bold text-text-secondary uppercase">${month}</span>
                <span class="text-xl font-black text-[#0d1b12] dark:text-white leading-none">${day}</span>
            </div>
            <div class="w-full h-full bg-center bg-cover transition-transform duration-700 group-hover:scale-105" style='background-image: url("${eventImage}");' onerror="this.style.backgroundImage='url(${DEFAULT_IMAGE})'"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
        </div>
        <div class="flex flex-col flex-1 p-5 gap-3">
            <div class="flex flex-col gap-1">
                <h3 class="text-[#0d1b12] dark:text-white text-xl font-bold leading-tight group-hover:text-primary transition-colors">${event.title}</h3>
                <div class="flex items-center gap-1 text-text-secondary dark:text-[#9abfaa] text-sm font-medium">
                    <span class="material-symbols-outlined text-[18px]">category</span>
                    ${displayCategory}
                </div>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">${event.description}</p>
            <div class="mt-auto pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                <span class="text-sm font-medium text-text-main dark:text-white flex items-center gap-1">
                    <span class="material-symbols-outlined text-[18px]">schedule</span> ${event.time || 'TBD'}
                </span>
                <button class="flex items-center justify-center rounded-lg h-9 px-4 bg-primary text-[#0d1b12] text-sm font-bold hover:bg-[#0fd651] transition-colors">
                    View Details
                </button>
            </div>
        </div>
    </article>
    `;
}

function createBlogCard(blog) {
    const mainImage = blog.image || blog.imageUrl || "https://visitbend.com/wp-content/uploads/2022/09/aerial-bend-fall-blog.jpg";
    const dateStr = blog.createdAt ? new Date(blog.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Recent";
    const category = blog.category || "General";

    // Extract snippet from HTML content logic
    let snippet = blog.description || "";
    if (!snippet && blog.content) {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = blog.content;
        snippet = tmp.textContent || tmp.innerText || "";
        snippet = snippet.substring(0, 100) + "...";
    }

    return `
    <article class="group card-hover flex flex-col overflow-hidden rounded-2xl bg-card-light shadow-sm dark:bg-card-dark h-full cursor-pointer" onclick="window.location.href='/blog-post?id=${blog.id}'">
        <div class="relative aspect-[16/10] overflow-hidden">
            <img alt="${blog.title}"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                src="${mainImage}" />
            <div class="absolute left-4 top-4 z-10 rounded-md bg-white/90 px-3 py-1 text-xs font-bold text-black backdrop-blur-sm">
                ${category}
            </div>
        </div>
        <div class="flex flex-1 flex-col p-6">
            <div class="mb-3 flex items-center gap-2 text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
                <span class="material-symbols-outlined text-[16px]">calendar_today</span>
                <time>${dateStr}</time>
            </div>
            <h3 class="mb-3 text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                ${blog.title}
            </h3>
            <p class="mb-4 flex-1 text-sm leading-relaxed text-text-secondary-light dark:text-gray-400">
                ${snippet}
            </p>
            <a class="inline-flex items-center text-sm font-bold text-primary hover:underline" href="/blog-post?id=${blog.id}">
                Read Article <span class="material-symbols-outlined ml-1 text-[18px]">arrow_right_alt</span>
            </a>
        </div>
    </article>
    `;
}

// FETCH FUNCTIONS

async function fetchEvents() {
    console.log("fetchEvents() called - Starting to fetch events...");
    console.log("Database instance:", db);
    const container = document.getElementById('featured-events-container');
    // if (container) container.style.border = "2px solid red"; // Debug removed

    try {
        console.log("Creating Firestore query for 'events' collection...");
        // FIX: Query events from today onwards, sorted ascending (soonest first)
        // This ensures the homepage calendar shows TODAY'S events, not just future ones
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

        const q = query(
            collection(db, "events"),
            where("eventDate", ">=", todayStr),
            orderBy("eventDate", "asc"),
            limit(100)  // Increased to cover 2 weeks of events
        );

        console.log("Executing getDocs() query...");
        const querySnapshot = await getDocs(q);
        const events = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            events.push({ id: doc.id, ...data });
        });

        console.log(`✓ Successfully fetched ${events.length} total events from Firestore.`);
        if (events.length > 0) {
            console.log("Sample event:", events[0]);
        }

        // Determine "upcoming" vs "past" logic if needed, but for now we just return all.

        // Update Cache
        if (events.length > 0) {
            localStorage.setItem('cachedEvents', JSON.stringify(events));
            localStorage.setItem('cachedEventsTimestamp', Date.now());
            console.log("✓ Events cached to localStorage");
        }

        return events;
    } catch (error) {
        console.error("❌ ERROR fetching events:", error);
        console.error("Error details:", error.message, error.code);
        return [];
    }
}

async function fetchBlogs() {
    console.log("📝 fetchBlogs() called...");
    try {
        let q;
        let blogs = [];

        // Strategy: Try sorted query first. If it fails (index missing), catch and use fallback.
        try {
            console.log("📝 Attempting sorted query for articles...");
            q = query(collection(db, "articles"), orderBy("createdAt", "desc"), limit(20));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                blogs = querySnapshot.docs.map(doc => {
                    const d = doc.data();
                    // Log date for debugging
                    // console.log(`Blog ${doc.id}: ${d.createdAt?.seconds}`);
                    return { id: doc.id, ...d };
                });
                console.log(`📝 Sorted query success. Fetched ${blogs.length} articles.`);
                return blogs;
            } else {
                console.log("📝 Sorted query returned empty.");
            }
        } catch (sortError) {
            console.warn("⚠️ createdAt sort failed (likely missing index). Falling back to basic fetch.", sortError);
        }

        // Fallback: Fetch without sort
        console.log("📝 Attempting fallback query (limit 20)...");
        q = query(collection(db, "articles"), limit(20));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            blogs.push({ id: doc.id, ...doc.data() });
        });

        console.log(`📝 Fallback fetch got ${blogs.length} articles.`);

        // Sort client-side
        // Prefer createdAt if available, else ID
        blogs.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            if (timeA && timeB) return timeB - timeA;
            return b.id.localeCompare(a.id);
        });

        console.log("📝 Client-side sort complete.");
        return blogs;

    } catch (error) {
        console.error("❌ Error fetching blogs:", error);
        return [];
    }
}

// FILTER FUNCTIONS

function filterEvents(category) {
    const container = document.getElementById('events-container');
    if (!container) return;

    // Update Active Button State
    const buttons = document.querySelectorAll('.text-center .btn-stitch');
    buttons.forEach(btn => {
        if (btn.id === `filter-${category.toLowerCase()}` || (category === 'All' && btn.id === 'filter-all')) {
            btn.style.background = 'var(--primary)';
            btn.style.borderColor = 'var(--primary)';
        } else {
            btn.style.background = 'transparent';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
        }
    });

    // Filter Data
    let filtered = allEventsData;
    if (category !== 'All') {
        filtered = allEventsData.filter(e => {
            // Check category OR tags
            const catMatch = e.category && e.category.toLowerCase().includes(category.toLowerCase());
            const tagMatch = e.tags && e.tags.some(t => t.toLowerCase().includes(category.toLowerCase()));
            return catMatch || tagMatch;
        });
    }

    // Render
    if (filtered.length === 0) {
        container.innerHTML = '<div style="color: white; text-align: center; grid-column: 1/-1;">No events found for this category.</div>';
    } else {
        container.innerHTML = filtered.map(createEventCard).join('');
    }
}


// MOCK_FAVORITES REMOVED - Fetching from Firestore


async function initFavorites() {
    const container = document.getElementById('favorites-container');
    if (!container) {
        console.warn("Favorites container not found.");
        return;
    }

    try {
        // Fetch from Firestore 'favorites' collection
        console.log("Fetching favorites from Firestore...");
        const q = query(collection(db, "favorites"));
        const querySnapshot = await getDocs(q);
        const favorites = [];

        querySnapshot.forEach((doc) => {
            favorites.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Fetched ${favorites.length} favorites.`);

        if (favorites.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center text-slate-500">No favorites found.</div>`;
            return;
        }

        // Shuffle / Randomize logic 
        // We want to show 4 random ones each time, or rotate daily. 
        // Let's do random shuffle for now to keep it dynamic on refresh.
        const shuffled = favorites.sort(() => 0.5 - Math.random());
        const displayFavorites = shuffled.slice(0, 4);

        container.innerHTML = displayFavorites.map(fav => `
            <div class="group relative rounded-xl overflow-hidden aspect-[4/5] cursor-pointer" onclick="window.open('${fav.websiteUrl}', '_blank')">
                <img alt="${fav.name}"
                    class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    src="${fav.image || DEFAULT_IMAGE}" 
                    onerror="this.src='${DEFAULT_IMAGE}'" />
                <div
                    class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end">
                    <a href="${fav.googleReviewsUrl}" target="_blank" onclick="event.stopPropagation()" 
                       class="inline-flex items-center gap-1 w-fit bg-white/10 backdrop-blur-md rounded-full px-2 py-1 text-primary text-sm font-bold mb-2 hover:bg-white/20 transition-colors">
                        <span class="material-symbols-outlined text-[16px] fill-current">star</span>
                        <span>${fav.rating || 5.0}</span>
                        <span class="text-xs text-slate-300 font-normal ml-1">(${fav.reviews || '100+'})</span>
                    </a>
                    <h3 class="text-xl font-bold text-white group-hover:text-primary transition-colors">${fav.name}</h3>
                    <p class="text-sm text-slate-300">${fav.category || 'Local Business'}</p>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("Error initializing favorites:", error);
        container.innerHTML = `<div class="col-span-full text-center text-red-500">Unable to load favorites.</div>`;
    }
}

// Global storage for filtering
let allDailyUpdates = [];
let allBlogPosts = [];

// Pagination State
let currentVisibleCount = 10;
let localEventsVisibleCount = 10;
let calendarEventsVisibleCount = 10;
let blogPostsVisibleCount = 6;
const PAGE_SIZE = 10;

/**
 * Render Daily Update Cards
 */
function renderDailyUpdates(updates) {
    const dailyContainer = document.getElementById('daily-updates-container');
    if (!dailyContainer) return;

    if (updates.length === 0) {
        dailyContainer.innerHTML = '<div class="p-4 text-center text-gray-500">No updates found for this topic.</div>';
    } else {
        dailyContainer.innerHTML = updates.map(createDailyUpdateCard).join('');
    }
}

/**
 * Setup Sidebar Filters for Daily Updates
 */
function setupDailyFilters() {
    const filterContainer = document.getElementById('daily-topics-filter');
    if (!filterContainer) return;

    const buttons = filterContainer.querySelectorAll('button');

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const topic = e.target.closest('button').innerText.trim(); // Handle icon click

            // 1. UI: Update Active State
            buttons.forEach(b => {
                b.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e7f3eb] text-text-main hover:bg-primary/20 text-xs font-medium transition-colors";
            });
            e.target.closest('button').className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-text-main text-xs font-bold transition-colors";

            // 2. Logic: Filter List
            if (topic === 'All') {
                renderDailyUpdates(allDailyUpdates.slice(0, currentVisibleCount));
                // Show load more button if we have more
                const loadMoreBtn = document.getElementById('load-more-updates-btn');
                if (loadMoreBtn) loadMoreBtn.style.display = allDailyUpdates.length > currentVisibleCount ? 'flex' : 'none';
            } else {
                // Keyword Mapping
                const keywords = {
                    'Traffic': ['traffic', 'road', 'closure', 'alert', 'snow', 'ice', 'drive', 'highway', 'cascade'],
                    'Business': ['business', 'market', 'shop', 'open', 'new', 'restaurant', 'food', 'store', 'launch'],
                    'Events': ['event', 'music', 'concert', 'stage', 'fest', 'live', 'show', 'tickets'],
                    'Weather': ['weather', 'forecast', 'temp', 'storm', 'sun', 'rain', 'wind', 'alert'],
                    'Outdoors': ['sky', 'trail', 'hike', 'run', 'river', 'mountain', 'park', 'ski', 'ride']
                };

                const terms = keywords[topic] || [topic.toLowerCase()];

                const filtered = allDailyUpdates.filter(u => {
                    const text = (u.title + " " + u.vibe + " " + (u.content || "")).toLowerCase();
                    return terms.some(t => text.includes(t));
                });

                renderDailyUpdates(filtered);
                // Hide load more on filtered views for simplicity (or implement filtered pagination later)
                const loadMoreBtn = document.getElementById('load-more-updates-btn');
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            }
        });
    });
}

function initLoadMoreUpdates() {
    const btn = document.getElementById('load-more-updates-btn');
    if (!btn) return;

    // Initial check
    if (allDailyUpdates.length <= currentVisibleCount) {
        btn.style.display = 'none';
    }

    btn.addEventListener('click', () => {
        // Increment visibility
        currentVisibleCount += PAGE_SIZE;

        // Re-render
        renderDailyUpdates(allDailyUpdates.slice(0, currentVisibleCount));

        // Hide if no more
        if (currentVisibleCount >= allDailyUpdates.length) {
            btn.style.display = 'none';
        }
    });
}

// NEW FETCH FOR DAILY UPDATES
// NEW FETCH FOR DAILY UPDATES
async function fetchDailyUpdates() {
    try {
        // Try standard sort first (Fetch 50 to support Load More)
        let q = query(collection(db, "daily_updates"), orderBy("publishedAt", "desc"), limit(50));

        try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const updates = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Cache logic
                if (updates.length > 0) {
                    localStorage.setItem('cachedDailyUpdates', JSON.stringify(updates));
                    localStorage.setItem('cachedDailyUpdatesVersion', '2');
                    localStorage.setItem('cachedDailyUpdatesTimestamp', Date.now());
                }
                return updates;
            }
        } catch (sortError) {
            console.warn("publishedAt sort failed (missing index or field), falling back to ID sort.");
        }

        // Fallback: ID Sort
        q = query(collection(db, "daily_updates"), limit(50));
        const querySnapshot = await getDocs(q);
        const updates = [];
        querySnapshot.forEach((doc) => {
            updates.push({ id: doc.id, ...doc.data() });
        });

        console.log("Fetched Updates with IDs:", updates.map(u => u.id));

        // Manual Sort by ID Descending (Newest first)
        updates.sort((a, b) => b.id.localeCompare(a.id));

        console.log(`Fetched ${updates.length} daily updates from Firestore.`);
        allDailyUpdates = updates; // Store globally

        // Cache logic
        if (updates.length > 0) {
            localStorage.setItem('cachedDailyUpdates', JSON.stringify(updates));
            localStorage.setItem('cachedDailyUpdatesVersion', '2');
            localStorage.setItem('cachedDailyUpdatesTimestamp', Date.now());
        }

        return updates;
    } catch (error) {
        console.error("Error fetching daily updates:", error);
        return [];
    }
}

// NEWSLETTER SUBSCRIPTION
async function subscribeToNewsletter(email, firstName, lastName) {
    if (!email) return { success: false, message: "Email is required." };

    try {
        // Use the relative path /main?type=subscribe which works due to firebase.json rewrite
        // OR acts as a direct call if on localhost (proxy needed) or just fails gracefully to CORS if using full URL
        const API_URL = 'https://us-central1-good-day-bend-v6.cloudfunctions.net/main?type=subscribe';

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, firstName, lastName })
        });

        if (response.ok) {
            return { success: true };
        } else {
            const text = await response.text();
            console.error("Subscription failed:", text);
            return { success: false, message: "Failed to subscribe. Please try again." };
        }
    } catch (error) {
        console.error("Subscription network error:", error);
        return { success: false, message: "Network error. Please try again." };
    }
}

function createDailyUpdateCard(update) {
    if (!update.id) console.warn("Daily Update Missing ID:", update);

    // Extract a title/snippet from HTML content if title is missing
    let title = update.title || "Daily Update";

    // CLEANUP: Remove "Good Day Bend:" prefix
    title = title.replace(/^Good Day Bend:\s*/i, "").trim();

    let snippet = update.description || "Click to read the latest update.";

    // CLEANUP: Remove "Good Day Bend:" from snippet if it appears at the start
    snippet = snippet.replace(/^Good Day Bend:\s*/i, "").trim();

    // Parse Date from ID or field and format as "January 19th"
    let dateStr = "Recent";
    if (update.id.startsWith("daily-")) {
        const rawDate = update.id.replace("daily-", "");
        // Parse the date (format: YYYY-MM-DD)
        const dateParts = rawDate.split("-");
        if (dateParts.length === 3) {
            const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            const month = dateObj.toLocaleString('default', { month: 'long' });
            const day = dateObj.getDate();
            // Add ordinal suffix (st, nd, rd, th)
            const getOrdinalSuffix = (n) => {
                if (n > 3 && n < 21) return 'th';
                switch (n % 10) {
                    case 1: return 'st';
                    case 2: return 'nd';
                    case 3: return 'rd';
                    default: return 'th';
                }
            };
            dateStr = `${month} ${day}${getOrdinalSuffix(day)}`;
        } else {
            dateStr = rawDate; // Fallback to raw date if parsing fails
        }
    }

    if (update.content && !update.description) {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = update.content;
        snippet = tmp.textContent || tmp.innerText || "";
        // CLEANUP: Remove "Good Day Bend:" from extracted content content
        snippet = snippet.replace(/^Good Day Bend:\s*/i, "").trim();
        snippet = snippet.substring(0, 150) + "...";
    }

    // Default Images based on content "vibe" or random if missing
    const image = update.image || update.imageUrl || "https://visitbend.com/wp-content/uploads/2022/09/aerial-bend-fall-blog.jpg";

    return `
    <a href="/daily-details?id=${update.id}" class="block group bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-primary/20 w-full text-left">
            <div class="flex flex-col sm:flex-row gap-5 h-full">
                <div class="shrink-0">
                    <div class="w-full sm:w-[160px] h-48 sm:h-[100px] rounded-lg bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style='background-image: url("${image}");'>
                    </div>
                </div>
                <div class="flex flex-1 flex-col justify-center min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-bold text-primary uppercase tracking-wider">Daily Update</span>
                        <span class="text-xs text-text-secondary">• ${dateStr}</span>
                    </div>
                    <h3 class="text-lg font-bold text-text-main mb-1 group-hover:text-primary transition-colors truncate">
                        ${title}
                    </h3>
                    <p class="text-text-secondary text-sm leading-relaxed line-clamp-2 break-words">
                        ${snippet}
                    </p>
                </div>
                <div class="hidden sm:flex items-center justify-center shrink-0 text-gray-300 group-hover:text-primary transition-colors self-center">
                    <span class="material-symbols-outlined text-3xl">chevron_right</span>
                </div>
            </div>
            </div>
    </a>
        `;
}


// Helper to render Featured Events (Home)
function renderFeaturedEvents() {
    const featuredContainer = document.getElementById('featured-events-container');
    if (!featuredContainer) return;

    // Strategy:
    // 1. Look for manually 'featured' events.
    // 2. If < 3, fill with events happening this coming weekend.
    // 3. If still < 3, fill with the soonest upcoming events.

    // Initialize Calendar Widget (needs all data)
    initCalendarWidget(allEventsData);

    const isThisWeekend = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const today = new Date();
        const nextSaturday = new Date(today);
        nextSaturday.setDate(today.getDate() + (6 - today.getDay())); // Next Saturday
        nextSaturday.setHours(0, 0, 0, 0);

        const nextSunday = new Date(nextSaturday);
        nextSunday.setDate(nextSunday.getDate() + 1); // Next Sunday
        nextSunday.setHours(23, 59, 59, 999);

        return d >= nextSaturday && d <= nextSunday;
    };

    let displayEvents = allEventsData.filter(e => e.featured);

    if (displayEvents.length < 3) {
        const weekendEvents = allEventsData.filter(e =>
            !displayEvents.includes(e) && isThisWeekend(e.eventDate || e.date)
        );
        const needed = 3 - displayEvents.length;
        displayEvents = displayEvents.concat(weekendEvents.slice(0, needed));
    }

    if (displayEvents.length < 3) {
        const upcoming = allEventsData.filter(e => !displayEvents.includes(e));
        const needed = 3 - displayEvents.length;
        displayEvents = displayEvents.concat(upcoming.slice(0, needed));
    }

    displayEvents = displayEvents.slice(0, 3);

    if (displayEvents.length > 0) {
        featuredContainer.innerHTML = displayEvents.map(createEventCard).join('');
    } else {
        console.log("No events to display in featured.");
        featuredContainer.innerHTML = '<div class="col-span-full text-center py-8 text-gray-500">No featured events at the moment.</div>';
    }
}

// Helper to render Featured Page Events (Next 3 Days)
function renderFeaturedPageEvents() {
    const container = document.getElementById('featured-page-container');
    if (!container) return;

    console.log("Rendering Featured Page Events (Next 3 Days)...");

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999); // End of 3rd day

    let displayEvents = allEventsData.filter(e => {
        const d = new Date(e.eventDate || e.date);
        return d >= now && d <= threeDaysFromNow;
    });

    // Sort by date ascending
    displayEvents.sort((a, b) => new Date(a.eventDate || a.date) - new Date(b.eventDate || b.date));

    // Limit to 3
    displayEvents = displayEvents.slice(0, 3);

    if (displayEvents.length > 0) {
        container.innerHTML = displayEvents.map(createEventCard).join('');
    } else {
        container.innerHTML = '<div class="col-span-full text-center py-8 text-gray-500">No events found in the next 3 days.</div>';
    }
}


/**
 * Initialize Hero Widget (Date & Weather)
 */
async function initHeroWidget() {
    // 1. Set Date
    const dateEl = document.getElementById("hero-date");
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString("en-US", options);
    }

    // 2. Fetch Weather (Bend, OR)
    const weatherEl = document.getElementById("hero-weather");
    const iconEl = document.getElementById("hero-weather-icon");

    if (weatherEl && iconEl) {
        try {
            // Open-Meteo API (Free, no key needed)
            const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=44.0582&longitude=-121.3153&current=temperature_2m,weather_code&temperature_unit=fahrenheit");
            const data = await response.json();

            if (data.current) {
                const temp = Math.round(data.current.temperature_2m);
                const code = data.current.weather_code;

                // Map Code to Description & Icon
                let condition = "Sunny";
                let icon = "sunny";

                // WMO Weather Codes
                if (code >= 1 && code <= 3) { condition = "Partly Cloudy"; icon = "partly_cloudy_day"; }
                else if (code >= 45 && code <= 48) { condition = "Foggy"; icon = "foggy"; }
                else if (code >= 51 && code <= 67) { condition = "Rainy"; icon = "rainy"; }
                else if (code >= 71 && code <= 77) { condition = "Snowy"; icon = "weather_snowy"; }
                else if (code >= 80 && code <= 82) { condition = "Showers"; icon = "rainy"; }
                else if (code >= 85 && code <= 86) { condition = "Snow Showers"; icon = "weather_snowy"; }
                else if (code >= 95) { condition = "Thunderstorm"; icon = "thunderstorm"; }

                weatherEl.textContent = `${temp}°F ${condition} `;
                iconEl.textContent = icon;
            }
        } catch (error) {
            console.error("Weather fetch failed:", error);
            weatherEl.textContent = "Bend, OR";
        }
    }
}

// MAIN INIT
async function initDynamicContent() {
    console.log("Initializing Dynamic Content...");

    // SHARED STATE VARIABLES
    let allEventsData = [];
    let allBlogPosts = [];
    let activeBlogCategory = 'All';
    let blogPostsVisibleCount = 6;

    initHeroWidget(); // Run Hero Widget
    initFavorites(); // Run Local Favorites
    initMobileMenu(); // Run Mobile Menu Logic

    // --- EVENTS CACHING & FETCHING ---
    const cachedEvents = localStorage.getItem('cachedEvents');
    let eventsLoadedFromCache = false;

    if (cachedEvents) {
        try {
            const parsed = JSON.parse(cachedEvents);
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.log(`[Cache] Loaded ${parsed.length} events.`);
                allEventsData = parsed;
                eventsLoadedFromCache = true;

                // Render UI immediately with cache
                renderFeaturedEvents();
                if (document.getElementById('events-container')) filterEvents('All');
                if (document.getElementById('local-events-container')) await initLocalEventsPage();
                if (document.getElementById('featured-page-container')) renderFeaturedPageEvents();
                // Note: initCalendarPage() and initHomeCalendar() will be called after fresh fetch to avoid double-init
            }
        } catch (e) {
            console.error("Cache parse error (events):", e);
        }
    }

    // Fetch Fresh Events (Background / Revalidate)
    fetchEvents().then(async (events) => {
        allEventsData = events;
        // Re-render UI with fresh data
        renderFeaturedEvents();
        if (document.getElementById('events-container')) filterEvents('All');
        if (document.getElementById('local-events-container')) await initLocalEventsPage();
        if (document.getElementById('featured-page-container')) renderFeaturedPageEvents();
        await initCalendarPage();
        await initHomeCalendar();

        // Setup listeners if not already done? 
        // filterEvents and initCalendarPage sets up listeners. 
        // We should ensure we don't duplicate listeners. 
        // But the init functions usually just attach if elements exist.
        // Ideally we should have separate setupListeners() vs render().

        // For 'Events Page' (filterEvents), it attaches listeners every time initDynamicContent runs?
        // No, initDynamicContent runs ONCE per page load.
        // But here we are calling the render helpers twice.
        // We moved listener attachment to AFTER this block in original code.
        // Let's ensure listeners are attached only once.
    });


    // --- DAILY UPDATES CACHING & FETCHING ---
    const dailyContainer = document.getElementById('daily-updates-container');
    const heroDailyBtn = document.getElementById('hero-daily-btn');

    // Helper to update hero button
    const updateHeroDailyButton = (latestUpdate) => {
        if (heroDailyBtn && latestUpdate) {
            heroDailyBtn.href = `/daily-details?id=${latestUpdate.id}`;
            heroDailyBtn.innerHTML = `
                <span class="material-symbols-outlined">newspaper</span>
                Today's Update
            `;
        }
    };


    if (dailyContainer || heroDailyBtn) {
        // Cache version - increment this when data structure or formatting changes
        const CACHE_VERSION = '2'; // Changed from '1' to force cache refresh for date formatting update
        const cachedUpdates = localStorage.getItem('cachedDailyUpdates');
        const cachedVersion = localStorage.getItem('cachedDailyUpdatesVersion');
        let updatesLoadedFromCache = false;

        if (cachedUpdates && cachedVersion === CACHE_VERSION) {
            try {
                const parsed = JSON.parse(cachedUpdates);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`[Cache v${CACHE_VERSION}] Loaded ${parsed.length} daily updates.`);
                    allDailyUpdates = parsed;
                    updatesLoadedFromCache = true;

                    renderDailyUpdates(allDailyUpdates.slice(0, 10));
                    setupDailyFilters();
                    initLoadMoreUpdates();
                    initEventMap(allEventsData, allDailyUpdates);

                    // Update Hero Button from Cache
                    if (allDailyUpdates.length > 0) updateHeroDailyButton(allDailyUpdates[0]);
                }
            } catch (e) { console.error("Cache parse error (updates):", e); }
        } else {
            if (cachedVersion && cachedVersion !== CACHE_VERSION) {
                console.log(`[Cache] Version mismatch (${cachedVersion} vs ${CACHE_VERSION}), clearing old cache`);
                localStorage.removeItem('cachedDailyUpdates');
                localStorage.removeItem('cachedDailyUpdatesVersion');
            }
        }

        // Fetch Fresh Updates
        fetchDailyUpdates().then((dailyUpdates) => {
            allDailyUpdates = dailyUpdates;
            renderDailyUpdates(allDailyUpdates.slice(0, 10)); // Re-render

            // Update Hero Button from Fresh Data
            if (allDailyUpdates.length > 0) updateHeroDailyButton(allDailyUpdates[0]);

            // We can re-init filters/map if needed, or if cache was empty
            if (!updatesLoadedFromCache) {
                setupDailyFilters();
                initLoadMoreUpdates();
                initEventMap(allEventsData, dailyUpdates);
            }
        });
    } else {
        // Fallback Map Init (e.g. Calendar Page)
        const mapContainer = document.getElementById('event-map');
        if (mapContainer && window.L) {
            // If we have cache, we might have already inited map via events? 
            // Logic above for events called initLocalEventsPage, which calls initCalendarPage.
            // Map is in Sidebar?
            // If map is present but NOT on daily-updates page.
            initEventMap(allEventsData, []);
        }
    }

    // --- BLOGS ---
    const blogContainer = document.getElementById('blog-container');
    if (blogContainer) {
        // Init the full blog page logic which handles fetching and the featured hero
        await initBlogPage();
    }

    // --- LISTENERS FOR EVENTS PAGE ---
    // Moved here to ensure they attach
    const allEventsContainer = document.getElementById('events-container');
    if (allEventsContainer) {
        document.getElementById('filter-all')?.addEventListener('click', () => filterEvents('All'));
        document.getElementById('filter-music')?.addEventListener('click', () => filterEvents('Music'));
        document.getElementById('filter-sports')?.addEventListener('click', () => filterEvents('Sports'));
        document.getElementById('filter-family')?.addEventListener('click', () => filterEvents('Family'));
        document.getElementById('filter-food')?.addEventListener('click', () => filterEvents('Food'));
    }





    // 6. Detail Pages
    if (window.location.pathname.includes('event-details') || document.getElementById('event-details-container')) {
        await initEventDetails();
    }
    if (window.location.pathname.includes('blog-post') || document.getElementById('blog-post-container')) {
        await initBlogDetails();
    }
    if (window.location.pathname.includes('daily-details') || document.getElementById('daily-details-container')) {
        await initDailyDetails();
    }

    // 7. Calendar Page
    await initCalendarPage();

    // BLOG PAGE LOGIC
    async function initBlogPage() {
        const blogContainer = document.getElementById('blog-container');
        if (!blogContainer) return;

        console.log("Initializing Blog Page...");

        // 1. Fetch Blogs
        allBlogPosts = await fetchBlogs();

        // 2. Initial Render
        blogPostsVisibleCount = 6;
        renderBlogPosts();

        // 3. Setup Load More Button
        const loadMoreBtn = document.getElementById('load-more-blog-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                blogPostsVisibleCount += 6;
                renderBlogPosts();
            });
        }

        // 4. Setup Filters
        setupBlogFilters();

        // 5. Featured Story Logic (Hero Section)
        if (allBlogPosts.length > 0) {
            // Find a featured article (manual 'featured: true' flag) OR default to the newest (first in list)
            const featuredArticle = allBlogPosts.find(b => b.featured) || allBlogPosts[0];

            if (featuredArticle) {
                console.log("Setting Featured Story:", featuredArticle.title);

                const heroTitle = document.getElementById('blog-hero-title');
                const heroDesc = document.getElementById('blog-hero-description');
                const heroImage = document.getElementById('blog-hero-image');
                const heroBtn = document.getElementById('featured-story-btn');

                if (heroTitle) heroTitle.textContent = featuredArticle.title;

                // Description logic: Use description field, or strip HTML from content
                if (heroDesc) {
                    let desc = featuredArticle.description || "";
                    if (!desc && featuredArticle.content) {
                        const tmp = document.createElement("DIV");
                        tmp.innerHTML = featuredArticle.content;
                        desc = tmp.textContent || tmp.innerText || "";
                        desc = desc.substring(0, 150) + "...";
                    }
                    heroDesc.textContent = desc;
                }

                // Image logic
                if (heroImage) {
                    const imgUrl = featuredArticle.imageUrl || featuredArticle.image || "blog-hero.jpg";
                    heroImage.src = imgUrl;
                    heroImage.alt = featuredArticle.title;
                }

                // Button Logic
                if (heroBtn) {
                    heroBtn.href = `/blog-post?id=${featuredArticle.id}`;
                }
            }
        }
    }

    // let activeBlogCategory = 'All'; // Hoisted to top

    function setupBlogFilters() {
        const categories = [
            { id: 'blog-filter-all', name: 'All' },
            { id: 'blog-filter-outdoors', name: 'Outdoors' },
            { id: 'blog-filter-food', name: 'Food & Drink' },
            { id: 'blog-filter-arts', name: 'Arts & Culture' },
            { id: 'blog-filter-community', name: 'Community' },
            { id: 'blog-filter-events', name: 'Events' }
        ];

        categories.forEach(cat => {
            const btn = document.getElementById(cat.id);
            if (btn) {
                btn.addEventListener('click', () => {
                    // Update active state UI
                    categories.forEach(c => {
                        const b = document.getElementById(c.id);
                        if (b) {
                            if (c.name === cat.name) {
                                b.classList.remove('bg-white', 'text-text-primary-light', 'ring-gray-200', 'dark:bg-white/5', 'dark:text-white', 'dark:ring-white/10');
                                b.classList.add('bg-primary', 'text-black', 'ring-primary', 'font-bold');
                            } else {
                                b.classList.add('bg-white', 'text-text-primary-light', 'ring-gray-200', 'dark:bg-white/5', 'dark:text-white', 'dark:ring-white/10');
                                b.classList.remove('bg-primary', 'text-black', 'ring-primary', 'font-bold');
                            }
                        }
                    });

                    filterBlogs(cat.name);
                });
            }
        });
    }

    function filterBlogs(category) {
        activeBlogCategory = category;
        blogPostsVisibleCount = 6; // Reset pagination
        renderBlogPosts();
    }

    function renderBlogPosts() {
        const blogContainer = document.getElementById('blog-container');
        if (!blogContainer) return;

        let filteredPosts = allBlogPosts;
        if (activeBlogCategory !== 'All') {
            filteredPosts = allBlogPosts.filter(post => {
                // Check category field or tags
                const cat = post.category || "";
                return cat.toLowerCase().includes(activeBlogCategory.toLowerCase()) ||
                    (post.tags && post.tags.some(t => t.toLowerCase().includes(activeBlogCategory.toLowerCase())));
            });
        }

        const blogsToShow = filteredPosts.slice(0, blogPostsVisibleCount);
        console.log(`📝 renderBlogPosts: Rendering ${blogsToShow.length} blogs to container.`);

        if (blogsToShow.length > 0) {
            const html = blogsToShow.map(createBlogCard).join('');
            // console.log("Generated HTML length:", html.length);
            blogContainer.innerHTML = html;
        } else {
            console.log("📝 No blogs to show (filtered empty?)");
            blogContainer.innerHTML = '<div class="col-span-full text-center">No articles found.</div>';
        }

        // Handle Load More Button Visibility
        const loadMoreBtn = document.getElementById('load-more-blog-btn');
        if (loadMoreBtn) {
            // Check against filtered count
            let totalFiltered = allBlogPosts.length;
            if (activeBlogCategory !== 'All') {
                totalFiltered = allBlogPosts.filter(post => {
                    const cat = post.category || "";
                    return cat.toLowerCase().includes(activeBlogCategory.toLowerCase()) ||
                        (post.tags && post.tags.some(t => t.toLowerCase().includes(activeBlogCategory.toLowerCase())));
                }).length;
            }

            if (totalFiltered > blogPostsVisibleCount) {
                loadMoreBtn.style.display = 'flex';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    }

    // 8. Local Favorites (Home) - MOVED TO TOP
    // initFavorites();

    // 9. Hero "Daily Update" Button (Dynamic Link) - MOVED TO TOP (Shared Logic)
}

// Helper to get ID from Search Params OR Path Suffix (GHL support)
function getIdFromUrl(paramName = 'id') {
    const urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get(paramName);
    if (id) return id;

    // Try extracting from path suffix (e.g. /event-details-1234 -> 1234)
    try {
        const path = window.location.pathname.replace(/\/$/, ""); // Remove trailing slash
        const segments = path.split('/');
        const lastSegment = segments[segments.length - 1]; // e.g. "event-details-1234"

        // If it looks like it has a suffix, try to get the last part
        if (lastSegment.includes('-')) {
            const parts = lastSegment.split('-');
            const potentialId = parts[parts.length - 1];
            // Basic validation: likely alphanumeric, at least 1 chars
            if (potentialId && potentialId.length > 0) {
                return potentialId;
            }
        }
    } catch (e) {
        console.warn("Error parsing ID from path:", e);
    }
    return null;
}

// DETAILS LOGIC
async function initEventDetails() {
    const eventId = getIdFromUrl('id');
    if (!eventId) return;

    try {
        const docRef = doc(db, "events", eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Update Page Title
            const pageTitle = document.getElementById('page-title');
            if (pageTitle && data.title) {
                pageTitle.textContent = `${data.title} - Good Day Bend`;
            }

            // Update Breadcrumb (dynamic category instead of hardcoded "Summer Concert Series")
            const breadcrumbEl = document.getElementById('event-breadcrumb');
            if (breadcrumbEl) {
                breadcrumbEl.textContent = data.category || data.title || "Event";
            }

            // Populate Fields if they exist in DOM
            const titleEl = document.getElementById('event-title');
            if (titleEl) titleEl.textContent = data.title;

            const catEl = document.getElementById('event-category');
            if (catEl) catEl.textContent = data.category || "Event";

            const descEl = document.getElementById('event-description');
            if (descEl) {
                // Use richDescription if available, else content, else description
                descEl.innerHTML = data.richDescription || data.content || `<p>${data.description}</p>`;
            }

            const dateEl = document.getElementById('event-date');
            if (dateEl) {
                let dStr = data.eventDate || data.date || 'TBD';
                // Try format
                try {
                    // Fix timezone issue for pure dates
                    if (dStr.length === 10) dStr += "T12:00:00";
                    dStr = new Date(dStr).toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' });
                } catch (e) { }
                dateEl.textContent = dStr;
            }

            // Event Time
            const timeEl = document.getElementById('event-time');
            if (timeEl) {
                timeEl.textContent = data.time || data.eventTime || "See details";
            }

            const locEl = document.getElementById('event-location');
            if (locEl) locEl.textContent = data.venue || data.location || "Bend, OR";

            const heroBg = document.getElementById('hero-bg');
            if (heroBg && data.image) {
                heroBg.style.backgroundImage = `url('${data.image}')`;
            }

            // CTA Button Logic
            const ctaBtn = document.getElementById('event-cta-btn');
            if (ctaBtn) {
                const price = data.price || data.cost || "";
                const isFree = !price || price.toLowerCase().includes('free') || price === '$0' || price === '0';
                const ticketUrl = data.sourceUrl || data.ticketUrl || data.url || "#";

                if (isFree && ticketUrl === "#") {
                    // Free event with no link
                    ctaBtn.textContent = "Free Event";
                    ctaBtn.removeAttribute('href');
                    ctaBtn.style.cursor = 'default';
                    ctaBtn.classList.remove('hover:bg-green-400');
                } else if (isFree) {
                    // Free event but has a link
                    ctaBtn.textContent = "More Info";
                    ctaBtn.href = ticketUrl;
                    ctaBtn.target = "_blank";
                } else {
                    // Paid event
                    ctaBtn.textContent = "Get Tickets";
                    ctaBtn.href = ticketUrl;
                    ctaBtn.target = "_blank";
                }
            }

            // Update price display
            const priceEl = document.getElementById('event-price');
            if (priceEl) {
                const price = data.price || data.cost || "Free";
                priceEl.textContent = price;
            }
        }
    } catch (e) {
        console.error("Error loading event details:", e);
    }
}

async function initBlogDetails() {
    const blogId = getIdFromUrl('id');
    if (!blogId) return;

    try {
        const docRef = doc(db, "articles", blogId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            const titleEl = document.getElementById('blog-title');
            if (titleEl) titleEl.textContent = data.title;

            const contentEl = document.getElementById('blog-content');
            if (contentEl) contentEl.innerHTML = data.content;

            const dateEl = document.getElementById('blog-date');
            if (dateEl && data.createdAt) {
                dateEl.textContent = new Date(data.createdAt.seconds * 1000).toLocaleDateString();
            }

            const heroBg = document.getElementById('hero-bg');
            if (heroBg && data.imageUrl) {
                heroBg.style.backgroundImage = `url('${data.imageUrl}')`;
            }
        }
    } catch (e) {
        console.error("Error loading blog details:", e);
    }
}

async function initDailyDetails() {
    const updateId = getIdFromUrl('id');
    if (!updateId) {
        console.error("No ID found in URL param 'id'");
        const titleEl = document.getElementById('daily-title');
        if (titleEl) titleEl.textContent = "Update Not Found";
        const contentEl = document.getElementById('daily-content');
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <p class="text-red-600 font-bold mb-2">Error: Missing Article ID</p>
                    <p class="text-sm text-gray-600 mb-4">The link you clicked didn't have an ID attached.</p>
                    <div class="inline-block bg-gray-100 px-3 py-1 rounded text-xs font-mono text-gray-500">
                        Current URL: ${window.location.href}
                    </div>
                    <div class="mt-6">
                        <a href="/daily-updates" class="bg-primary text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-400 transition-colors">
                            Return to Daily Updates
                        </a>
                    </div>
                </div>
            `;
        }
        return;
    }

    console.log("initDailyDetails fetching ID:", updateId);

    try {
        const docRef = doc(db, "daily_updates", updateId);
        const docSnap = await getDoc(docRef);

        console.log("Doc fetch complete. Exists:", docSnap.exists());

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Loaded Daily Update:", data);

            // Title
            const titleEl = document.getElementById('daily-title');
            if (titleEl) {
                let cleanTitle = data.title;
                if (cleanTitle) {
                    cleanTitle = cleanTitle.replace(/^Good Day Bend:\s*/i, "").trim();
                }
                titleEl.textContent = cleanTitle;
            }

            // Date / Metadata
            const dateEl = document.getElementById('daily-date');
            if (dateEl && data.publishedAt) {
                const date = data.publishedAt.seconds ? new Date(data.publishedAt.seconds * 1000) : new Date(data.publishedAt);
                dateEl.textContent = `Published: ${date.toLocaleString()} `;
            }

            // Image
            const imgContainer = document.getElementById('daily-image-container');
            const imgEl = document.getElementById('daily-image');

            // Standard fallback
            const DEFAULT_HERO = "https://visitbend.com/wp-content/uploads/2022/09/aerial-bend-fall-blog.jpg";

            if (data.image || data.imageUrl) {
                const url = data.image || data.imageUrl;
                if (imgEl) {
                    imgEl.style.display = 'block'; // Ensure it's visible
                    imgEl.src = url;
                    // Add visual error handling
                    imgEl.onerror = function () {
                        console.warn("Daily Image failed to load:", url);
                        this.src = DEFAULT_HERO;
                        this.style.display = 'block'; // Keep visible for fallback
                    };
                }
            } else {
                // If no image is set at all, use default instead of hiding
                if (imgEl) imgEl.src = DEFAULT_HERO;
            }

            // Ensure container is visible
            if (imgContainer) imgContainer.style.display = 'block';

            // Content
            const contentEl = document.getElementById('daily-content');
            if (contentEl) contentEl.innerHTML = data.content;

            // Vibe / Badge (Optional)
            const vibeEl = document.getElementById('daily-vibe');
            if (vibeEl && data.vibe) {
                vibeEl.textContent = data.vibe;
            }
        } else {
            console.log("No such daily update!");
            const contentEl = document.getElementById('daily-content');
            if (contentEl) contentEl.innerHTML = "<p>Daily Update not found.</p>";
        }
    } catch (e) {
        console.error("Error loading daily details:", e);
    }
}


async function initInstagramFeed() {
    const container = document.querySelector('.insta-grid');
    if (!container) return;

    if (!INSTAGRAM_FEED_URL) {
        console.log("Instagram Feed URL not set. Using static placeholders.");
        return;
    }

    try {
        const response = await fetch(INSTAGRAM_FEED_URL);
        if (!response.ok) throw new Error('Failed to fetch Instagram feed');

        const posts = await response.json();
        if (!posts || posts.length === 0) return;

        // Limit to 4 posts
        const displayPosts = posts.slice(0, 4);

        container.innerHTML = displayPosts.map(post => {
            // Adjust property names based on the feed service (Behold.so uses mediaUrl, permalink)
            // Fallback for different JSON structures
            const imageUrl = post.mediaUrl || post.media_url || post.url;
            const link = post.permalink || post.link || '#';

            return `
        < a href = "${link}" target = "_blank" class="insta-item" >
            <img src="${imageUrl}" alt="Instagram Post">
            </a>
    `;
        }).join('');

    } catch (error) {
        console.error("Error loading Instagram feed:", error);
        // Fallback to local hardcoded images
        const fallbackImages = [
            'https://storage.googleapis.com/msgsndr/ljbXgigJfqxzsPrE4kqp/media/692cb55996dd5b137b11048f.png',
            'https://storage.googleapis.com/msgsndr/ljbXgigJfqxzsPrE4kqp/media/692cb559aaad917bb9ef9b9e.png',
            'https://storage.googleapis.com/msgsndr/ljbXgigJfqxzsPrE4kqp/media/692cb559aaad917ddfef9b9f.png',
            'https://storage.googleapis.com/msgsndr/ljbXgigJfqxzsPrE4kqp/media/692cb55982f4c5dd0231712c.png'
        ];

        container.innerHTML = fallbackImages.map(img => `
        < a href = "https://www.instagram.com/gooddaybend/?hl=en" target = "_blank" class="insta-item" >
            <img src="${img}" alt="Instagram Post">
            </a>
    `).join('');
    }
}

// Mobile Menu Logic
function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
    }
}

// CALENDAR WIDGET LOGIC
// CALENDAR WIDGET LOGIC (Homepage)
async function initCalendarWidget(allEvents) {
    const monthLabel = document.getElementById('current-month');
    const daysGrid = document.getElementById('calendar-days-grid');

    if (!monthLabel || !daysGrid) return;

    // Clear existing (except headers if we want to keep them, but let's rebuild for safety)
    daysGrid.innerHTML = `
        < span class="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2" > S</span >
        <span class="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">M</span>
        <span class="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">T</span>
        <span class="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">W</span>
        <span class="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">T</span>
        <span class="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">F</span>
        <span class="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">S</span>
    `;

    const today = new Date();
    // Correctly handle "Today" based on local time, not UTC, to avoid "yesterday" bugs late at night
    // The browser's new Date() is local, so we are good.

    // Set Month Label
    const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });
    monthLabel.textContent = currentMonth;

    // Start from the Sunday of the current week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Generate 21 days (3 weeks) to ensure full row coverage
    for (let i = 0; i < 21; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);

        // Compare dates without time
        const isToday = d.toDateString() === today.toDateString();
        const isPast = d < today && !isToday;

        const btn = document.createElement('button');
        // Base classes
        let classes = "w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all relative ";

        if (isToday) {
            classes += "bg-primary text-[#0d1b12] font-bold shadow-md shadow-primary/20";
        } else if (isPast) {
            classes += "text-slate-300 dark:text-slate-600 cursor-default";
        } else {
            classes += "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700";
        }

        btn.className = classes;
        btn.textContent = d.getDate();

        // Marker for days with events
        const hasEvent = allEvents.some(e => {
            const eDate = e.eventDate || e.date; // YYYY-MM-DD
            if (!eDate) return false;
            // Use timezone offset to get correct local date string (same as updateAttachedEvents)
            const offsetD = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
            const localDateStr = offsetD.toISOString().split('T')[0];
            return eDate === localDateStr;
        });

        if (hasEvent && !isToday && !isPast) {
            const dot = document.createElement('span');
            dot.className = "absolute bottom-1 w-1 h-1 bg-primary rounded-full";
            btn.appendChild(dot);
        }

        if (!isPast) {
            btn.onclick = () => {
                // Remove active class from all
                Array.from(daysGrid.querySelectorAll('button')).forEach(b => {
                    // Reset to default (non-active) appearance
                    if (b.classList.contains('bg-primary')) {
                        b.classList.remove('bg-primary', 'text-[#0d1b12]', 'font-bold', 'shadow-md', 'shadow-primary/20');
                        b.classList.add('text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-100');
                    }
                });

                // Add active class to clicked
                btn.classList.remove('text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-100');
                btn.classList.add('bg-primary', 'text-[#0d1b12]', 'font-bold', 'shadow-md', 'shadow-primary/20');

                updateAttachedEvents(d, allEvents);
            };
        }

        daysGrid.appendChild(btn);
    }

    // Initial load for Today
    updateAttachedEvents(today, allEvents);
}

function updateAttachedEvents(date, allEvents) {
    const container = document.getElementById('featured-events-container');
    if (!container) return;

    // Format target date YYYY-MM-DD
    const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    const targetStr = offsetDate.toISOString().split('T')[0];

    const matches = allEvents.filter(e => {
        const eDate = e.eventDate || e.date;
        return eDate === targetStr;
    });

    if (matches.length === 0) {
        container.innerHTML = `
        < div class="col-span-full flex flex-col items-center justify-center py-12 text-center text-slate-500" >
                <span class="material-symbols-outlined text-4xl mb-2 opacity-50">event_busy</span>
                <p>No events scheduled for ${date.toLocaleDateString()}.</p>
            </div >
        `;
    } else {
        container.innerHTML = matches.map(createEventCard).join('');
    }
}

// NOTE: initDynamicContent is exported and called by init.js
// We do NOT add another listener here, or it will double-load.

/**
 * Initialize Leaflet Map for Daily Updates Sidebar
 */
function initEventMap(events, dailyUpdates = []) {
    const mapContainer = document.getElementById('event-map');
    if (!mapContainer || !window.L) return;

    // Prevent Double Init
    if (mapContainer._leaflet_id) {
        // Map already exists. We can optionally clear layers and re-add, but for V1 we'll skip re-init to prevent errors.
        // A more robust solution would be to save 'map' instance globally and clearLayers().
        return;
    }

    // Center on Bend, OR
    const map = L.map('event-map').setView([44.0582, -121.3153], 13);

    // Use CartoDB Positron for the "Clean/Gray" look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Custom "Clean Green" Icon
    // Matches the user's screenshot: White circle with green icon + shadow
    const createCustomIcon = (type) => {
        const iconName = type === 'update' ? 'newspaper' : 'location_on'; // Different icon for updates? Or all location pins? User asked for "Green Pins or Trees". Let's stick to location/tree theme.
        // Let's use 'forest' for events (fun) and 'location_on' for specific updates, or just 'location_on' for all for consistency.
        // Actually user said "Green Pins", let's use location_on.

        return L.divIcon({
            className: 'custom-map-marker', // We'll add no specific CSS class, using Tailwind in HTML
            html: `
                <div class="relative group cursor-pointer transition-transform hover:scale-110">
                    <div class="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100">
                        <span class="material-symbols-outlined text-primary text-[18px]">location_on</span>
                    </div>
                    <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 transform"></div>
                </div>
            `,
            iconSize: [32, 40], // Width, Height (including tip)
            iconAnchor: [16, 40], // Center X, Bottom Y
            popupAnchor: [0, -40]
        });
    };

    // Simple manual geocoding for popular Bend venues
    const venueLocations = {
        "Haynes Amphitheater": [44.0475, -121.3180],
        "Les Schwab Amphitheater": [44.0475, -121.3180],
        "Drake Park": [44.0600, -121.3150],
        "Downtown Bend": [44.0582, -121.3153],
        "Old Mill District": [44.0494, -121.3158],
        "Mt. Bachelor": [43.9790, -121.6883],
        "Pilot Butte": [44.0610, -121.2917],
        "Tower Theatre": [44.0592, -121.3134],
        "Deschutes Brewery": [44.0463, -121.3232],
        "10 Barrel Brewing": [44.0587, -121.3289],
        "Crux Fermentation Project": [44.0505, -121.3090],
        "Pine Tavern": [44.0595, -121.3148],
        "McMenamins Old St. Francis School": [44.0558, -121.3103],
        "Cascade Lakes": [43.9500, -121.7500],
        "Cascade Lakes Highway": [43.9800, -121.6500],
        "Smith Rock": [44.3633, -121.1378],
        "High Desert Museum": [44.0178, -121.2828]
    };

    let markers = 0;

    // Helper to drop a pin
    const dropPin = (item, type) => {
        // Collect all potential locations for this item
        let potentialLocations = [];

        // 1. Explicit coordinates
        if (item.lat && item.lng) {
            potentialLocations.push({
                latLng: [item.lat, item.lng],
                label: item.title, // Default label
                context: "" // No extra context
            });
        }

        // 2. Scan Content for MULTIPLE "📍 Location" markers (e.g. in a Daily Rundown list)
        if (item.content) {
            // Regex to find "📍 Location Name"
            // Captures text after 📍 until a pipe |, newline, or HTML tag start <
            const regex = /📍\s*([^|<:\n]+)/g;
            let match;
            while ((match = regex.exec(item.content)) !== null) {
                const locName = match[1].trim();

                // Try to extract a time context if it appears before the pin (e.g. "9:00 AM | 📍 Location")
                // We look at the 20 chars before the match
                const preText = item.content.substring(Math.max(0, match.index - 20), match.index);
                const timeMatch = preText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
                const timeStr = timeMatch ? timeMatch[0] : "";

                potentialLocations.push({
                    name: locName,
                    label: item.title, // Parent Title
                    context: timeStr // "9:00 AM"
                });
            }
        }

        // 3. Fallback: If no 📍 found, check main title/location metadata
        if (potentialLocations.length === 0) {
            const searchText = (item.location || item.title || item.headline || "");
            if (searchText) {
                potentialLocations.push({
                    name: searchText,
                    label: item.title,
                    context: ""
                });
            }
        }

        // Process all found locations
        potentialLocations.forEach(loc => {
            let latLng = loc.latLng;

            // If no explicit latLng, lookup by name
            if (!latLng && loc.name) {
                // Try strict match first, then partial
                const locNameClean = loc.name.toLowerCase();
                const matchKey = Object.keys(venueLocations).find(key =>
                    locNameClean.includes(key.toLowerCase())
                );
                if (matchKey) {
                    latLng = venueLocations[matchKey];
                }
            }

            if (latLng) {
                // Add jitter
                const jitterLat = latLng[0] + (Math.random() - 0.5) * 0.003;
                const jitterLng = latLng[1] + (Math.random() - 0.5) * 0.003;

                const marker = L.marker([jitterLat, jitterLng], {
                    icon: createCustomIcon(type)
                }).addTo(map);

                // Format Date/Context
                const dateStr = item.eventDate || item.publishedAt || "Recently";
                // If we found a specific time, append it
                const timeDisplay = loc.context ? `<span class="text-xs font-bold bg-green-100 text-green-800 px-1 rounded ml-2">${loc.context}</span>` : "";

                const typeLabel = type === 'update' ? "DAILY UPDATE" : "EVENT";
                const linkUrl = type === 'update' ? `/daily-details?id=${item.id}` : `/event-details?id=${item.id}`;

                marker.bindPopup(`
                    <div class="text-sm">
                        <strong class="block text-xs font-bold text-gray-500 mb-1 tracking-wider">${typeLabel} ${timeDisplay}</strong>
                        <strong class="block text-[#0d1b12] mb-1 font-bold text-base leading-tight">${loc.label}</strong>
                        <span class="text-xs text-green-600 block mb-1">${dateStr}</span>
                        ${loc.name ? `<span class="text-xs text-gray-400 block italic">📍 ${loc.name}</span>` : ''}
                        <a href="${linkUrl}" class="block mt-2 text-primary font-bold text-xs hover:underline">View Details</a>
                    </div>
                `);
                markers++;
            }
        });
    };

    // Process Events
    events.forEach(e => dropPin(e, 'event'));

    // Process Daily Updates
    dailyUpdates.forEach(u => dropPin(u, 'update'));

    console.log(`Map initialized with ${markers} pins.`);
}

// LOCAL EVENTS PAGE LOGIC
async function initLocalEventsPage() {
    const container = document.getElementById('local-events-container');
    if (!container) return;

    console.log("Initializing Local Events Page...");

    if (allEventsData.length === 0) {
        allEventsData = await fetchEvents();
    }

    // Reuse calendar filters setup as they share IDs in local-events.html (copied from calendar.html)
    // BUT local-events.html might have different IDs? 
    // I checked local-events.html lines 200-400 earlier.
    // It has id="calendar-date-filter", id="calendar-category-filter", etc.
    // So setupCalendarFilters(); should work!
    setupCalendarFilters();

    // Reset pagination on load
    localEventsVisibleCount = 10;

    // Load More Button Logic
    const loadMoreBtn = document.getElementById('load-more-events-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            localEventsVisibleCount += 10;
            filterAndRenderLocalEvents();
        });
    }

    // Override the listener to call OUR render function AND reset pagination
    const dateRadios = document.querySelectorAll('input[name="date"]');
    dateRadios.forEach(r => {
        r.removeEventListener('change', filterAndRenderCalendarEvents);
        r.addEventListener('change', () => {
            // Clear date input
            const dateInput = document.querySelector('input[type="date"]');
            if (dateInput) dateInput.value = '';

            localEventsVisibleCount = 10;
            filterAndRenderLocalEvents();
        });
    });

    const categories = document.querySelectorAll('#calendar-category-filter button');
    categories.forEach(b => {
        // We can't easily remove anonymous listeners, but we can just add ours.
        // However, the existing logic toggles classes. We want that.
        // We just need to trigger our render.
        b.addEventListener('click', () => {
            setTimeout(() => {
                localEventsVisibleCount = 10;
                filterAndRenderLocalEvents();
            }, 50);
        });
    });

    const locCheckboxes = document.querySelectorAll('#calendar-location-filter input[type="checkbox"]');
    locCheckboxes.forEach(cb => {
        cb.removeEventListener('change', filterAndRenderCalendarEvents);
        cb.addEventListener('change', () => {
            localEventsVisibleCount = 10;
            filterAndRenderLocalEvents();
        });
    });

    // Specific Date Input
    const dateInput = document.querySelector('input[type="date"]');
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            // Uncheck radios
            const dateRadios = document.querySelectorAll('input[name="date"]');
            dateRadios.forEach(r => r.checked = false);

            localEventsVisibleCount = 10;
            filterAndRenderLocalEvents();
        });
    }

    // Initial Render
    filterAndRenderLocalEvents();
}

function filterAndRenderLocalEvents() {
    const container = document.getElementById('local-events-container');
    if (!container) return;

    // 3. Initial Render (Default: Today onwards)
    // Actually, initLocalEventsPage overrides this with 'Any Date' default usually.
    // We just need to make sure logic handles it.

    // Helper removed (now global)

    let filtered = [...allEventsData];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Local midnight

    // 1. Date Filter
    // Local events page reuses the same filters as calendar
    const selectedDateRadio = document.querySelector('input[name="date"]:checked');
    const dateInputVal = document.querySelector('input[type="date"]')?.value;

    if (dateInputVal) {
        const targetDate = parseEventDate(dateInputVal);
        if (targetDate) {
            targetDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter(e => {
                const d = parseEventDate(e.eventDate || e.date);
                if (!d) return false;
                d.setHours(0, 0, 0, 0);
                return d.getTime() === targetDate.getTime();
            });
        }
    }
    else if (selectedDateRadio) {
        const labelText = selectedDateRadio.nextElementSibling.innerText.trim();
        console.log("Filtering Local Events by Date:", labelText);

        if (labelText === 'Any Date') {
            // Show ALL events (no filter)
        } else if (labelText === 'Today') {
            filtered = filtered.filter(e => {
                const d = parseEventDate(e.eventDate || e.date);
                if (!d) return false;
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            });
        } else if (labelText === 'This Weekend') {
            const currentDay = today.getDay();
            const diffToSaturday = (6 - currentDay + 7) % 7;
            const nextSaturday = new Date(today);
            nextSaturday.setDate(today.getDate() + diffToSaturday);
            nextSaturday.setHours(0, 0, 0, 0);

            const nextSunday = new Date(nextSaturday);
            nextSunday.setDate(nextSaturday.getDate() + 1);
            nextSunday.setHours(23, 59, 59, 999);

            filtered = filtered.filter(e => {
                const d = parseEventDate(e.eventDate || e.date);
                if (!d) return false;
                return d >= nextSaturday && d <= nextSunday;
            });
        }
    }

    // 2. Category Filter
    // Note: setupCalendarFilters() handles the visual class toggling
    const activeCatBtn = document.querySelector('#calendar-category-filter button.bg-primary');
    if (activeCatBtn && activeCatBtn.innerText !== 'All') {
        const cat = activeCatBtn.innerText;
        console.log("Filtering by Category:", cat);
        filtered = filtered.filter(e => (e.category && e.category.includes(cat)) || (e.tags && e.tags.includes(cat)));
    }

    // 3. Location Filter
    const checkedLocs = Array.from(document.querySelectorAll('#calendar-location-filter input[type="checkbox"]:checked')).map(cb => cb.nextElementSibling.innerText.trim());
    if (checkedLocs.length > 0) {
        filtered = filtered.filter(e => {
            if (!e.location && !e.venue) return false;
            const openSearch = (e.location || "") + " " + (e.venue || "");
            return checkedLocs.some(loc => openSearch.toLowerCase().includes(loc.toLowerCase()));
        });
    }

    // Sort
    filtered.sort((a, b) => {
        const da = parseEventDate(a.eventDate || a.date);
        const db = parseEventDate(b.eventDate || b.date);
        // Fallback for nulls
        if (!da) return 1;
        if (!db) return -1;
        return da - db; // Ascending (Soonest first)
    });

    console.log(`Rendered ${filtered.length} local events.`);

    // Pagination Slicing
    const totalEvents = filtered.length;
    const eventsToShow = filtered.slice(0, localEventsVisibleCount);

    // Toggle Load More Button
    const loadMoreBtn = document.getElementById('load-more-events-btn');
    if (loadMoreBtn) {
        // Explicitly use 'flex' to match the CSS class structure (which usually implies flex)
        // or just remove 'hidden' class if we used that. 
        // But here we are setting style.display directly.
        if (totalEvents > localEventsVisibleCount) {
            loadMoreBtn.style.display = 'flex';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    if (eventsToShow.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-slate-500">No events found matching your current filters.</div>`;
    } else {
        container.innerHTML = eventsToShow.map(createHorizontalEventCard).join('');
    }
}

function createHorizontalEventCard(event) {
    const displayCategory = (event.tags && event.tags.length > 0) ? event.tags[0] : (event.category || 'General');
    const eventImage = event.imageUrl || event.image || "https://placehold.co/600x400/102216/13ec5b?text=Good+Day+Bend";

    let dateStr = event.eventDate || event.date;
    let dateObj;

    if (dateStr && dateStr.seconds) {
        dateObj = new Date(dateStr.seconds * 1000);
    } else if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        dateObj = new Date(dateStr + 'T00:00:00');
    } else {
        dateObj = dateStr ? new Date(dateStr) : new Date();
    }

    const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
    const day = dateObj.getDate();

    // Time formatting
    let timeStr = event.time || "All Day";

    return `
    <article class="group bg-white dark:bg-[#1a2e22] rounded-xl overflow-hidden border border-border-light dark:border-gray-800 hover:shadow-lg hover:border-primary/50 transition-all duration-300 flex flex-col sm:flex-row w-full cursor-pointer" onclick="window.location.href='/event-details?id=${event.id}'">
        <div class="relative w-full sm:w-72 h-48 sm:h-56 flex-shrink-0 overflow-hidden">
            <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 text-center shadow-sm z-10 border border-border-light">
                <div class="text-xs font-bold text-primary uppercase tracking-wide">${month}</div>
                <div class="text-xl font-black text-[#0d1b12] leading-none">${day}</div>
            </div>
            <img alt="${event.title}" loading="lazy" decoding="async"
                class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                src="${eventImage}" />
            <div class="absolute top-3 right-3 z-10">
                <span class="inline-flex items-center rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-[#13ec5b] ring-1 ring-inset ring-[#13ec5b]/50 backdrop-blur-md uppercase tracking-wide">
                    ${displayCategory}
                </span>
            </div>
        </div>
        <div class="p-5 flex flex-col flex-1 justify-center">
            <h3 class="text-xl font-bold text-text-dark dark:text-white mb-2 leading-tight group-hover:text-primary transition-colors">
                ${event.title}
            </h3>
            <p class="text-sm text-text-muted dark:text-gray-400 mb-4 line-clamp-2">
                ${event.description || "Join us for this amazing local event in Bend."}
            </p>
            <div class="flex flex-wrap gap-4 mb-4 text-sm text-text-muted dark:text-gray-400">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">schedule</span>
                    <span>${timeStr}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">location_on</span>
                    <span>${event.venue || event.location || "Bend, OR"}</span>
                </div>
            </div>
            <div class="mt-auto pt-4 border-t border-border-light dark:border-gray-800 flex items-center justify-between">
                <span class="text-sm font-bold text-text-dark dark:text-white">${event.price || "Free Entry"}</span>
                <button class="text-primary hover:text-primary-hover font-bold text-sm flex items-center gap-1 transition-colors">
                    View Details <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
            </div>
        </div>
    </article>
    `;
}

// --- HOME PAGE CALENDAR LOGIC ---

let homeCalendarDate = new Date();
let selectedHomeDate = new Date();

function initHomeCalendar() {
    const calendarGrid = document.getElementById('home-calendar-grid');
    if (!calendarGrid) return;

    console.log("Initializing Home Page Calendar...");

    // Set initial selected date to today
    selectedHomeDate = new Date();
    selectedHomeDate.setHours(0, 0, 0, 0);

    // Render Calendar
    renderHomeCalendar(homeCalendarDate);

    // Initial Event Load (Starting Today)
    updateHomeEvents(selectedHomeDate);

    // Event Listeners
    document.getElementById('home-calendar-prev')?.addEventListener('click', () => {
        homeCalendarDate.setDate(1);
        homeCalendarDate.setMonth(homeCalendarDate.getMonth() - 1);
        renderHomeCalendar(homeCalendarDate);
    });

    document.getElementById('home-calendar-next')?.addEventListener('click', () => {
        homeCalendarDate.setDate(1);
        homeCalendarDate.setMonth(homeCalendarDate.getMonth() + 1);
        renderHomeCalendar(homeCalendarDate);
    });
}

function renderHomeCalendar(date) {
    const grid = document.getElementById('home-calendar-grid');
    const monthLabel = document.getElementById('home-calendar-month');
    if (!grid || !monthLabel) return;

    // Clear days (keep headers)
    // The headers are the first 7 children. We want to remove children after index 6.
    // Easier to just rebuild headers if we want, or select all divs without font-bold text-slate-400
    // Actually, let's just clear everything and re-add headers to be safe, or just clear after header.

    // Simpler: Set innerHTML to headers + new days
    grid.innerHTML = `
        <span class="text-xs font-bold text-slate-400 w-8 h-8 flex items-center justify-center">S</span>
        <span class="text-xs font-bold text-slate-400 w-8 h-8 flex items-center justify-center">M</span>
        <span class="text-xs font-bold text-slate-400 w-8 h-8 flex items-center justify-center">T</span>
        <span class="text-xs font-bold text-slate-400 w-8 h-8 flex items-center justify-center">W</span>
        <span class="text-xs font-bold text-slate-400 w-8 h-8 flex items-center justify-center">T</span>
        <span class="text-xs font-bold text-slate-400 w-8 h-8 flex items-center justify-center">F</span>
        <span class="text-xs font-bold text-slate-400 w-8 h-8 flex items-center justify-center">S</span>
    `;

    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    monthLabel.textContent = date.toLocaleString('default', { month: 'short', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('span');
        grid.appendChild(empty);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        d.setHours(0, 0, 0, 0);

        const btn = document.createElement('button');
        btn.className = "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all";
        btn.textContent = i;

        // Styles
        const isToday = d.getTime() === today.getTime();
        const isSelected = d.getTime() === selectedHomeDate.getTime();
        const isPast = d < today;

        if (isSelected) {
            btn.classList.add('bg-primary', 'text-[#0d1b12]', 'shadow-md');
        } else if (isToday) {
            btn.classList.add('bg-primary/20', 'text-primary');
        } else if (isPast) {
            btn.classList.add('text-slate-300', 'dark:text-slate-600');
        } else {
            btn.classList.add('text-slate-700', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-700');
        }

        // Click Handler
        btn.onclick = () => {
            selectedHomeDate = new Date(d); // Update global selected date
            renderHomeCalendar(homeCalendarDate); // Re-render to update selection styles
            updateHomeEvents(selectedHomeDate); // Update events list
        };

        grid.appendChild(btn);
    }
}

async function updateHomeEvents(startDate) {
    const container = document.getElementById('featured-events-container');
    if (!container) return;

    // Ensure data is loaded
    if (allEventsData.length === 0) {
        allEventsData = await fetchEvents();
    }

    // Filter events: Date >= startDate (Time ignored for comparison usually, but let's be safe)
    // We want events starting from the selected date.

    // Sort logic in fetchEvents is Descending. We need Ascending for "What's happening this week starting from X"
    // So we restart filter

    let upcoming = allEventsData.filter(e => {
        const d = parseEventDate(e.eventDate || e.date);
        if (!d) return false;
        d.setHours(0, 0, 0, 0);
        return d >= startDate;
    });

    // Sort Ascending (Soonest first)
    upcoming.sort((a, b) => {
        const da = parseEventDate(a.eventDate || a.date);
        const db = parseEventDate(b.eventDate || b.date);
        return da - db;
    });

    // Take 5-7 events
    const displayEvents = upcoming.slice(0, 7);

    if (displayEvents.length === 0) {
        container.innerHTML = `
            <div class="w-full flex flex-col items-center justify-center py-12 text-center text-slate-500 bg-surface-light dark:bg-surface-dark rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <span class="material-symbols-outlined text-4xl mb-2">event_busy</span>
                <p>No upcoming events found from this date.</p>
                <button onclick="updateHomeEvents(new Date())" class="mt-4 text-primary font-bold hover:underline">Reset to Today</button>
            </div>
        `;
    } else {
        container.innerHTML = displayEvents.map(createHomeEventCard).join('');
    }
}

function createHomeEventCard(event) {
    // Similar to standard card but fixed width for horizontal scrolling
    const eventImage = event.imageUrl || event.image || DEFAULT_IMAGE;
    let dateStr = event.eventDate || event.date;
    const dateObj = parseEventDate(dateStr);

    let month = '', day = '';
    if (dateObj) {
        month = dateObj.toLocaleString('default', { month: 'short' });
        day = dateObj.getDate();
    }

    return `
    <article class="snap-start shrink-0 w-[85vw] sm:w-[320px] md:w-[350px] flex flex-col rounded-xl bg-white dark:bg-[#1a2e22] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-lg transition-all group" onclick="window.location.href='/event-details?id=${event.id}'">
        <div class="relative w-full aspect-video overflow-hidden">
            <div class="absolute top-3 left-3 bg-white/90 dark:bg-[#0d1b12]/90 backdrop-blur-sm rounded-lg px-3 py-1.5 flex flex-col items-center shadow-sm z-10 border border-black/5">
                <span class="text-xs font-bold text-text-secondary uppercase">${month}</span>
                <span class="text-xl font-black text-[#0d1b12] dark:text-white leading-none">${day}</span>
            </div>
            <img src="${eventImage}" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="${event.title}">
        </div>
        <div class="p-4 flex flex-col gap-2 flex-1">
            <h3 class="text-lg font-bold text-[#0d1b12] dark:text-white line-clamp-1 group-hover:text-primary transition-colors">${event.title}</h3>
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">schedule</span> ${event.time || 'TBD'}</span>
                <span>•</span>
                <span class="truncate max-w-[120px]">${event.category || 'Event'}</span>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">${event.description || 'No description available.'}</p>
            <div class="mt-auto pt-3 flex items-center text-primary text-sm font-bold group-hover:translate-x-1 transition-transform">
                Event Details <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
        </div>
    </article>
    `;
}

export { initDynamicContent, fetchEvents, fetchDailyUpdates, fetchBlogs, initHomeCalendar, subscribeToNewsletter };
