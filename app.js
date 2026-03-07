
const initPreloader = () => {
    const runPreloader = () => {
        const preloader = document.getElementById('preloader');
        if (!preloader) return;

        const tl = gsap.timeline({
            onComplete: () => {
                preloader.style.display = 'none';
                document.body.style.overflow = 'auto'; 
                
                if (typeof animateHero === 'function') animateHero();
                
                
                gsap.fromTo(".navbar, .hero h1, .hero p, .toggle-group, .feed-grid", {
                    y: 20,
                    opacity: 0
                }, {
                    y: 0,
                    opacity: 1,
                    stagger: 0.1,
                    duration: 0.8,
                    ease: "power3.out"
                });
            }
        });

        tl.to(".preloader-logo", {
            duration: 1,
            y: -20,
            opacity: 1,
            ease: "back.out(1.7)"
        })
        .to(".preloader-logo", {
            duration: 0.8,
            y: 0,
            scale: 1.1,
            ease: "power2.inOut"
        }, "+=0.2")
        .to("#preloader", {
            duration: 1,
            y: "-100%",
            ease: "power4.inOut"
        }, "+=0.3");
    };

    if (document.readyState === 'complete') {
        runPreloader();
    } else {
        window.addEventListener('load', runPreloader);
    }
};


initPreloader();
// Fail-safe to remove preloader if network stalls
setTimeout(() => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        gsap.to(preloader, { opacity: 0, duration: 1, onComplete: () => preloader.remove() });
        document.body.style.overflow = 'auto';
        // Force show feed/hero if they are still hidden
        gsap.to(['.navbar', '.hero', '.controls', '.feed-grid'], { opacity: 1, duration: 0.5, stagger: 0.1 });
    }
}, 4000);

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '20px', left: '50%', transform: 'translate(-50%, 50px)',
        background: type === 'success' ? 'var(--secondary)' : 'var(--primary)',
        color: '#fff', padding: '12px 24px', borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)', zIndex: '9999', opacity: '0', fontWeight: '500',
        pointerEvents: 'none'
    });
    document.body.appendChild(toast);
    if(typeof gsap !== 'undefined') {
        gsap.to(toast, { y: -20, opacity: 1, duration: 0.4, ease: 'power2.out' });
        setTimeout(() => {
            gsap.to(toast, { y: 20, opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: () => toast.remove() });
        }, 4000);
    } else {
        toast.style.transform = 'translate(-50%, -20px)';
        toast.style.opacity = '1';
        setTimeout(() => toast.remove(), 4000);
    }
}

const SUPABASE_URL = 'https://palifzjzhayfwtybtqmb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbGlmemp6aGF5Znd0eWJ0cW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4Mjg0NzAsImV4cCI6MjA4ODQwNDQ3MH0.Wr9nFeME3c5AbCQSTtpi_SHQ16dLklLDXoS7fIWdGP8';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


const locationData = { "Koshi": ["Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga", "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung", "Terhathum", "Udayapur"], "Madhesh": ["Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat", "Saptari", "Sarlahi", "Siraha"], "Bagmati": ["Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok", "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli", "Sindhupalchok"], "Gandaki": ["Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi", "Nawalpur", "Parbat", "Syangja", "Tanahun"], "Lumbini": ["Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi", "Kapilvastu", "Parasi", "Palpa", "Pyuthan", "Rolpa", "Rukum East", "Rupandehi"], "Karnali": ["Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu", "Rukum West", "Salyan", "Surkhet"], "Sudurpashchim": ["Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula", "Doti", "Kailali", "Kanchanpur"] };


const ADMIN_EMAIL = 'shrawanb121@gmail.com';
let currentUser = null;
let isAdmin = false;
let currentFilterType = 'problem'; 
let filterProvince = '';
let filterDistrict = '';
let turnstileWidgetId = null;
let turnstileCommentWidgetId = null;
let turnstileReportWidgetId = null;


let deviceId = localStorage.getItem('hg_device_id');
if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('hg_device_id', deviceId);
}

