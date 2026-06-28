(function () {
  "use strict";

  const TOKEN_KEY = "mni_admin_token";
  const ADMIN_KEY = "mni_admin_info";

  // ---------- DOM refs ----------
  const authWrap = document.getElementById("authWrap");
  const loginCard = document.getElementById("loginCard");
  const forgotCard = document.getElementById("forgotCard");
  const resetCard = document.getElementById("resetCard");

  const loginForm = document.getElementById("loginForm");
  const loginFeedback = document.getElementById("loginFeedback");
  const forgotForm = document.getElementById("forgotForm");
  const forgotFeedback = document.getElementById("forgotFeedback");
  const resetForm = document.getElementById("resetForm");
  const resetFeedback = document.getElementById("resetFeedback");

  const showForgot = document.getElementById("showForgot");
  const showLoginFromForgot = document.getElementById("showLoginFromForgot");
  const showLoginFromReset = document.getElementById("showLoginFromReset");

  const dashboard = document.getElementById("dashboard");
  const logoutBtn = document.getElementById("logoutBtn");
  const modalRoot = document.getElementById("modalRoot");

  const tabButtons = document.querySelectorAll(".admin-tabs button[data-tab]");
  const tabSections = document.querySelectorAll(".admin-tab");

  const productsTableBody = document.getElementById("productsTableBody");
  const addProductBtn = document.getElementById("addProductBtn");

  const servicesTableBody = document.getElementById("servicesTableBody");
  const addServiceBtn = document.getElementById("addServiceBtn");

  const reviewsTableBody = document.getElementById("reviewsTableBody");

  const discountsTableBody = document.getElementById("discountsTableBody");
  const addDiscountBtn = document.getElementById("addDiscountBtn");

  // ---------- session helpers ----------
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setSession(token, admin) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin || {}));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  }

  // ---------- fetch wrapper ----------
  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    let body = null;
    try {
      body = await res.json();
    } catch (_) {
      // response had no JSON body (e.g. some error pages)
    }

    if (!res.ok) {
      const message = (body && body.message) || `Request failed (${res.status})`;
      throw new Error(message);
    }
    return body;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  // Uploads a single image file to Cloudinary via our own /api/upload
  // endpoint and returns the resulting hosted URL. Kept separate from
  // apiFetch() because file uploads need multipart/form-data, not JSON —
  // the browser sets that header itself when given a FormData body.
  async function uploadImage(file) {
    const token = getToken();
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    let body = null;
    try {
      body = await res.json();
    } catch (_) {
      // no JSON body
    }

    if (!res.ok) {
      throw new Error((body && body.message) || `Upload failed (${res.status})`);
    }
    return body.url;
  }

  function showFeedback(el, message, isError) {
    el.textContent = message;
    el.className = isError ? "feedback feedback-error" : "feedback feedback-success";
  }

  // Swaps a submit button into/out of a disabled, spinning "loading" state.
  // Stores the button's original label in a data attribute so it can be
  // restored exactly once the request finishes (success or failure).
  function setButtonLoading(button, isLoading, loadingText) {
    if (isLoading) {
      button.dataset.originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="btn-spinner"></span>${loadingText}`;
    } else {
      button.disabled = false;
      button.innerHTML = button.dataset.originalText || button.innerHTML;
    }
  }

  // ---------- screen switching ----------
  function showAuthCard(card) {
    [loginCard, forgotCard, resetCard].forEach((c) => (c.hidden = c !== card));
    authWrap.hidden = false;
    dashboard.hidden = true;
  }

  function showDashboard() {
    authWrap.hidden = true;
    dashboard.hidden = false;
    loadProducts();
    loadServices();
    loadReviews();
    loadDiscounts();
  }

  showForgot.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthCard(forgotCard);
  });
  showLoginFromForgot.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthCard(loginCard);
  });
  showLoginFromReset.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthCard(loginCard);
  });

  // ---------- login ----------
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showFeedback(loginFeedback, "", false);
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true, "Logging in…");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(data.token, data.admin);
      showDashboard();
    } catch (err) {
      showFeedback(loginFeedback, err.message, true);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  // ---------- forgot password ----------
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showFeedback(forgotFeedback, "", false);
    const submitBtn = forgotForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true, "Sending…");
    const email = document.getElementById("forgotEmail").value.trim();

    try {
      const data = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      showFeedback(forgotFeedback, data.message, false);
    } catch (err) {
      showFeedback(forgotFeedback, err.message, true);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  // ---------- reset password ----------
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showFeedback(resetFeedback, "", false);
    const submitBtn = resetForm.querySelector('button[type="submit"]');
    const password = document.getElementById("resetPassword").value;
    const confirmPassword = document.getElementById("resetPasswordConfirm").value;
    const token = new URLSearchParams(window.location.search).get("resetToken");

    if (password !== confirmPassword) {
      showFeedback(resetFeedback, "Passwords do not match.", true);
      return;
    }
    if (!token) {
      showFeedback(resetFeedback, "Missing or invalid reset link.", true);
      return;
    }

    setButtonLoading(submitBtn, true, "Updating…");

    try {
      const data = await apiFetch(`/auth/reset-password/${token}`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      showFeedback(resetFeedback, `${data.message} Redirecting to login…`, false);
      setTimeout(() => {
        window.history.replaceState({}, "", "admin.html");
        showAuthCard(loginCard);
      }, 1500);
    } catch (err) {
      showFeedback(resetFeedback, err.message, true);
      setButtonLoading(submitBtn, false);
    }
  });

  // ---------- logout ----------
  logoutBtn.addEventListener("click", () => {
    clearSession();
    showAuthCard(loginCard);
  });

  // ---------- tabs ----------
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.tab;
      tabSections.forEach((section) => {
        section.hidden = section.id !== `tab-${target}`;
      });
    });
  });

  // ---------- products ----------
  const PRODUCT_CATEGORIES = [
    "Wigs & Bundles",
    "Hair Care",
    "Styling Tools",
    "Accessories",
    "Other",
  ];

  let currentProducts = [];

  async function loadProducts() {
    productsTableBody.innerHTML = `<tr class="empty-row"><td colspan="7">Loading…</td></tr>`;
    try {
      currentProducts = await apiFetch("/products/all");
      renderProducts(currentProducts);
    } catch (err) {
      productsTableBody.innerHTML = `<tr class="empty-row"><td colspan="7">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderProducts(products) {
    if (!products.length) {
      productsTableBody.innerHTML = `<tr class="empty-row"><td colspan="7">No products yet.</td></tr>`;
      return;
    }

    productsTableBody.innerHTML = products
      .map(
        (p) => `
        <tr data-id="${p._id}">
          <td>${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.brand || "—")}</td>
          <td>${escapeHtml(p.category)}</td>
          <td>R${Number(p.price).toFixed(2)}</td>
          <td>${p.stock}</td>
          <td>${p.active ? "Active" : "Hidden"}</td>
          <td class="admin-row-actions">
            <button class="btn-link" data-action="edit">Edit</button>
            <button class="btn-link btn-link-danger" data-action="delete">Delete</button>
          </td>
        </tr>`
      )
      .join("");

    productsTableBody.querySelectorAll("tr[data-id]").forEach((row) => {
      const id = row.dataset.id;
      const product = currentProducts.find((p) => p._id === id);
      row.querySelector('[data-action="edit"]').addEventListener("click", () => openProductModal(product));
      row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteProduct(product));
    });
  }

  addProductBtn.addEventListener("click", () => openProductModal(null));

  function openProductModal(product) {
    const isEdit = !!product;
    const p = product || {
      name: "",
      brand: "",
      category: PRODUCT_CATEGORIES[0],
      description: "",
      price: "",
      stock: 0,
      image: "",
      active: true,
    };

    modalRoot.innerHTML = `
      <div class="mni-modal-overlay" id="mniOverlay">
        <div class="mni-modal" role="dialog" aria-modal="true">
          <h3>${isEdit ? "Edit product" : "Add product"}</h3>
          <form id="productForm">
            <div class="field">
              <label for="pName">Name</label>
              <input id="pName" required value="${escapeHtml(p.name)}" />
            </div>
            <div class="field">
              <label for="pBrand">Brand</label>
              <input id="pBrand" value="${escapeHtml(p.brand)}" />
            </div>
            <div class="field">
              <label for="pCategory">Category</label>
              <select id="pCategory">
                ${PRODUCT_CATEGORIES.map(
                  (c) => `<option value="${c}" ${c === p.category ? "selected" : ""}>${c}</option>`
                ).join("")}
              </select>
            </div>
            <div class="field">
              <label for="pDescription">Description</label>
              <textarea id="pDescription" rows="3">${escapeHtml(p.description)}</textarea>
            </div>
            <div class="field">
              <label for="pPrice">Price (R)</label>
              <input id="pPrice" type="number" min="0" step="0.01" required value="${p.price}" />
            </div>
            <div class="field">
              <label for="pStock">Stock</label>
              <input id="pStock" type="number" min="0" step="1" value="${p.stock}" />
            </div>
            <div class="field">
              <label for="pImageFile">Product photo</label>
              <input id="pImageFile" type="file" accept="image/*" />
              <img
                id="pImagePreview"
                class="mni-image-preview"
                src="${escapeHtml(p.image || "")}"
                style="${p.image ? "" : "display:none;"}"
                alt="Product preview"
              />
            </div>
            <div class="field field-checkbox">
              <label><input id="pActive" type="checkbox" ${p.active ? "checked" : ""} /> Active (visible on site)</label>
            </div>
            <div id="productFeedback" class="feedback"></div>
            <div class="mni-modal-actions">
              <button type="button" class="btn btn-outline" id="cancelProductBtn">Cancel</button>
              <button type="submit" class="btn btn-gold">${isEdit ? "Save changes" : "Add product"}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const overlay = document.getElementById("mniOverlay");
    const form = document.getElementById("productForm");
    const feedback = document.getElementById("productFeedback");

    document.getElementById("cancelProductBtn").addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    document.getElementById("pImageFile").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = document.getElementById("pImagePreview");
        preview.src = ev.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(file);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      feedback.textContent = "";
      feedback.className = "feedback";

      try {
        let imageUrl = p.image || "";
        const fileInput = document.getElementById("pImageFile");
        if (fileInput.files && fileInput.files[0]) {
          feedback.textContent = "Uploading image…";
          imageUrl = await uploadImage(fileInput.files[0]);
        }

        const payload = {
          name: document.getElementById("pName").value.trim(),
          brand: document.getElementById("pBrand").value.trim(),
          category: document.getElementById("pCategory").value,
          description: document.getElementById("pDescription").value.trim(),
          price: parseFloat(document.getElementById("pPrice").value),
          stock: parseInt(document.getElementById("pStock").value, 10) || 0,
          image: imageUrl,
          active: document.getElementById("pActive").checked,
        };

        if (isEdit) {
          await apiFetch(`/products/${p._id}`, { method: "PUT", body: JSON.stringify(payload) });
        } else {
          await apiFetch("/products", { method: "POST", body: JSON.stringify(payload) });
        }
        closeModal();
        loadProducts();
      } catch (err) {
        feedback.textContent = err.message;
        feedback.className = "feedback feedback-error";
        submitBtn.disabled = false;
      }
    });
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}"? This can't be undone.`)) return;
    try {
      await apiFetch(`/products/${product._id}`, { method: "DELETE" });
      loadProducts();
    } catch (err) {
      window.alert(err.message);
    }
  }

  // ---------- services ----------
  const SERVICE_CATEGORIES = [
    "Nails",
    "Lashes",
    "Hair Installation",
    "Hair Care",
    "Other",
  ];

  let currentServices = [];

  async function loadServices() {
    servicesTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">Loading…</td></tr>`;
    try {
      currentServices = await apiFetch("/services/all");
      renderServices(currentServices);
    } catch (err) {
      servicesTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderServices(services) {
    if (!services.length) {
      servicesTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">No services yet.</td></tr>`;
      return;
    }

    servicesTableBody.innerHTML = services
      .map(
        (s) => `
        <tr data-id="${s._id}">
          <td>${escapeHtml(s.name)}</td>
          <td>${escapeHtml(s.category)}</td>
          <td>R${Number(s.price).toFixed(2)}</td>
          <td>${s.durationMinutes} min</td>
          <td>${s.active ? "Active" : "Hidden"}</td>
          <td class="admin-row-actions">
            <button class="btn-link" data-action="edit">Edit</button>
            <button class="btn-link btn-link-danger" data-action="delete">Delete</button>
          </td>
        </tr>`
      )
      .join("");

    servicesTableBody.querySelectorAll("tr[data-id]").forEach((row) => {
      const id = row.dataset.id;
      const service = currentServices.find((s) => s._id === id);
      row.querySelector('[data-action="edit"]').addEventListener("click", () => openServiceModal(service));
      row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteService(service));
    });
  }

  addServiceBtn.addEventListener("click", () => openServiceModal(null));

  function openServiceModal(service) {
    const isEdit = !!service;
    const s = service || {
      name: "",
      category: SERVICE_CATEGORIES[0],
      description: "",
      price: "",
      durationMinutes: 60,
      image: "",
      active: true,
    };

    modalRoot.innerHTML = `
      <div class="mni-modal-overlay" id="mniOverlay">
        <div class="mni-modal" role="dialog" aria-modal="true">
          <h3>${isEdit ? "Edit service" : "Add service"}</h3>
          <form id="serviceForm">
            <div class="field">
              <label for="sName">Name</label>
              <input id="sName" required value="${escapeHtml(s.name)}" />
            </div>
            <div class="field">
              <label for="sCategory">Category</label>
              <select id="sCategory">
                ${SERVICE_CATEGORIES.map(
                  (c) => `<option value="${c}" ${c === s.category ? "selected" : ""}>${c}</option>`
                ).join("")}
              </select>
            </div>
            <div class="field">
              <label for="sDescription">Description</label>
              <textarea id="sDescription" rows="3">${escapeHtml(s.description)}</textarea>
            </div>
            <div class="field">
              <label for="sPrice">Price (R)</label>
              <input id="sPrice" type="number" min="0" step="0.01" required value="${s.price}" />
            </div>
            <div class="field">
              <label for="sDuration">Duration (minutes)</label>
              <input id="sDuration" type="number" min="0" step="5" value="${s.durationMinutes}" />
            </div>
            <div class="field">
              <label for="sImageFile">Service photo</label>
              <input id="sImageFile" type="file" accept="image/*" />
              <img
                id="sImagePreview"
                class="mni-image-preview"
                src="${escapeHtml(s.image || "")}"
                style="${s.image ? "" : "display:none;"}"
                alt="Service preview"
              />
            </div>
            <div class="field field-checkbox">
              <label><input id="sActive" type="checkbox" ${s.active ? "checked" : ""} /> Active (visible on site)</label>
            </div>
            <div id="serviceFeedback" class="feedback"></div>
            <div class="mni-modal-actions">
              <button type="button" class="btn btn-outline" id="cancelServiceBtn">Cancel</button>
              <button type="submit" class="btn btn-gold">${isEdit ? "Save changes" : "Add service"}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const overlay = document.getElementById("mniOverlay");
    const form = document.getElementById("serviceForm");
    const feedback = document.getElementById("serviceFeedback");

    document.getElementById("cancelServiceBtn").addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    document.getElementById("sImageFile").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = document.getElementById("sImagePreview");
        preview.src = ev.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(file);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      feedback.textContent = "";
      feedback.className = "feedback";

      try {
        let imageUrl = s.image || "";
        const fileInput = document.getElementById("sImageFile");
        if (fileInput.files && fileInput.files[0]) {
          feedback.textContent = "Uploading image…";
          imageUrl = await uploadImage(fileInput.files[0]);
        }

        const payload = {
          name: document.getElementById("sName").value.trim(),
          category: document.getElementById("sCategory").value,
          description: document.getElementById("sDescription").value.trim(),
          price: parseFloat(document.getElementById("sPrice").value),
          durationMinutes: parseInt(document.getElementById("sDuration").value, 10) || 0,
          image: imageUrl,
          active: document.getElementById("sActive").checked,
        };

        if (isEdit) {
          await apiFetch(`/services/${s._id}`, { method: "PUT", body: JSON.stringify(payload) });
        } else {
          await apiFetch("/services", { method: "POST", body: JSON.stringify(payload) });
        }
        closeModal();
        loadServices();
      } catch (err) {
        feedback.textContent = err.message;
        feedback.className = "feedback feedback-error";
        submitBtn.disabled = false;
      }
    });
  }

  async function deleteService(service) {
    if (!window.confirm(`Delete "${service.name}"? This can't be undone.`)) return;
    try {
      await apiFetch(`/services/${service._id}`, { method: "DELETE" });
      loadServices();
    } catch (err) {
      window.alert(err.message);
    }
  }

  // ---------- reviews ----------
  let currentReviews = [];

  async function loadReviews() {
    reviewsTableBody.innerHTML = `<tr class="empty-row"><td colspan="5">Loading…</td></tr>`;
    try {
      currentReviews = await apiFetch("/reviews/all");
      renderReviews(currentReviews);
    } catch (err) {
      reviewsTableBody.innerHTML = `<tr class="empty-row"><td colspan="5">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderReviews(reviews) {
    if (!reviews.length) {
      reviewsTableBody.innerHTML = `<tr class="empty-row"><td colspan="5">No reviews yet.</td></tr>`;
      return;
    }

    reviewsTableBody.innerHTML = reviews
      .map((r) => {
        const comment = r.comment.length > 100 ? r.comment.slice(0, 100) + "…" : r.comment;
        return `
        <tr data-id="${r._id}">
          <td>${escapeHtml(r.customerName)}</td>
          <td>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</td>
          <td title="${escapeHtml(r.comment)}">${escapeHtml(comment)}</td>
          <td class="status-${r.status}">${r.status}</td>
          <td class="admin-row-actions">
            ${r.status !== "approved" ? '<button class="btn-link" data-action="approve">Approve</button>' : ""}
            ${r.status !== "rejected" ? '<button class="btn-link" data-action="reject">Reject</button>' : ""}
            <button class="btn-link btn-link-danger" data-action="delete">Delete</button>
          </td>
        </tr>`;
      })
      .join("");

    reviewsTableBody.querySelectorAll("tr[data-id]").forEach((row) => {
      const id = row.dataset.id;
      const review = currentReviews.find((r) => r._id === id);
      const approveBtn = row.querySelector('[data-action="approve"]');
      const rejectBtn = row.querySelector('[data-action="reject"]');
      const deleteBtn = row.querySelector('[data-action="delete"]');
      if (approveBtn) approveBtn.addEventListener("click", () => setReviewStatus(review, "approved"));
      if (rejectBtn) rejectBtn.addEventListener("click", () => setReviewStatus(review, "rejected"));
      deleteBtn.addEventListener("click", () => deleteReview(review));
    });
  }

  async function setReviewStatus(review, status) {
    try {
      await apiFetch(`/reviews/${review._id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      loadReviews();
    } catch (err) {
      window.alert(err.message);
    }
  }

  async function deleteReview(review) {
    if (!window.confirm(`Delete this review from ${review.customerName}? This can't be undone.`)) return;
    try {
      await apiFetch(`/reviews/${review._id}`, { method: "DELETE" });
      loadReviews();
    } catch (err) {
      window.alert(err.message);
    }
  }

  // ---------- discounts ----------
  let currentDiscounts = [];

  function formatDate(d) {
    return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  }

  function discountStatus(d) {
    if (!d.active) return { label: "Inactive", cls: "status-inactive" };
    const now = new Date();
    const start = new Date(d.startDate);
    const end = new Date(d.endDate);
    if (now < start) return { label: "Upcoming", cls: "status-upcoming" };
    if (now > end) return { label: "Expired", cls: "status-expired" };
    return { label: "Live", cls: "status-live" };
  }

  function discountAppliesTo(d) {
    if (d.scope === "all") return "All services & products";
    if (d.scope === "services") return "All services";
    if (d.scope === "products") return "All products";
    // scope === "item"
    const pool = d.targetModel === "Service" ? currentServices : currentProducts;
    const item = pool.find((x) => x._id === d.targetId);
    return `${d.targetModel}: ${item ? item.name : "(item not found)"}`;
  }

  async function loadDiscounts() {
    discountsTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">Loading…</td></tr>`;
    try {
      currentDiscounts = await apiFetch("/discounts");
      renderDiscounts(currentDiscounts);
    } catch (err) {
      discountsTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderDiscounts(discounts) {
    if (!discounts.length) {
      discountsTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">No discounts yet.</td></tr>`;
      return;
    }

    discountsTableBody.innerHTML = discounts
      .map((d) => {
        const status = discountStatus(d);
        const amount = d.type === "percentage" ? `${d.value}%` : `R${Number(d.value).toFixed(2)}`;
        return `
        <tr data-id="${d._id}">
          <td>${escapeHtml(d.title)}</td>
          <td>${escapeHtml(discountAppliesTo(d))}</td>
          <td>${amount}</td>
          <td>${formatDate(d.startDate)} – ${formatDate(d.endDate)}</td>
          <td class="${status.cls}">${status.label}</td>
          <td class="admin-row-actions">
            <button class="btn-link" data-action="edit">Edit</button>
            <button class="btn-link btn-link-danger" data-action="delete">Delete</button>
          </td>
        </tr>`;
      })
      .join("");

    discountsTableBody.querySelectorAll("tr[data-id]").forEach((row) => {
      const id = row.dataset.id;
      const discount = currentDiscounts.find((d) => d._id === id);
      row.querySelector('[data-action="edit"]').addEventListener("click", () => openDiscountModal(discount));
      row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteDiscount(discount));
    });
  }

  addDiscountBtn.addEventListener("click", () => openDiscountModal(null));

  function toDateInputValue(d) {
    return new Date(d).toISOString().slice(0, 10);
  }

  function openDiscountModal(discount) {
    const isEdit = !!discount;
    const d = discount || {
      title: "",
      type: "percentage",
      value: "",
      scope: "all",
      targetModel: null,
      targetId: null,
      startDate: new Date(),
      endDate: new Date(),
      active: true,
    };

    function targetOptionsFor(model) {
      const pool = model === "Service" ? currentServices : currentProducts;
      return pool.map((item) => `<option value="${item._id}">${escapeHtml(item.name)}</option>`).join("");
    }

    modalRoot.innerHTML = `
      <div class="mni-modal-overlay" id="mniOverlay">
        <div class="mni-modal" role="dialog" aria-modal="true">
          <h3>${isEdit ? "Edit discount" : "Add discount"}</h3>
          <form id="discountForm">
            <div class="field">
              <label for="dTitle">Title</label>
              <input id="dTitle" required value="${escapeHtml(d.title)}" placeholder="e.g. Winter Lash Special" />
            </div>
            <div class="field">
              <label for="dType">Discount type</label>
              <select id="dType">
                <option value="percentage" ${d.type === "percentage" ? "selected" : ""}>Percentage off</option>
                <option value="fixed" ${d.type === "fixed" ? "selected" : ""}>Fixed amount off (R)</option>
              </select>
            </div>
            <div class="field">
              <label for="dValue" id="dValueLabel">Value</label>
              <input id="dValue" type="number" min="0" step="0.01" required value="${d.value}" />
            </div>
            <div class="field">
              <label for="dScope">Applies to</label>
              <select id="dScope">
                <option value="all" ${d.scope === "all" ? "selected" : ""}>All services & products</option>
                <option value="services" ${d.scope === "services" ? "selected" : ""}>All services</option>
                <option value="products" ${d.scope === "products" ? "selected" : ""}>All products</option>
                <option value="item" ${d.scope === "item" ? "selected" : ""}>One specific item</option>
              </select>
            </div>
            <div class="field" id="dTargetModelField" ${d.scope === "item" ? "" : "hidden"}>
              <label for="dTargetModel">Item type</label>
              <select id="dTargetModel">
                <option value="Service" ${d.targetModel === "Service" ? "selected" : ""}>Service</option>
                <option value="Product" ${d.targetModel === "Product" ? "selected" : ""}>Product</option>
              </select>
            </div>
            <div class="field" id="dTargetIdField" ${d.scope === "item" ? "" : "hidden"}>
              <label for="dTargetId">Which item</label>
              <select id="dTargetId">
                ${targetOptionsFor(d.targetModel || "Service")}
              </select>
            </div>
            <div class="field">
              <label for="dStartDate">Start date</label>
              <input id="dStartDate" type="date" required value="${toDateInputValue(d.startDate)}" />
            </div>
            <div class="field">
              <label for="dEndDate">End date</label>
              <input id="dEndDate" type="date" required value="${toDateInputValue(d.endDate)}" />
            </div>
            <div class="field field-checkbox">
              <label><input id="dActive" type="checkbox" ${d.active ? "checked" : ""} /> Active</label>
            </div>
            <div id="discountFeedback" class="feedback"></div>
            <div class="mni-modal-actions">
              <button type="button" class="btn btn-outline" id="cancelDiscountBtn">Cancel</button>
              <button type="submit" class="btn btn-gold">${isEdit ? "Save changes" : "Add discount"}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const overlay = document.getElementById("mniOverlay");
    const form = document.getElementById("discountForm");
    const feedback = document.getElementById("discountFeedback");
    const scopeSelect = document.getElementById("dScope");
    const targetModelField = document.getElementById("dTargetModelField");
    const targetIdField = document.getElementById("dTargetIdField");
    const targetModelSelect = document.getElementById("dTargetModel");
    const targetIdSelect = document.getElementById("dTargetId");
    const typeSelect = document.getElementById("dType");
    const valueLabel = document.getElementById("dValueLabel");

    function updateValueLabel() {
      valueLabel.textContent = typeSelect.value === "percentage" ? "Value (%)" : "Value (R)";
    }
    updateValueLabel();
    typeSelect.addEventListener("change", updateValueLabel);

    scopeSelect.addEventListener("change", () => {
      const isItem = scopeSelect.value === "item";
      targetModelField.hidden = !isItem;
      targetIdField.hidden = !isItem;
      if (isItem) targetIdSelect.innerHTML = targetOptionsFor(targetModelSelect.value);
    });

    targetModelSelect.addEventListener("change", () => {
      targetIdSelect.innerHTML = targetOptionsFor(targetModelSelect.value);
    });

    document.getElementById("cancelDiscountBtn").addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      feedback.textContent = "";
      feedback.className = "feedback";

      const scope = scopeSelect.value;
      const startDate = document.getElementById("dStartDate").value;
      const endDate = document.getElementById("dEndDate").value;

      if (new Date(endDate) < new Date(startDate)) {
        feedback.textContent = "End date can't be before the start date.";
        feedback.className = "feedback feedback-error";
        return;
      }
      if (scope === "item" && !targetIdSelect.value) {
        feedback.textContent = "Choose which service or product this applies to.";
        feedback.className = "feedback feedback-error";
        return;
      }

      submitBtn.disabled = true;

      const payload = {
        title: document.getElementById("dTitle").value.trim(),
        type: typeSelect.value,
        value: parseFloat(document.getElementById("dValue").value),
        scope,
        targetModel: scope === "item" ? targetModelSelect.value : null,
        targetId: scope === "item" ? targetIdSelect.value : null,
        startDate,
        endDate,
        active: document.getElementById("dActive").checked,
      };

      try {
        if (isEdit) {
          await apiFetch(`/discounts/${d._id}`, { method: "PUT", body: JSON.stringify(payload) });
        } else {
          await apiFetch("/discounts", { method: "POST", body: JSON.stringify(payload) });
        }
        closeModal();
        loadDiscounts();
      } catch (err) {
        feedback.textContent = err.message;
        feedback.className = "feedback feedback-error";
        submitBtn.disabled = false;
      }
    });
  }

  async function deleteDiscount(discount) {
    if (!window.confirm(`Delete "${discount.title}"? This can't be undone.`)) return;
    try {
      await apiFetch(`/discounts/${discount._id}`, { method: "DELETE" });
      loadDiscounts();
    } catch (err) {
      window.alert(err.message);
    }
  }

  function closeModal() {
    modalRoot.innerHTML = "";
  }

  // ---------- init ----------
  async function init() {
    const urlToken = new URLSearchParams(window.location.search).get("resetToken");
    if (urlToken) {
      showAuthCard(resetCard);
      return;
    }

    const token = getToken();
    if (!token) {
      showAuthCard(loginCard);
      return;
    }

    try {
      await apiFetch("/auth/me");
      showDashboard();
    } catch (_) {
      clearSession();
      showAuthCard(loginCard);
    }
  }

  init();
})();