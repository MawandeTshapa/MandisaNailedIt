// ===================== Auth state =====================
const TOKEN_KEY = "mni_admin_token";

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 401) {
    clearToken();
    showAuthScreen("login");
    throw new Error("Session expired. Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
}

// ===================== Screen switching =====================
function showAuthScreen(which) {
  document.getElementById("authWrap").hidden = false;
  document.getElementById("dashboard").hidden = true;
  document.getElementById("loginCard").hidden = which !== "login";
  document.getElementById("forgotCard").hidden = which !== "forgot";
  document.getElementById("resetCard").hidden = which !== "reset";
}

function showDashboard() {
  document.getElementById("authWrap").hidden = true;
  document.getElementById("dashboard").hidden = false;
  loadAllTabData();
}

document.getElementById("showForgot").addEventListener("click", () => showAuthScreen("forgot"));
document.getElementById("showLoginFromForgot").addEventListener("click", () => showAuthScreen("login"));
document.getElementById("showLoginFromReset").addEventListener("click", () => showAuthScreen("login"));

// On load: if URL has a resetToken, jump straight to the reset screen
const urlParams = new URLSearchParams(window.location.search);
const resetTokenFromUrl = urlParams.get("resetToken");

if (resetTokenFromUrl) {
  showAuthScreen("reset");
} else if (getToken()) {
  showDashboard();
} else {
  showAuthScreen("login");
}

// ===================== Login =====================
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const feedback = document.getElementById("loginFeedback");
  feedback.innerHTML = "";
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed.");
    setToken(data.token);
    showDashboard();
  } catch (err) {
    feedback.innerHTML = `<p class="form-error">${err.message}</p>`;
  }
});

// ===================== Forgot password =====================
document.getElementById("forgotForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const feedback = document.getElementById("forgotFeedback");
  feedback.innerHTML = "";
  const email = document.getElementById("forgotEmail").value.trim();

  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    feedback.innerHTML = `<p class="form-success">${data.message}</p>`;
  } catch (err) {
    feedback.innerHTML = `<p class="form-error">Something went wrong. Please try again.</p>`;
  }
});

// ===================== Reset password =====================
document.getElementById("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const feedback = document.getElementById("resetFeedback");
  feedback.innerHTML = "";
  const password = document.getElementById("resetPassword").value;
  const confirm = document.getElementById("resetPasswordConfirm").value;

  if (password !== confirm) {
    feedback.innerHTML = `<p class="form-error">Passwords don't match.</p>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/reset-password/${resetTokenFromUrl}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Could not reset password.");
    feedback.innerHTML = `<p class="form-success">${data.message}</p>`;
    setTimeout(() => { window.location.href = "admin.html"; }, 1500);
  } catch (err) {
    feedback.innerHTML = `<p class="form-error">${err.message}</p>`;
  }
});

// ===================== Logout =====================
document.getElementById("logoutBtn").addEventListener("click", () => {
  clearToken();
  showAuthScreen("login");
});

// ===================== Tabs =====================
document.querySelectorAll(".admin-tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tabs button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".admin-tab").forEach((t) => (t.hidden = true));
    document.getElementById(`tab-${btn.dataset.tab}`).hidden = false;
  });
});

function loadAllTabData() {
  loadServices();
  loadProducts();
  loadDiscounts();
  loadReviews();
}

// ===================== Toast =====================
function toast(message, isError = false) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ===================== Modal helper =====================
function openModal(title, bodyHtml, onSubmit) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-card">
        <h3>${title}</h3>
        <form id="modalForm">${bodyHtml}</form>
      </div>
    </div>
  `;
  const overlay = document.getElementById("modalOverlay");
  const form = document.getElementById("modalForm");

  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await onSubmit(new FormData(form));
  });
}

function closeModal() {
  document.getElementById("modalRoot").innerHTML = "";
}

function moneyOrDash(n) { return n != null ? `R${Number(n).toFixed(2)}` : "—"; }

// ===================================================================
// SERVICES
// ===================================================================
let servicesCache = [];

async function loadServices() {
  const tbody = document.getElementById("servicesTableBody");
  try {
    servicesCache = await apiFetch("/services/all");
    if (servicesCache.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No services yet. Add your first one.</td></tr>`;
      return;
    }
    tbody.innerHTML = servicesCache.map((s) => `
      <tr>
        <td>${s.name}</td>
        <td>${s.category}</td>
        <td>${moneyOrDash(s.price)}</td>
        <td>${s.durationMinutes} min</td>
        <td><span class="status-pill ${s.active ? "active" : "inactive"}">${s.active ? "Active" : "Hidden"}</span></td>
        <td class="row-actions">
          <button data-edit="${s._id}">Edit</button>
          <button data-delete="${s._id}" class="danger">Delete</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openServiceModal(b.dataset.edit)));
    tbody.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => deleteService(b.dataset.delete)));
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">${err.message}</td></tr>`;
  }
}

