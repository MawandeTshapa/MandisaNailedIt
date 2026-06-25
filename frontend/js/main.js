document.getElementById("year").textContent = new Date().getFullYear();

// ---------- Mobile nav ----------
document.getElementById("navToggle").addEventListener("click", () => {
  document.getElementById("navLinks").classList.toggle("open");
});

// ---------- Hero mirror rotation (full‑size images) ----------
const mirrorSlides = [
  {
    image: "images/Screenshot 2026-06-25 220426",
    label: "Nails",
    sub: "Builder gel, acrylic &amp; nail art"
  },
  {
    image: "images/lashes.jpg",
    label: "Lashes",
    sub: "Classic, hybrid &amp; volume sets"
  },
  {
    image: "images/hair.jpg",
    label: "Hair Installation",
    sub: "Wigs, weaves &amp; closures, installed right"
  },
];

let mirrorIndex = 0;
const mirrorSlideEl = document.getElementById("mirrorSlide");
const mirrorDotsEl = document.getElementById("mirrorDots");

function renderMirror() {
  const s = mirrorSlides[mirrorIndex];
  mirrorSlideEl.style.opacity = 0;
  setTimeout(() => {
    // Set the background image directly on the slide element
    mirrorSlideEl.style.backgroundImage = `url(${s.image})`;
    mirrorSlideEl.style.backgroundSize = "cover";
    mirrorSlideEl.style.backgroundPosition = "center";
    // Keep the text overlay
    mirrorSlideEl.innerHTML = `
      <div class="mirror-text">
        <div class="label">${s.label}</div>
        <div class="sub">${s.sub}</div>
      </div>
    `;
    mirrorSlideEl.style.opacity = 1;
  }, 200);

  mirrorDotsEl.querySelectorAll("button").forEach((b, i) => {
    b.classList.toggle("active", i === mirrorIndex);
  });
}

mirrorDotsEl.innerHTML = mirrorSlides.map((_, i) => `<button data-i="${i}"></button>`).join("");
mirrorDotsEl.querySelectorAll("button").forEach((b) => {
  b.addEventListener("click", () => { mirrorIndex = Number(b.dataset.i); renderMirror(); });
});
renderMirror();
setInterval(() => {
  mirrorIndex = (mirrorIndex + 1) % mirrorSlides.length;
  renderMirror();
}, 4500);

// ---------- Helpers (unchanged) ----------
function formatPrice(n) {
  return "R" + Number(n).toFixed(2);
}

function discountBadge(discount) {
  if (!discount) return "";
  const ends = new Date(discount.endDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  return `<span class="discount-tag">${discount.title} · ends ${ends}</span>`;
}

function priceMarkup(item) {
  if (item.discount) {
    return `<span class="was">${formatPrice(item.originalPrice)}</span><span class="now">${formatPrice(item.finalPrice)}</span>`;
  }
  return `<span class="now">${formatPrice(item.originalPrice ?? item.price)}</span>`;
}

// ---------- Services (unchanged) ----------
async function loadServices() {
  const grid = document.getElementById("servicesGrid");
  try {
    const res = await fetch(`${API_BASE}/services`);
    const services = await res.json();

    if (!Array.isArray(services) || services.length === 0) {
      grid.innerHTML = `<p class="empty-note">Services will be listed here soon.</p>`;
      return;
    }

    const byCategory = {};
    services.forEach((s) => {
      byCategory[s.category] = byCategory[s.category] || [];
      byCategory[s.category].push(s);
    });

    grid.innerHTML = Object.entries(byCategory)
      .map(([category, items]) => `
        <div class="menu-card">
          <h3>${category}</h3>
          ${items.map((s) => `
            <div class="menu-item">
              <div class="menu-item-row">
                <span class="menu-item-name">${s.name}</span>
                <span class="menu-item-leader"></span>
                <span class="menu-item-price">${priceMarkup(s)}</span>
              </div>
              ${s.description ? `<div class="menu-item-desc">${s.description}</div>` : ""}
              ${discountBadge(s.discount)}
            </div>
          `).join("")}
        </div>
      `).join("");
  } catch (err) {
    grid.innerHTML = `<p class="empty-note">Couldn't load services right now. Please check back shortly.</p>`;
  }
}

// ---------- Products (unchanged) ----------
async function loadProducts() {
  const grid = document.getElementById("productsGrid");
  try {
    const res = await fetch(`${API_BASE}/products`);
    const products = await res.json();

    if (!Array.isArray(products) || products.length === 0) {
      grid.innerHTML = `<p class="empty-note">Products will be listed here soon.</p>`;
      return;
    }

    grid.innerHTML = products.map((p) => `
      <div class="product-card">
        <div class="product-thumb">
          ${p.image ? `<img src="${p.image}" alt="${p.name}" onerror="this.parentElement.innerHTML='&#10024;'" />` : "&#10024;"}
        </div>
        <div class="product-body">
          ${p.brand ? `<div class="product-brand">${p.brand}</div>` : ""}
          <div class="product-name">${p.name}</div>
          ${p.description ? `<div class="product-desc">${p.description}</div>` : ""}
          <div class="product-price">${priceMarkup(p)}</div>
          ${discountBadge(p.discount)}
        </div>
      </div>
    `).join("");
  } catch (err) {
    grid.innerHTML = `<p class="empty-note">Couldn't load products right now. Please check back shortly.</p>`;
  }
}

// ---------- Reviews (unchanged) ----------
async function loadReviews() {
  const grid = document.getElementById("reviewsGrid");
  try {
    const res = await fetch(`${API_BASE}/reviews`);
    const reviews = await res.json();

    if (!Array.isArray(reviews) || reviews.length === 0) {
      grid.innerHTML = `<p class="empty-note">Be the first to leave a review below!</p>`;
      return;
    }

    grid.innerHTML = reviews.map((r) => `
      <div class="review-card">
        <div class="stars">${"&#9733;".repeat(r.rating)}${"&#9734;".repeat(5 - r.rating)}</div>
        <div class="review-comment">"${r.comment}"</div>
        <div class="review-name">${r.customerName}</div>
      </div>
    `).join("");
  } catch (err) {
    grid.innerHTML = `<p class="empty-note">Couldn't load reviews right now.</p>`;
  }
}

// ---------- Review submission (unchanged) ----------
const starSelect = document.getElementById("starSelect");
starSelect.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = Number(btn.dataset.star);
    starSelect.dataset.value = value;
    starSelect.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.star) <= value);
    });
  });
});

document.getElementById("reviewForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const feedback = document.getElementById("reviewFeedback");
  feedback.innerHTML = "";

  const customerName = document.getElementById("reviewName").value.trim();
  const comment = document.getElementById("reviewComment").value.trim();
  const rating = Number(starSelect.dataset.value);

  if (!rating) {
    feedback.innerHTML = `<p class="form-error">Please select a star rating.</p>`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName, rating, comment }),
    });
    const data = await res.json();

    if (!res.ok) {
      feedback.innerHTML = `<p class="form-error">${data.message || "Something went wrong."}</p>`;
      return;
    }

    feedback.innerHTML = `<p class="form-success">${data.message}</p>`;
    e.target.reset();
    starSelect.dataset.value = 0;
    starSelect.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  } catch (err) {
    feedback.innerHTML = `<p class="form-error">Network error — please try again.</p>`;
  }
});

loadServices();
loadProducts();
loadReviews();
