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
            profiles (full_name, avatar_url, email)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        feedContainer.innerHTML = `<div style="color:var(--primary); padding:2rem;">Error: ${error.message}</div>`;
        return;
    }

    allPosts = data;
    renderTable();
}

// 4. Render the Data Table
function renderTable() {
    const feedContainer = document.getElementById('adminDataFeed');

    const filteredData = allPosts.filter(post => {
        if (currentFilter === 'all') return true;
        return post.type === currentFilter;
    });

    if (!filteredData || filteredData.length === 0) {
        feedContainer.innerHTML = '<div style="padding: 2rem; color: var(--text-light);">No data found.</div>';
        return;
    }

    let tableHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Author</th>
                    <th>Type</th>
                    <th style="width:35%;">Snippet</th>
                    <th>Media/Links</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredData.forEach(post => {
        const dateStr = new Date(post.created_at).toLocaleString();
        const profile = post.profiles;
        let authorStr = 'Unknown';
        if (profile) {
            authorStr = `<strong>${post.is_anonymous ? 'Anon (' + profile.email + ')' : profile.full_name}</strong>`;
        }

        const typeBadgeStyle = post.type === 'problem' ? 'background:#fee2e2; color:#b91c1c;' : 'background:#f0f7ff; color:#0056b3;';
        const typeBadge = `<span style="padding:0.25rem 0.6rem; border-radius:100px; font-size:0.75rem; font-weight:700; text-transform:uppercase; ${typeBadgeStyle}">${post.type}</span>`;

        let mediaHtml = '';
        if (post.media_links && post.media_links.length > 0) {
            mediaHtml += `<span style="color:var(--text-light); font-size:0.8rem; display:block;">${post.media_links.length} Add-on(s)</span>`;
        }
        if (post.external_link) {
            const linkColor = post.is_link_public ? 'var(--secondary)' : 'var(--primary)';
            mediaHtml += `
                <a href="${post.external_link}" target="_blank" rel="noopener noreferrer" style="color:${linkColor}; font-size:0.8rem; display:flex; align-items:center; gap:0.25rem; font-weight:600; text-decoration:none;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    ${post.is_link_public ? 'Public Link' : 'PRIVATE Link'}
                </a>
            `;
        }
        if (!mediaHtml) mediaHtml = '<span style="color:var(--text-light); font-size:0.8rem;">None</span>';

        const pinnedClass = post.is_pinned ? 'active' : '';

        tableHTML += `
            <tr id="admin-row-${post.id}">
                <td data-label="Date" style="color:var(--text-light); font-size:0.85rem;">${dateStr}</td>
                <td data-label="Author">${authorStr}</td>
                <td data-label="Type">${typeBadge}</td>
                <td data-label="Snippet">
                    <div class="post-snippet">${escapeHTML(post.content)}</div>
                </td>
                <td data-label="Attachments">${mediaHtml}</td>
                <td data-label="Actions">
                    <div class="admin-action-col">
                        <button class="admin-btn pin-btn ${pinnedClass}" data-id="${post.id}" data-pinned="${post.is_pinned}" title="Pin/Unpin">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                        </button>
                        <button class="admin-btn delete-btn" data-id="${post.id}" title="Delete Post">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    feedContainer.innerHTML = tableHTML;

    bindAdminEvents();
}

// 5. Event Listeners for Filters & Actions
function bindAdminEvents() {
    // Delete Listeners
    document.querySelectorAll('.admin-table .delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm("HAKIM OVERRIDE: Are you absolutely sure you want to permanently delete this post and all its comments?")) {
                const row = document.getElementById(`admin-row-${id}`);
                // Simple GSAP visual feedback before deleting
                gsap.to(row, { opacity: 0.5, pointerEvents: 'none', duration: 0.2 });

                const { error } = await supabase.from('posts').delete().eq('id', id);
                if (error) {
                    alert('Deletion failed: ' + error.message);
                    gsap.to(row, { opacity: 1, pointerEvents: 'all', duration: 0.2 });
                } else {
                    gsap.to(row, {
                        x: 50, opacity: 0, duration: 0.4,
                        onComplete: () => {
                            row.remove();
                            loadDashboardStats(); // refresh stats
                        }
                    });
                }
            }
        });
    });

    // Pin Listeners
    document.querySelectorAll('.admin-table .pin-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const isCurrentlyPinned = e.currentTarget.dataset.pinned === 'true';

            e.currentTarget.style.opacity = '0.5';

            const { error } = await supabase.from('posts').update({ is_pinned: !isCurrentlyPinned }).eq('id', id);

            if (error) {
                alert('Pinning failed: ' + error.message);
                e.currentTarget.style.opacity = '1';
            } else {
                // Instantly update local array and re-render
                const post = allPosts.find(p => p.id === id);
                if (post) post.is_pinned = !isCurrentlyPinned;
                renderTable();
            }
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

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
