/* HAKIM TACTICAL COMMAND CENTER - MAIN LOGIC */

const SUPABASE_URL = 'https://palifzjzhayfwtybtqmb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbGlmemp6aGF5Znd0eWJ0cW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4Mjg0NzAsImV4cCI6MjA4ODQwNDQ3MH0.Wr9nFeME3c5AbCQSTtpi_SHQ16dLklLDXoS7fIWdGP8';
const ADMIN_EMAIL = 'shrawanb121@gmail.com';
const NEPAL_GEOJSON_URL = 'https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-states.geojson';

let map, provinceChart;
let currentUser = null;
let supabase;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Supabase inside try/catch
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session || session.user.email !== ADMIN_EMAIL) {
            console.warn("Unauthorized access attempt or session error.");
            window.location.replace('index.html');
            return;
        }

        currentUser = session.user;
        document.body.style.display = 'flex';

        // Initialize Dashboard Components
        await initDashboard();
    } catch (err) {
        console.error("CRITICAL BOOT ERROR:", err);
        // Fallback to show page content if hidden, so admin can at least see the shell
        document.body.style.display = 'flex';
    }
});

async function setupRealtimeSubscriptions() {
    const channel = supabase.channel('hakim_realtime_v2')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async () => {
             console.log("Realtime Intelligence Received: POSTS");
             await Promise.allSettled([updateStats(), fetchActivityFeed(), updateLiveHeartbeat(), fetchPostManagement()]);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, async () => {
             console.log("Realtime Intelligence Received: COMMENTS");
             await Promise.allSettled([updateStats(), fetchActivityFeed(), updateLiveHeartbeat()]);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_votes' }, async () => {
             console.log("Realtime Intelligence Received: VOTES");
             await Promise.allSettled([updateStats(), updateLiveHeartbeat()]);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
             console.log("Realtime Intelligence Received: PROFILES");
             await Promise.allSettled([updateStats(), fetchUserManagement()]);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ban_appeals' }, async () => {
             console.log("Realtime Intelligence Received: APPEALS");
             await fetchAppeals();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Realtime Tactical Uplink established.');
            }
        });
}

async function initDashboard() {
    try {
        // Parallel execution to speed up loading
        await Promise.allSettled([
            updateStats(),
            fetchActivityFeed(),
            initAnalyticsCharts(),
            fetchUserManagement(),
            fetchPostManagement(),
            fetchAppeals()
        ]);

        // Setup Realtime Events
        setupRealtimeSubscriptions();

        // Setup Coarse Fallback Refresh (Stats and less frequent data)
        setInterval(updateStats, 120000); // 2 mins
        setInterval(fetchActivityFeed, 120000);
        setInterval(fetchAppeals, 60000); // 1 min
        setInterval(updateLiveHeartbeat, 60000); // 1 min sync

        // Event Listeners
        setupEventListeners();
    } catch (err) {
        console.error("Dashboard component initialization failed:", err);
    }
}

// 1. Statistics Bar
async function updateStats() {
    try {
        const { data, error } = await supabase.rpc('get_admin_stats');
        if (error) throw error;

        const setMetric = (selector, val) => {
            const el = document.querySelector(selector);
            if (el) el.textContent = (val || 0).toLocaleString();
        };

        setMetric('#card-total-posts .metric-value', data.total_posts);
        setMetric('#card-resolved-posts .metric-value', data.resolved_posts);
        setMetric('#card-pending-posts .metric-value', data.pending_posts);
        setMetric('#card-total-users .metric-value', data.total_users);
    } catch (err) {
        console.error("Stats Update Failure:", err);
    }
}

