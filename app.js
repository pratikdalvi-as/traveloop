(function () {
  "use strict";

  const Data = window.TraveloopData;

  const state = {
    user: null,
    dataset: null,
    selectedTripId: "",
    activeView: "dashboard",
    authMode: "login",
    itineraryMode: "list",
    cityQuery: "",
    regionFilter: "All",
    activityQuery: "",
    activityType: "All",
    pendingVerification: null
  };

  const titles = {
    dashboard: ["Dashboard", "Personalized travel planning"],
    create: ["Create Trip", "Start a new route"],
    trips: ["My Trips", "Manage every itinerary"],
    builder: ["Itinerary Builder", "Cities, dates, activities"],
    itinerary: ["Itinerary View", "Review the full plan"],
    discover: ["City and Activity Search", "Find where to go next"],
    budget: ["Trip Budget", "Costs and alerts"],
    packing: ["Packing Checklist", "Prepare with confidence"],
    share: ["Public Itinerary", "Share or copy plans"],
    notes: ["Trip Notes", "Reminders and journal"],
    settings: ["Settings", "Profile and backend setup"],
    admin: ["Admin Analytics", "Usage and planning signals"]
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    bindShellEvents();
    applyTheme(localStorage.getItem("traveloop.theme") || "dark");
    await Data.config.waitForSupabase(5000);
    updateBackendStatus();

    try {
      state.user = await Data.auth.getSession();
      if (state.user) {
        await loadApp();
      } else {
        showAuth(true);
      }
    } catch (error) {
      toast("Backend unavailable", error.message || "Traveloop opened in demo mode.");
      state.user = { id: "demo-user", email: "demo@traveloop.app", name: "Demo Traveler" };
      await loadApp();
    }

    refreshIcons();
    window.setTimeout(refreshIcons, 1200);
  }

  function cacheElements() {
    els.appShell = document.getElementById("appShell");
    els.authScreen = document.getElementById("authScreen");
    els.authForm = document.getElementById("authForm");
    els.authEmail = document.getElementById("authEmail");
    els.authPassword = document.getElementById("authPassword");
    els.authSubmit = document.getElementById("authSubmit");
    els.authSubtitle = document.getElementById("authSubtitle");
    els.toggleAuthMode = document.getElementById("toggleAuthMode");
    els.forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
    els.verificationPanel = document.getElementById("verificationPanel");
    els.verificationMessage = document.getElementById("verificationMessage");
    els.verificationCode = document.getElementById("verificationCode");
    els.verifyEmailBtn = document.getElementById("verifyEmailBtn");
    els.resendVerificationBtn = document.getElementById("resendVerificationBtn");
    els.refreshVerificationBtn = document.getElementById("refreshVerificationBtn");
    els.navList = document.getElementById("navList");
    els.viewRoot = document.getElementById("viewRoot");
    els.viewTitle = document.getElementById("viewTitle");
    els.viewEyebrow = document.getElementById("viewEyebrow");
    els.logoutBtn = document.getElementById("logoutBtn");
    els.themeToggle = document.getElementById("themeToggle");
    els.mobileMenuBtn = document.getElementById("mobileMenuBtn");
    els.openCurrentRoute = document.getElementById("openCurrentRoute");
    els.toastRegion = document.getElementById("toastRegion");
    els.backendDot = document.getElementById("backendDot");
    els.backendLabel = document.getElementById("backendLabel");
    els.backendHint = document.getElementById("backendHint");
  }

  function bindShellEvents() {
    els.authForm.addEventListener("submit", handleAuthSubmit);
    els.toggleAuthMode.addEventListener("click", toggleAuthMode);
    els.forgotPasswordBtn.addEventListener("click", handlePasswordReset);
    els.verifyEmailBtn.addEventListener("click", handleVerifyEmail);
    els.resendVerificationBtn.addEventListener("click", handleResendVerification);
    els.refreshVerificationBtn.addEventListener("click", handleRefreshVerification);
    els.logoutBtn.addEventListener("click", handleLogout);
    els.themeToggle.addEventListener("click", toggleTheme);
    els.mobileMenuBtn.addEventListener("click", () => document.body.classList.toggle("menu-open"));
    els.openCurrentRoute.addEventListener("click", () => openRoute(getSelectedTrip()));

    window.addEventListener("hashchange", handleHashRoute);

    els.navList.addEventListener("click", (event) => {
      const link = event.target.closest("[data-view]");
      if (link) document.body.classList.remove("menu-open");
    });

    els.viewRoot.addEventListener("click", handleViewClick);
    els.viewRoot.addEventListener("submit", handleViewSubmit);
    els.viewRoot.addEventListener("input", handleViewInput);
    els.viewRoot.addEventListener("change", handleViewChange);
  }

  async function loadApp() {
    showAuth(false);
    state.dataset = await Data.dataset.load(state.user);
    if (!state.dataset.trips.length) {
      state.selectedTripId = "";
    } else {
      state.selectedTripId = state.selectedTripId || state.dataset.trips[0].id;
    }
    handleHashRoute();
  }

  function handleHashRoute() {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash.startsWith("share/")) {
      renderPublicShare(hash.split("/")[1]);
      return;
    }
    const view = hash || "dashboard";
    renderView(titles[view] ? view : "dashboard");
  }

  function showAuth(show) {
    els.authScreen.classList.toggle("hidden", !show);
    els.appShell.setAttribute("aria-hidden", String(show));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = els.authEmail.value.trim();
    const password = els.authPassword.value;
    setButtonBusy(els.authSubmit, true);
    try {
      const validation = Data.auth.validateEmail(email);
      if (!validation.valid) throw new Error(validation.message);
      const authResult = state.authMode === "signup"
        ? await Data.auth.signUp(email, password)
        : await Data.auth.signIn(email, password);
      if (authResult && authResult.pendingVerification) {
        showVerification(authResult);
        toast("Verify your email", authResult.message || "Check your inbox to finish account setup.");
        return;
      }
      state.user = authResult;
      toast(state.authMode === "signup" ? "Account ready" : "Welcome back", "Your Traveloop workspace is open.");
      await loadApp();
    } catch (error) {
      toast("Authentication failed", error.message || "Check your email and password.");
    } finally {
      setButtonBusy(els.authSubmit, false);
    }
  }

  function toggleAuthMode() {
    state.authMode = state.authMode === "login" ? "signup" : "login";
    hideVerification();
    els.authSubmit.querySelector("span").textContent = state.authMode === "login" ? "Login" : "Create account";
    els.authSubtitle.textContent = state.authMode === "login"
      ? "Sign in to manage your travel plans."
      : "Create an account to start planning.";
    els.toggleAuthMode.textContent = state.authMode === "login" ? "Create an account" : "Already have an account";
    els.authPassword.setAttribute("autocomplete", state.authMode === "login" ? "current-password" : "new-password");
    refreshIcons();
  }

  async function handlePasswordReset() {
    const email = els.authEmail.value.trim();
    if (!email) {
      toast("Email needed", "Enter your email before requesting a reset link.");
      return;
    }
    try {
      await Data.auth.resetPassword(email);
      toast("Reset requested", "If this email exists, Supabase will send reset instructions.");
    } catch (error) {
      toast("Reset failed", error.message || "Could not request a password reset.");
    }
  }

  function showVerification(result) {
    state.pendingVerification = result;
    els.verificationPanel.classList.remove("hidden");
    els.verificationCode.value = "";
    els.verificationMessage.textContent = result.provider === "demo"
      ? `${result.message}. It expires in 10 minutes.`
      : "Supabase sent a confirmation email. Click the email link, or enter an OTP if your template sends one.";
    els.authSubtitle.textContent = `Verify ${result.email} to continue.`;
    els.verificationCode.focus();
  }

  function hideVerification() {
    state.pendingVerification = null;
    els.verificationPanel.classList.add("hidden");
    els.verificationCode.value = "";
  }

  async function handleVerifyEmail() {
    if (!state.pendingVerification) {
      toast("No pending email", "Create an account first, then verify it.");
      return;
    }
    try {
      const user = await Data.auth.verifyEmailCode(state.pendingVerification.email, els.verificationCode.value);
      if (!user) {
        toast("Verification pending", "Click the confirmation link in your email, then use the refresh button.");
        return;
      }
      state.user = user;
      hideVerification();
      toast("Email verified", "Your Traveloop workspace is ready.");
      await loadApp();
    } catch (error) {
      toast("Verification failed", error.message || "The code was not accepted.");
    }
  }

  async function handleResendVerification() {
    const email = state.pendingVerification && state.pendingVerification.email || els.authEmail.value.trim();
    if (!email) {
      toast("Email needed", "Enter your email first.");
      return;
    }
    try {
      const result = await Data.auth.resendVerification(email);
      showVerification(result);
      toast("Verification sent", result.message || "Check your inbox.");
    } catch (error) {
      toast("Could not resend", error.message || "Try again in a moment.");
    }
  }

  async function handleRefreshVerification() {
    try {
      const user = await Data.auth.getSession();
      if (!user) {
        toast("Still waiting", "No verified session is active yet.");
        return;
      }
      state.user = user;
      hideVerification();
      toast("Email confirmed", "Your verified Supabase session is active.");
      await loadApp();
    } catch (error) {
      toast("Refresh failed", error.message || "Could not check the session.");
    }
  }

  async function handleLogout() {
    await Data.auth.signOut();
    state.user = null;
    showAuth(true);
    toast("Logged out", "Your current planning session is closed.");
  }

  function updateBackendStatus() {
    const live = Data.config.isSupabaseConfigured();
    els.backendDot.classList.toggle("live", live);
    els.backendLabel.textContent = live ? "Supabase live" : "Demo backend";
    els.backendHint.textContent = live ? "Auth and tables are connected." : "Add Supabase keys for live data.";
  }

  function renderView(view) {
    state.activeView = view;
    const [title, eyebrow] = titles[view];
    els.viewTitle.textContent = title;
    els.viewEyebrow.textContent = eyebrow;
    document.querySelectorAll("[data-view]").forEach((link) => {
      link.classList.toggle("active", link.dataset.view === view);
    });

    const renderers = {
      dashboard: renderDashboard,
      create: renderCreateTrip,
      trips: renderTrips,
      builder: renderBuilder,
      itinerary: renderItinerary,
      discover: renderDiscover,
      budget: renderBudget,
      packing: renderPacking,
      share: renderShare,
      notes: renderNotes,
      settings: renderSettings,
      admin: renderAdmin
    };

    els.viewRoot.innerHTML = renderers[view]();
    els.viewRoot.focus({ preventScroll: true });
    refreshIcons();
  }

  function renderDashboard() {
    const profile = state.dataset.profile;
    const trips = state.dataset.trips;
    const nextTrip = trips.slice().sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
    const cities = uniqueCities(trips).length;
    const totalBudget = trips.reduce((sum, trip) => sum + Number(trip.budget || 0), 0);
    const recommended = state.dataset.cities.slice().sort((a, b) => b.popularity - a.popularity).slice(0, 3);

    return `
      <section class="hero">
        <div>
          <span class="pill accent">Welcome, ${escapeHtml(profile.name || "Traveler")}</span>
          <h2>Plan rich multi-city travel without losing the plot.</h2>
          <p>Traveloop combines trip creation, city discovery, activity planning, budget visibility, packing, notes, and public sharing in one workspace.</p>
          <div class="hero-actions">
            <a class="solid-btn" href="#create"><i data-lucide="plus"></i><span>Plan New Trip</span></a>
            <a class="ghost-btn" href="#discover"><i data-lucide="search"></i><span>Explore Cities</span></a>
          </div>
        </div>
      </section>

      <div class="grid cards-3" style="margin-top:16px">
        ${metricCard("Trips", trips.length, "Active and saved itineraries")}
        ${metricCard("Cities", cities, "Unique stops across plans")}
        ${metricCard("Planned Budget", money(totalBudget), "All trip budgets combined")}
      </div>

      <div class="grid dashboard-grid">
        <section class="card">
          <div class="row-head">
            <div>
              <h3>Upcoming Trip</h3>
              <p class="muted">Recent plans stay close for quick editing.</p>
            </div>
            <a class="subtle-btn" href="#trips"><i data-lucide="briefcase"></i><span>View All</span></a>
          </div>
          ${nextTrip ? tripFeature(nextTrip) : emptyState("calendar-plus", "No trips yet", "Create a trip to start building your itinerary.")}
        </section>

        <aside class="card">
          <h3>Budget Highlights</h3>
          ${nextTrip ? journeyGraphic(nextTrip) : ""}
          ${nextTrip ? budgetMini(nextTrip) : "<p class='muted'>Budget insights will appear after you create a trip.</p>"}
        </aside>
      </div>

      <section class="grid cards-3" style="margin-top:16px">
        ${recommended.map(cityCard).join("")}
      </section>
    `;
  }

  function renderCreateTrip() {
    const today = new Date();
    const start = formatInputDate(today);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 6);
    const end = formatInputDate(endDate);

    return `
      <div class="split">
        <section class="form-panel">
          <h3>Create a personalized trip</h3>
          <p class="muted">Add the essentials now, then refine stops, activities, costs, notes, and packing from the builder.</p>
          <form class="form-grid" data-action="create-trip">
            <label>
              <span>Trip name</span>
              <input name="name" required placeholder="Summer food loop">
            </label>
            <label>
              <span>Total budget</span>
              <input name="budget" required type="number" min="0" step="50" value="1500">
            </label>
            <label>
              <span>Start date</span>
              <input name="startDate" required type="date" value="${start}">
            </label>
            <label>
              <span>End date</span>
              <input name="endDate" required type="date" value="${end}">
            </label>
            <label class="full">
              <span>Cover photo URL</span>
              <input name="coverImage" placeholder="Optional image URL">
            </label>
            <label class="full">
              <span>Description</span>
              <textarea name="description" placeholder="What makes this journey special?"></textarea>
            </label>
            <button class="solid-btn full" type="submit"><i data-lucide="save"></i><span>Save Trip</span></button>
          </form>
        </section>
        <aside class="card image-card">
          <div class="image" style="background-image:url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80')"></div>
          <div class="content">
            <h3>Suggested first step</h3>
            <p class="muted">After saving, open Builder and add your first city stop. Traveloop will use your stop dates to create timeline and calendar views.</p>
          </div>
        </aside>
      </div>
    `;
  }

  function renderTrips() {
    const trips = state.dataset.trips;
    if (!trips.length) return emptyState("briefcase", "No saved trips", "Create a trip to start planning.");
    return `
      <div class="grid cards-3">
        ${trips.map((trip) => `
          <article class="card image-card">
            <div class="image" style="background-image:url('${escapeAttr(trip.coverImage || fallbackCover(trip))}')"></div>
            <div class="content">
              <h3>${escapeHtml(trip.name)}</h3>
              <p class="muted">${escapeHtml(trip.description || "No description added yet.")}</p>
              <div class="meta-list">
                <span class="pill">${dateRange(trip)}</span>
                <span class="pill">${trip.stops.length} cities</span>
                <span class="pill">${money(trip.budget)}</span>
              </div>
              <div class="card-actions">
                <button class="solid-btn" type="button" data-action="select-trip" data-trip-id="${trip.id}"><i data-lucide="eye"></i><span>Open</span></button>
                <button class="ghost-btn" type="button" data-action="duplicate-trip" data-trip-id="${trip.id}"><i data-lucide="copy"></i><span>Copy</span></button>
                <button class="danger-btn" type="button" data-action="delete-trip" data-trip-id="${trip.id}"><i data-lucide="trash-2"></i><span>Delete</span></button>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderBuilder() {
    const trip = getSelectedTrip();
    if (!trip) return noTripSelected();
    const cityOptions = state.dataset.cities.map((city) => `<option value="${city.id}">${escapeHtml(city.city)}, ${escapeHtml(city.country)}</option>`).join("");
    const stopOptions = trip.stops.map((stop) => `<option value="${stop.id}">${escapeHtml(stop.city)}</option>`).join("");
    const matchingActivities = activitiesForTrip(trip);

    return `
      ${tripSelector()}
      <div class="split">
        <section class="form-panel">
          <h3>Add stop</h3>
          <form class="form-grid" data-action="add-stop">
            <label class="full">
              <span>City</span>
              <select name="cityId" required>${cityOptions}</select>
            </label>
            <label>
              <span>Arrive</span>
              <input name="startDate" type="date" required value="${trip.startDate}">
            </label>
            <label>
              <span>Leave</span>
              <input name="endDate" type="date" required value="${trip.endDate}">
            </label>
            <button class="solid-btn full" type="submit"><i data-lucide="plus"></i><span>Add Stop</span></button>
          </form>

          <hr style="border:0;border-top:1px solid var(--line);margin:22px 0">

          <h3>Add activity to stop</h3>
          <form class="form-grid" data-action="assign-activity">
            <label>
              <span>Stop</span>
              <select name="stopId" required>${stopOptions}</select>
            </label>
            <label>
              <span>Activity</span>
              <select name="activityId" required>
                ${matchingActivities.map((activity) => `<option value="${activity.id}">${escapeHtml(activity.name)} - ${money(activity.cost)}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>Time</span>
              <input name="time" type="time" value="10:00">
            </label>
            <label>
              <span>Custom cost</span>
              <input name="cost" type="number" min="0" step="1" placeholder="Use default">
            </label>
            <button class="solid-btn full" type="submit"><i data-lucide="plus"></i><span>Add Activity</span></button>
          </form>
        </section>

        <section class="card">
          <div class="row-head">
            <div>
              <h3>${escapeHtml(trip.name)}</h3>
              <p class="muted">${dateRange(trip)} with ${trip.stops.length} planned stops.</p>
            </div>
            <button class="ghost-btn" type="button" data-action="open-route"><i data-lucide="map"></i><span>Maps</span></button>
          </div>
          <h3 style="margin-top:18px">Order suggestions</h3>
          <div class="action-row">
            <button class="subtle-btn" type="button" data-action="apply-order" data-order="date"><i data-lucide="calendar"></i><span>Date order</span></button>
            <button class="subtle-btn" type="button" data-action="apply-order" data-order="budget"><i data-lucide="badge-dollar-sign"></i><span>Budget friendly</span></button>
            <button class="subtle-btn" type="button" data-action="apply-order" data-order="popular"><i data-lucide="sparkles"></i><span>Popularity first</span></button>
          </div>
        </section>
      </div>

      <section class="grid cards-2" style="margin-top:16px">
        <div class="card">
          <h3>Stops</h3>
          ${trip.stops.length ? trip.stops.slice().sort(byOrder).map(stopCard).join("") : emptyState("map-pin", "No stops yet", "Add a city to start the route.")}
        </div>
        <div class="card">
          <h3>Assigned Activities</h3>
          ${trip.assignedActivities.length ? trip.assignedActivities.map(activityAssignment).join("") : "<p class='muted'>Activities added to stops will appear here.</p>"}
        </div>
      </section>
    `;
  }

  function renderItinerary() {
    const trip = getSelectedTrip();
    if (!trip) return noTripSelected();
    const modeButtons = `
      <div class="segmented action-row" style="margin-bottom:16px">
        <button type="button" data-action="set-itinerary-mode" data-mode="list" class="${state.itineraryMode === "list" ? "active" : ""}"><i data-lucide="list"></i><span>List</span></button>
        <button type="button" data-action="set-itinerary-mode" data-mode="calendar" class="${state.itineraryMode === "calendar" ? "active" : ""}"><i data-lucide="calendar-days"></i><span>Calendar</span></button>
      </div>
    `;

    return `
      ${tripSelector()}
      <section class="card" style="margin-bottom:16px">
        <div class="row-head">
          <div>
            <h3>${escapeHtml(trip.name)}</h3>
            <p class="muted">${escapeHtml(trip.description || "No description yet.")}</p>
          </div>
          <div class="card-actions">
            <button class="ghost-btn" type="button" data-action="open-route"><i data-lucide="map"></i><span>Open Route</span></button>
            <button class="solid-btn" type="button" data-action="copy-share-link"><i data-lucide="link"></i><span>Copy Link</span></button>
          </div>
        </div>
      </section>
      ${modeButtons}
      ${state.itineraryMode === "calendar" ? calendarView(trip) : timelineView(trip)}
    `;
  }

  function renderDiscover() {
    const regions = ["All"].concat(unique(state.dataset.cities.map((city) => city.region)));
    const types = ["All"].concat(unique(state.dataset.activities.map((activity) => activity.type)));
    const cities = filteredCities();
    const activities = filteredActivities();

    return `
      <div class="split">
        <section>
          <div class="form-panel">
            <h3>City Search</h3>
            <p class="muted">${cities.length} matching cities from the travel catalog, with expanded India coverage.</p>
            <div class="form-grid">
              <label>
                <span>Search cities</span>
                <input data-filter="cityQuery" value="${escapeAttr(state.cityQuery)}" placeholder="Paris, Tokyo, Bali">
              </label>
              <label>
                <span>Region</span>
                <select data-filter="regionFilter">
                  ${regions.map((region) => `<option ${region === state.regionFilter ? "selected" : ""}>${escapeHtml(region)}</option>`).join("")}
                </select>
              </label>
            </div>
          </div>
          <div class="grid cards-2" style="margin-top:16px">
            ${cities.length ? cities.map(cityCard).join("") : emptyState("search-x", "No city found", "Try a broader name, or open the place directly in Google Maps from the search text.")}
          </div>
        </section>
        <section>
          <div class="form-panel">
            <h3>Activity Search</h3>
            <div class="form-grid">
              <label>
                <span>Search activities</span>
                <input data-filter="activityQuery" value="${escapeAttr(state.activityQuery)}" placeholder="food, museum, temple">
              </label>
              <label>
                <span>Type</span>
                <select data-filter="activityType">
                  ${types.map((type) => `<option ${type === state.activityType ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}
                </select>
              </label>
            </div>
          </div>
          <div class="grid" style="margin-top:16px">
            ${activities.map(activityDiscoveryCard).join("")}
          </div>
        </section>
      </div>
    `;
  }

  function renderBudget() {
    const trip = getSelectedTrip();
    if (!trip) return noTripSelected();
    const totals = budgetTotals(trip);
    const categories = ["transport", "stay", "activities", "meals", "misc"];

    return `
      ${tripSelector()}
      <div class="split">
        <section class="card">
          <span class="pill accent">Estimated total</span>
          <div class="budget-total">${money(totals.total)}</div>
          <p class="muted">Budget target: ${money(trip.budget)}. Average per day: ${money(totals.averagePerDay)}.</p>
          ${totals.total > Number(trip.budget || 0) ? `<div class="alert">This plan is ${money(totals.total - Number(trip.budget || 0))} over budget. Try the budget-friendly order or reduce high-cost activities.</div>` : ""}
          <div class="bar-list" style="margin-top:18px">
            ${categories.map((category) => barRow(labelCase(category), totals.byCategory[category] || 0, totals.total)).join("")}
          </div>
        </section>

        <section class="form-panel">
          <h3>Add expense</h3>
          <form class="form-grid" data-action="add-expense">
            <label>
              <span>Category</span>
              <select name="category">
                ${categories.map((category) => `<option value="${category}">${labelCase(category)}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>Amount</span>
              <input name="amount" type="number" min="0" step="1" required>
            </label>
            <label>
              <span>Date</span>
              <input name="date" type="date" value="${trip.startDate}">
            </label>
            <label>
              <span>Label</span>
              <input name="label" required placeholder="Hotel deposit">
            </label>
            <button class="solid-btn full" type="submit"><i data-lucide="plus"></i><span>Add Cost</span></button>
          </form>
        </section>
      </div>
      <section class="card" style="margin-top:16px">
        <h3>Expense items</h3>
        ${trip.expenses.length ? trip.expenses.map(expenseRow).join("") : "<p class='muted'>No expenses yet.</p>"}
      </section>
    `;
  }

  function renderPacking() {
    const trip = getSelectedTrip();
    if (!trip) return noTripSelected();
    const packed = trip.packing.filter((item) => item.packed).length;
    return `
      ${tripSelector()}
      <div class="split">
        <section class="form-panel">
          <h3>Packing Checklist</h3>
          <p class="muted">${packed} of ${trip.packing.length} items packed.</p>
          <form class="form-grid" data-action="add-packing">
            <label>
              <span>Category</span>
              <select name="category">
                <option>Clothing</option>
                <option>Documents</option>
                <option>Electronics</option>
                <option>Health</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              <span>Item</span>
              <input name="text" required placeholder="Travel charger">
            </label>
            <button class="solid-btn full" type="submit"><i data-lucide="plus"></i><span>Add Item</span></button>
          </form>
          <div class="action-row" style="margin-top:14px">
            <button class="ghost-btn" type="button" data-action="reset-packing"><i data-lucide="rotate-ccw"></i><span>Reset Checklist</span></button>
          </div>
        </section>
        <section class="card">
          <h3>${escapeHtml(trip.name)}</h3>
          ${trip.packing.length ? trip.packing.map(packingRow).join("") : "<p class='muted'>Add items you need to pack.</p>"}
        </section>
      </div>
    `;
  }

  function renderShare() {
    const trip = getSelectedTrip();
    if (!trip) return noTripSelected();
    const shareUrl = shareLink(trip);
    return `
      ${tripSelector()}
      <div class="split">
        <section class="card image-card">
          <div class="image" style="background-image:url('${escapeAttr(trip.coverImage || fallbackCover(trip))}')"></div>
          <div class="content">
            <h3>${escapeHtml(trip.name)}</h3>
            <p class="muted">${escapeHtml(trip.description || "Shareable trip summary.")}</p>
            <div class="meta-list">
              <span class="pill">${dateRange(trip)}</span>
              <span class="pill">${trip.stops.length} stops</span>
              <span class="pill">${money(budgetTotals(trip).total)}</span>
            </div>
          </div>
        </section>
        <section class="form-panel">
          <h3>Public link</h3>
          <p class="muted">This opens a read-only itinerary view that friends can inspect or copy into their own plans.</p>
          <label>
            <span>Share URL</span>
            <input readonly value="${escapeAttr(shareUrl)}">
          </label>
          <div class="action-row" style="margin-top:14px">
            <button class="solid-btn" type="button" data-action="copy-share-link"><i data-lucide="copy"></i><span>Copy Link</span></button>
            <a class="ghost-btn" href="${escapeAttr(shareUrl)}"><i data-lucide="external-link"></i><span>Open</span></a>
            <button class="subtle-btn" type="button" data-action="toggle-public"><i data-lucide="globe"></i><span>${trip.isPublic ? "Public" : "Make Public"}</span></button>
          </div>
        </section>
      </div>
    `;
  }

  function renderNotes() {
    const trip = getSelectedTrip();
    if (!trip) return noTripSelected();
    const stopOptions = `<option value="">Whole trip</option>` + trip.stops.map((stop) => `<option value="${stop.id}">${escapeHtml(stop.city)}</option>`).join("");
    return `
      ${tripSelector()}
      <div class="split">
        <section class="form-panel">
          <h3>Add note</h3>
          <form class="stacked-form" data-action="add-note">
            <label>
              <span>Attach to</span>
              <select name="stopId">${stopOptions}</select>
            </label>
            <label>
              <span>Note</span>
              <textarea name="body" required placeholder="Hotel check-in details, local contacts, reminders..."></textarea>
            </label>
            <button class="solid-btn" type="submit"><i data-lucide="save"></i><span>Save Note</span></button>
          </form>
        </section>
        <section class="card">
          <h3>Saved notes</h3>
          ${trip.notes.length ? trip.notes.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((note) => noteRow(note, trip)).join("") : "<p class='muted'>No notes yet.</p>"}
        </section>
      </div>
    `;
  }

  function renderSettings() {
    const profile = state.dataset.profile;
    return `
      <div class="split">
        <section class="form-panel">
          <h3>Profile preferences</h3>
          <form class="form-grid" data-action="save-profile">
            <label>
              <span>Name</span>
              <input name="name" value="${escapeAttr(profile.name || "")}" required>
            </label>
            <label>
              <span>Email</span>
              <input name="email" value="${escapeAttr(profile.email || state.user.email || "")}" type="email">
            </label>
            <label>
              <span>Language</span>
              <select name="language">
                ${["English", "Hindi", "French", "Japanese", "Spanish"].map((language) => `<option ${language === profile.language ? "selected" : ""}>${language}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>Photo URL</span>
              <input name="photo" value="${escapeAttr(profile.photo || "")}" placeholder="Optional profile image">
            </label>
            <label class="full">
              <span>Saved destinations, comma separated</span>
              <input name="savedDestinations" value="${escapeAttr((profile.savedDestinations || []).join(", "))}">
            </label>
            <button class="solid-btn full" type="submit"><i data-lucide="save"></i><span>Save Profile</span></button>
          </form>
        </section>
        <section class="card">
          <h3>Backend setup</h3>
          <p class="muted">Current mode: <strong>${Data.config.isSupabaseConfigured() ? "Supabase live" : "Local demo fallback"}</strong>.</p>
          <p class="muted">To connect the real database, add your project URL and anon key in <code>data.js</code>, then create these tables in Supabase SQL editor.</p>
          <div class="action-row">
            <button class="ghost-btn" type="button" data-action="copy-schema"><i data-lucide="copy"></i><span>Copy SQL Schema</span></button>
            <button class="danger-btn" type="button" data-action="reset-demo"><i data-lucide="refresh-cw"></i><span>Reset Demo Data</span></button>
          </div>
          <pre style="white-space:pre-wrap;max-height:280px;overflow:auto;border:1px solid var(--line);border-radius:var(--radius);padding:12px;background:var(--bg-soft)">${escapeHtml(Data.config.sqlSchema.trim())}</pre>
        </section>
      </div>
    `;
  }

  function renderAdmin() {
    const trips = state.dataset.trips;
    const topCities = uniqueCities(trips).map((cityName) => ({
      name: cityName,
      count: trips.filter((trip) => trip.stops.some((stop) => stop.city === cityName)).length
    })).sort((a, b) => b.count - a.count);
    const topActivities = state.dataset.activities.slice().sort((a, b) => b.cost - a.cost).slice(0, 6);
    const engagement = [
      { label: "Trips created", value: trips.length },
      { label: "Stops planned", value: trips.reduce((sum, trip) => sum + trip.stops.length, 0) },
      { label: "Activities added", value: trips.reduce((sum, trip) => sum + trip.assignedActivities.length, 0) },
      { label: "Shared trips", value: trips.filter((trip) => trip.isPublic).length }
    ];

    return `
      <div class="grid cards-3">
        ${engagement.map((metric) => metricCard(metric.label, metric.value, "Platform usage signal")).join("")}
      </div>
      <div class="split" style="margin-top:16px">
        <section class="card">
          <h3>Top Cities</h3>
          <div class="bar-list">
            ${topCities.length ? topCities.map((city) => barRow(city.name, city.count, Math.max(...topCities.map((item) => item.count)))).join("") : "<p class='muted'>No city data yet.</p>"}
          </div>
        </section>
        <section class="table-panel">
          <h3>High-cost Activity Watch</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Activity</th><th>City</th><th>Type</th><th>Cost</th></tr></thead>
              <tbody>
                ${topActivities.map((activity) => `<tr><td>${escapeHtml(activity.name)}</td><td>${escapeHtml(activity.city)}</td><td>${escapeHtml(activity.type)}</td><td>${money(activity.cost)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function renderPublicShare(slug) {
    const dataset = state.dataset || Data.dataset.local();
    const trip = dataset.trips.find((item) => item.publicSlug === slug);
    els.viewTitle.textContent = "Public Itinerary";
    els.viewEyebrow.textContent = "Read-only shared plan";
    document.querySelectorAll("[data-view]").forEach((link) => link.classList.remove("active"));
    showAuth(false);
    if (!trip) {
      els.viewRoot.innerHTML = emptyState("link-2-off", "Trip not found", "This public Traveloop link does not match a saved itinerary.");
      refreshIcons();
      return;
    }
    els.viewRoot.innerHTML = `
      <section class="hero" style="background-image:linear-gradient(180deg, rgba(6,10,14,.16), rgba(6,10,14,.84)), url('${escapeAttr(trip.coverImage || fallbackCover(trip))}')">
        <div>
          <span class="pill accent">Shared Traveloop</span>
          <h2>${escapeHtml(trip.name)}</h2>
          <p>${escapeHtml(trip.description || "A public itinerary from Traveloop.")}</p>
          <div class="hero-actions">
            <button class="solid-btn" type="button" data-action="copy-public-trip" data-trip-id="${trip.id}"><i data-lucide="copy"></i><span>Copy Trip</span></button>
            <button class="ghost-btn" type="button" data-action="open-public-route" data-trip-id="${trip.id}"><i data-lucide="map"></i><span>Open Maps</span></button>
          </div>
        </div>
      </section>
      <div style="margin-top:16px">${timelineView(trip)}</div>
    `;
    refreshIcons();
  }

  async function handleViewSubmit(event) {
    const form = event.target.closest("form[data-action]");
    if (!form) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const action = form.dataset.action;

    if (action === "create-trip") createTrip(data);
    if (action === "add-stop") addStop(data);
    if (action === "assign-activity") assignActivity(data);
    if (action === "add-expense") addExpense(data);
    if (action === "add-packing") addPacking(data);
    if (action === "add-note") addNote(data);
    if (action === "save-profile") saveProfile(data);

    await persistAndRender();
  }

  async function handleViewClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const trip = getSelectedTrip();

    if (action === "select-trip") {
      state.selectedTripId = target.dataset.tripId;
      window.location.hash = "itinerary";
      return;
    }
    if (action === "duplicate-trip") duplicateTrip(target.dataset.tripId);
    if (action === "delete-trip") deleteTrip(target.dataset.tripId);
    if (action === "delete-stop") deleteStop(target.dataset.stopId);
    if (action === "move-stop") moveStop(target.dataset.stopId, target.dataset.direction);
    if (action === "delete-activity") deleteActivity(target.dataset.activityId);
    if (action === "delete-expense") deleteExpense(target.dataset.expenseId);
    if (action === "delete-packing") deletePacking(target.dataset.itemId);
    if (action === "delete-note") deleteNote(target.dataset.noteId);
    if (action === "toggle-packed") togglePacked(target.dataset.itemId);
    if (action === "reset-packing") resetPacking();
    if (action === "open-route") openRoute(trip);
    if (action === "open-city-map") openUrl(Data.maps.search(`${target.dataset.city}, ${target.dataset.country}`));
    if (action === "open-activity-map") openUrl(Data.maps.search(`${target.dataset.activity}, ${target.dataset.city}`));
    if (action === "add-city-to-trip") addCityToTrip(target.dataset.cityId);
    if (action === "add-discovery-activity") addDiscoveryActivity(target.dataset.activityId);
    if (action === "apply-order") applyOrder(target.dataset.order);
    if (action === "set-itinerary-mode") {
      state.itineraryMode = target.dataset.mode;
      renderView(state.activeView);
      return;
    }
    if (action === "copy-share-link") copyText(shareLink(trip), "Share link copied");
    if (action === "toggle-public") togglePublic();
    if (action === "copy-schema") copyText(Data.config.sqlSchema.trim(), "SQL schema copied");
    if (action === "reset-demo") {
      state.dataset = Data.dataset.resetLocal();
      state.selectedTripId = state.dataset.trips[0] && state.dataset.trips[0].id || "";
      toast("Demo reset", "Sample Traveloop data has been restored.");
      renderView(state.activeView);
      return;
    }
    if (action === "copy-public-trip") copyPublicTrip(target.dataset.tripId);
    if (action === "open-public-route") {
      const publicTrip = (state.dataset || Data.dataset.local()).trips.find((item) => item.id === target.dataset.tripId);
      openRoute(publicTrip);
      return;
    }

    await persistAndRender();
  }

 function handleViewInput(event) {

  const filter = event.target.dataset.filter;

  // Ignore normal forms completely
  if (!filter) {
    return;
  }

  // Save state
  state[filter] = event.target.value;

  // ONLY Discover page uses live filtering
  if (state.activeView !== "discover") {
    return;
  }

  clearTimeout(state.searchTimer);

  state.searchTimer = setTimeout(() => {

    renderDiscoverOnly();

  }, 120);
}
  
function renderDiscoverOnly() {

  if (state.activeView !== "discover") {
    return;
  }

  els.viewRoot.innerHTML = renderDiscover();

  refreshIcons();

  // restore search focus

  const cityInput = document.querySelector(
    '[data-filter="cityQuery"]'
  );

  if (cityInput) {

    cityInput.focus();

    cityInput.setSelectionRange(
      cityInput.value.length,
      cityInput.value.length
    );
  }
}
  function handleViewChange(event) {
  if (event.target.id === "tripSelect") {
    state.selectedTripId = event.target.value;
    renderView(state.activeView);
    return;
  }

  const filter = event.target.dataset.filter;

  if (filter) {
    state[filter] = event.target.value;

    // Only rerender once on select change
    requestAnimationFrame(() => {
      renderView(state.activeView);
    });
  }
}
async function handleViewSubmit(event) {
  const form = event.target;

  if (!form.dataset.action) return;

  event.preventDefault();

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {

    // CREATE TRIP
    if (form.dataset.action === "create-trip") {

      const newTrip = {
        id: "trip-" + Date.now(),

        name: data.name || "Untitled Trip",

        description: data.description || "",

        budget: Number(data.budget || 0),

        startDate: data.startDate,

        endDate: data.endDate,

        coverImage: data.coverImage || "",

        stops: [],

        assignedActivities: [],

        expenses: [],

        packing: [],

        notes: [],

        publicSlug: "trip-" + Math.random().toString(36).slice(2, 8)
      };

      state.dataset.trips.unshift(newTrip);

      state.selectedTripId = newTrip.id;

      // SAVE
      localStorage.setItem(
        "traveloop.v1.dataset",
        JSON.stringify(state.dataset)
      );

      toast(
        "Trip created",
        `${newTrip.name} has been added successfully.`
      );

      window.location.hash = "#builder";

      renderView("builder");

      return;
    }

    // ADD STOP
    if (form.dataset.action === "add-stop") {

      const trip = getSelectedTrip();

      if (!trip) {
        toast("No trip selected", "Create or open a trip first.");
        return;
      }

      const city = state.dataset.cities.find(
        (item) => String(item.id) === String(data.cityId)
      );

      if (!city) {
        toast("City not found", "Please select a valid city.");
        return;
      }

      const stop = {
        id: "stop-" + Date.now(),

        city: city.city,

        country: city.country,

        region: city.region,

        startDate: data.startDate,

        endDate: data.endDate,

        costIndex: city.costIndex,

        popularity: city.popularity,

        position: trip.stops.length
      };

      trip.stops.push(stop);

      localStorage.setItem(
        "traveloop.v1.dataset",
        JSON.stringify(state.dataset)
      );

      toast(
        "City added",
        `${city.city} added to your trip.`
      );

      renderView("builder");

      return;
    }

  } catch (error) {

    console.error(error);

    toast(
      "Something went wrong",
      error.message || "Unable to save data."
    );
  }
};
function getSelectedTrip() {
  return state.dataset.trips.find(
    (trip) => trip.id === state.selectedTripId
  );
}
  function createTrip(data) {
    if (new Date(data.endDate) < new Date(data.startDate)) {
      toast("Dates need attention", "End date must be after the start date.");
      return;
    }
    const trip = {
      id: Data.uid("trip"),
      ownerId: state.user.id,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      description: data.description || "",
      coverImage: data.coverImage || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=80",
      budget: Number(data.budget || 0),
      publicSlug: slugify(data.name),
      isPublic: false,
      stops: [],
      assignedActivities: [],
      expenses: [],
      packing: [
        { id: Data.uid("pack"), category: "Documents", text: "Passport and ID", packed: false },
        { id: Data.uid("pack"), category: "Electronics", text: "Phone charger", packed: false }
      ],
      notes: []
    };
    state.dataset.trips.unshift(trip);
    state.selectedTripId = trip.id;
    window.location.hash = "builder";
    toast("Trip created", "Now add stops and activities in the builder.");
  }

  function addStop(data) {
    const trip = getSelectedTrip();
   const city = state.dataset.cities.find(
  (item) =>
    String(item.id) === String(data.cityId)
);
if (!city) {

  toast(
    "City not found",
    "Please select a valid city."
  );

  return;
}
    if (!trip || !city) return;
    trip.stops.push({
      id: Data.uid("stop"),
      city: city.city,
      country: city.country,
      region: city.region,
      startDate: data.startDate,
      endDate: data.endDate,
      costIndex: city.costIndex,
      popularity: city.popularity,
      order: trip.stops.length + 1
    });
    syncTripDates(trip);
    toast("Stop added", `${city.city} is now part of ${trip.name}.`);
  }

  function assignActivity(data) {
    const trip = getSelectedTrip();
    const activity = state.dataset.activities.find((item) => item.id === data.activityId);
    if (!trip || !activity) return;
    trip.assignedActivities.push({
      id: Data.uid("ta"),
      stopId: data.stopId,
      activityId: activity.id,
      name: activity.name,
      type: activity.type,
      cost: Number(data.cost || activity.cost || 0),
      duration: Number(activity.duration || 1),
      time: data.time || "10:00",
      image: activity.image,
      description: activity.description
    });
    toast("Activity added", `${activity.name} has been added to the itinerary.`);
  }

  function addExpense(data) {
    const trip = getSelectedTrip();
    if (!trip) return;
    trip.expenses.push({
      id: Data.uid("exp"),
      category: data.category,
      label: data.label,
      amount: Number(data.amount || 0),
      date: data.date || trip.startDate
    });
    toast("Expense added", `${data.label} was added to the budget.`);
  }

  function addPacking(data) {
    const trip = getSelectedTrip();
    if (!trip) return;
    trip.packing.push({
      id: Data.uid("pack"),
      category: data.category,
      text: data.text,
      packed: false
    });
    toast("Checklist updated", `${data.text} was added.`);
  }

  function addNote(data) {
    const trip = getSelectedTrip();
    if (!trip) return;
    trip.notes.push({
      id: Data.uid("note"),
      stopId: data.stopId,
      body: data.body,
      createdAt: new Date().toISOString()
    });
    toast("Note saved", "Your trip note has been stored.");
  }

  function saveProfile(data) {
    state.dataset.profile = {
      ...state.dataset.profile,
      name: data.name,
      email: data.email,
      language: data.language,
      photo: data.photo,
      savedDestinations: data.savedDestinations.split(",").map((item) => item.trim()).filter(Boolean)
    };
    toast("Profile saved", "Your preferences are updated.");
  }

  function duplicateTrip(tripId) {
    const source = state.dataset.trips.find((trip) => trip.id === tripId);
    if (!source) return;
    const copy = Data.clone(source);
    copy.id = Data.uid("trip");
    copy.name = `${source.name} Copy`;
    copy.publicSlug = slugify(copy.name);
    copy.isPublic = false;
    copy.stops.forEach((stop, index) => {
      const oldId = stop.id;
      stop.id = Data.uid("stop");
      copy.assignedActivities.forEach((activity) => {
        if (activity.stopId === oldId) activity.stopId = stop.id;
      });
      copy.notes.forEach((note) => {
        if (note.stopId === oldId) note.stopId = stop.id;
      });
      stop.order = index + 1;
    });
    copy.assignedActivities.forEach((activity) => { activity.id = Data.uid("ta"); });
    copy.expenses.forEach((expense) => { expense.id = Data.uid("exp"); });
    copy.packing.forEach((item) => { item.id = Data.uid("pack"); });
    copy.notes.forEach((note) => { note.id = Data.uid("note"); note.createdAt = new Date().toISOString(); });
    state.dataset.trips.unshift(copy);
    state.selectedTripId = copy.id;
    toast("Trip copied", `${copy.name} is ready to edit.`);
  }

  function deleteTrip(tripId) {
    state.dataset.trips = state.dataset.trips.filter((trip) => trip.id !== tripId);
    if (state.selectedTripId === tripId) {
      state.selectedTripId = state.dataset.trips[0] && state.dataset.trips[0].id || "";
    }
    toast("Trip deleted", "The trip was removed from your list.");
  }

  function deleteStop(stopId) {
    const trip = getSelectedTrip();
    if (!trip) return;
    trip.stops = trip.stops.filter((stop) => stop.id !== stopId);
    trip.assignedActivities = trip.assignedActivities.filter((activity) => activity.stopId !== stopId);
    trip.notes = trip.notes.filter((note) => note.stopId !== stopId);
    normalizeStopOrder(trip);
    toast("Stop removed", "Related activities and notes were removed.");
  }

  function moveStop(stopId, direction) {
    const trip = getSelectedTrip();
    if (!trip) return;
    const stops = trip.stops.slice().sort(byOrder);
    const index = stops.findIndex((stop) => stop.id === stopId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= stops.length) return;
    const swap = stops[index].order;
    stops[index].order = stops[nextIndex].order;
    stops[nextIndex].order = swap;
    trip.stops = stops.sort(byOrder);
    normalizeStopOrder(trip);
  }

  function deleteActivity(activityId) {
    const trip = getSelectedTrip();
    if (!trip) return;
    trip.assignedActivities = trip.assignedActivities.filter((activity) => activity.id !== activityId);
    toast("Activity removed", "The itinerary activity was removed.");
  }

  function deleteExpense(expenseId) {
    const trip = getSelectedTrip();
    if (!trip) return;
    trip.expenses = trip.expenses.filter((expense) => expense.id !== expenseId);
  }

  function togglePacked(itemId) {
    const trip = getSelectedTrip();
    if (!trip) return;
    const item = trip.packing.find((entry) => entry.id === itemId);
    if (item) item.packed = !item.packed;
  }

  function deletePacking(itemId) {
    const trip = getSelectedTrip();
    if (!trip) return;
    trip.packing = trip.packing.filter((item) => item.id !== itemId);
  }

  function resetPacking() {
    const trip = getSelectedTrip();
    if (!trip) return;
    trip.packing.forEach((item) => { item.packed = false; });
    toast("Checklist reset", "All packing items are marked unpacked.");
  }

  function deleteNote(noteId) {
    const trip = getSelectedTrip();
    if (!trip) return;
    trip.notes = trip.notes.filter((note) => note.id !== noteId);
  }

  function addCityToTrip(cityId) {
    const city = state.dataset.cities.find((item) => item.id === cityId);
    const trip = getSelectedTrip();
    if (!city || !trip) return;
    trip.stops.push({
      id: Data.uid("stop"),
      city: city.city,
      country: city.country,
      region: city.region,
      startDate: trip.startDate,
      endDate: trip.endDate,
      costIndex: city.costIndex,
      popularity: city.popularity,
      order: trip.stops.length + 1
    });
    toast("City added", `${city.city} was added to ${trip.name}.`);
  }

  function addDiscoveryActivity(activityId) {
    const trip = getSelectedTrip();
    const activity = state.dataset.activities.find((item) => item.id === activityId);
    if (!trip || !activity) return;
    let stop = trip.stops.find((item) => item.city === activity.city);
    if (!stop) {
      const city = state.dataset.cities.find((item) => item.city === activity.city);
      addCityToTrip(city && city.id);
      stop = trip.stops.find((item) => item.city === activity.city);
    }
    if (!stop) return;
    trip.assignedActivities.push({
      id: Data.uid("ta"),
      stopId: stop.id,
      activityId: activity.id,
      name: activity.name,
      type: activity.type,
      cost: Number(activity.cost || 0),
      duration: Number(activity.duration || 1),
      time: "10:00",
      image: activity.image,
      description: activity.description
    });
    toast("Activity added", `${activity.name} has been attached to ${stop.city}.`);
  }

  function applyOrder(order) {
    const trip = getSelectedTrip();
    if (!trip) return;
    let sorted = trip.stops.slice();
    if (order === "date") sorted.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    if (order === "budget") sorted.sort((a, b) => Number(a.costIndex || 0) - Number(b.costIndex || 0));
    if (order === "popular") sorted.sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0));
    sorted.forEach((stop, index) => { stop.order = index + 1; });
    trip.stops = sorted;
    toast("Order suggested", `${labelCase(order)} order has been applied.`);
  }

  function togglePublic() {
    const trip = getSelectedTrip();
    if (!trip) return;
    trip.isPublic = !trip.isPublic;
    if (!trip.publicSlug) trip.publicSlug = slugify(trip.name);
    toast(trip.isPublic ? "Trip is public" : "Trip is private", "Share status updated.");
  }

  function copyPublicTrip(tripId) {
    const dataset = state.dataset || Data.dataset.local();
    const source = dataset.trips.find((trip) => trip.id === tripId);
    if (!source) return;
    if (!state.user) {
      toast("Login needed", "Sign in first, then copy this public trip.");
      showAuth(true);
      return;
    }
    duplicateTrip(source.id);
  }

  async function persistAndRender() {
    try {
      await Data.dataset.save(state.dataset, state.user);
      renderView(state.activeView);
    } catch (error) {
      toast("Could not save", error.message || "Changes stayed in memory only.");
      renderView(state.activeView);
    }
  }

  function getSelectedTrip() {
    if (!state.dataset) return null;
    return state.dataset.trips.find((trip) => trip.id === state.selectedTripId) || state.dataset.trips[0] || null;
  }

  function tripSelector() {
    const options = state.dataset.trips.map((trip) => `<option value="${trip.id}" ${trip.id === state.selectedTripId ? "selected" : ""}>${escapeHtml(trip.name)}</option>`).join("");
    return `
      <div class="trip-selector">
        <label>
          <span>Current trip</span>
          <select id="tripSelect">${options}</select>
        </label>
        <a class="ghost-btn" href="#create"><i data-lucide="plus"></i><span>New Trip</span></a>
      </div>
    `;
  }

  function noTripSelected() {
    return emptyState("map", "No trip selected", "Create or select a trip to use this feature.") +
      `<div class="action-row" style="justify-content:center;margin-top:16px"><a class="solid-btn" href="#create"><i data-lucide="plus"></i><span>Create Trip</span></a></div>`;
  }

  function metricCard(label, value, hint) {
    return `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><p class="muted">${escapeHtml(hint)}</p></article>`;
  }

  function tripFeature(trip) {
    return `
      <article class="image-card card" style="margin-top:12px">
        <div class="image" style="background-image:url('${escapeAttr(trip.coverImage || fallbackCover(trip))}')"></div>
        <div class="content">
          <h3>${escapeHtml(trip.name)}</h3>
          <p class="muted">${escapeHtml(trip.description || "")}</p>
          <div class="meta-list">
            <span class="pill">${dateRange(trip)}</span>
            <span class="pill">${trip.stops.length} stops</span>
            <span class="pill">${money(budgetTotals(trip).total)} planned</span>
          </div>
          <div class="card-actions">
            <button class="solid-btn" type="button" data-action="select-trip" data-trip-id="${trip.id}"><i data-lucide="calendar-days"></i><span>View Itinerary</span></button>
            <button class="ghost-btn" type="button" data-action="open-route"><i data-lucide="map"></i><span>Open Maps</span></button>
          </div>
        </div>
      </article>
    `;
  }

  function budgetMini(trip) {
    const totals = budgetTotals(trip);
    return `
      <div class="budget-total" style="font-size:2.2rem">${money(totals.total)}</div>
      <p class="muted">Target: ${money(trip.budget)} across ${tripDays(trip)} days.</p>
      <div class="bar-list">
        ${Object.entries(totals.byCategory).map(([category, value]) => barRow(labelCase(category), value, totals.total)).join("")}
      </div>
    `;
  }

  function journeyGraphic(trip) {
    const stops = trip.stops.slice().sort(byOrder).slice(0, 5);
    if (!stops.length) return "";
    const totals = budgetTotals(trip);
    return `
      <div class="journey-graphic" aria-label="Trip route graphic">
        <div class="route-track">
          ${stops.map((stop, index) => `
            <div class="route-node">
              <span>${index + 1}</span>
              <small>${escapeHtml(stop.city)}</small>
            </div>
          `).join("")}
        </div>
        <div class="graphic-stats">
          <div><strong>${trip.stops.length}</strong><small class="muted">Stops</small></div>
          <div><strong>${tripDays(trip)}</strong><small class="muted">Days</small></div>
          <div><strong>${money(totals.total)}</strong><small class="muted">Planned</small></div>
        </div>
      </div>
    `;
  }

  function cityCard(city) {
    return `
      <article class="card image-card">
        <div class="image" style="background-image:url('${escapeAttr(city.image)}')"></div>
        <div class="content">
          <h3>${escapeHtml(city.city)}, ${escapeHtml(city.country)}</h3>
          <p class="muted">${escapeHtml(city.summary)}</p>
          <div class="meta-list">
            <span class="pill">${escapeHtml(city.region)}</span>
            <span class="pill">Cost ${city.costIndex}</span>
            <span class="pill">Popularity ${city.popularity}</span>
          </div>
          <div class="card-actions">
            <button class="solid-btn" type="button" data-action="add-city-to-trip" data-city-id="${city.id}"><i data-lucide="plus"></i><span>Add to Trip</span></button>
            <button class="ghost-btn" type="button" data-action="open-city-map" data-city="${escapeAttr(city.city)}" data-country="${escapeAttr(city.country)}"><i data-lucide="map-pin"></i><span>Maps</span></button>
          </div>
        </div>
      </article>
    `;
  }

  function stopCard(stop) {
    return `
      <article class="stop-card">
        <div class="stop-head">
          <div>
            <h3>${escapeHtml(stop.city)}, ${escapeHtml(stop.country)}</h3>
            <p class="muted">${formatDate(stop.startDate)} to ${formatDate(stop.endDate)}. Cost index ${stop.costIndex}, popularity ${stop.popularity}.</p>
          </div>
          <div class="inline-actions">
            <button class="icon-btn" title="Move up" aria-label="Move stop up" type="button" data-action="move-stop" data-stop-id="${stop.id}" data-direction="up"><i data-lucide="arrow-up"></i></button>
            <button class="icon-btn" title="Move down" aria-label="Move stop down" type="button" data-action="move-stop" data-stop-id="${stop.id}" data-direction="down"><i data-lucide="arrow-down"></i></button>
            <button class="icon-btn" title="Open city in Google Maps" aria-label="Open city in Google Maps" type="button" data-action="open-city-map" data-city="${escapeAttr(stop.city)}" data-country="${escapeAttr(stop.country)}"><i data-lucide="map-pin"></i></button>
            <button class="icon-btn" title="Delete stop" aria-label="Delete stop" type="button" data-action="delete-stop" data-stop-id="${stop.id}"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      </article>
    `;
  }

  function activityAssignment(activity) {
    return `
      <article class="activity-row">
        <div class="row-head">
          <div>
            <h3>${escapeHtml(activity.name)}</h3>
            <p class="muted">${escapeHtml(activity.type)} at ${activity.time || "time not set"} for ${money(activity.cost)}.</p>
          </div>
          <button class="icon-btn" title="Delete activity" aria-label="Delete activity" type="button" data-action="delete-activity" data-activity-id="${activity.id}"><i data-lucide="trash-2"></i></button>
        </div>
      </article>
    `;
  }

  function activityDiscoveryCard(activity) {
    return `
      <article class="card">
        <div class="row-head">
          <div>
            <h3>${escapeHtml(activity.name)}</h3>
            <p class="muted">${escapeHtml(activity.description)} ${escapeHtml(activity.city)}, ${escapeHtml(activity.country)}.</p>
          </div>
          <span class="pill">${money(activity.cost)}</span>
        </div>
        <div class="meta-list">
          <span class="pill">${escapeHtml(activity.type)}</span>
          <span class="pill">${activity.duration}h</span>
        </div>
        <div class="card-actions">
          <button class="solid-btn" type="button" data-action="add-discovery-activity" data-activity-id="${activity.id}"><i data-lucide="plus"></i><span>Add</span></button>
          <button class="ghost-btn" type="button" data-action="open-activity-map" data-activity="${escapeAttr(activity.name)}" data-city="${escapeAttr(activity.city)}"><i data-lucide="map-pin"></i><span>Maps</span></button>
        </div>
      </article>
    `;
  }

  function timelineView(trip) {
    const stops = trip.stops.slice().sort(byOrder);
    if (!stops.length) return emptyState("route", "No itinerary stops", "Open Builder and add city stops.");
    return `
      <section class="timeline">
        ${stops.map((stop) => {
          const activities = trip.assignedActivities.filter((activity) => activity.stopId === stop.id);
          return `
            <div class="timeline-day">
              <div>
                <div class="date-badge">${formatDate(stop.startDate)}</div>
                <p class="muted">${formatDate(stop.endDate)}</p>
                <button class="ghost-btn" type="button" data-action="open-city-map" data-city="${escapeAttr(stop.city)}" data-country="${escapeAttr(stop.country)}"><i data-lucide="map-pin"></i><span>${escapeHtml(stop.city)}</span></button>
              </div>
              <div>
                <h3>${escapeHtml(stop.city)}, ${escapeHtml(stop.country)}</h3>
                ${activities.length ? activities.map((activity) => `
                  <article class="activity-block">
                    <strong>${escapeHtml(activity.time || "Any time")} - ${escapeHtml(activity.name)}</strong>
                    <span class="muted">${escapeHtml(activity.description || activity.type)} ${money(activity.cost)}.</span>
                  </article>
                `).join("") : "<p class='muted'>No activities assigned yet.</p>"}
              </div>
            </div>
          `;
        }).join("")}
      </section>
    `;
  }

  function calendarView(trip) {
    const days = dateList(trip.startDate, trip.endDate);
    return `
      <section class="calendar-grid">
        ${days.map((day) => {
          const stop = trip.stops.find((item) => day >= item.startDate && day <= item.endDate);
          const activities = stop ? trip.assignedActivities.filter((activity) => activity.stopId === stop.id).slice(0, 2) : [];
          return `
            <div class="calendar-cell">
              <strong>${formatDate(day)}</strong>
              <p class="muted">${stop ? `${escapeHtml(stop.city)}, ${escapeHtml(stop.country)}` : "Travel day"}</p>
              ${activities.map((activity) => `<span class="pill">${escapeHtml(activity.name)}</span>`).join(" ")}
            </div>
          `;
        }).join("")}
      </section>
    `;
  }

  function expenseRow(expense) {
    return `
      <article class="expense-row">
        <div class="row-head">
          <div>
            <strong>${escapeHtml(expense.label)}</strong>
            <p class="muted">${labelCase(expense.category)} on ${formatDate(expense.date)}.</p>
          </div>
          <div class="inline-actions">
            <span class="pill">${money(expense.amount)}</span>
            <button class="icon-btn" title="Delete expense" aria-label="Delete expense" type="button" data-action="delete-expense" data-expense-id="${expense.id}"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      </article>
    `;
  }

  function packingRow(item) {
    return `
      <article class="packing-row ${item.packed ? "packed" : ""}">
        <input type="checkbox" ${item.packed ? "checked" : ""} data-action="toggle-packed" data-item-id="${item.id}" aria-label="Mark ${escapeAttr(item.text)} packed">
        <div>
          <strong class="item-title">${escapeHtml(item.text)}</strong>
          <p class="muted">${escapeHtml(item.category)}</p>
        </div>
        <button class="icon-btn" title="Delete packing item" aria-label="Delete packing item" type="button" data-action="delete-packing" data-item-id="${item.id}"><i data-lucide="trash-2"></i></button>
      </article>
    `;
  }

  function noteRow(note, trip) {
    const stop = trip.stops.find((item) => item.id === note.stopId);
    return `
      <article class="note-row">
        <div class="row-head">
          <div>
            <span class="pill">${stop ? escapeHtml(stop.city) : "Whole trip"}</span>
            <p>${escapeHtml(note.body)}</p>
            <p class="muted">${formatDateTime(note.createdAt)}</p>
          </div>
          <button class="icon-btn" title="Delete note" aria-label="Delete note" type="button" data-action="delete-note" data-note-id="${note.id}"><i data-lucide="trash-2"></i></button>
        </div>
      </article>
    `;
  }

  function emptyState(icon, title, text) {
    return `
      <div class="empty-state">
        <i data-lucide="${icon}"></i>
        <h3>${escapeHtml(title)}</h3>
        <p class="muted">${escapeHtml(text)}</p>
      </div>
    `;
  }

  function barRow(label, value, total) {
    const width = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
    return `
      <div class="bar-row">
        <div class="bar-label"><span>${escapeHtml(label)}</span><strong>${typeof value === "number" ? (value > 20 ? money(value) : value) : escapeHtml(String(value))}</strong></div>
        <div class="bar-track"><span class="bar-fill" style="width:${width}%"></span></div>
      </div>
    `;
  }

  function filteredCities() {
    const query = state.cityQuery.toLowerCase();
    return state.dataset.cities.filter((city) => {
      const text = `${city.city} ${city.country} ${city.region}`.toLowerCase();
      return (!query || text.includes(query)) && (state.regionFilter === "All" || city.region === state.regionFilter);
    });
  }

  function filteredActivities() {
    const query = state.activityQuery.toLowerCase();
    return state.dataset.activities.filter((activity) => {
      const text = `${activity.name} ${activity.city} ${activity.type} ${activity.description}`.toLowerCase();
      return (!query || text.includes(query)) && (state.activityType === "All" || activity.type === state.activityType);
    }).slice(0, 10);
  }

  function activitiesForTrip(trip) {
    const stopCities = new Set(trip.stops.map((stop) => stop.city));
    const matches = state.dataset.activities.filter((activity) => stopCities.has(activity.city));
    return matches.length ? matches : state.dataset.activities;
  }

  function budgetTotals(trip) {
    const byCategory = {};
    const expensesTotal = (trip.expenses || []).reduce((sum, expense) => {
      byCategory[expense.category] = (byCategory[expense.category] || 0) + Number(expense.amount || 0);
      return sum + Number(expense.amount || 0);
    }, 0);
    const activityTotal = (trip.assignedActivities || []).reduce((sum, activity) => sum + Number(activity.cost || 0), 0);
    byCategory.activities = (byCategory.activities || 0) + activityTotal;
    const total = expensesTotal + activityTotal;
    return {
      total,
      byCategory,
      averagePerDay: total / Math.max(1, tripDays(trip))
    };
  }

  function openRoute(trip) {
    if (!trip || !trip.stops.length) {
      toast("No route yet", "Add at least one city stop to open Google Maps.");
      return;
    }
    openUrl(Data.maps.directions(trip.stops));
  }

  function openUrl(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function copyText(text, title) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(title, text)).catch(() => fallbackCopy(text, title));
    } else {
      fallbackCopy(text, title);
    }
  }

  function fallbackCopy(text, title) {
    const input = document.createElement("textarea");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    toast(title, text);
  }

  function shareLink(trip) {
    const slug = trip.publicSlug || slugify(trip.name);
    return `${window.location.href.split("#")[0]}#share/${slug}`;
  }

  function applyTheme(theme) {
    document.body.classList.toggle("light-theme", theme === "light");
    localStorage.setItem("traveloop.theme", theme);
  }

  function toggleTheme() {
    const next = document.body.classList.contains("light-theme") ? "dark" : "light";
    applyTheme(next);
    toast("Theme changed", next === "light" ? "Light mode is active." : "Dark mode is active.");
  }

  function setButtonBusy(button, busy) {
    button.disabled = busy;
    button.querySelector("span").textContent = busy ? "Working..." : (state.authMode === "signup" ? "Create account" : "Login");
  }

  function toast(title, message) {
    const node = document.createElement("div");
    node.className = "toast";
    node.innerHTML = `<strong>${escapeHtml(title)}</strong><span class="muted">${escapeHtml(message || "")}</span>`;
    els.toastRegion.appendChild(node);
    window.setTimeout(() => node.remove(), 4200);
  }

  function refreshIcons() {
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  }

  function syncTripDates(trip) {
    if (!trip.stops.length) return;
    const dates = trip.stops.flatMap((stop) => [stop.startDate, stop.endDate]).sort();
    trip.startDate = dates[0] || trip.startDate;
    trip.endDate = dates[dates.length - 1] || trip.endDate;
  }

  function normalizeStopOrder(trip) {
    trip.stops.sort(byOrder).forEach((stop, index) => { stop.order = index + 1; });
  }

  function fallbackCover(trip) {
    const first = trip.stops && trip.stops[0];
    const city = first && state.dataset.cities.find((item) => item.city === first.city);
    return city && city.image || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1400&q=80";
  }

  function byOrder(a, b) {
    return Number(a.order || 0) - Number(b.order || 0);
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function uniqueCities(trips) {
    return unique(trips.flatMap((trip) => trip.stops.map((stop) => stop.city)));
  }

  function tripDays(trip) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    return Math.max(1, Math.round((end - start) / 86400000) + 1);
  }

  function dateList(startDate, endDate) {
    const dates = [];
    const date = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    while (date <= end && dates.length < 42) {
      dates.push(formatInputDate(date));
      date.setDate(date.getDate() + 1);
    }
    return dates;
  }

  function dateRange(trip) {
    return `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`;
  }

  function formatDate(dateString) {
    if (!dateString) return "Not set";
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${dateString}T00:00:00`));
  }

  function formatDateTime(dateString) {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(dateString));
  }

  function formatInputDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function money(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  function labelCase(value) {
    return String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function slugify(value) {
    return String(value || "trip").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "trip";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();