function serviceFormHtml(s = {}) {
  return `
    <div class="field"><label>Name</label><input name="name" value="${s.name || ""}" required /></div>
    <div class="field"><label>Category</label>
      <select name="category" required>
        ${["Nails","Lashes","Hair Installation","Hair Care","Other"].map(c => `<option value="${c}" ${s.category===c?"selected":""}>${c}</option>`).join("")}
      </select>
    </div>
    <div class="field-row">
      <div class="field"><label>Price (R)</label><input name="price" type="number" min="0" step="0.01" value="${s.price ?? ""}" required /></div>
      <div class="field"><label>Duration (min)</label><input name="durationMinutes" type="number" min="0" value="${s.durationMinutes ?? 60}" /></div>
    </div>
    <div class="field"><label>Description</label><textarea name="description" rows="2">${s.description || ""}</textarea></div>
    <div class="field"><label>Image URL (optional)</label><input name="image" value="${s.image || ""}" /></div>
    <label class="checkbox-row"><input type="checkbox" name="active" ${s.active === false ? "" : "checked"} /> Visible on website</label>
    <div class="modal-actions">
      <button type="button" class="btn btn-outline" style="color:var(--ink-plum);border-color:var(--line);" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn btn-gold">${s._id ? "Save changes" : "Add service"}</button>
    </div>
  `;
}

