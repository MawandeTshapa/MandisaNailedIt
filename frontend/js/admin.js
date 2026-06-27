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

  function showFeedback(el, message, isError) {
    el.textContent = message;
    el.className = isError ? "feedback feedback-error" : "feedback feedback-success";
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
    }
  });

  // ---------- forgot password ----------
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showFeedback(forgotFeedback, "", false);
    const email = document.getElementById("forgotEmail").value.trim();

    try {
      const data = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      showFeedback(forgotFeedback, data.message, false);
    } catch (err) {
      showFeedback(forgotFeedback, err.message, true);
    }
  });

  // ---------- reset password ----------
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showFeedback(resetFeedback, "", false);
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
              <label for="pImage">Image URL</label>
              <input id="pImage" value="${escapeHtml(p.image)}" />
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

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById("pName").value.trim(),
        brand: document.getElementById("pBrand").value.trim(),
        category: document.getElementById("pCategory").value,
        description: document.getElementById("pDescription").value.trim(),
        price: parseFloat(document.getElementById("pPrice").value),
        stock: parseInt(document.getElementById("pStock").value, 10) || 0,
        image: document.getElementById("pImage").value.trim(),
        active: document.getElementById("pActive").checked,
      };

      try {
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