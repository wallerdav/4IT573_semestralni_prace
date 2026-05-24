// === MODALS ===
function showLogin() {
    document.getElementById('loginModal').style.display = 'block';
}

function showRegister() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// Close modal when clicking outside of it
window.onclick = (event) => {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const reviewModal = document.getElementById('reviewModal');

    if (event.target === loginModal) {
        loginModal.style.display = 'none';
    }
    if (event.target === registerModal) {
        registerModal.style.display = 'none';
    }
    if (event.target === reviewModal) {
        reviewModal.style.display = 'none';
    }
}

// === LOGIN ===
async function login(e) {
    e.preventDefault();
    clearFormError('loginError');

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showFormError('loginError', 'Vyplňte uživatelské jméno i heslo.');
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            showNotification('Přihlášení úspěšné!');
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            closeModal('loginModal');
            await checkLogin();
            if (window.location.pathname.includes('movie.html')) {
                loadMovieDetail();
            } else if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
                await loadHomepageSections();
            }
        } else {
            showFormError('loginError', data.error || 'Přihlášení se nezdařilo');
        }
    } catch (error) {
        showFormError('loginError', 'Chyba při přihlášení: ' + error.message);
    }
}

// === REGISTER ===
async function register(e) {
    e.preventDefault();
    clearFormError('registerError');

    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!username || !email || !password) {
        showFormError('registerError', 'Vyplňte všechny údaje.');
        return;
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();

        if (res.ok) {
            showNotification('Registrace úspěšná! Nyní se přihlaste.');
            document.getElementById('regUsername').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            closeModal('registerModal');
            showLogin();
        } else {
            showFormError('registerError', data.error || 'Registrace se nezdařila');
        }
    } catch (error) {
        showFormError('registerError', 'Chyba při registraci: ' + error.message);
    }
}

// === LOGOUT ===
let currentUser = null;
let currentMovieId = null;
let currentWatchlistEntry = null;

function applyTheme(theme) {
    document.body.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('siteTheme', theme);
    const button = document.getElementById('themeToggle');
    if (button) {
        button.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

function initializeTheme() {
    const storedTheme = localStorage.getItem('siteTheme') || 'dark';
    applyTheme(storedTheme);
}

function toggleTheme() {
    const current = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
}

function showFormError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    } else {
        showNotification(message, true);
    }
}

function clearFormError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    location.reload();
}

function goToProfile() {
    if (currentUser) {
        window.location.href = `/profile.html?user=${encodeURIComponent(currentUser)}`;
    }
}

async function checkLogin() {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();

        if (data.loggedIn) {
            currentUser = data.user.username;
            document.getElementById('authButtons').style.display = 'none';
            document.getElementById('userMenu').style.display = 'flex';
            document.getElementById('username').textContent = data.user.username;
            const profileButton = document.getElementById('profileButton');
            if (profileButton) {
                profileButton.style.display = 'inline-flex';
            }
        } else {
            currentUser = null;
            document.getElementById('authButtons').style.display = 'block';
            document.getElementById('userMenu').style.display = 'none';
            const profileButton = document.getElementById('profileButton');
            if (profileButton) {
                profileButton.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Chyba při ověření přihlášení:', error);
        document.getElementById('authButtons').style.display = 'block';
        document.getElementById('userMenu').style.display = 'none';
    }
}

function createDirectorLink(director) {
    return `<a href="#" class="director-link" onclick="showDirectorInfo('${encodeURIComponent(director)}'); return false;">${director}</a>`;
}

function createActorLink(actor) {
    return `<a href="#" class="actor-link" onclick="showActorInfo('${encodeURIComponent(actor)}'); return false;">${actor}</a>`;
}

function renderMoviePreview(movie) {
    const actorLinks = movie.actors && movie.actors.length
        ? movie.actors.slice(0, 3).map((actor) => createActorLink(actor)).join(', ')
        : '';

    return `
        <div class="movie">
            <h3>${movie.title} (${movie.year})</h3>
            <p>${createDirectorLink(movie.director)} | ${movie.genre}</p>
            ${actorLinks ? `<p>${actorLinks}</p>` : ''}
            <img src="${movie.poster}" alt="${movie.title}" style="max-width: 100%; max-height: 300px;">
            <p>${movie.description}</p>
            <a href="/movie.html?id=${movie.id}"><button>Detail</button></a>
        </div>
    `;
}

function getMovieFilters() {
    const query = document.getElementById('searchInput')?.value || '';
    const genre = document.getElementById('filterGenre')?.value || '';
    const year = document.getElementById('filterYear')?.value || '';
    const rating = document.getElementById('filterRating')?.value || '';
    const sort = document.getElementById('filterSort')?.value || 'year';

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (genre) params.set('genre', genre);
    if (year) params.set('year', year);
    if (rating) params.set('minRating', rating);
    if (sort) params.set('sort', sort);
    return params.toString();
}

async function loadFilterOptions() {
    try {
        const res = await fetch('/api/movies');
        const movies = await res.json();
        const genres = new Set();
        const years = new Set();

        movies.forEach(movie => {
            if (movie.genre) genres.add(movie.genre);
            if (movie.year) years.add(movie.year);
        });

        const genreSelect = document.getElementById('filterGenre');
        const yearSelect = document.getElementById('filterYear');

        if (genreSelect) {
            genres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                genreSelect.appendChild(option);
            });
        }

        if (yearSelect) {
            Array.from(years).sort((a, b) => b - a).forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Chyba při načítání filtrů:', error);
    }
}

