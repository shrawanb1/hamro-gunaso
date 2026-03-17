/* HAKIM TACTICAL COMMAND CENTER - MAIN LOGIC */

const SUPABASE_URL = 'https://palifzjzhayfwtybtqmb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbGlmemp6aGF5Znd0eWJ0cW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4Mjg0NzAsImV4cCI6MjA4ODQwNDQ3MH0.Wr9nFeME3c5AbCQSTtpi_SHQ16dLklLDXoS7fIWdGP8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_EMAIL = 'shrawanb121@gmail.com';
const NEPAL_GEOJSON_URL = 'https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-states.geojson';

let map, provinceChart;
let currentUser = null;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session || session.user.email !== ADMIN_EMAIL) {
        window.location.replace('index.html');
        return;
    }

    currentUser = session.user;
    document.body.style.display = 'flex';

    // Initialize Dashboard Components
    initDashboard();
});

async function initDashboard() {
    await updateStats();
    await fetchActivityFeed();
    await initMapAndChart();
    await fetchUserManagement();
    await fetchPostManagement();
    await fetchAppeals();

    // Setup Auto-refresh (Every 2 minutes)
    setInterval(updateStats, 120000);
    setInterval(fetchActivityFeed, 120000);
    setInterval(fetchAppeals, 60000); // Check appeals every minute

    // Event Listeners
    setupEventListeners();
}

// 1. Statistics Bar
async function updateStats() {
    const { data, error } = await supabase.rpc('get_admin_stats');
    if (error) {
        console.error('Stats Error:', error);
        return;
    }

    document.querySelector('#card-total-posts .metric-value').textContent = data.total_posts.toLocaleString();
    document.querySelector('#card-resolved-posts .metric-value').textContent = data.resolved_posts.toLocaleString();
    document.querySelector('#card-pending-posts .metric-value').textContent = data.pending_posts.toLocaleString();
    document.querySelector('#card-total-users .metric-value').textContent = data.total_users.toLocaleString();
}