const translations = {
    en: {
        logoText: "Hamro <span>Gunaso</span>",
        postButton: "Post a Gunaso",
        loginSignup: "Log In / Sign Up",
        logout: "Logout",
        heroTitle: "Voices that shape the Nation.",
        heroSubtitle: "A transparent platform to report civic problems and suggest actionable suggestions. Let's build a better Nepal together.",
        filterProblem: "Problems",
        filterSuggestion: "Suggestions",
        categorizeBtn: "Categorize",
        loadingFeed: "Loading posts...",
        postModalTitle: "Post a Gunaso",
        labelProblem: "Problem",
        labelSuggestion: "Suggestion",
        postTypeLabel: "Gunaso Type",
        postContentPlaceholder: "Describe the issue or suggestion in detail...",
        postDistrictPlaceholder: "Select District",
        hideIdentity: "Hide my identity (Post Anonymously)",
        hideIdentityHelper: "Checking this hides your name from the public feed to protect you.",
        submitBtn: "Submit",
        editModalTitle: "Edit Gunaso",
        saveChangesBtn: "Save Changes",
        filterFeedTitle: "Filter Feed",
        allProvinces: "All Provinces",
        allDistricts: "All Districts",
        clearBtn: "Clear",
        applyFiltersBtn: "Apply Filters",
        loginRequiredTitle: "Login Required",
        loginRequiredDesc: "You must log in to participate. Your voice matters!",
        welcomeTitle: "Welcome to Hamro Gunaso",
        welcomeDesc: "Log in to safely voice your concerns.",
        emailPlaceholder: "Email Address",
        passwordPlaceholder: "Password",
        signInSubmit: "Sign In / Sign Up",
        orText: "OR",
        continueGoogle: "Continue with Google",
        agreeText: "Agree",
        disagreeText: "Disagree",
        anonCitizen: "Anonymous Citizen",
        anonUser: "Anonymous User",
        fetchingUpdates: "Fetching latest community updates...",
        errorFetching: "Error fetching posts. Please try again.",
        noSubmissions: "No submissions yet. Be the first to speak up!",
        editAction: "Edit",
        deleteAction: "Delete",
        cancelAction: "Cancel",
        flagAction: "Flag for review",
        deleteConfirm: "Are you sure you want to delete this Gunaso?",
        savingText: "Saving...",
        failedLoad: "Failed to load feed:",
        rateLimitTitle: "Limit Reached",
        rateLimitErrorGuest: "You have reached your guest limit of 5 posts for today. Please log in to post more, or try again tomorrow.",
        rateLimitErrorVerified: "You have reached the maximum verified limit of 50 posts for today. Please try again tomorrow.",
        commentsTitle: "Community Feedback",
        loadingComments: "Loading feedback...",
        commentPlaceholder: "Write your counter-statement or feedback...",
        postCommentBtn: "Post Feedback",
        commentAction: "Feedback",
        noComments: "No feedback yet. Be the first to share your perspective!",
        reportPostTitle: "Report Post",
        reportPostDesc: "Help us understand what's wrong with this post. Your report is anonymous.",
        reportReasonLabel: "Reason for reporting",
        reportPlaceholder: "Describe the issue (optional)...",
        reportSuccessTitle: "Report Received",
        reportSuccessDesc: "Thank you for helping keep our community safe. Our team will review this post shortly.",
        pinAction: "Pin to Top",
        unpinAction: "Unpin Post",
        pinnedBadge: "Pinned by Admin",
        adminAction: "Hamro Gunaso Admin"
    },
        np: {
        logoText: "हाम्रो <span>गुनासो</span>",
        postButton: "गुनासो राख्नुहोस्",
        loginSignup: "लगइन / साइन अप",
        logout: "लगआउट",
        heroTitle: "राष्ट्र निर्माण गर्ने आवाजहरू।",
        heroSubtitle: "नागरिकहरूलाई समस्या रिपोर्ट गर्न र समाधान प्रस्ताव गर्न सशक्त बनाउने पारदर्शी मञ्च।",
        filterProblem: "समस्याहरू",
        filterSuggestion: "सुझावहरू",
        categorizeBtn: "वर्गीकरण गर्नुहोस्",
        loadingFeed: "पोस्टहरू लोड हुँदैछ...",
        postModalTitle: "आफ्नो आवाज उठाउनुहोस्",
        labelProblem: "समस्या",
        labelSuggestion: "सुझाव",
        postTypeLabel: "गुनासो प्रकार",
        postProvincePlaceholder: "प्रदेश छान्नुहोस्",
        postDistrictPlaceholder: "जिल्ला छान्नुहोस्",
        postContentPlaceholder: "समस्या वा समाधानको विस्तृत विवरण दिनुहोस्...",
        hideIdentity: "मेरो पहिचान लुकाउनुहोस् (अज्ञात रूपमा पोस्ट गर्नुहोस्)",
        hideIdentityHelper: "तपाईंको सुरक्षाको लागि यसले सार्वजनिक फिडबाट तपाईंको नाम लुकाउँछ।",
        submitBtn: "पेश गर्नुहोस्",
        editModalTitle: "गुनासो सम्पादन गर्नुहोस्",
        saveChangesBtn: "परिवर्तनहरू सुरक्षित गर्नुहोस्",
        filterFeedTitle: "फिड फिल्टर गर्नुहोस्",
        allProvinces: "सबै प्रदेशहरू",
        allDistricts: "सबै जिल्लाहरू",
        clearBtn: "हटाउनुहोस्",
        applyFiltersBtn: "फिल्टर लागू गर्नुहोस्",
        loginRequiredTitle: "लगइन आवश्यक छ",
        loginRequiredDesc: "सहभागी हुनको लागि तपाईंले लगइन गर्नुपर्छ। तपाईंको आवाज महत्त्वपूर्ण छ!",
        welcomeTitle: "हाम्रो गुनासोमा स्वागत छ",
        welcomeDesc: "तपाईंका समस्याहरू सुरक्षित रूपमा राख्न लगइन गर्नुहोस्।",
        emailPlaceholder: "इमेल ठेगाना",
        passwordPlaceholder: "पासवर्ड",
        signInSubmit: "साइन इन / साइन अप",
        orText: "वा",
        continueGoogle: "Google सँग जारी राख्नुहोस्",
        agreeText: "सहमत",
        disagreeText: "असहमत",
        anonCitizen: "अज्ञात नागरिक",
        anonUser: "अज्ञात प्रयोगकर्ता",
        fetchingUpdates: "पछिल्ला अपडेटहरू ल्याउँदै...",
        noSubmissions: "यी फिल्टरहरूसँग मिल्ने कुनै गुनासो फेला परेन।",
        editAction: "सम्पादन",
        deleteAction: "मेटाउनुहोस्",
        deleteConfirm: "के तपाईं पक्का यो गुनासो मेटाउन चाहनुहुन्छ?",
        savingText: "सुरक्षित गर्दै...",
        failedLoad: "फिड लोड गर्न असफल:",
        rateLimitTitle: "सीमा पुग्यो",
        rateLimitErrorGuest: "तपाईंले पाहुनाको रूपमा आजको ५ पोस्टको सीमा पूरा गर्नुभएको छ। थप पोस्ट गर्न लगइन गर्नुहोस् वा भोलि फेरि प्रयास गर्नुहोस्।",
        rateLimitErrorVerified: "तपाईंले प्रमाणित प्रयोगकर्ताको रूपमा आजको ५० पोस्टको सीमा पूरा गर्नुभएको छ। कृपया भोलि फेरि प्रयास गर्नुहोस्।",
        commentsTitle: "सामुदायिक प्रतिक्रिया",
        loadingComments: "प्रतिक्रिया लोड हुँदैछ...",
        commentPlaceholder: "आफ्नो टिप्पणी वा प्रतिक्रिया लेख्नुहोस्...",
        postCommentBtn: "प्रतिक्रिया पोस्ट गर्नुहोस्",
        commentAction: "प्रतिक्रिया",
        noComments: "अझै कुनै प्रतिक्रिया छैन। आफ्नो विचार साझा गर्ने पहिलो हुनुहोस्!",
        reportPostTitle: "गुनासो रिपोर्ट गर्नुहोस्",
        reportPostDesc: "यो पोस्टमा के गलत छ भन्ने कुरा हामीलाई बुझ्न मदत गर्नुहोस्। तपाईंको रिपोर्ट गोप्य रहनेछ।",
        reportReasonLabel: "रिपोर्ट गर्नुको कारण",
        reportPlaceholder: "समस्याको विवरण दिनुहोस् (वैकल्पिक)...",
        reportSuccessTitle: "रिपोर्ट प्राप्त भयो",
        reportSuccessDesc: "हाम्रो समुदायलाई सुरक्षित राख्न मदत गर्नुभएकोमा धन्यवाद। हाम्रो टोलीले चाँडै यस पोस्टको समीक्षा गर्नेछ।",
        pinAction: "शीर्षमा पिन गर्नुहोस्",
        unpinAction: "पिन हटाउनुहोस्",
        pinnedBadge: "प्रशासकद्वारा पिन गरिएको",
        adminAction: "हाम्रो गुनासो एडमिन"
}
};