// 2. Recent Activities Feed
async function fetchActivityFeed() {
    try {
        const container = document.getElementById('activityFeed');
        if (!container) return;

        const [postsRes, commentsRes] = await Promise.all([
            supabase.from('posts').select('id, content, type, created_at, profiles(full_name, avatar_url)').order('created_at', { ascending: false }).limit(5),
            supabase.from('post_comments').select('id, content, created_at, profiles(full_name, avatar_url)').order('created_at', { ascending: false }).limit(5)
        ]);

        const activities = [
            ...(postsRes.data || []).map(p => ({ ...p, act_type: 'post' })),
            ...(commentsRes.data || []).map(c => ({ ...c, act_type: 'comment' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (activities.length === 0) {
            container.innerHTML = '<div style="padding:1rem; opacity:0.5;">No recent activities found.</div>';
            return;
        }

        container.innerHTML = activities.map(act => {
            const timeAgo = getTimeAgo(act.created_at);
            const name = act.profiles?.full_name || 'Anonymous';
            const avatar = act.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e293b&color=fff`;
            const actionText = act.act_type === 'post' ? 'Posted a Gunaso' : 'Commented';

            return `
                <div class="activity-item">
                    <img src="${avatar}" class="user-avatar" alt="User">
                    <div class="activity-content">
                        <span class="activity-user">${name}</span>
                        <span class="activity-text">${actionText}: "${truncate(act.content, 50)}"</span>
                        <span class="activity-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Activity Feed Failure:", err);
    }
}

// 3. Chart.js Analytics Suite
let provincePie, districtPie, activityLine;

async function initAnalyticsCharts() {
    try {
        // A. Province Distribution
        const { data: provData, error: provError } = await supabase.rpc('get_province_distribution');
        if (provError) throw provError;

        renderProvinceChart(provData);

        // B. Initial District Data (From top province)
        if (provData && provData.length > 0) {
            updateDistrictChart(provData[0].province);
        }

        // C. Live Heartbeat
        await updateLiveHeartbeat();

    } catch (err) {
        console.error("Analytics Suite Failure:", err);
    }
}

async function updateLiveHeartbeat() {
    try {
        const { data, error } = await supabase.rpc('get_live_usage_heartbeat');
        if (error) throw error;
        renderLiveUsageHeartbeat(data);
    } catch (err) {
        console.error("Heartbeat sync failure:", err);
    }
}

function renderProvinceChart(data) {
    const ctx = document.getElementById('provincePieChart')?.getContext('2d');
    if (!ctx) return;

    if (provincePie) provincePie.destroy();

    const chartColors = ['#3b82f6', '#ef4444', '#a855f7', '#eab308', '#22c55e', '#f97316', '#06b6d4'];

    provincePie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.province),
            datasets: [{
                data: data.map(d => d.post_count),
                backgroundColor: chartColors,
                borderColor: '#0f172a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } }
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const provinceName = provincePie.data.labels[index];
                    updateDistrictChart(provinceName);
                }
            }
        }
    });
}

async function updateDistrictChart(provinceName) {
    try {
        const label = document.getElementById('districtChartLabel');
        if (label) label.textContent = `DISTRICTS IN ${provinceName.toUpperCase()}`;

        const { data, error } = await supabase.rpc('get_district_distribution', { p_province: provinceName });
        if (error) throw error;

        const ctx = document.getElementById('districtPieChart')?.getContext('2d');
        if (!ctx) return;

        if (districtPie) districtPie.destroy();

        districtPie = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(d => d.district),
                datasets: [{
                    data: data.map(d => d.post_count),
                    backgroundColor: ['#60a5fa', '#f87171', '#c084fc', '#fbbf24', '#4ade80', '#fb923c', '#22d3ee'],
                    borderColor: '#0f172a',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } catch (err) {
        console.error("District Drill-down Failure:", err);
    }
}

function renderLiveUsageHeartbeat(data) {
    const ctx = document.getElementById('activityLineGraph')?.getContext('2d');
    if (!ctx) return;

    if (activityLine) activityLine.destroy();

    const cyanGradient = ctx.createLinearGradient(0, 0, 0, 400);
    cyanGradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
    cyanGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

    activityLine = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => {
                const date = new Date(d.minute_timestamp);
                return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            }),
            datasets: [
                {
                    label: 'Platform Actions (Minute Heartbeat)',
                    data: data.map(d => d.action_count),
                    borderColor: '#06b6d4',
                    backgroundColor: cyanGradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2, 
                    pointHitRadius: 10,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, 
                    ticks: { color: '#64748b', font: { family: 'Space Grotesk', size: 10 } } 
                },
                x: { 
                    grid: { display: false }, 
                    ticks: { 
                        color: '#64748b', 
                        font: { family: 'Space Grotesk', size: 10 },
                        autoSkip: true,
                        maxTicksLimit: 12 
                    } 
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleFont: { family: 'Space Grotesk' },
                    bodyFont: { family: 'Inter' },
                    borderColor: '#06b6d4',
                    borderWidth: 1,
                    displayColors: false
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            }
        }
    });
}

