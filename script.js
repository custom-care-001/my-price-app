// script.js

// --- SECURITY CONFIG (SHA-256 Hashes) ---
const ADMIN_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"; 
const WORKER_HASH = "b631165cb4668df72a440e69d9544c4146e507198884244243b676a08605c446";

let products = []; // Will be loaded from database.html
let currentUserType = null;

// --- 1. THEME SETUP ---
if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

// --- 2. AUTHENTICATION & DATA LOADING ---
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function attemptLogin() {
    const input = document.getElementById('password-input').value;
    const errorMsg = document.getElementById('error-msg');
    const loadingMsg = document.getElementById('loading-msg');
    
    // Hash the input password
    const inputHash = await sha256(input);

    if (inputHash === ADMIN_HASH) {
        currentUserType = 'admin';
    } else if (inputHash === WORKER_HASH) {
        currentUserType = 'worker';
    } else {
        errorMsg.classList.remove('hidden');
        return;
    }

    // Login Successful: Now Load Data
    errorMsg.classList.add('hidden');
    loadingMsg.classList.remove('hidden'); // Show "Loading..."

    try {
        // FETCH THE DATA FROM THE OTHER HTML FILE
        const response = await fetch('database.html');
        const text = await response.text();
        
        // Parse the HTML to find our hidden div
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const dataContent = doc.getElementById('secure-data').textContent;
        
        products = JSON.parse(dataContent);
        
        initApp();
    } catch (err) {
        alert("Error loading database.html. Make sure the file exists!");
        console.error(err);
    }
}

function logout() { location.reload(); }

// --- 3. UI RENDERING ---
function initApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('user-badge').innerText = currentUserType === 'admin' ? 'ADMIN MODE' : 'VIEWER MODE';
    
    if(currentUserType === 'admin') {
        document.getElementById('export-btn').classList.remove('hidden');
    }
    renderProducts();
}

function renderProducts() {
    const list = document.getElementById('product-list');
    list.innerHTML = '';

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700";

        let html = `<h2 class="text-xl font-bold mb-4 text-gray-800 dark:text-white border-b pb-2 dark:border-gray-700">${product.name}</h2>`;
        html += `<div class="space-y-3">`;

        product.variants.forEach((variant, index) => {
            const opacity = variant.available ? 'opacity-100' : 'opacity-50 grayscale';
            const statusText = variant.available ? '' : '<span class="text-xs text-red-500 font-bold ml-2">(OUT OF STOCK)</span>';
            const minPriceDisplay = (variant.minPrice && currentUserType === 'admin') // Only Admin sees min price if needed? Or both? Assuming both for now per logic.
                ? `<div class="text-xs text-gray-400">Min: ${variant.minPrice}</div>` 
                : (variant.minPrice ? `<div class="text-xs text-gray-400">Min: ${variant.minPrice}</div>` : '');

            const editBtn = currentUserType === 'admin' 
                ? `<button onclick="openEdit(${product.id}, ${index})" class="ml-auto text-blue-500 hover:text-blue-600 text-sm font-medium">Edit</button>` 
                : '';

            html += `
            <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg ${opacity}">
                <div>
                    <div class="font-bold text-gray-700 dark:text-gray-200">${variant.weight} ${statusText}</div>
                    <div class="text-green-600 dark:text-green-400 font-mono font-bold text-lg">
                        ${variant.salePrice} <span class="text-xs text-gray-500">₹</span>
                    </div>
                    ${minPriceDisplay}
                </div>
                ${editBtn}
            </div>`;
        });
        html += `</div>`;
        card.innerHTML = html;
        list.appendChild(card);
    });
}

// --- 4. ADMIN FUNCTIONS ---
let currentEdit = { productId: null, variantIndex: null };

function openEdit(pid, vIndex) {
    currentEdit = { productId: pid, variantIndex: vIndex };
    const variant = products.find(p => p.id === pid).variants[vIndex];
    
    document.getElementById('edit-sale').value = variant.salePrice;
    document.getElementById('edit-min').value = variant.minPrice || '';
    document.getElementById('edit-available').checked = variant.available;
    
    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-modal').classList.add('flex');
}

function saveProductChange() {
    const sale = document.getElementById('edit-sale').value;
    const min = document.getElementById('edit-min').value;
    const avail = document.getElementById('edit-available').checked;

    if(!sale) return alert("Sale price is mandatory");

    const variant = products.find(p => p.id === currentEdit.productId).variants[currentEdit.variantIndex];
    variant.salePrice = Number(sale);
    variant.minPrice = min ? Number(min) : null;
    variant.available = avail;

    document.getElementById('edit-modal').classList.add('hidden');
    document.getElementById('edit-modal').classList.remove('flex');
    renderProducts();
}

// --- 5. EXPORT FOR GITHUB ---
function exportData() {
    // Generate the Exact HTML content for database.html
    const jsonString = JSON.stringify(products, null, 4);
    const htmlContent = `<div id="secure-data" style="display:none;">\n${jsonString}\n</div>`;
    
    navigator.clipboard.writeText(htmlContent).then(() => {
        alert("Data copied!\n\nStep 1: Go to GitHub.\nStep 2: Open 'database.html'.\nStep 3: Delete everything there and Paste this new content.\nStep 4: Commit Changes.");
    });
}