async function loadMovies() {
    const params = getMovieFilters();
    const hasSearch = !!document.getElementById('searchInput')?.value.trim();
    const hasGenre = !!document.getElementById('filterGenre')?.value;
    const hasYear = !!document.getElementById('filterYear')?.value;
    const hasRating = !!document.getElementById('filterRating')?.value;
    const isFiltering = hasSearch || hasGenre || hasYear || hasRating;

    const moviesList = document.getElementById('moviesList');
    const trendingSection = document.getElementById('trendingSection');
    const recommendationsSection = document.getElementById('recommendationsSection');

    if (!isFiltering) {
        moviesList.innerHTML = '';
        moviesList.style.display = 'none';
        trendingSection.style.display = 'block';
        if (currentUser) recommendationsSection.style.display = 'block';
        return;
    }

    // Filtering is active — show results list, hide sections
    trendingSection.style.display = 'none';
    recommendationsSection.style.display = 'none';
    moviesList.style.display = 'block';

    const url = `/api/movies${params ? `?${params}` : ''}`;
    const res = await fetch(url);
    const movies = await res.json();
    moviesList.innerHTML = movies.length
        ? movies.map(renderMoviePreview).join('')
        : '<p>Žádné filmy nenalezeny.</p>';
}

async function loadRecommendations() {
    if (!currentUser) {
        document.getElementById('recommendationsSection').style.display = 'none';
        return;
    }

    try {
        const res = await fetch('/api/recommendations');
        if (!res.ok) throw new Error('Nelze načíst doporučení');
        const movies = await res.json();
        const limited = movies.slice(0, 4); // add this
        const list = document.getElementById('recommendationsList');
        list.innerHTML = limited.length
            ? limited.map(renderMoviePreview).join('')
            : '<p>Žádná doporučení.</p>';
        document.getElementById('recommendationsSection').style.display = 'block';
    } catch (error) {
        document.getElementById('recommendationsSection').style.display = 'none';
        console.error(error);
    }
}

async function loadTrending() {
    try {
        const res = await fetch('/api/movies/trending');
        if (!res.ok) throw new Error('Nelze načíst trendy filmy');
        const movies = await res.json();
        const list = document.getElementById('trendingList');
        list.innerHTML = movies.length
            ? movies.map(renderMoviePreview).join('')
            : '<p>Žádné trendující filmy.</p>';
    } catch (error) {
        document.getElementById('trendingList').innerHTML = '<p>Chyba při načítání trendujících filmů.</p>';
    }
}

async function loadHomepageSections() {
    document.getElementById('moviesList').style.display = 'none';
    await Promise.all([loadTrending(), loadRecommendations()]);
}

async function searchMovies() {
    loadMovies();
}