let currentLang = localStorage.getItem('language') || 'en';

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('language', lang);

    
    const langToggleBtn = document.getElementById('langToggle');
    if (langToggleBtn) {
        langToggleBtn.innerText = lang === 'en' ? 'EN' : 'ने';

        
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(langToggleBtn, { scale: 0.8 }, { scale: 1, duration: 0.3, ease: 'back.out(1.5)' });
        }
    }

    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = translations[lang][key];
        if (translation) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                el.innerHTML = translation;
            }
        }
    });
}


const feedContainer = document.getElementById('feed');
const loginBtn = document.getElementById('loginBtn');
const postBtn = document.getElementById('postBtn');
const userProfile = document.getElementById('userProfile');
const userAvatar = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');


const authModal = document.getElementById('authModal');
const postModal = document.getElementById('postModal');
const categorizeModal = document.getElementById('categorizeModal');


const filterProblemBtn = document.getElementById('filterProblem');
const filterSuggestionBtn = document.getElementById('filterSolution');
const categorizeBtn = document.getElementById('categorizeBtn');


document.addEventListener('DOMContentLoaded', async () => {
    
    const { data: { session } } = await supabase.auth.getSession();
    handleAuthChange(session);

    
    supabase.auth.onAuthStateChange((event, session) => {
        handleAuthChange(session);
        if (event === 'SIGNED_IN') {
            if (!authModal.classList.contains('hidden')) {
                closeModal('authModal');
                showToast('Successfully logged in!');
            }
        }
    });

    
    setupLocationSelects('postProvince', 'postDistrict');
    setupLocationSelects('filterProvince', 'filterDistrict');

    
    setupEventListeners();

    
    fetchFeed();

    
    setLanguage(currentLang);

    
    let lastScrollY = window.scrollY;
    const navbar = document.querySelector('.navbar');
    const scrollTopBtn = document.getElementById('scrollToTopBtn');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        if (window.scrollY > lastScrollY && window.scrollY > 80) {
            
            navbar.classList.add('hidden-nav');
        } else {
            
            navbar.classList.remove('hidden-nav');
        }
        lastScrollY = window.scrollY;

        
        if (scrollTopBtn) {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('show');
            } else {
                scrollTopBtn.classList.remove('show');
            }
        }
    });

    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});