// 4. User Management Table
let userPage = 1;
const ITEMS_PER_PAGE = 8;

async function fetchUserManagement() {
    try {
        const tableBody = document.getElementById('userTableBody');
        const pagination = document.getElementById('userPagination');
        if (!tableBody) return;

        const { data, error } = await supabase
            .from('profiles')
            .select('*, posts(count)')
            .order('full_name', { ascending: true });

        if (error) throw error;

        // Client-side Pagination
        const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
        const start = (userPage - 1) * ITEMS_PER_PAGE;
        const pageData = data.slice(start, start + ITEMS_PER_PAGE);

        tableBody.innerHTML = pageData.map(user => {
            const postCount = user.posts?.[0]?.count || 0;
            const statusClass = user.is_banned ? 'banned' : 'active';
            const statusText = user.is_banned ? 'Banned' : 'Active';

            // Format joined date with exact time
            const dateObj = new Date(user.created_at);
            const joinedDate = isNaN(dateObj.getTime()) ? 'N/A' :
                dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
                ' ' + dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const avatar = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=1e293b&color=fff`;

            return `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            <img src="${avatar}" class="user-avatar" style="width:28px; height:28px;">
                            <span>${user.full_name}</span>
                        </div>
                    </td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>${postCount}</td>
                    <td class="joined-col">${joinedDate}</td>
                    <td><code style="font-size: 10px; opacity: 0.6;">${user.device_token ? user.device_token.slice(0, 8) + '...' : 'N/A'}</code></td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon ${user.is_banned ? 'success' : 'danger'} ban-btn" 
                                    data-id="${user.id}" 
                                    data-banned="${user.is_banned}" 
                                    data-token="${user.device_token || ''}"
                                    title="${user.is_banned ? 'Unban & Restore' : 'Ban User'}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        renderPagination(pagination, userPage, totalPages, (p) => {
            userPage = p;
            fetchUserManagement();
        });

        // Bind Ban Listeners
        tableBody.querySelectorAll('.ban-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const isBanned = e.currentTarget.dataset.banned === 'true';
                const token = e.currentTarget.dataset.token;

                if (isBanned) {
                    if (confirm(`Restore access for this user? This will clear their ban.`)) {
                        await supabase.rpc('hakim_unban_user', { p_device_token: token });
                        showToast('Intelligence restriction lifted.');
                        fetchUserManagement();
                    }
                } else {
                    const reason = prompt("Enter Ban Reason (Violations, Spam, etc.):");
                    if (reason) {
                        await supabase.rpc('hakim_ban_user', { p_user_id: id, p_reason: reason });
                        showToast('Target restricted and locked out.');
                        fetchUserManagement();
                    }
                }
            });
        });
    } catch (err) {
        console.error("User Management Failure:", err);
    }
}

// 5. Post Management Table
let postPage = 1;