async function submitReviewComment(reviewId) {
    if (!currentUser) {
        showNotification('Pro komentář se musíte přihlásit.');
        return;
    }

    const input = document.getElementById(`reviewCommentInput-${reviewId}`);
    if (!input) return;
    const comment = input.value.trim();
    if (!comment) {
        showNotification('Komentář nesmí být prázdný.');
        return;
    }

    try {
        const res = await fetch(`/api/reviews/${reviewId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ comment })
        });
        const data = await res.json();
        if (!res.ok) {
            showNotification(data.error || 'Chyba při odesílání komentáře');
            return;
        }
        input.value = '';
        showNotification('Komentář uložen.');
        loadReviewComments(reviewId);
    } catch (error) {
        showNotification('Chyba při odesílání komentáře: ' + error.message);
    }
}

async function loadReviewComments(reviewId) {
    const commentsContainer = document.getElementById(`reviewComments-${reviewId}`);
    if (!commentsContainer) return;

    try {
        const res = await fetch(`/api/reviews/${reviewId}/comments`);
        if (!res.ok) {
            commentsContainer.innerHTML = '<p>Nelze načíst komentáře.</p>';
            return;
        }
        const comments = await res.json();
        commentsContainer.innerHTML = comments.length
            ? comments.map(comment => `
                <div class="review-comment-item">
                    <p><strong>${comment.username}</strong> · ${new Date(comment.createdAt).toLocaleString()}</p>
                    <p>${comment.comment}</p>
                </div>
            `).join('')
            : '<p>Žádné komentáře.</p>';
    } catch (error) {
        commentsContainer.innerHTML = '<p>Chyba při načítání komentářů.</p>';
    }
}

function toggleReviewComments(reviewId) {
    const commentsSection = document.getElementById(`reviewCommentsSection-${reviewId}`);
    if (!commentsSection) return;
    const isOpen = commentsSection.style.display === 'block';
    commentsSection.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
        loadReviewComments(reviewId);
    }
}

async function reportReview(reviewId) {
    if (!currentUser) {
        showNotification('Pro nahlášení se musíte přihlásit.');
        return;
    }

    const reason = prompt('Proč chcete recenzi nahlásit?');
    if (reason === null) return;

    try {
        const res = await fetch(`/api/reviews/${reviewId}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ reason: reason.trim() || 'Podezřelý obsah' })
        });
        const data = await res.json();
        if (!res.ok) {
            showNotification(data.error || 'Chyba při nahlášení');
            return;
        }
        showNotification('Recenze byla nahlášena.');
    } catch (error) {
        showNotification('Chyba při nahlášení: ' + error.message);
    }
}

function showProfile(username) {
    window.location.href = `/profile.html?user=${encodeURIComponent(username)}`;
}

function openReviewModal(movieId) {
    document.getElementById('reviewMovieId').value = movieId;
    document.getElementById('reviewModal').style.display = 'block';
}

function setWatchlistButtonState(isSaved) {
    const button = document.getElementById('watchlistBtn');
    if (!button) return;
    button.textContent = isSaved ? 'Odstranit ze seznamu' : 'Přidat do seznamu';
    button.dataset.saved = isSaved ? 'true' : 'false';
}

async function loadWatchlistState(movieId) {
    if (!currentUser || !movieId) {
        setWatchlistButtonState(false);
        return;
    }
    try {
        const res = await fetch('/api/watchlist', { credentials: 'include' });
        if (!res.ok) return;
        const watchlist = await res.json();
        const saved = watchlist.some((movie) => Number(movie.id) === Number(movieId));
        setWatchlistButtonState(saved);
    } catch (error) {
        console.error('Chyba při načítání seznamu:', error);
    }
}

async function toggleWatchlist() {
    if (!currentUser) {
        showNotification('Nejdříve se přihlaste.');
        return;
    }

    const movieId = currentMovieId;
    if (!movieId) return;

    const button = document.getElementById('watchlistBtn');
    const isSaved = button?.dataset.saved === 'true';
    try {
        if (isSaved) {
            await fetch(`/api/watchlist/${movieId}`, { method: 'DELETE', credentials: 'include' });
            setWatchlistButtonState(false);
            showNotification('Film odebrán ze seznamu.');
        } else {
            await fetch('/api/watchlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ movieId: Number(movieId) })
            });
            setWatchlistButtonState(true);
            showNotification('Film přidán do seznamu.');
        }
    } catch (error) {
        showNotification('Chyba seznamu: ' + error.message);
    }
}