function handleAuthChange(session) {
    if (session && session.user) {
        currentUser = session.user;
        isAdmin = currentUser.email === ADMIN_EMAIL;
        loginBtn.classList.add('hidden');
        userProfile.classList.remove('hidden');
        
        const avatarUrl = currentUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.user_metadata?.full_name || currentUser.email.split('@')[0])}&background=003893&color=fff`;
        userAvatar.src = avatarUrl;

        
        if (!authModal.classList.contains('hidden')) {
            closeModal('authModal');
        }
    } else {
        currentUser = null;
        isAdmin = false;
        loginBtn.classList.remove('hidden');
        userProfile.classList.add('hidden');
    }
}


function setupEventListeners() {
    
    const langToggleBtn = document.getElementById('langToggle');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            const newLang = currentLang === 'en' ? 'np' : 'en';
            setLanguage(newLang);
        });
    }

    
    loginBtn.addEventListener('click', () => openModal('authModal'));
    postBtn.addEventListener('click', () => {
        openModal('postModal');

        const tryRenderTurnstile = () => {
            if (typeof turnstile !== 'undefined') {
                const btn = document.getElementById('submitPostBtn');
                if (turnstileWidgetId === null) {
                    turnstileWidgetId = turnstile.render('#turnstile-container', {
                        sitekey: '0x4AAAAAACnnK3PbbygHiFnx',
                        theme: 'light',
                        callback: function() { btn.disabled = false; },
                        'expired-callback': function() { btn.disabled = true; }
                    });
                } else {
                    turnstile.reset(turnstileWidgetId);
                    btn.disabled = true;
                }
            } else {
                setTimeout(tryRenderTurnstile, 100);
            }
        };
        setTimeout(tryRenderTurnstile, 300);
    });

    const postBtnMobile = document.getElementById('postBtnMobile');
    if (postBtnMobile) {
        postBtnMobile.addEventListener('click', () => {
            postBtn.click();
        });
    }
    categorizeBtn.addEventListener('click', () => openModal('categorizeModal'));

    
    document.querySelectorAll('.close-btn, .secondary-btn[data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.currentTarget.dataset.modal;
            if (modalId) closeModal(modalId);
        });
    });

    const openAuthFromVoteBtn = document.getElementById('openAuthFromVoteBtn');
    if (openAuthFromVoteBtn) {
        openAuthFromVoteBtn.addEventListener('click', () => {
            closeModal('voteAuthModal');
            openModal('authModal');
        });
    }

    
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeModal(backdrop.id);
            }
        });
    });

    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.options-menu')) {
            document.querySelectorAll('.options-dropdown.show').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
    });

    
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
    });

    
    filterProblemBtn.addEventListener('click', () => {
        currentFilterType = 'problem';
        filterProblemBtn.classList.add('active');
        filterSuggestionBtn.classList.remove('active');
        fetchFeed();
    });

    filterSuggestionBtn.addEventListener('click', () => {
        currentFilterType = 'solution';
        filterSuggestionBtn.classList.add('active');
        filterProblemBtn.classList.remove('active');
        fetchFeed();
    });

    
    document.getElementById('authForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        const msgEl = document.getElementById('authMessage');
        const errEl = document.getElementById('authError');
        const submitBtn = document.getElementById('authSubmitBtn');
        const originalText = submitBtn.innerHTML;

        submitBtn.textContent = 'Authenticating...';
        submitBtn.disabled = true;
        msgEl.textContent = 'Authenticating...';
        errEl.textContent = '';

        
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email, password,
                    options: { data: { full_name: email.split('@')[0] } }
                });

                if (signUpError) {
                    errEl.textContent = signUpError.message;
                    msgEl.textContent = '';
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                } else {
                    if (signUpData.session) {
                        msgEl.textContent = '';
                        document.getElementById('authForm').reset();
                        closeModal('authModal');
                        showToast('Account created and logged in successfully!');
                        window.location.href = '#';
                    } else {
                        msgEl.textContent = '';
                        document.getElementById('authForm').reset();
                        closeModal('authModal');
                        showToast('Account created! Please check your email to verify and log in.');
                    }
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } else {
                errEl.textContent = error.message;
                msgEl.textContent = '';
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        } else {
            msgEl.textContent = '';
            errEl.textContent = '';
            document.getElementById('authForm').reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    
    document.getElementById('googleLoginBtn').addEventListener('click', async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    });

    
    document.getElementById('postForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        
        const turnstileResponse = typeof turnstile !== 'undefined' && turnstileWidgetId !== null ? turnstile.getResponse(turnstileWidgetId) : null;
        if (!turnstileResponse) {
            alert('Please complete the security check to post.');
            return;
        }

        const submitBtn = document.getElementById('submitPostBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Posting...';
        submitBtn.disabled = true;

        const type = document.querySelector('input[name="postType"]:checked').value;
        const province = document.getElementById('postProvince').value;
        const district = document.getElementById('postDistrict').value;
        const content = document.getElementById('postContent').value;
        const isAnonymous = document.getElementById('postAnonymous').checked;

        
        if (!currentUser) {
            if (isAnonymous) {
                const { data, error } = await supabase.auth.signInAnonymously();
                if (error) {
                    alert('Error creating anonymous session: ' + error.message);
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    return;
                }
                currentUser = data.user;
            } else {
                alert('Please sign in or check "Hide my identity" to post anonymously.');
                openModal('authModal');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }
        }

        
        const isVerified = currentUser.app_metadata.provider !== 'anonymous';
        const { data: canPost, error: rpcError } = await supabase.rpc('check_daily_post_limit', {
            p_user_id: currentUser.id,
            p_device_id: deviceId,
            p_is_verified: isVerified
        });

        if (rpcError) {
            
        } else if (!canPost) {
            const errorKey = isVerified ? 'rateLimitErrorVerified' : 'rateLimitErrorGuest';
            const modalBody = document.querySelector('#rateLimitModal p');
            if (modalBody) {
                modalBody.setAttribute('data-i18n', errorKey);
                modalBody.textContent = translations[currentLang][errorKey];
            }
            openModal('rateLimitModal');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        const { error } = await supabase.from('posts').insert([{
            user_id: currentUser.id,
            device_id: deviceId,
            type,
            province,
            district,
            content,
            is_anonymous: isAnonymous
        }]);

        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        if (error) {
            alert('Error posting: ' + error.message);
        } else {
            document.getElementById('postForm').reset();
            
            if (typeof turnstile !== 'undefined' && turnstileWidgetId !== null) {
                turnstile.reset(turnstileWidgetId);
            }
            closeModal('postModal');

            
            if (currentFilterType !== type) {
                currentFilterType = type;
                if (type === 'problem') {
                    filterProblemBtn.classList.add('active');
                    filterSuggestionBtn.classList.remove('active');
                } else {
                    filterProblemBtn.classList.remove('active');
                    filterSuggestionBtn.classList.add('active');
                }
            }
            
            showToast(currentLang === 'en' ? 'Gunaso posted successfully!' : 'à¤—à¥ à¤¨à¤¾à¤¸à¥‹ à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥ à¤µà¤• à¤ªà¥‹à¤¸à¥ à¤Ÿ à¤—à¤°à¤¿à¤¯à¥‹!');
            fetchFeed();
        }
    });

    
    document.getElementById('editForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitEditBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        const id = document.getElementById('editPostId').value;
        const type = document.querySelector('input[name="editPostType"]:checked').value;
        const content = document.getElementById('editPostContent').value;
        const isAnonymous = document.getElementById('editPostAnonymous').checked;

        const { error } = await supabase.from('posts').update({
            type,
            content,
            is_anonymous: isAnonymous
        }).eq('id', id);

        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        if (error) {
            alert('Error updating post: ' + error.message);
        } else {
            document.getElementById('editForm').reset();
            closeModal('editModal');
            fetchFeed();
        }
    });

    
    document.getElementById('filterForm').addEventListener('submit', (e) => {
        e.preventDefault();
        filterProvince = document.getElementById('filterProvince').value;
        filterDistrict = document.getElementById('filterDistrict').value;
        closeModal('categorizeModal');
        fetchFeed();
    });

    
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        document.getElementById('filterForm').reset();
        document.getElementById('filterDistrict').disabled = true;
        document.getElementById('filterDistrict').innerHTML = '<option value="">All Districts</option>';
        filterProvince = '';
        filterDistrict = '';
        closeModal('categorizeModal');
        fetchFeed();
    });
}



function setupLocationSelects(provinceId, districtId) {
    const provSelect = document.getElementById(provinceId);
    const distSelect = document.getElementById(districtId);

    provSelect.addEventListener('change', (e) => {
        const prov = e.target.value;
        distSelect.innerHTML = '<option value="" disabled selected>Select District</option>';
        if (prov === "") {
            distSelect.innerHTML = '<option value="">All Districts</option>';
            distSelect.disabled = true;
            return;
        }

        const districts = locationData[prov] || [];
        districts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            distSelect.appendChild(opt);
        });
        distSelect.disabled = false;

        
        if (provinceId === 'filterProvince') {
            distSelect.innerHTML = '<option value="">All Districts in ' + prov + '</option>' + distSelect.innerHTML;
            distSelect.value = "";
        }
    });
}


function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const modalContent = modal.querySelector('.modal');

    modal.classList.remove('hidden');

    
    gsap.to(modal, { opacity: 1, duration: 0.3, ease: "power2.out", autoAlpha: 1 });

    
    gsap.fromTo(modalContent,
        { scale: 0.9, y: 30, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.2)", delay: 0.05 }
    );
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const modalContent = modal.querySelector('.modal');

    
    gsap.to(modalContent, {
        scale: 0.95, y: -20, opacity: 0, duration: 0.2, ease: "power2.in"
    });

    
    gsap.to(modal, {
        opacity: 0,
        duration: 0.3,
        delay: 0.1,
        ease: "power2.in",
        onComplete: () => {
            modal.classList.add('hidden');
            
            gsap.set(modalContent, { clearProps: "all" });
            gsap.set(modal, { clearProps: "all" });
        }
    });
}


async function fetchFeed() {
    feedContainer.innerHTML = `<div class="loading-state" data-i18n="fetchingUpdates">${translations[currentLang].fetchingUpdates}</div>`;

    const { data, error } = await supabase.rpc('get_ranked_posts', {
        filter_type: currentFilterType,
        filter_province: filterProvince || null,
        filter_district: filterDistrict || null,
        filter_limit: 50
    });

    if (error) {
        feedContainer.innerHTML = `<div class="error-msg"><span data-i18n="failedLoad">${translations[currentLang].failedLoad}</span> ${error.message}</div>`;
        return;
    }

    renderFeed(data);
}

function renderFeed(posts) {
    if (!posts || posts.length === 0) {
        feedContainer.innerHTML = `<div class="loading-state" data-i18n="noSubmissions">${translations[currentLang].noSubmissions}</div>`;
        return;
    }

    feedContainer.innerHTML = '';

    posts.forEach((post, index) => {
        const isAnonymous = post.is_anonymous;
        const authorName = isAnonymous ? `<span data-i18n="anonCitizen">${translations[currentLang].anonCitizen}</span>` : (post.author_full_name || `<span data-i18n="anonUser">${translations[currentLang].anonUser}</span>`);
        const authorTextForAvatar = isAnonymous ? 'A+C' : (post.author_full_name || 'A+U');
        const authorAvatar = isAnonymous ? `https://ui-avatars.com/api/?name=${encodeURIComponent(authorTextForAvatar)}&background=666&color=fff` : (post.author_avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorTextForAvatar)}&background=003893&color=fff`);

        const dateStr = new Date(post.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

        const postDate = new Date(post.created_at);
        const now = new Date();
        const hoursDiff = Math.abs(now - postDate) / 36e5;
        const isWithin12Hours = hoursDiff <= 12;

        const isOwner = currentUser && currentUser.id === post.user_id;
        const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;

        
        let dropdownItems = '';
        if (isOwner && isWithin12Hours) {
            dropdownItems += `
                <button class="dropdown-item edit-btn" data-id="${post.id}" data-type="${post.type}" data-anon="${post.is_anonymous}" data-content="${encodeURIComponent(post.content)}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    <span data-i18n="editAction">${translations[currentLang].editAction || 'Edit'}</span>
                </button>
            `;
        }

        if ((isOwner && isWithin12Hours) || isAdmin) {
            dropdownItems += `
                <button class="dropdown-item danger delete-btn" data-id="${post.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span data-i18n="deleteAction">${translations[currentLang].deleteAction || 'Delete'}</span>
                </button>
            `;
        }

        
        if (isAdmin) {
            const pinIcon = post.is_pinned ?
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>' :
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L12 22"></path><path d="M19 9l-7-7-7 7"></path></svg>';

            dropdownItems += `
                <button class="dropdown-item pin-btn" data-id="${post.id}" data-pinned="${post.is_pinned}">
                    ${pinIcon}
                    <span data-i18n="${post.is_pinned ? 'unpinAction' : 'pinAction'}">${translations[currentLang][post.is_pinned ? 'unpinAction' : 'pinAction']}</span>
                </button>
            `;
        }

        
        dropdownItems += `
            <button class="dropdown-item flag-btn" data-id="${post.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                <span data-i18n="flagAction">${translations[currentLang].flagAction || 'Flag for review'}</span>
            </button>
        `;

        const actionMenu = `
            <div class="options-menu">
                <button class="options-btn" onclick="toggleDropdown('${post.id}')" aria-label="Options">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                </button>
                <div class="options-dropdown" id="dropdown-${post.id}">
                    ${dropdownItems}
                </div>
            </div>
        `;

        const cardHTML = `
            <div class="card ${post.is_pinned ? 'pinned' : ''}" id="post-${post.id}">
                ${post.is_pinned ? `
                <div class="pinned-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L12 22"></path><path d="M19 9l-7-7-7 7"></path></svg>
                    <span data-i18n="pinnedBadge">${translations[currentLang].pinnedBadge}</span>
                </div>` : ''}
                <div class="card-header" style="justify-content: space-between; align-items: flex-start;">
                    <div class="card-meta">
                        <span class="card-type ${post.type === 'solution' ? 'suggestion' : post.type}" data-i18n="${post.type === 'problem' ? 'labelProblem' : 'labelSuggestion'}">${translations[currentLang][post.type === 'problem' ? 'labelProblem' : 'labelSuggestion']}</span>
                        <div class="card-author" style="margin-top: 0.5rem;">
                            <img src="${authorAvatar}" class="author-avatar" alt="Avatar">
                            <span class="truncate-text">${authorName}</span>
                        </div>
                    </div>
                    <div class="card-top-right">
                        ${actionMenu}
                        <div class="card-meta-right">
                            <div class="card-location">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                <span class="truncate-text">${post.district}, ${post.province}</span>
                            </div>
                            <div class="card-time">${dateStr}</div>
                        </div>
                    </div>
                </div>
                <div class="card-content">${escapeHTML(post.content)}</div>
                <div class="card-footer">
                    <div class="card-votes">
                        <button class="vote-btn ${!currentUser || currentUser.is_anonymous ? 'dimmed' : ''}" data-id="${post.id}" data-type="agree" data-current-vote="${post.user_vote || 'none'}" style="color: ${post.user_vote === 'agree' ? 'var(--secondary)' : 'var(--text-light)'};">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="${post.user_vote === 'agree' ? 'var(--secondary)' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                            <span class="vote-text-wrapper"><span class="vote-count">${post.agree_count}</span> <span data-i18n="agreeText">${translations[currentLang].agreeText}</span></span>
                        </button>
                        <button class="vote-btn ${!currentUser || currentUser.is_anonymous ? 'dimmed' : ''}" data-id="${post.id}" data-type="disagree" data-current-vote="${post.user_vote || 'none'}" style="color: ${post.user_vote === 'disagree' ? 'var(--primary)' : 'var(--text-light)'};">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="${post.user_vote === 'disagree' ? 'var(--primary)' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                            <span class="vote-text-wrapper"><span class="vote-count">${post.disagree_count}</span> <span data-i18n="disagreeText">${translations[currentLang].disagreeText}</span></span>
                        </button>
                        <div style="flex-grow: 1;"></div>
                        <button class="comment-btn" data-id="${post.id}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            <span class="vote-text-wrapper"><span class="vote-count">${post.comment_count || 0}</span> <span data-i18n="commentAction">${translations[currentLang].commentAction}</span></span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        feedContainer.insertAdjacentHTML('beforeend', cardHTML);
    });

    
    gsap.to('.card', {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
        clearProps: "transform" 
    });

    
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const btnEl = e.currentTarget;
            let finalUser = currentUser;

            if (!finalUser || finalUser.is_anonymous) {
                
                closeModal('commentsModal');
                openModal('voteAuthModal');
                return;
            }

            const postId = btnEl.dataset.id;
            const voteType = btnEl.dataset.type;
            const currentVote = btnEl.dataset.currentVote;

            
            gsap.fromTo(btnEl,
                { scale: 0.8 },
                { scale: 1, duration: 0.3, ease: "back.out(1.5)" }
            );

            if (voteType === currentVote) {
                
                const { error: deleteError } = await supabase
                    .from('post_votes')
                    .delete()
                    .match({ post_id: postId, user_id: finalUser.id });

                if (deleteError) {
                    alert('Failed to remove vote: ' + deleteError.message);
                } else {
                    
                    const countEl = btnEl.querySelector('.vote-count');
                    countEl.textContent = parseInt(countEl.textContent) - 1;
                    btnEl.dataset.currentVote = 'none';
                    btnEl.style.color = 'var(--text-light)';
                    const svg = btnEl.querySelector('svg');
                    if (svg) svg.setAttribute('fill', 'none');
                    
                    
                    const siblingBtn = btnEl.parentElement.querySelector(`.vote-btn[data-type="${voteType === 'agree' ? 'disagree' : 'agree'}"]`);
                    if (siblingBtn) siblingBtn.dataset.currentVote = 'none';
                }
            } else {
                
                const { error: upsertError } = await supabase.from('post_votes').upsert({
                    post_id: postId,
                    user_id: finalUser.id,
                    vote_type: voteType
                }, { onConflict: 'post_id,user_id' });

                if (upsertError) {
                    alert('Failed to register vote: ' + upsertError.message);
                } else {
                    
                    const siblingBtn = btnEl.parentElement.querySelector(`.vote-btn[data-type="${voteType === 'agree' ? 'disagree' : 'agree'}"]`);
                    
                    
                    if (currentVote !== 'none' && currentVote !== voteType) {
                        const siblingCountEl = siblingBtn.querySelector('.vote-count');
                        siblingCountEl.textContent = Math.max(0, parseInt(siblingCountEl.textContent) - 1);
                        siblingBtn.style.color = 'var(--text-light)';
                        const siblingSvg = siblingBtn.querySelector('svg');
                        if (siblingSvg) siblingSvg.setAttribute('fill', 'none');
                    }

                    
                    const countEl = btnEl.querySelector('.vote-count');
                    countEl.textContent = parseInt(countEl.textContent) + 1;
                    btnEl.dataset.currentVote = voteType;
                    btnEl.style.color = voteType === 'agree' ? 'var(--secondary)' : 'var(--primary)';
                    const svg = btnEl.querySelector('svg');
                    if (svg) svg.setAttribute('fill', voteType === 'agree' ? 'var(--secondary)' : 'var(--primary)');
                    
                    
                    btnEl.dataset.currentVote = voteType;
                    if (siblingBtn) siblingBtn.dataset.currentVote = voteType;
                }
            }
        });
    });

    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const currentBtn = e.currentTarget;
            const id = currentBtn.dataset.id;
            const type = currentBtn.dataset.type;
            const isAnon = currentBtn.dataset.anon === 'true';
            const content = decodeURIComponent(currentBtn.dataset.content);

            document.getElementById('editPostId').value = id;
            document.getElementById('editPostContent').value = content;
            document.getElementById('editPostAnonymous').checked = isAnon;
            document.querySelector(`input[name="editPostType"][value="${type}"]`).checked = true;

            
            document.getElementById(`dropdown-${id}`).classList.remove('show');
            openModal('editModal');
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const currentBtn = e.currentTarget;
            const id = currentBtn.dataset.id;

            if (confirm(translations[currentLang].deleteConfirm || 'Are you sure you want to delete this Gunaso?')) {
                const originalText = currentBtn.innerHTML;
                currentBtn.innerHTML = '...';
                currentBtn.disabled = true;

                const { error } = await supabase.from('posts').delete().eq('id', id);
                if (error) {
                    alert('Error deleting post: ' + error.message);
                    currentBtn.innerHTML = originalText;
                    currentBtn.disabled = false;
                } else {
                    document.getElementById('post-' + id).remove();
                }
            } else {
                
                document.getElementById(`dropdown-${id}`).classList.remove('show');
            }
        });
    });

    document.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const currentBtn = e.currentTarget;
            const id = currentBtn.dataset.id;
            const isCurrentlyPinned = currentBtn.dataset.pinned === 'true';

            
            document.getElementById(`dropdown-${id}`).classList.remove('show');

            togglePinPost(id, isCurrentlyPinned);
        });
    });

    document.querySelectorAll('.flag-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const currentBtn = e.currentTarget;
            const id = currentBtn.dataset.id;

            
            document.getElementById(`dropdown-${id}`).classList.remove('show');

            if (!currentUser || currentUser.is_anonymous) {
                closeModal('commentsModal');
                openModal('voteAuthModal');
                return;
            }

            
            document.getElementById('reportPostId').value = id;
            document.getElementById('reportReason').value = '';
            openModal('reportModal');

            const tryRenderTurnstileReport = () => {
                if (typeof turnstile !== 'undefined') {
                    const btn = document.getElementById('submitReportBtn');
                    if (turnstileReportWidgetId === null) {
                        turnstileReportWidgetId = turnstile.render('#turnstile-container-report', {
                            sitekey: '0x4AAAAAACnnK3PbbygHiFnx',
                            theme: 'light',
                            callback: function() { btn.disabled = false; },
                            'expired-callback': function() { btn.disabled = true; }
                        });
                    } else {
                        turnstile.reset(turnstileReportWidgetId);
                        btn.disabled = true;
                    }
                } else {
                    setTimeout(tryRenderTurnstileReport, 100);
                }
            };
            setTimeout(tryRenderTurnstileReport, 300);
        });
    });

    
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            document.getElementById('commentPostId').value = id;
            openModal('commentsModal');
            fetchComments(id);

            const tryRenderTurnstileComment = () => {
                if (typeof turnstile !== 'undefined') {
                    const btn = document.getElementById('submitCommentBtn');
                    if (turnstileCommentWidgetId === null) {
                        turnstileCommentWidgetId = turnstile.render('#turnstile-container-comment', {
                            sitekey: '0x4AAAAAACnnK3PbbygHiFnx',
                            theme: 'light',
                            callback: function() { btn.disabled = false; },
                            'expired-callback': function() { btn.disabled = true; }
                        });
                    } else {
                        turnstile.reset(turnstileCommentWidgetId);
                        btn.disabled = true;
                    }
                } else {
                    setTimeout(tryRenderTurnstileComment, 100);
                }
            };
            setTimeout(tryRenderTurnstileComment, 300);
        });
    });
}


document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const turnstileResponse = typeof turnstile !== 'undefined' && turnstileReportWidgetId !== null ? turnstile.getResponse(turnstileReportWidgetId) : null;
    if (!turnstileResponse) {
        alert(currentLang === 'en' ? 'Please complete the security check to submit a report.' : 'à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¸à¥ à¤°à¤•à¥ à¤·à¤¾ à¤œà¤¾à¤ à¤š à¤ªà¥‚à¤°à¤¾ à¤—à¤°à¥ à¤¨à¥ à¤¹à¥‹à¤¸à¥ à¥¤');
        return;
    }

    const postId = document.getElementById('reportPostId').value;
    const reason = document.getElementById('reportReason').value;
    const submitBtn = document.getElementById('submitReportBtn');
    const originalText = submitBtn.textContent;

    submitBtn.textContent = translations[currentLang].savingText || 'Sending...';
    submitBtn.disabled = true;

    const { error } = await supabase.from('post_reports').insert({
        post_id: postId,
        reporter_id: currentUser.id,
        reason: reason
    });

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;

    if (error) {
        if (error.code === '23505') { 
            alert(currentLang === 'en' ? "You have already reported this post." : "à¤¤à¤ªà¤¾à¤ˆà¤‚à¤²à¥‡ à¤¯à¥‹ à¤ªà¥‹à¤¸à¥à¤Ÿ à¤ªà¤¹à¤¿à¤²à¥‡ à¤¨à¥ˆ à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ à¤—à¤°à¤¿à¤¸à¤•à¥à¤¨à¥à¤­à¤à¤•à¥‹ à¤›à¥¤");
        } else {
            alert("Failed to run report: " + error.message);
        }
    } else {
        
        document.getElementById('reportInitialState').classList.add('hidden');
        document.getElementById('reportSuccessState').classList.remove('hidden');

        if (typeof turnstile !== 'undefined' && turnstileReportWidgetId !== null) {
            turnstile.reset(turnstileReportWidgetId);
        }

        setTimeout(() => {
            closeModal('reportModal');

            setTimeout(() => {
                document.getElementById('reportInitialState').classList.remove('hidden');
                document.getElementById('reportSuccessState').classList.add('hidden');
            }, 500);
        }, 3000);
    }
});

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}


function toggleDropdown(postId) {
    const dropdown = document.getElementById(`dropdown-${postId}`);
    if (dropdown) {
        
        document.querySelectorAll('.options-dropdown.show').forEach(d => {
            if (d.id !== `dropdown-${postId}`) d.classList.remove('show');
        });
        dropdown.classList.toggle('show');
    }
}

async function togglePinPost(postId, currentState) {
    if (!isAdmin) return;

    const { error } = await supabase
        .from('posts')
        .update({ is_pinned: !currentState })
        .eq('id', postId);

    if (error) {
        alert('Error pinning post: ' + error.message);
    } else {
        
        fetchFeed();
    }
}


async function fetchComments(postId) {
    const listEl = document.getElementById('commentsList');
    listEl.innerHTML = `<div class="loading-state" data-i18n="loadingComments">${translations[currentLang].loadingComments}</div>`;

    const { data, error } = await supabase
        .from('post_comments')
        .select('*, profiles(full_name, avatar_url, role)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) {
        listEl.innerHTML = `<div class="error-msg">Error loading comments: ${error.message}</div>`;
        return;
    }

    if (!data || data.length === 0) {
        listEl.innerHTML = `<div class="loading-state" data-i18n="noComments">${translations[currentLang].noComments}</div>`;
        return;
    }

    listEl.innerHTML = '';
    data.forEach(comment => {
        const profile = comment.profiles || comment.profiles_1;
        let authorName = profile?.full_name || 'User';
        let avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=003893&color=fff`;

        const isAdminComment = profile?.role === 'admin';
        if (isAdminComment) {
            authorName = translations[currentLang].adminAction || 'Hamro Gunaso Admin';
        }
        
        if (comment.is_anonymous) {
            authorName = translations[currentLang].anonCitizen;
            avatarUrl = `https://ui-avatars.com/api/?name=A&background=666&color=fff`;
        }
        const timeStr = new Date(comment.created_at).toLocaleString(currentLang === 'en' ? 'en-US' : 'ne-NP', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

        const isCommentOwner = currentUser && currentUser.id === comment.user_id;
        const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;
        let deleteBtnHTML = '';

        if (isCommentOwner || isAdmin) {
            deleteBtnHTML = `
                <button class="delete-comment-btn" data-id="${comment.id}" data-post-id="${postId}" style="background:none; border:none; color:var(--danger); cursor:pointer; padding: 0.25rem; display:flex; align-items:center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
        }

        const adminBadgeHTML = isAdminComment ? `
            <span class="admin-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Admin
            </span>
        ` : '';

        const commentHTML = `
            <div class="comment-card ${isAdminComment ? 'admin-comment' : ''}" id="comment-${comment.id}">
                <div class="comment-meta" style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <img src="${avatarUrl}" style="width:20px; height:20px; border-radius:50%;" alt="Avatar">
                        <div class="comment-author" style="display: flex; align-items: center; gap: 0.4rem;">
                            ${authorName}
                            ${adminBadgeHTML}
                        </div>
                        <div class="comment-time" style="font-size:0.75rem; color:var(--text-light);">${timeStr}</div>
                    </div>
                    ${deleteBtnHTML}
                </div>
                <div class="comment-content">${escapeHTML(comment.content)}</div>
            </div>
        `;
        listEl.insertAdjacentHTML('beforeend', commentHTML);
    });

    
    listEl.querySelectorAll('.delete-comment-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const currentBtn = e.currentTarget;
            const commentId = currentBtn.dataset.id;

            if (confirm(translations[currentLang].deleteConfirm || 'Are you sure you want to delete this comment?')) {
                const originalHtml = currentBtn.innerHTML;
                currentBtn.innerHTML = '...';
                currentBtn.disabled = true;

                const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
                if (error) {
                    alert('Error deleting comment: ' + error.message);
                    currentBtn.innerHTML = originalHtml;
                    currentBtn.disabled = false;
                } else {
                    const commentEl = document.getElementById('comment-' + commentId);
                    if (commentEl) {
                        gsap.to(commentEl, {
                            opacity: 0,
                            height: 0,
                            marginBottom: 0,
                            padding: 0,
                            duration: 0.3,
                            onComplete: () => commentEl.remove()
                        });
                    }
                }
            }
        });
    });
}

document.getElementById('commentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser || currentUser.is_anonymous) {
        closeModal('commentsModal');
        openModal('voteAuthModal');
        return;
    }

    const turnstileResponse = typeof turnstile !== 'undefined' && turnstileCommentWidgetId !== null ? turnstile.getResponse(turnstileCommentWidgetId) : null;
    if (!turnstileResponse) {
        alert(currentLang === 'en' ? 'Please complete the security check to post a comment.' : 'à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¸à¥ à¤°à¤•à¥ à¤·à¤¾ à¤œà¤¾à¤ à¤š à¤ªà¥‚à¤°à¤¾ à¤—à¤°à¥ à¤¨à¥ à¤¹à¥‹à¤¸à¥ à¥¤');
        return;
    }

    const submitBtn = document.getElementById('submitCommentBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Posting...';
    submitBtn.disabled = true;

    const postId = document.getElementById('commentPostId').value;
    const content = document.getElementById('commentContent').value;
    const isAnonymous = document.getElementById('commentAnonymous').checked;

    const { error } = await supabase.from('post_comments').insert([{
        post_id: postId,
        user_id: currentUser.id,
        content,
        is_anonymous: isAnonymous
    }]);

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;

    if (error) {
        alert('Error posting comment: ' + error.message);
    } else {
        document.getElementById('commentContent').value = '';
        
        if (typeof turnstile !== 'undefined' && turnstileCommentWidgetId !== null) {
            turnstile.reset(turnstileCommentWidgetId);
        }

        const commentCountEl = document.querySelector(`#post-${postId} .comment-btn .vote-count`);
        if (commentCountEl) {
            commentCountEl.textContent = parseInt(commentCountEl.textContent) + 1;
        }

        const listEl = document.getElementById('commentsList');
        if (listEl.querySelector('.loading-state')) {
            listEl.innerHTML = '';
        }

        let authorName = isAnonymous ? translations[currentLang].anonCitizen : (currentUser.user_metadata?.full_name || currentUser.email.split('@')[0]);
        const avatarUrl = isAnonymous ? `https://ui-avatars.com/api/?name=A&background=666&color=fff` : (currentUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=003893&color=fff`);
        const timeStr = new Date().toLocaleString(currentLang === 'en' ? 'en-US' : 'ne-NP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        if (isAdmin && !isAnonymous) {
            authorName = translations[currentLang].adminAction || 'Hamro Gunaso Admin';
        }

        const adminBadgeHTML = (isAdmin && !isAnonymous) ? `
            <span class="admin-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Admin
            </span>
        ` : '';

        const newCommentHTML = `
            <div class="comment-card ${isAdmin && !isAnonymous ? 'admin-comment' : ''}" id="comment-temp-${Date.now()}">
                <div class="comment-meta" style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <img src="${avatarUrl}" style="width:20px; height:20px; border-radius:50%;" alt="Avatar">
                        <div class="comment-author" style="display: flex; align-items: center; gap: 0.4rem;">
                            ${authorName}
                            ${adminBadgeHTML}
                        </div>
                        <div class="comment-time" style="font-size:0.75rem; color:var(--text-light);">${timeStr}</div>
                    </div>
                </div>
                <div class="comment-content">${escapeHTML(content)}</div>
            </div>
        `;
        listEl.insertAdjacentHTML('afterbegin', newCommentHTML);
    }
});



window.toggleDropdown = toggleDropdown;
window.closeModal = closeModal;
window.openModal = openModal;