async function fetchPostManagement() {
    try {
        const tableBody = document.getElementById('postTableBody');
        const pagination = document.getElementById('postPagination');
        if (!tableBody) return;

        const { data, error } = await supabase
            .from('posts')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Client-side Pagination
        const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
        const start = (postPage - 1) * ITEMS_PER_PAGE;
        const pageData = data.slice(start, start + ITEMS_PER_PAGE);

        tableBody.innerHTML = pageData.map(post => {
            const author = post.profiles?.full_name || 'Anonymous';
            const status = post.status || 'Open';
            const snippet = truncate(post.content, 40);

            // Format precise post date
            const dateObj = new Date(post.created_at);
            const postDate = isNaN(dateObj.getTime()) ? 'N/A' :
                dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
                ' ' + dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

            return `
                <tr>
                    <td class="joined-col">${postDate}</td>
                    <td>${snippet}</td>
                    <td>${author}</td>
                    <td>${post.province || 'N/A'}</td>
                    <td>${post.district || 'N/A'}</td>
                    <td><span class="badge ${status.toLowerCase()}">${status}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon moderate-btn" data-id="${post.id}" title="God Mode Moderate">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                            </button>
                            <button class="btn-icon danger delete-btn" data-id="${post.id}" title="Delete Post">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        renderPagination(pagination, postPage, totalPages, (p) => {
            postPage = p;
            fetchPostManagement();
        });

        setupPostActions(tableBody, data);
    } catch (err) {
        console.error("Post Management Failure:", err);
    }
}

function setupPostActions(container, posts) {
    container.querySelectorAll('.moderate-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const post = posts.find(p => p.id === id);
            if (!post) return;

            const safeSetVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };

            safeSetVal('godModePostId', post.id);
            safeSetVal('godModeContent', post.content);
            safeSetVal('godModeAgreeOffset', post.agree_offset || 0);
            safeSetVal('godModeDisagreeOffset', post.disagree_offset || 0);
            safeSetVal('godModeFeedback', post.admin_feedback || '');

            const modal = document.getElementById('godModeModal');
            if (modal) {
                modal.classList.remove('hidden');
                if (typeof gsap !== 'undefined') {
                    gsap.fromTo(modal.querySelector('.tactical-modal'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 });
                }
            }
        });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm("Permanently delete this Gunaso intelligence?")) {
                await supabase.from('posts').delete().eq('id', id);
                fetchPostManagement();
                updateStats();
            }
        });
    });
}

// 6. Appeals Management
async function fetchAppeals() {
    try {
        const tableBody = document.getElementById('appealsTableBody');
        if (!tableBody) return;

        const { data, error } = await supabase
            .from('ban_appeals')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Appeals Fetch error:", error);
            return;
        }

        if (!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; opacity:0.5;">No pending appeals intelligence found.</td></tr>';
            return;
        }

        tableBody.innerHTML = data.map(appeal => {
            const dateObj = new Date(appeal.created_at);
            const dateStr = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
                ' ' + dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            return `
                <tr>
                    <td>${dateStr}</td>
                    <td>${appeal.contact_email}</td>
                    <td><code style="font-size:10px;">${appeal.device_token}</code></td>
                    <td>${appeal.reason || 'No reason provided'}</td>
                    <td>
                        <button class="tactical-btn-small success resolve-appeal" data-token="${appeal.device_token}" data-id="${appeal.id}">APPROVE</button>
                    </td>
                </tr>
            `;
        }).join('');

        tableBody.querySelectorAll('.resolve-appeal').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const token = e.currentTarget.dataset.token;
                const appealId = e.currentTarget.dataset.id;
                if (confirm(`Approve appeal and restore device ${token}?`)) {
                    await supabase.rpc('hakim_unban_user', { p_device_token: token });
                    await supabase.from('ban_appeals').update({ status: 'resolved' }).eq('id', appealId);
                    showToast('Access restored for target device.');
                    fetchAppeals();
                    fetchUserManagement();
                }
            });
        });
    } catch (err) {
        console.error("Appeals Failure:", err);
    }
}

// 7. Overrides & Events
function setupEventListeners() {
    const safeAddEvent = (id, event, cb) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, cb);
    };

    safeAddEvent('logoutBtn', 'click', () => {
        supabase.auth.signOut().then(() => window.location.replace('index.html'));
    });

    safeAddEvent('closeGodModeBtn', 'click', () => {
        const modal = document.getElementById('godModeModal');
        if (modal) modal.classList.add('hidden');
    });

    safeAddEvent('godModeForm', 'submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'EXECUTING...';
        }

        try {
            const payload = {
                p_id: document.getElementById('godModePostId').value,
                p_content: document.getElementById('godModeContent').value,
                p_agree_offset: parseInt(document.getElementById('godModeAgreeOffset').value),
                p_disagree_offset: parseInt(document.getElementById('godModeDisagreeOffset').value),
                p_feedback: document.getElementById('godModeFeedback').value
            };

            const { error } = await supabase.rpc('admin_override_post', payload);

            if (error) throw error;

            const modal = document.getElementById('godModeModal');
            if (modal) modal.classList.add('hidden');
            fetchPostManagement();
            showToast('Override Success.');
        } catch (err) {
            alert('Override Aborted: ' + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'EXECUTE OVERRIDE';
            }
        }
    });

    safeAddEvent('langToggle', 'click', () => {
        const currentLang = localStorage.getItem('hg_lang') || 'en';
        const newLang = currentLang === 'en' ? 'np' : 'en';
        localStorage.setItem('hg_lang', newLang);
        showToast(`System Lexicon Swapped to ${newLang.toUpperCase()}`);
        // In a real app, this would trigger a re-render of all text
    });

    // Wire up Export Buttons
    document.querySelectorAll('.panel-action.secondary').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const panelTitle = e.target.closest('.tactical-panel').querySelector('h3').textContent;
            if (panelTitle.includes('USER')) {
                exportTableToCSV('userTable', 'hakim_users_export.csv');
            } else if (panelTitle.includes('POST')) {
                exportTableToCSV('postTable', 'hakim_posts_export.csv');
            }
        });
    });

    // System Online Toggle
    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
        statusIndicator.style.cursor = 'pointer';
        statusIndicator.addEventListener('click', () => {
            const dot = statusIndicator.querySelector('.status-dot');
            const isOnline = !statusIndicator.textContent.includes('OFFLINE');

            if (isOnline) {
                statusIndicator.style.color = 'var(--accent-red)';
                if (dot) dot.style.background = 'var(--accent-red)';
                statusIndicator.innerHTML = '<span class="status-dot" style="background:var(--accent-red)"></span> SYSTEM OFFLINE';
                showToast('Platform restricted. Maintenance mode active.');
            } else {
                statusIndicator.style.color = 'var(--accent-green)';
                if (dot) dot.style.background = 'var(--accent-green)';
                statusIndicator.innerHTML = '<span class="status-dot" style="background:var(--accent-green)"></span> SYSTEM ONLINE';
                showToast('Platform live. Tactical operations resumed.');
            }
        });
    }
}

function exportTableToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;

    let csv = [];
    const rows = table.querySelectorAll('tr');

    for (const row of rows) {
        const cols = row.querySelectorAll('td, th');
        const rowData = Array.from(cols).map(col => `"${col.textContent.trim().replace(/"/g, '""')}"`);
        csv.push(rowData.join(','));
    }

    const csvFile = new Blob([csv.join('\n')], { type: 'text/csv' });
    const downloadLink = document.createElement('a');
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showToast(`Export Complete: ${filename}`);
}