async function submitReview(e) {
    e.preventDefault();

    const movieId = document.getElementById('reviewMovieId').value;
    const rating = parseInt(document.getElementById('reviewRating').value, 10);
    const comment = document.getElementById('reviewComment').value.trim();

    if (!movieId) {
        showNotification('Chyba: ID filmu není nastaveno');
        return;
    }
    if (!rating || rating < 1 || rating > 10) {
        showNotification('Zvolte hodnocení od 1 do 10.');
        return;
    }
    if (!comment) {
        showNotification('Napište prosím komentář k recenzi.');
        return;
    }

    const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ movieId: parseInt(movieId, 10), rating, comment })
    });

    const data = await res.json();

    if (res.ok) {
        showNotification('Recenze přidána!');
        document.getElementById('reviewRating').value = '';
        document.getElementById('reviewComment').value = '';
        closeModal('reviewModal');

        // Refresh reviews if on movie detail page
        if (window.location.pathname.includes('movie.html')) {
            await loadMovieDetail();
        }
    } else {
        showNotification(data.error || 'Chyba při přidání recenze');
    }
}

function showDirectorInfo(encodedDirector) {
    const director = decodeURIComponent(encodedDirector);
    window.location.href = `/director.html?name=${encodeURIComponent(director)}`;
}

function showActorInfo(encodedActor) {
    const actor = decodeURIComponent(encodedActor);
    window.location.href = `/actor.html?name=${encodeURIComponent(actor)}`;
}

async function loadDirectorDetail() {
    const params = new URLSearchParams(window.location.search);
    const directorName = params.get('name');

    if (!directorName) return;

    try {
        // Fetch director info
        const infoRes = await fetch(`/api/directors/${encodeURIComponent(directorName)}`);
        const directorInfo = infoRes.ok ? await infoRes.json() : null;

        // Fetch director's movies
        const moviesRes = await fetch('/api/movies');
        const movies = await moviesRes.json();
        const directorMovies = movies.filter(m => m.director === directorName);

        const detailDiv = document.getElementById('directorDetail');
        const bioHtml = directorInfo ? `
            <div class="director-bio">
                <p><strong>Narozen:</strong> ${directorInfo.birthYear}</p>
                <p><strong>Národnost:</strong> ${directorInfo.nationality}</p>
                <p class="director-bio-text">${directorInfo.bio}</p>
            </div>
        ` : '';

        detailDiv.innerHTML = `
            <div class="director-page">
                <h2>${directorName}</h2>
                ${bioHtml}
                <p class="director-stats">Má v databázi <strong>${directorMovies.length}</strong> ${directorMovies.length === 1 ? 'film' : 'filmy'}.</p>
                
                <div class="director-movies-grid">
                    ${directorMovies.map(movie => `
                        <div class="director-movie-card">
                            <img src="${movie.poster}" alt="${movie.title}">
                            <div class="director-movie-info">
                                <h3>${movie.title}</h3>
                                <p><strong>Rok:</strong> ${movie.year}</p>
                                <p><strong>Žánr:</strong> ${movie.genre}</p>
                                <p><strong>⭐ Hodnocení:</strong> ${movie.averageRating || 'N/A'}/10</p>
                                <a href="/movie.html?id=${movie.id}"><button>Detail</button></a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        showNotification('Chyba při načítání režiséra: ' + error.message);
    }
}

async function loadActorDetail() {
    const params = new URLSearchParams(window.location.search);
    const actorName = params.get('name');
    if (!actorName) return;

    try {
        const res = await fetch(`/api/actors/${encodeURIComponent(actorName)}`);
        if (!res.ok) {
            showNotification('Herec nenalezen');
            return;
        }

        const actorInfo = await res.json();
        const detailDiv = document.getElementById('actorDetail');

        detailDiv.innerHTML = `
            <div class="director-page">
                <h2>${actorInfo.name}</h2>
                <div class="director-bio">
                    <p><strong>Narozen:</strong> ${actorInfo.birthYear}</p>
                    <p><strong>Národnost:</strong> ${actorInfo.nationality}</p>
                    <p class="director-bio-text">${actorInfo.bio}</p>
                </div>
                <p class="director-stats">Má v databázi <strong>${actorInfo.movies.length}</strong> ${actorInfo.movies.length === 1 ? 'film' : 'filmy'}.</p>
                <div class="director-movies-grid">
                    ${actorInfo.movies.map(movie => `
                        <div class="director-movie-card">
                            <img src="${movie.poster}" alt="${movie.title}">
                            <div class="director-movie-info">
                                <h3>${movie.title}</h3>
                                <p><strong>Rok:</strong> ${movie.year}</p>
                                <p><strong>Žánr:</strong> ${movie.genre}</p>
                                <p><strong>⭐ Hodnocení:</strong> ${movie.averageRating || 'N/A'}/10</p>
                                <a href="/movie.html?id=${movie.id}"><button>Detail</button></a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        showNotification('Chyba při načítání herce: ' + error.message);
    }
}