function openServiceModal(id) {
  const s = id ? servicesCache.find((x) => x._id === id) : {};
  openModal(id ? "Edit service" : "Add service", serviceFormHtml(s), async (formData) => {
    const payload = {
      name: formData.get("name"),
      category: formData.get("category"),
      price: Number(formData.get("price")),
      durationMinutes: Number(formData.get("durationMinutes")) || 0,
      description: formData.get("description"),
      image: formData.get("image"),
      active: formData.get("active") === "on",
    };
    try {
      await apiFetch(id ? `/services/${id}` : "/services", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      closeModal();
      toast(id ? "Service updated." : "Service added.");
      loadServices();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

async function deleteService(id) {
  if (!confirm("Delete this service? This can't be undone.")) return;
  try {
    await apiFetch(`/services/${id}`, { method: "DELETE" });
    toast("Service deleted.");
    loadServices();
  } catch (err) {
    toast(err.message, true);
  }
}

document.getElementById("addServiceBtn").addEventListener("click", () => openServiceModal(null));

// ===================================================================
// PRODUCTS
// ===================================================================
let productsCache = [];

async function loadProducts() {
  const tbody = document.getElementById("productsTableBody");
  try {
    productsCache = await apiFetch("/products/all");
    if (productsCache.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No products yet. Add your first one.</td></tr>`;
      return;
    }
    tbody.innerHTML = productsCache.map((p) => `
      <tr>
        <td>${p.name}</td>
        <td>${p.brand || "—"}</td>
        <td>${p.category}</td>
        <td>${moneyOrDash(p.price)}</td>
        <td>${p.stock}</td>
        <td><span class="status-pill ${p.active ? "active" : "inactive"}">${p.active ? "Active" : "Hidden"}</span></td>
        <td class="row-actions">
          <button data-edit="${p._id}">Edit</button>
          <button data-delete="${p._id}" class="danger">Delete</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openProductModal(b.dataset.edit)));
    tbody.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => deleteProduct(b.dataset.delete)));
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${err.message}</td></tr>`;
  }
}

function productFormHtml(p = {}) {
  return `
    <div class="field"><label>Name</label><input name="name" value="${p.name || ""}" required /></div>
    <div class="field-row">
      <div class="field"><label>Brand</label><input name="brand" value="${p.brand || ""}" /></div>
      <div class="field"><label>Category</label>
        <select name="category" required>
          ${["Wigs & Bundles","Hair Care","Styling Tools","Accessories","Other"].map(c => `<option value="${c}" ${p.category===c?"selected":""}>${c}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>Price (R)</label><input name="price" type="number" min="0" step="0.01" value="${p.price ?? ""}" required /></div>
      <div class="field"><label>Stock</label><input name="stock" type="number" min="0" value="${p.stock ?? 0}" /></div>
    </div>
    <div class="field"><label>Description</label><textarea name="description" rows="2">${p.description || ""}</textarea></div>
    <div class="field"><label>Image URL (optional)</label><input name="image" value="${p.image || ""}" /></div>
    <label class="checkbox-row"><input type="checkbox" name="active" ${p.active === false ? "" : "checked"} /> Visible on website</label>
    <div class="modal-actions">
      <button type="button" class="btn btn-outline" style="color:var(--ink-plum);border-color:var(--line);" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn btn-gold">${p._id ? "Save changes" : "Add product"}</button>
    </div>
  `;
}

function openProductModal(id) {
  const p = id ? productsCache.find((x) => x._id === id) : {};
  openModal(id ? "Edit product" : "Add product", productFormHtml(p), async (formData) => {
    const payload = {
      name: formData.get("name"),
      brand: formData.get("brand"),
      category: formData.get("category"),
      price: Number(formData.get("price")),
      stock: Number(formData.get("stock")) || 0,
      description: formData.get("description"),
      image: formData.get("image"),
      active: formData.get("active") === "on",
    };
    try {
      await apiFetch(id ? `/products/${id}` : "/products", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      closeModal();
      toast(id ? "Product updated." : "Product added.");
      loadProducts();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

async function deleteProduct(id) {
  if (!confirm("Delete this product? This can't be undone.")) return;
  try {
    await apiFetch(`/products/${id}`, { method: "DELETE" });
    toast("Product deleted.");
    loadProducts();
  } catch (err) {
    toast(err.message, true);
  }
}

document.getElementById("addProductBtn").addEventListener("click", () => openProductModal(null));

// ===================================================================
// DISCOUNTS
// ===================================================================
let discountsCache = [];

function fmtDate(d) { return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }); }

async function loadDiscounts() {
  const tbody = document.getElementById("discountsTableBody");
  try {
    discountsCache = await apiFetch("/discounts");
    if (discountsCache.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No discounts yet.</td></tr>`;
      return;
    }
    const now = new Date();
    tbody.innerHTML = discountsCache.map((d) => {
      const isLive = d.active && new Date(d.startDate) <= now && new Date(d.endDate) >= now;
      const amount = d.type === "percentage" ? `${d.value}% off` : `R${d.value} off`;
      const scopeLabel = d.scope === "item" ? `One ${d.targetModel || "item"}` : d.scope[0].toUpperCase() + d.scope.slice(1);
      return `
        <tr>
          <td>${d.title}</td>
          <td>${scopeLabel}</td>
          <td>${amount}</td>
          <td>${fmtDate(d.startDate)} – ${fmtDate(d.endDate)}</td>
          <td><span class="status-pill ${isLive ? "active" : "inactive"}">${isLive ? "Live" : d.active ? "Scheduled/Ended" : "Off"}</span></td>
          <td class="row-actions">
            <button data-edit="${d._id}">Edit</button>
            <button data-delete="${d._id}" class="danger">Delete</button>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openDiscountModal(b.dataset.edit)));
    tbody.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => deleteDiscount(b.dataset.delete)));
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">${err.message}</td></tr>`;
  }
}

function toInputDate(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function discountFormHtml(d = {}) {
  return `
    <div class="field"><label>Offer title</label><input name="title" value="${d.title || ""}" placeholder="e.g. Winter Lash Special" required /></div>
    <div class="field-row">
      <div class="field"><label>Discount type</label>
        <select name="type" required>
          <option value="percentage" ${d.type==="percentage"?"selected":""}>Percentage off</option>
          <option value="fixed" ${d.type==="fixed"?"selected":""}>Fixed amount off (R)</option>
        </select>
      </div>
      <div class="field"><label>Value</label><input name="value" type="number" min="0" step="0.01" value="${d.value ?? ""}" required /></div>
    </div>
    <div class="field"><label>Applies to</label>
      <select name="scope" id="discountScope" required>
        <option value="all" ${d.scope==="all"?"selected":""}>Everything (all services &amp; products)</option>
        <option value="services" ${d.scope==="services"?"selected":""}>All services</option>
        <option value="products" ${d.scope==="products"?"selected":""}>All products</option>
        <option value="item" ${d.scope==="item"?"selected":""}>One specific service or product</option>
      </select>
    </div>
    <div id="discountTargetWrap" style="${d.scope==="item" ? "" : "display:none;"}">
      <div class="field"><label>Item type</label>
        <select name="targetModel" id="discountTargetModel">
          <option value="Service" ${d.targetModel==="Service"?"selected":""}>Service</option>
          <option value="Product" ${d.targetModel==="Product"?"selected":""}>Product</option>
        </select>
      </div>
      <div class="field"><label>Item</label><select name="targetId" id="discountTargetId"></select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Start date</label><input name="startDate" type="date" value="${toInputDate(d.startDate) || toInputDate(new Date())}" required /></div>
      <div class="field"><label>End date</label><input name="endDate" type="date" value="${toInputDate(d.endDate)}" required /></div>
    </div>
    <label class="checkbox-row"><input type="checkbox" name="active" ${d.active === false ? "" : "checked"} /> Offer is enabled</label>
    <div class="modal-actions">
      <button type="button" class="btn btn-outline" style="color:var(--ink-plum);border-color:var(--line);" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn btn-gold">${d._id ? "Save changes" : "Add discount"}</button>
    </div>
  `;
}

function populateDiscountTargets(targetModel, selectedId) {
  const select = document.getElementById("discountTargetId");
  if (!select) return;
  const list = targetModel === "Service" ? servicesCache : productsCache;
  select.innerHTML = list.map((item) => `<option value="${item._id}" ${item._id===selectedId?"selected":""}>${item.name}</option>`).join("");
}

function openDiscountModal(id) {
  const d = id ? discountsCache.find((x) => x._id === id) : {};
  openModal(id ? "Edit discount" : "Add discount", discountFormHtml(d), async (formData) => {
    const scope = formData.get("scope");
    const payload = {
      title: formData.get("title"),
      type: formData.get("type"),
      value: Number(formData.get("value")),
      scope,
      targetModel: scope === "item" ? formData.get("targetModel") : null,
      targetId: scope === "item" ? formData.get("targetId") : null,
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      active: formData.get("active") === "on",
    };
    try {
      await apiFetch(id ? `/discounts/${id}` : "/discounts", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      closeModal();
      toast(id ? "Discount updated." : "Discount added.");
      loadDiscounts();
    } catch (err) {
      toast(err.message, true);
    }
  });

  // Wire up the scope -> target item picker after the modal is in the DOM
  setTimeout(() => {
    const scopeSelect = document.getElementById("discountScope");
    const targetWrap = document.getElementById("discountTargetWrap");
    const targetModelSelect = document.getElementById("discountTargetModel");
    if (!scopeSelect) return;

    function syncTargets() {
      populateDiscountTargets(targetModelSelect.value, d.targetId);
    }
    scopeSelect.addEventListener("change", () => {
      targetWrap.style.display = scopeSelect.value === "item" ? "" : "none";
      if (scopeSelect.value === "item") syncTargets();
    });
    targetModelSelect.addEventListener("change", syncTargets);
    if (scopeSelect.value === "item") syncTargets();
  }, 0);
}

async function deleteDiscount(id) {
  if (!confirm("Delete this discount?")) return;
  try {
    await apiFetch(`/discounts/${id}`, { method: "DELETE" });
    toast("Discount deleted.");
    loadDiscounts();
  } catch (err) {
    toast(err.message, true);
  }
}

document.getElementById("addDiscountBtn").addEventListener("click", () => openDiscountModal(null));

// ===================================================================
// REVIEWS (moderation)
// ===================================================================
async function loadReviews() {
  const tbody = document.getElementById("reviewsTableBody");
  try {
    const reviews = await apiFetch("/reviews/all");
    if (reviews.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No reviews submitted yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = reviews.map((r) => `
      <tr>
        <td>${r.customerName}</td>
        <td>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</td>
        <td style="max-width:280px;">${r.comment}</td>
        <td><span class="status-pill ${r.status}">${r.status[0].toUpperCase() + r.status.slice(1)}</span></td>
        <td class="row-actions">
          ${r.status !== "approved" ? `<button data-approve="${r._id}">Approve</button>` : ""}
          ${r.status !== "rejected" ? `<button data-reject="${r._id}">Reject</button>` : ""}
          <button data-delete="${r._id}" class="danger">Delete</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-approve]").forEach((b) => b.addEventListener("click", () => setReviewStatus(b.dataset.approve, "approved")));
    tbody.querySelectorAll("[data-reject]").forEach((b) => b.addEventListener("click", () => setReviewStatus(b.dataset.reject, "rejected")));
    tbody.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => deleteReview(b.dataset.delete)));
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">${err.message}</td></tr>`;
  }
}

async function setReviewStatus(id, status) {
  try {
    await apiFetch(`/reviews/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
    toast(`Review ${status}.`);
    loadReviews();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteReview(id) {
  if (!confirm("Delete this review?")) return;
  try {
    await apiFetch(`/reviews/${id}`, { method: "DELETE" });
    toast("Review deleted.");
    loadReviews();
  } catch (err) {
    toast(err.message, true);
  }
}