// --- Helpers ---
function renderPagination(container, current, total, onPageChange) {
    if (!container) return;
    if (total <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button class="tactical-btn-small" ${current === 1 ? 'disabled' : ''} id="prevPage">PREV</button>
        <span style="font-size: 0.7rem; font-weight:700; display:flex; align-items:center; padding:0 0.5rem; color:var(--text-muted);">
            PAGE ${current} / ${total}
        </span>
        <button class="tactical-btn-small" ${current === total ? 'disabled' : ''} id="nextPage">NEXT</button>
    `;

    container.innerHTML = html;

    const prev = container.querySelector('#prevPage');
    const next = container.querySelector('#nextPage');

    if (prev) prev.onclick = () => onPageChange(current - 1);
    if (next) next.onclick = () => onPageChange(current + 1);
}

function truncate(str, len) {
    if (!str) return "";
    if (str.length <= len) return str;
    return str.slice(0, len) + '...';
}

function getTimeAgo(date) {
    if (!date) return "N/A";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
}

function getColorForCount(d) {
    return d > 50 ? '#ef4444' :
        d > 20 ? '#f97316' :
            d > 10 ? '#f59e0b' :
                d > 5 ? '#eab308' :
                    d > 2 ? '#84cc16' :
                        d > 0 ? '#22c55e' :
                            '#334155';
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'tactical-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: var(--panel-bg);
        border: 1px solid var(--accent-blue);
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.8rem;
        z-index: 9999;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}