async function loadProfile() {
    const params = new URLSearchParams(window.location.search);
    const username = params.get('user');
    if (!username) return;

    const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
    if (!res.ok) {
        document.getElementById('profileDetail').innerHTML = '<p>Profil nenalezen.</p>';
        return;
    }

    const profile = await res.json();
    const isMine = currentUser === profile.username;
    const profileDiv = document.getElementById('profileDetail');

    profileDiv.innerHTML = `
        <div class="profile-page">
            <h2>${profile.username}</h2>
            <div class="profile-metrics">
                <div><strong>Recenzí:</strong> ${profile.reviewCount}</div>
                <div><strong>Průměrné hodnocení:</strong> ${profile.averageRating}/10</div>
                <div><strong>Člen od:</strong> ${new Date(profile.createdAt).toLocaleDateString()}</div>
            </div>

            <section class="profile-section">
                <h3>${isMine ? 'Můj seznam' : 'Oblíbené filmy'}</h3>
                <div class="director-movies-grid">
                    ${profile.watchlist.length ? profile.watchlist.map(movie => `
                        <div class="director-movie-card">
                            <img src="${movie.poster}" alt="${movie.title}">
                            <div class="director-movie-info">
                                <h3>${movie.title}</h3>
                                <p><strong>Rok:</strong> ${movie.year}</p>
                                <p><strong>Žánr:</strong> ${movie.genre}</p>
                                <a href="/movie.html?id=${movie.id}"><button>Detail</button></a>
                            </div>
                        </div>
                    `).join('') : '<p>Žádné filmy v seznamu.</p>'}
                </div>
            </section>

            <section class="profile-section">
                <h3>${isMine ? 'Mé recenze' : 'Recenze uživatele'}</h3>
                ${profile.reviews.length ? profile.reviews.map(review => `
                    <div class="review">
                        <p><strong>${review.movieTitle}</strong> · ⭐ ${review.rating}/10</p>
                        <p>${review.comment}</p>
                        <a href="/movie.html?id=${review.movieId}">Zobrazit film</a>
                    </div>
                `).join('') : '<p>Žádné recenze.</p>'}
            </section>
        </div>
    `;
}

function openReviewModalFromPage() {
    document.getElementById('reviewModal').style.display = 'block';
}

function getMovieIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadMovieDetail() {
    const id = getMovieIdFromUrl();
    if (!id) return;

    const res = await fetch(`/api/movies/${id}`);

    if (!res.ok) {
        document.getElementById('movieDetail').innerHTML = '<p>Film nenalezen</p>';
        return;
    }

    const movie = await res.json();
    const reviewBtn = document.getElementById('addReviewBtn');
    if (reviewBtn) {
        reviewBtn.style.display = currentUser ? 'inline-block' : 'none';
    }
    const castHtml = movie.actors && movie.actors.length
        ? `<p><strong>Hrají:</strong> ${movie.actors.map((actor) => createActorLink(actor)).join(', ')}</p>`
        : '';

    const movieDiv = document.getElementById('movieDetail');
    movieDiv.innerHTML = `
        <div class="movie-detail">
            <img src="${movie.poster}" alt="${movie.title}" style="max-width: 300px;">
            <div>
                <h2>${movie.title}</h2>
                <p><strong>Rok:</strong> ${movie.year}</p>
                <p><strong>Režisér:</strong> ${createDirectorLink(movie.director)}</p>
                ${castHtml}
                <p><strong>Žánr:</strong> ${movie.genre}</p>
                <p><strong>Popis:</strong> ${movie.description}</p>
                <p><strong>⭐ Průměrné hodnocení:</strong> ${movie.averageRating || 'N/A'}/10 (${movie.reviewCount || 0} recenzí)</p>
                <button id="watchlistBtn" class="add-review-btn" onclick="toggleWatchlist()">Načítání...</button>
            </div>
        </div>
        <div class="movie-meta-row">
            <div class="histogram-box" id="ratingHistogram"></div>
            </div>
        </div>
    `;

    const reviewsDiv = document.getElementById('reviews');
    reviewsDiv.innerHTML = '';

    const selectedSort = document.getElementById('reviewSort')?.value || 'score';
    const sortedReviews = (movie.reviews || []).slice();

    sortedReviews.forEach(r => {
        const div = document.createElement('div');
        div.className = 'review';

        div.innerHTML = `
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <p><strong>${r.username}</strong></p>
                            <p>⭐ ${r.rating}/10</p>
                            <p>${r.comment}</p>
                        </div>
                        <div style="text-align: right;">
                            <p><strong>🔥 Skóre: ${r.score || 0}</strong></p>
                            <button onclick="voteReview(${r.id}, 1)">👍</button>
                            <button onclick="voteReview(${r.id}, -1)">👎</button>
                        </div>
                    </div>
                    <div class="review-actions">
                        <button class="review-small-btn" onclick="toggleReviewComments(${r.id})">Komentáře (${r.commentCount || 0})</button>
                        <button class="review-small-btn report-btn" onclick="reportReview(${r.id})">Nahlásit</button>
                    </div>
                    <div id="reviewCommentsSection-${r.id}" class="review-comments-section" style="display: none;">
                        <div id="reviewComments-${r.id}" class="review-comments"></div>
                        <textarea id="reviewCommentInput-${r.id}" placeholder="Přidat komentář..." rows="3"></textarea>
                        <button class="add-review-btn" onclick="submitReviewComment(${r.id})">Odeslat komentář</button>
                    </div>
                `;

        reviewsDiv.appendChild(div);
    });


    document.getElementById('reviewMovieId').value = id;
    currentMovieId = id;
    await loadWatchlistState(id);
    renderRatingHistogram(movie.reviews || []);
}

