/* ========== SMARTSHOP ========== */

const $ = (id) => document.getElementById(id);

let cart = [];
let allProducts = [];
let couponApplied = false;
let balance = Number(localStorage.getItem("balance")) || 1000;

const LIMIT_MSG = "Warning: Total price exceeds your balance! Please add money.";


/* ---------- NAVBAR ---------- */

$("menu-btn").onclick = () => $("menu").classList.toggle("max-md:hidden");

const navLinks = document.querySelectorAll("#menu a");
const sections = document.querySelectorAll("section");

window.addEventListener("scroll", () => {
  let current = "home";
  sections.forEach((s) => {
    if (window.scrollY >= s.offsetTop - 100) current = s.id;
  });
  navLinks.forEach((link) => {
    link.dataset.active = link.getAttribute("href") === "#" + current;
  });
  $("back-to-top").classList.toggle("hidden", window.scrollY <= 300);
});

$("back-to-top").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

/* View Cart button: cart er kache scroll kore + ektu highlight kore */
$("view-cart").onclick = () => {
  $("cart").scrollIntoView({ behavior: "smooth", block: "start" });
  $("cart").classList.add("ring-4", "ring-amber-500");
  setTimeout(() => $("cart").classList.remove("ring-4", "ring-amber-500"), 1000);
};


/* ---------- CAROUSEL HELPER (banner + review duto ei ek function e) ---------- */

function carousel(length, show, prevId, nextId, delay) {
  let i = 0;
  const move = (step) => {
    i = (i + step + length) % length;
    show(i);
  };
  $(prevId).onclick = () => move(-1);
  $(nextId).onclick = () => move(1);
  setInterval(() => move(1), delay);
  show(0);
}

const slides = document.querySelectorAll("#slider img");
carousel(slides.length, (i) => {
  slides.forEach((s, n) => s.classList.toggle("hidden", n !== i));
}, "prev-slide", "next-slide", 3000);


/* ---------- BALANCE ---------- */

function updateBalance() {
  $("balance").textContent = balance;
  localStorage.setItem("balance", balance);
}

$("add-money").onclick = () => {
  balance += 1000;
  updateBalance();
  $("warning").textContent = "";
};

updateBalance();


/* ---------- PRODUCTS ---------- */

fetch("https://fakestoreapi.com/products")
  .then((res) => res.json())
  .then((data) => {
    allProducts = data;
    showProducts(allProducts);
  })
  .catch(() => {
    $("product-list").innerHTML = "<p class='text-red-600'>Failed to load products.</p>";
  });

function showProducts(list) {
  $("product-list").innerHTML = list.length ? "" : "<p>No product found.</p>";

  list.forEach((product) => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-lg shadow-md p-4 flex flex-col";
    card.innerHTML = `
      <img class="w-full h-40 object-contain" src="${product.image}" alt="${product.title}">
      <h3 class="text-sm font-bold flex-1 my-3">${product.title}</h3>
      <p class="text-blue-600 font-bold my-2">${product.price} BDT</p>
      <p class="my-1">Rating: ${product.rating.rate} (${product.rating.count})</p>
      <button class="bg-blue-600 text-white px-3.5 py-2 rounded-md hover:opacity-85">Add to Cart</button>
    `;
    card.querySelector("button").onclick = () => changeQty(product, 1);
    $("product-list").appendChild(card);
  });
}

function filterAndSort() {
  const text = $("search").value.toLowerCase();
  const sort = $("sort").value;

  const result = allProducts.filter((p) => p.title.toLowerCase().includes(text));

  if (sort === "low") result.sort((a, b) => a.price - b.price);
  if (sort === "high") result.sort((a, b) => b.price - a.price);

  showProducts(result);
}

$("search").oninput = filterAndSort;
$("sort").onchange = filterAndSort;


/* ---------- CART ---------- */

/* extra = notun je item add korte chai tar price (balance check er jonno) */
function getTotals(extra = 0) {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0) + extra;
  const hasItems = subtotal > 0;
  const delivery = hasItems ? 50 : 0;
  const shipping = hasItems ? 30 : 0;
  const discount = couponApplied ? subtotal * 0.1 : 0;
  return { subtotal, delivery, shipping, discount, total: subtotal + delivery + shipping - discount };
}

