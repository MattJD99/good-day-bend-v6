import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const calendarGrid = document.getElementById('calendarGrid');
const currentMonthElement = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const todayBtn = document.getElementById('todayBtn');

// Initialize with TODAY'S date
let currentDate = new Date();
let allEvents = []; // Store fetched events

// --- Event Popup Modal Logic ---
function showDayPopup(date, events) {
    // Remove existing popup if any
    const existingPopup = document.getElementById('day-popup-modal');
    if (existingPopup) existingPopup.remove();

    const dateString = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const modalHtml = `
    <div id="day-popup-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white dark:bg-[#1a2e22] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">
            <div class="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-primary/5">
                <h3 class="text-xl font-black text-[#0d1b12] dark:text-white">${dateString}</h3>
                <button id="close-popup-btn" class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                    <span class="material-symbols-outlined text-[#0d1b12] dark:text-white">close</span>
                </button>
            </div>
            <div class="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                ${events.length === 0 ? '<p class="text-center text-gray-500 italic">No events scheduled for this day.</p>' : ''}
                ${events.map(event => `
                    <div class="group flex gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-white/10"
                        onclick="window.location.href='event-details.html?id=${event.id}'">
                        <div class="size-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                            <img src="${event.image || 'https://placehold.co/100x100?text=Event'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="${event.title}">
                        </div>
                        <div class="flex-1">
                            <h4 class="font-bold text-[#0d1b12] dark:text-white mb-1 group-hover:text-primary transition-colors">${event.title}</h4>
                            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary-dark font-bold">${event.category || 'Event'}</span>
                                <span>•</span>
                                <span>${event.time || 'All Day'}</span>
                            </div>
                        </div>
                         <div class="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <span class="material-symbols-outlined text-primary">arrow_forward</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('close-popup-btn').addEventListener('click', () => {
        document.getElementById('day-popup-modal').remove();
    });

    // Close on click outside
    document.getElementById('day-popup-modal').addEventListener('click', (e) => {
        if (e.target.id === 'day-popup-modal') {
            document.getElementById('day-popup-modal').remove();
        }
    });
}


// Fetch Events from Firestore
async function fetchEvents() {
    try {
        console.log("Fetching calendar events...");
        const q = query(collection(db, "events")); // Removed orderBy to sort in memory if needed or rely on robust date parsing
        const querySnapshot = await getDocs(q);

        allEvents = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();

            // --- ROBUST DATE PARSING ---
            let eventDateStr = data.date || data.eventDate; // Support both field names
            let eventDate = null;

            if (eventDateStr) {
                if (eventDateStr.seconds) {
                    // Firestore Timestamp
                    eventDate = new Date(eventDateStr.seconds * 1000);
                    // Adjust to local date string YYYY-MM-DD
                    eventDate = eventDate.toISOString().split('T')[0];
                } else if (typeof eventDateStr === 'string') {
                    // String YYYY-MM-DD
                    // If it's a full ISO string, split it
                    eventDate = eventDateStr.split('T')[0];
                }
            }

            // Image Fallback
            const imageUrl = data.imageUrl || data.image || "https://placehold.co/600x400/102216/13ec5b?text=Good+Day+Bend";

            if (eventDate) {
                allEvents.push({
                    id: doc.id,
                    title: data.title,
                    date: eventDate, // Format: YYYY-MM-DD
                    category: data.category || 'General',
                    image: imageUrl,
                    time: data.time || 'TBD',
                    description: data.description || ''
                });
            }
        });

        console.log(`Loaded ${allEvents.length} events.`);
        renderCalendar(currentDate);
    } catch (error) {
        console.error("Error fetching events:", error);
        calendarGrid.innerHTML = `<div class="col-span-7 py-12 text-center text-red-500">Error loading events. Please try again later.</div>`;
    }
}

function renderCalendar(date) {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';

    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();

    // Update Header
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    currentMonthElement.textContent = `${monthNames[month]} ${year}`;

    // First day of the month (0-6)
    const firstDay = new Date(year, month, 1).getDay();
    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('min-h-[140px]', 'bg-gray-50/50', 'dark:bg-[#15261c]/50', 'border-b', 'border-r', 'border-border-light', 'dark:border-[#2a4535]');
        calendarGrid.appendChild(emptyCell);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('group', 'relative', 'min-h-[140px]', 'bg-white', 'dark:bg-[#1a2e22]', 'p-2', 'border-b', 'border-r', 'border-border-light', 'dark:border-[#2a4535]', 'hover:bg-slate-50', 'dark:hover:bg-[#203629]', 'transition-colors');

        // Highlight Today
        const isToday = year === today.getFullYear() && month === today.getMonth() && i === today.getDate();

        let dateNumClasses = "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-2";
        if (isToday) {
            dateNumClasses += " bg-primary text-[#0d1b12] shadow-sm";
        } else {
            dateNumClasses += " text-text-muted dark:text-gray-400";
        }

        const dateNum = document.createElement('div');
        dateNum.className = dateNumClasses;
        dateNum.textContent = i;
        dayCell.appendChild(dateNum);

        // Filter events for this day
        // Need to pad month/day to match YYYY-MM-DD
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(i).padStart(2, '0');
        const dateString = `${year}-${monthStr}-${dayStr}`;

        const dayEvents = allEvents.filter(e => e.date === dateString);

        // Mobile / Compact View container
        const eventsContainer = document.createElement('div');
        eventsContainer.className = "flex flex-col gap-1.5";

        // Logic: Show max 3 events. If more, show "X more" button
        const MAX_VISIBLE = 3;
        const visibleEvents = dayEvents.slice(0, MAX_VISIBLE);
        const hiddenCount = dayEvents.length - MAX_VISIBLE;

        visibleEvents.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = "text-xs font-bold truncate px-2 py-1 rounded bg-[#e7f3eb] dark:bg-[#2a4535] text-[#0d1b12] dark:text-white hover:bg-primary hover:text-[#0d1b12] cursor-pointer transition-colors border-l-2 border-primary";
            eventEl.textContent = event.title;
            // Prevent event propagation to cell click if we implement cell click later
            eventEl.onclick = (e) => {
                e.stopPropagation();
                window.location.href = `/event-details?id=${event.id}`;
            };
            eventsContainer.appendChild(eventEl);
        });

        if (hiddenCount > 0) {
            const moreBtn = document.createElement('button');
            moreBtn.className = "text-[10px] font-bold text-text-muted hover:text-primary mt-1 w-full text-left pl-1";
            moreBtn.textContent = `+ ${hiddenCount} more...`;
            moreBtn.onclick = (e) => {
                e.stopPropagation();
                showDayPopup(new Date(year, month, i), dayEvents);
            };
            eventsContainer.appendChild(moreBtn);
        }

        // Make entire cell clickable to show popup if allow
        dayCell.onclick = () => {
            // If clicked empty space, show popup to add? Or just show list if events exist
            if (dayEvents.length > 0) {
                showDayPopup(new Date(year, month, i), dayEvents);
            }
        };

        // Add cursor pointer if events
        if (dayEvents.length > 0) {
            dayCell.classList.add('cursor-pointer');
        }

        dayCell.appendChild(eventsContainer);
        calendarGrid.appendChild(dayCell);
    }
}

prevMonthBtn.addEventListener('click', () => {
    currentDate.setDate(1);
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setDate(1);
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
});

if (todayBtn) {
    todayBtn.addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar(currentDate);
    });
}

// Initial Load
fetchEvents();