function renderRatingHistogram(reviews) {
    const histogram = document.getElementById('ratingHistogram');
    if (!histogram) return;
    const counts = Array.from({ length: 10 }, () => 0);
    reviews.forEach((review) => {
        const score = Number(review.rating);
        if (score >= 1 && score <= 10) counts[score - 1]++;
    });

    const total = counts.reduce((sum, value) => sum + value, 0);
    histogram.innerHTML = `
        <div class="histogram-header">
            <strong>Distribuce hodnocení</strong>
            <span>${total} recenzí</span>
        </div>
        <div class="histogram-bars">
            ${counts.map((count, index) => {
        const width = total ? Math.round((count / total) * 100) : 0;
        return `<div class="histogram-row"><span>${index + 1}</span><div class="histogram-bar"><div style="width: ${width}%;"></div></div><span>${count}</span></div>`;
    }).join('')}
        </div>
    `;
}

async function voteReview(reviewId, vote) {
    const res = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vote })
    });

    if (res.ok) {
        loadMovieDetail(); // refresh
    } else {
        const data = await res.json();
        showNotification(data.error || 'Chyba při hlasování');
    }
}

window.onload = async () => {
    await checkLogin();
    initializeTheme();
    if (window.location.pathname.includes('director.html')) {
        loadDirectorDetail();
    } else if (window.location.pathname.includes('actor.html')) {
        loadActorDetail();
    } else if (window.location.pathname.includes('movie.html')) {
        loadMovieDetail();
    } else if (window.location.pathname.includes('profile.html')) {
        loadProfile();
    } else {
        await loadFilterOptions();
        await loadHomepageSections();
    }
    connectWebSocket();
};

// === WEBSOCKET ===
let ws;

function connectWebSocket() {
    try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}`);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'new_review') {
                showNotification(`Nová recenze od ${data.username} na film ${data.movieId}!`);
                // Refresh movie detail if current page is movie detail
                if (window.location.pathname.includes('movie.html')) {
                    loadMovieDetail();
                }
            } else if (data.type === 'review_voted') {
                showNotification('Recenze byla hlasována!');
                if (window.location.pathname.includes('movie.html')) {
                    loadMovieDetail();
                }
            }
        };

        ws.onerror = (error) => {
            console.log('WebSocket chyba:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket odpojeno');
            // Reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        };
    } catch (error) {
        console.error('WebSocket chyba:', error);
    }
}

function showNotification(message) {
    const notificationDiv = document.getElementById('notification');
    if (!notificationDiv) return;

    notificationDiv.textContent = message;
    notificationDiv.style.display = 'block';

    setTimeout(() => {
        notificationDiv.style.display = 'none';
    }, 5000);
}