/* delta = +1 (add) ba -1 (kombe). Quantity 0 hole item remove hoye jay */
function changeQty(product, delta) {
  if (delta > 0 && getTotals(product.price).total > balance) {
    $("warning").textContent = LIMIT_MSG;
    return;
  }
  $("warning").textContent = "";

  let item = cart.find((i) => i.id === product.id);
  if (!item) {
    item = { id: product.id, title: product.title, price: product.price, image: product.image, quantity: 0 };
    cart.push(item);
  }
  item.quantity += delta;
  cart = cart.filter((i) => i.quantity > 0);
  renderCart();
}

function renderCart() {
  $("cart-items").innerHTML = cart.length
    ? cart.map((item) => `
        <div class="cart-item border-b border-gray-300 py-2" data-id="${item.id}">
          <div class="flex items-center gap-2">
            <img class="w-12 h-12 object-contain" src="${item.image}" alt="${item.title}">
            <h4 class="text-[13px] font-bold">${item.title}</h4>
          </div>
          <div class="flex justify-between items-center mt-2">
            <div>
              <button class="bg-gray-200 text-black px-2 py-0.5 rounded-md" data-action="minus">-</button>
              <span class="mx-1">${item.quantity}</span>
              <button class="bg-gray-200 text-black px-2 py-0.5 rounded-md" data-action="plus">+</button>
            </div>
            <p>${(item.price * item.quantity).toFixed(2)} BDT</p>
            <button class="text-red-600" data-action="remove">Remove</button>
          </div>
        </div>`).join("")
    : "<p>Your cart is empty.</p>";

  const t = getTotals();
  $("subtotal").textContent = t.subtotal.toFixed(2);
  $("delivery").textContent = t.delivery;
  $("shipping").textContent = t.shipping;
  $("discount").textContent = t.discount.toFixed(2);
  $("total").textContent = t.total.toFixed(2);
  $("cart-count").textContent = cart.reduce((sum, i) => sum + i.quantity, 0);
}

/* ekta listener diye cart er shob button handle kora hocche */
$("cart-items").onclick = (e) => {
  const action = e.target.dataset.action;
  if (!action) return;

  const item = cart.find((i) => i.id === Number(e.target.closest(".cart-item").dataset.id));
  const delta = { plus: 1, minus: -1, remove: -item.quantity }[action];
  changeQty(item, delta);
};

$("apply-coupon").onclick = () => {
  couponApplied = $("coupon").value.trim().toUpperCase() === "SMART10";
  $("coupon-message").textContent = couponApplied ? "Coupon applied! 10% discount." : "Invalid coupon code.";
  $("coupon-message").className = couponApplied ? "text-green-600" : "text-red-600";
  renderCart();
};

$("clear-cart").onclick = () => {
  cart = [];
  renderCart();
};

renderCart();


/* ---------- REVIEWS ---------- */

const reviews = [
  { name: "Rahim", comment: "Great quality products and fast delivery.", rating: 5, date: "2026-09-10" },
  { name: "Karim", comment: "Prices are good. Will buy again.", rating: 4, date: "2026-09-18" },
  { name: "Nusrat", comment: "Nice website, easy to use.", rating: 5, date: "2026-10-01" },
  { name: "Sadia", comment: "Product was okay, delivery was a bit late.", rating: 3, date: "2026-10-12" }
];

carousel(reviews.length, (i) => {
  const r = reviews[i];
  $("review-box").innerHTML = `
    <p>"${r.comment}"</p>
    <h4>${r.name}</h4>
    <p>Rating: ${r.rating} / 5</p>
    <p>${r.date}</p>
  `;
}, "prev-review", "next-review", 4000);


/* ---------- CONTACT FORM ---------- */

$("contact-form").onsubmit = (e) => {
  e.preventDefault();

  const name = $("c-name").value.trim();
  const email = $("c-email").value.trim();
  const message = $("c-message").value.trim();

  let error = "";
  if (!name || !email || !message) error = "Please fill in all fields.";
  else if (!email.includes("@") || !email.includes(".")) error = "Please enter a valid email.";

  $("form-message").className = error ? "text-red-600" : "text-green-600";
  $("form-message").textContent = error || `Thank you, ${name}! We got your message.`;

  if (!error) {
    e.target.reset();
    setTimeout(() => ($("form-message").textContent = ""), 3000);
  }
};