// 2. Recent Activities Feed
async function fetchActivityFeed() {
    const container = document.getElementById('activityFeed');

    const [postsRes, commentsRes] = await Promise.all([
        supabase.from('posts').select('id, content, type, created_at, profiles(full_name, avatar_url)').order('created_at', { ascending: false }).limit(5),
        supabase.from('post_comments').select('id, content, created_at, profiles(full_name, avatar_url)').order('created_at', { ascending: false }).limit(5)
    ]);

    const activities = [
        ...(postsRes.data || []).map(p => ({ ...p, act_type: 'post' })),
        ...(commentsRes.data || []).map(c => ({ ...c, act_type: 'comment' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
}

// 3. Interactive Map & Chart
async function initMapAndChart() {
    // Fetch counts from DB
    const { data: distData, error: distError } = await supabase.rpc('get_province_distribution');
    if (distError) return;

    const counts = {};
    distData.forEach(d => { counts[d.province] = d.post_count; });

    // Initialize Leaflet Map
    if (!map) {
        map = L.map('nepalMap', { zoomControl: false, attributionControl: false }).setView([28.3949, 84.1240], 7);
        const geoData = await fetch(NEPAL_GEOJSON_URL).then(r => r.json());

        L.geoJSON(geoData, {
            style: (feature) => {
                const name = feature.properties.name || feature.properties.STATE_NAME;
                const count = counts[name] || 0;
                return {
                    fillColor: getColorForCount(count),
                    weight: 1,
                    opacity: 1,
                    color: '#1e293b',
                    fillOpacity: 0.7
                };
            },
            onEachFeature: (feature, layer) => {
                const name = feature.properties.name || feature.properties.STATE_NAME;
                layer.bindTooltip(`<strong>${name}</strong>: ${counts[name] || 0} Posts`, { sticky: true });
            }
        }).addTo(map);
    }

    // Initialize Chart.js
    const ctx = document.getElementById('provinceChart').getContext('2d');
    if (provinceChart) provinceChart.destroy();

    provinceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: distData.map(d => d.province),
            datasets: [{
                label: 'Posts',
                data: distData.map(d => d.post_count),
                backgroundColor: '#3b82f6',
                borderColor: '#60a5fa',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// 4. User Management Table
async function fetchUserManagement() {
    const tableBody = document.getElementById('userTableBody');

    // Fetch users (profiles) and join with post count check
    const { data, error } = await supabase
        .from('profiles')
        .select('*, posts(count)')
        .order('full_name', { ascending: true });

    if (error) return;

    tableBody.innerHTML = data.map(user => {
        const postCount = user.posts?.[0]?.count || 0;
        const statusClass = user.is_banned ? 'banned' : 'active';
        const statusText = user.is_banned ? 'Banned' : 'Active';
        const joinedDate = new Date(user.updated_at).toLocaleDateString(); // Note: updated_at for joined date if no created_at
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
                <td>${joinedDate}</td>
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
                    fetchAppeals();
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
}

// 5. Post Management Table
async function fetchPostManagement() {
    const tableBody = document.getElementById('postTableBody');

    const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

    if (error) return;

    tableBody.innerHTML = data.map(post => {
        const author = post.profiles?.full_name || 'Anonymous';
        const status = post.status || 'Open';
        const snippet = truncate(post.content, 40);

        return `
            <tr>
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

    // Bind Post Listeners
    setupPostActions(tableBody, data);
}

function setupPostActions(container, posts) {
    container.querySelectorAll('.moderate-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const post = posts.find(p => p.id === id);
            if (!post) return;

            document.getElementById('godModePostId').value = post.id;
            document.getElementById('godModeContent').value = post.content;
            document.getElementById('godModeAgreeOffset').value = post.agree_offset || 0;
            document.getElementById('godModeDisagreeOffset').value = post.disagree_offset || 0;
            document.getElementById('godModeFeedback').value = post.admin_feedback || '';

            const modal = document.getElementById('godModeModal');
            modal.classList.remove('hidden');
            gsap.fromTo(modal.querySelector('.tactical-modal'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 });
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

// 6. Overrides & Events
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        supabase.auth.signOut().then(() => window.location.replace('index.html'));
    });

    document.getElementById('closeGodModeBtn').addEventListener('click', () => {
        document.getElementById('godModeModal').classList.add('hidden');
    });

    document.getElementById('godModeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'EXECUTING...';

        const payload = {
            p_id: document.getElementById('godModePostId').value,
            p_content: document.getElementById('godModeContent').value,
            p_agree_offset: parseInt(document.getElementById('godModeAgreeOffset').value),
            p_disagree_offset: parseInt(document.getElementById('godModeDisagreeOffset').value),
            p_feedback: document.getElementById('godModeFeedback').value
        };

        const { error } = await supabase.rpc('admin_override_post', payload);

        btn.disabled = false;
        btn.textContent = 'EXECUTE OVERRIDE';

        if (error) {
            alert('Override Aborted: ' + error.message);
        } else {
            document.getElementById('godModeModal').classList.add('hidden');
            fetchPostManagement();
        }
    });

    // Language Toggle Tooltip (Mock)
    document.getElementById('langToggle').addEventListener('click', () => {
        alert('Translation System Integrated - Swapping Lexicon...');
    });
}

// --- Helpers ---
function truncate(str, len) {
    if (str.length <= len) return str;
    return str.slice(0, len) + '...';
}

function getTimeAgo(date) {
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
 
 / /   - - -   A p p e a l s   M a n a g e m e n t   - - -  
 a s y n c   f u n c t i o n   f e t c h A p p e a l s ( )   {  
         c o n s t   t a b l e B o d y   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' a p p e a l s T a b l e B o d y ' ) ;  
         c o n s t   {   d a t a ,   e r r o r   }   =   a w a i t   s u p a b a s e . f r o m ( ' b a n _ a p p e a l s ' ) . s e l e c t ( ' * ' ) . e q ( ' s t a t u s ' ,   ' p e n d i n g ' ) . o r d e r ( ' c r e a t e d _ a t ' ,   {   a s c e n d i n g :   f a l s e   } ) ;  
  
         i f   ( e r r o r   | |   ! d a t a   | |   d a t a . l e n g t h   = = =   0 )   {  
                 r e t u r n ;  
         }  
  
         t a b l e B o d y . i n n e r H T M L   =   d a t a . m a p ( a p p e a l   = >   {  
                 c o n s t   d a t e   =   n e w   D a t e ( a p p e a l . c r e a t e d _ a t ) . t o L o c a l e D a t e S t r i n g ( ) ;  
 