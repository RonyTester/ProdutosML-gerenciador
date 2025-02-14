import { SUPABASE_CONFIG } from './config.js';

// Configuração do Supabase
const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);

// Elementos do DOM
const modal = document.getElementById('productModal');
const addProductBtn = document.getElementById('addProductBtn');
const closeBtn = document.querySelector('.close');
const productForm = document.getElementById('productForm');
const productsContainer = document.getElementById('productsContainer');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const categoryFilter = document.getElementById('categoryFilter');
const categoryTabs = document.getElementById('categoryTabs');
const totalProductsElement = document.getElementById('totalProducts');
const totalCategoriesElement = document.getElementById('totalCategories');

// Estado da aplicação
let allProducts = [];
let activeCategory = '';
let searchTerm = '';

// Categorias disponíveis
const categories = {
    'celulares': 'Celulares e Smartphones',
    'audio': 'Áudio',
    'casa_construcao': 'Casa e Construção',
    'eletroportateis': 'Eletroportáteis',
    'utilidades_domesticas': 'Utilidades Domésticas',
    'relogios': 'Relógios',
    'brinquedos': 'Brinquedos',
    'ar_ventilacao': 'Ar e Ventilação',
    'esporte_lazer': 'Esporte e Lazer',
    'beleza_perfumaria': 'Beleza e Perfumaria',
    'tv_video': 'TV e Video',
    'saude': 'Saúde e Cuidados Pessoais',
    'automotivo': 'Automotivo',
    'casa_inteligente': 'Casa Inteligente',
    'mercado': 'Mercado',
    'cameras': 'Câmeras e Drones',
    'cama_mesa_banho': 'Cama, Mesa e Banho',
    'ferramentas': 'Ferramentas',
    'games': 'Games',
    'comercio_industria': 'Comércio e Indústria',
    'recem_chegados': 'Recém Chegados'
};

// Funções auxiliares
const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(price);
};

// Função para carregar produtos do Supabase
const loadProducts = async () => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allProducts = data || [];
        return data;
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        return [];
    }
};

// Função para salvar produto no Supabase
const saveProduct = async (product) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .insert([product]);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        return null;
    }
};

// Função para filtrar produtos
const filterProducts = () => {
    return allProducts.filter(product => {
        const matchesCategory = !activeCategory || product.category === activeCategory;
        const matchesSearch = !searchTerm || 
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });
};

// Função para atualizar estatísticas
const updateStats = () => {
    const uniqueCategories = new Set(allProducts.map(p => p.category));
    totalProductsElement.textContent = allProducts.length;
    totalCategoriesElement.textContent = uniqueCategories.size;
};

// Função para renderizar tabs de categorias
const renderCategoryTabs = () => {
    categoryTabs.innerHTML = `
        <div class="category-tab ${!activeCategory ? 'active' : ''}" 
             data-category="">
            Todos
        </div>
    `;

    Object.entries(categories).forEach(([key, value]) => {
        const hasProducts = allProducts.some(p => p.category === key);
        if (hasProducts) {
            categoryTabs.innerHTML += `
                <div class="category-tab ${activeCategory === key ? 'active' : ''}" 
                     data-category="${key}">
                    ${value}
                </div>
            `;
        }
    });

    // Adicionar event listeners para as tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            activeCategory = tab.dataset.category;
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderProducts();
        });
    });
};

const renderProducts = async () => {
    if (!allProducts.length) {
        allProducts = await loadProducts();
    }

    const filteredProducts = filterProducts();
    productsContainer.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        productsContainer.innerHTML = `
            <div class="no-products">
                <p>Nenhum produto encontrado</p>
            </div>
        `;
        return;
    }

    filteredProducts.forEach((product) => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-category">${categories[product.category] || product.category}</p>
            <p class="product-price">${formatPrice(product.price)}</p>
            <div class="product-links">
                <a href="${product.magalu_link}" target="_blank" class="store-link magalu-link">Ver na Magalu</a>
                <a href="${product.ml_link}" target="_blank" class="store-link ml-link">Ver no Mercado Livre</a>
            </div>
        `;
        productsContainer.appendChild(productCard);
    });

    updateStats();
    renderCategoryTabs();
};

// Event Listeners
addProductBtn.addEventListener('click', () => {
    modal.style.display = 'block';
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderProducts();
});

searchBtn.addEventListener('click', () => {
    renderProducts();
});

categoryFilter.addEventListener('change', (e) => {
    activeCategory = e.target.value;
    renderProducts();
});

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newProduct = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        image: document.getElementById('productImage').value,
        price: parseFloat(document.getElementById('productPrice').value),
        magalu_link: document.getElementById('magaluLink').value,
        ml_link: document.getElementById('mlLink').value
    };

    await saveProduct(newProduct);
    allProducts = await loadProducts();
    renderProducts();

    // Limpar formulário e fechar modal
    productForm.reset();
    modal.style.display = 'none';
});

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', renderProducts); 