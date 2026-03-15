/* hakim.js - Superadmin Logic */

// Connect to Superbase (using same credentials from app.js)
const SUPABASE_URL = 'https://palifzjzhayfwtybtqmb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbGlmemp6aGF5Znd0eWJ0cW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4Mjg0NzAsImV4cCI6MjA4ODQwNDQ3MH0.Wr9nFeME3c5AbCQSTtpi_SHQ16dLklLDXoS7fIWdGP8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_EMAIL = 'shrawanb121@gmail.com';

let currentFilter = 'all';
let allPosts = []; // Store locally for filtering

// 1. Core Security Check on Load
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session || session.user.email !== ADMIN_EMAIL) {
        // Kick them out immediately without rendering
        window.location.replace('index.html');
        return;
    }

    // Auth passed. Show the body.
    document.body.style.display = 'flex';
    document.getElementById('adminEmailDisplay').textContent = session.user.email;

    // Initialize Dashboard Data
    await loadDashboardStats();
    await fetchAdminFeed();
});

// 2. Fetch Aggregated Stats
async function loadDashboardStats() {
    try {
        // Total Users
        const { count: userCount, error: userErr } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (!userErr) document.getElementById('stat-users').textContent = userCount;

        // Total Posts
        const { count: postCount, error: postErr } = await supabase.from('posts').select('*', { count: 'exact', head: true });
        if (!postErr) document.getElementById('stat-posts').textContent = postCount;

        // Total Comments
        const { count: commentCount, error: commentErr } = await supabase.from('post_comments').select('*', { count: 'exact', head: true });
        if (!commentErr) document.getElementById('stat-comments').textContent = commentCount;

        // Active Private Links (posts where external_link is not null and is_link_public = false)
        const { count: linkCount, error: linkErr } = await supabase.from('posts').select('*', { count: 'exact', head: true })
            .not('external_link', 'is', null).eq('is_link_public', false);
        if (!linkErr) document.getElementById('stat-links').textContent = linkCount;

    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

// 3. Fetch Main Data Feed
async function fetchAdminFeed() {
    const feedContainer = document.getElementById('adminDataFeed');
    feedContainer.innerHTML = 'Loading secure data...';

    // We fetch EVERYTHING. Policies allow this.
    const { data, error } = await supabase
        .from('posts')
        .select(`
            *,
            profiles (full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        feedContainer.innerHTML = `<div style="color:var(--primary); padding:2rem;">Error: ${error.message}</div>`;
        return;
    }

    allPosts = data;
    renderTable();
}

// 4. Render the Data as Accordions
function renderTable() {
    const feedContainer = document.getElementById('adminDataFeed');

    let filteredData = allPosts.filter(post => {
        if (currentFilter === 'all') return true;
        return post.type === currentFilter;
    });

    if (!filteredData || filteredData.length === 0) {
        feedContainer.innerHTML = '<div style="padding: 2rem; color: var(--text-light);">No data found.</div>';
        return;
    }

    // Grouping: Province -> District -> Posts
    const grouped = {};
    filteredData.forEach(post => {
        const prov = post.province || 'Unknown Province';
        const dist = post.district || 'Unknown District';
        if (!grouped[prov]) grouped[prov] = { count: 0, districts: {} };
        if (!grouped[prov].districts[dist]) grouped[prov].districts[dist] = [];
        grouped[prov].districts[dist].push(post);
        grouped[prov].count++;
    });

    let accordionHTML = '';

    for (const [provName, provData] of Object.entries(grouped)) {
        const provId = `prov-${provName.replace(/\s+/g, '-')}`;
        accordionHTML += `
            <div class="province-group">
                <div class="province-header" onclick="toggleAccordion('${provId}')">
                    <span>${provName} <span class="count-badge">${provData.count}</span></span>
                    <svg class="accordion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="district-list" id="${provId}">
        `;

        for (const [distName, posts] of Object.entries(provData.districts)) {
            const distId = `dist-${distName.replace(/\s+/g, '-')}-${provId}`;
            accordionHTML += `
                <div class="district-group">
                    <div class="district-header" onclick="toggleAccordion('${distId}')">
                        <span>${distName} <span style="color:var(--text-light); font-weight:400; font-size:0.85rem; margin-left:0.5rem;">(${posts.length})</span></span>
                        <svg class="accordion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                    <div class="posts-container" id="${distId}">
            `;

            posts.forEach(post => {
                const dateStr = new Date(post.created_at).toLocaleString();
                const profile = post.profiles;
                let authorStr = 'Unknown';
                if (profile) {
                    authorStr = `${post.is_anonymous ? 'Anon' : profile.full_name}`;
                }

                const typeBadgeStyle = post.type === 'problem' ? 'background:#fee2e2; color:#b91c1c;' : 'background:#f0f7ff; color:#0056b3;';
                const typeBadge = `<span style="padding:0.2rem 0.5rem; border-radius:100px; font-size:0.7rem; font-weight:700; text-transform:uppercase; ${typeBadgeStyle}">${post.type}</span>`;

                let mediaHtml = '';
                if (post.external_link) {
                    const linkColor = post.is_link_public ? 'var(--secondary)' : 'var(--primary)';
                    mediaHtml += `
                        <a href="${post.external_link}" target="_blank" rel="noopener noreferrer" style="color:${linkColor}; font-size:0.8rem; display:inline-flex; align-items:center; gap:0.25rem; font-weight:600; text-decoration:none; margin-left:1rem; background: #fff; padding: 0.2rem 0.6rem; border-radius: 4px; border: 1px solid var(--border);">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                            ${post.is_link_public ? 'Public Link' : 'PRIVATE Link'}
                        </a>
                    `;
                }

                const pinnedClass = post.is_pinned ? 'pinned' : '';
                const pinBtnClass = post.is_pinned ? 'active' : '';

                accordionHTML += `
                    <div class="admin-post-card ${pinnedClass}" id="admin-post-${post.id}">
                        <div class="admin-post-header">
                            <div>
                                <div class="admin-author-info">${authorStr} ${typeBadge}</div>
                                <div class="admin-post-meta">
                                    <span>${dateStr}</span>
                                    <span>${post.agree_count || 0} Agree / ${post.disagree_count || 0} Disagree</span>
                                    ${mediaHtml}
                                </div>
                            </div>
                        </div>
                        <div class="admin-post-content">${escapeHTML(post.content)}</div>
                        ${post.admin_feedback ? `<div style="background:#fffbeb; color:#d97706; padding:0.5rem; font-size:0.85rem; border-radius:4px; margin-bottom:1rem; border:1px dashed #fde68a;"><strong>Admin Note:</strong> ${escapeHTML(post.admin_feedback)}</div>` : ''}
                        
                        <div class="admin-actions-bar">
                            <button class="admin-btn edit-god-mode-btn" data-id="${post.id}" title="God Mode Edit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button class="admin-btn pin-btn ${pinBtnClass}" data-id="${post.id}" data-pinned="${post.is_pinned}" title="Pin/Unpin">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                            </button>
                            <button class="admin-btn delete-btn" data-id="${post.id}" title="Delete Post">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                `;
            });

            accordionHTML += `</div></div>`; // End posts-container, End district-group
        }
        accordionHTML += `</div></div>`; // End district-list, End province-group
    }

    feedContainer.innerHTML = accordionHTML;
    bindAdminEvents();
}

// Helper to toggle accordions
window.toggleAccordion = function (id) {
    const el = document.getElementById(id);
    const header = el.previousElementSibling;

    el.classList.toggle('active');
    header.classList.toggle('active');
};

// 5. Event Listeners for Filters & Actions
function bindAdminEvents() {
    // Delete Listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm("HAKIM OVERRIDE: Are you absolutely sure you want to permanently delete this post and all its comments?")) {
                const card = document.getElementById(`admin-post-${id}`);
                gsap.to(card, { opacity: 0.5, pointerEvents: 'none', duration: 0.2 });

                const { error } = await supabase.from('posts').delete().eq('id', id);
                if (error) {
                    alert('Deletion failed: ' + error.message);
                    gsap.to(card, { opacity: 1, pointerEvents: 'all', duration: 0.2 });
                } else {
                    gsap.to(card, {
                        opacity: 0, height: 0, marginTop: 0, marginBottom: 0, duration: 0.4,
                        onComplete: () => {
                            card.remove();
                            // Optional: locally remove from allPosts to keep counts accurate if re-rendered
                            allPosts = allPosts.filter(p => p.id !== id);
                            loadDashboardStats();
                        }
                    });
                }
            }
        });
    });

    // Pin Listeners
    document.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const isCurrentlyPinned = e.currentTarget.dataset.pinned === 'true';

            e.currentTarget.style.opacity = '0.5';

            const { error } = await supabase.from('posts').update({ is_pinned: !isCurrentlyPinned }).eq('id', id);

            if (error) {
                alert('Pinning failed: ' + error.message);
                e.currentTarget.style.opacity = '1';
            } else {
                const post = allPosts.find(p => p.id === id);
                if (post) post.is_pinned = !isCurrentlyPinned;
                renderTable();
            }
        });
    });

    // God Mode Edit Open
    document.querySelectorAll('.edit-god-mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const post = allPosts.find(p => p.id === id);
            if (!post) return;

            document.getElementById('godModePostId').value = post.id;
            document.getElementById('godModeContent').value = post.content || '';

            // We use offsets, but initialize them at 0 conceptually. 
            // In a real sophisticated system, we'd load existing overrides. We'll default to 0.
            document.getElementById('godModeAgreeOffset').value = 0;
            document.getElementById('godModeDisagreeOffset').value = 0;

            document.getElementById('godModeFeedback').value = post.admin_feedback || '';

            const modal = document.getElementById('godModeModal');
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            gsap.fromTo(modal.querySelector('.modal'), { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3 });
        });
    });
}

// Filter listeners
document.querySelectorAll('.data-filters button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.data-filters button').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentFilter = e.currentTarget.dataset.filter;
        renderTable();
    });
});

// Modal Close Listeners
function closeGodModeModal() {
    const modal = document.getElementById('godModeModal');
    gsap.to(modal.querySelector('.modal'), {
        scale: 0.95, opacity: 0, duration: 0.2, onComplete: () => {
            modal.classList.add('hidden');
        }
    });
}

document.getElementById('closeGodModeBtn').addEventListener('click', closeGodModeModal);

// God Mode Form Submit Handler
document.getElementById('godModeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const id = document.getElementById('godModePostId').value;
    const newContent = document.getElementById('godModeContent').value;
    const agreeOffset = parseInt(document.getElementById('godModeAgreeOffset').value, 10) || 0;
    const disagreeOffset = parseInt(document.getElementById('godModeDisagreeOffset').value, 10) || 0;
    const adminFeedback = document.getElementById('godModeFeedback').value;

    const { data, error } = await supabase.rpc('admin_override_post', {
        p_id: id,
        p_content: newContent,
        p_agree_offset: agreeOffset,
        p_disagree_offset: disagreeOffset,
        p_feedback: adminFeedback
    });

    btn.textContent = 'Save Overrides';
    btn.disabled = false;

    if (error) {
        alert('Failed to override post: ' + error.message);
    } else {
        closeGodModeModal();
        // Re-fetch to guarantee accurate fresh counts and content
        await fetchAdminFeed();
    }
});

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

