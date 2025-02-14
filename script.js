// Configuração do Supabase
const SUPABASE_URL = window.SUPABASE_URL || 'https://kmfdbcijumvxxkoehuzl.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttZmRiY2lqdW12eHhrb2VodXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1MDQxMjUsImV4cCI6MjA1NTA4MDEyNX0.7GZwiE8arbOza12UiUubd2m8q4UJI7Aae4bHnQYnD_c';

// Inicialização do Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

// Variáveis para controle de desfazer
let lastDeletedProduct = null;
let undoToast = null;
let undoTimeout = null;

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

// Função para mostrar o modal de confirmação
const showConfirmModal = (productId, productName) => {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'confirm-modal';
    confirmModal.innerHTML = `
        <div class="confirm-modal-content">
            <div class="confirm-modal-icon">
                <i class="fas fa-trash"></i>
            </div>
            <h2>Confirmar Exclusão</h2>
            <p>Tem certeza que deseja excluir o produto "${productName}"?</p>
            <div class="confirm-modal-buttons">
                <button class="confirm-btn confirm-btn-cancel">Cancelar</button>
                <button class="confirm-btn confirm-btn-delete">Excluir</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);
    
    // Mostrar o modal com animação
    setTimeout(() => confirmModal.style.display = 'block', 0);
    
    return new Promise((resolve) => {
        confirmModal.querySelector('.confirm-btn-delete').addEventListener('click', () => {
            document.body.removeChild(confirmModal);
            resolve(true);
        });
        
        confirmModal.querySelector('.confirm-btn-cancel').addEventListener('click', () => {
            document.body.removeChild(confirmModal);
            resolve(false);
        });
    });
};

// Função para mostrar o toast de desfazer
const showUndoToast = (product) => {
    if (undoToast) {
        document.body.removeChild(undoToast);
        clearTimeout(undoTimeout);
    }
    
    undoToast = document.createElement('div');
    undoToast.className = 'undo-toast';
    undoToast.innerHTML = `
        <span>Produto removido</span>
        <button class="undo-btn">Desfazer</button>
    `;
    document.body.appendChild(undoToast);
    
    undoToast.querySelector('.undo-btn').addEventListener('click', async () => {
        if (lastDeletedProduct) {
            await saveProduct(lastDeletedProduct);
            allProducts = await loadProducts();
            renderProducts();
            document.body.removeChild(undoToast);
            lastDeletedProduct = null;
        }
    });
    
    undoTimeout = setTimeout(() => {
        if (undoToast && undoToast.parentNode) {
            document.body.removeChild(undoToast);
        }
        lastDeletedProduct = null;
    }, 5000);
};

// Função para editar produto
const editProduct = async (product) => {
    // Preencher o formulário com os dados do produto
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productImage').value = product.image;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('magaluLink').value = product.magalu_link;
    document.getElementById('mlLink').value = product.ml_link;
    
    // Modificar o formulário para modo de edição
    const submitBtn = productForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Atualizar Produto';
    productForm.dataset.editMode = 'true';
    productForm.dataset.editId = product.id;
    
    // Mostrar o modal
    modal.style.display = 'block';
};

// Função para atualizar o event listener do formulário
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        image: document.getElementById('productImage').value,
        price: parseFloat(document.getElementById('productPrice').value),
        magalu_link: document.getElementById('magaluLink').value,
        ml_link: document.getElementById('mlLink').value
    };

    if (productForm.dataset.editMode === 'true') {
        // Modo de edição
        const productId = productForm.dataset.editId;
        try {
            const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', productId);

            if (error) throw error;
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            alert('Erro ao atualizar produto. Tente novamente.');
            return;
        }
    } else {
        // Modo de criação
        await saveProduct(productData);
    }

    allProducts = await loadProducts();
    renderProducts();

    // Resetar formulário e fechar modal
    productForm.reset();
    productForm.dataset.editMode = 'false';
    productForm.dataset.editId = '';
    const submitBtn = productForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Adicionar Produto';
    modal.style.display = 'none';
});

// Função para atualizar a função de deletar produto
const deleteProduct = async (productId) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const shouldDelete = await showConfirmModal(productId, product.name);
    if (!shouldDelete) return;

    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) throw error;
        
        // Guardar o produto deletado para possível desfazer
        lastDeletedProduct = product;
        
        // Atualizar a lista de produtos
        allProducts = allProducts.filter(p => p.id !== productId);
        renderProducts();
        
        // Mostrar o toast de desfazer
        showUndoToast(product);
    } catch (error) {
        console.error('Erro ao remover produto:', error);
        alert('Erro ao remover produto. Tente novamente.');
    }
};

// Função para atualizar a função de renderização dos produtos
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
            <div class="product-actions">
                <button class="edit-btn" onclick="editProduct(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-category">${categories[product.category] || product.category}</p>
                <p class="product-price">${formatPrice(product.price)}</p>
                <div class="product-links">
                    <a href="${product.magalu_link}" target="_blank" class="store-link magalu-link">
                        <i class="fas fa-shopping-cart"></i>
                        Ver na Magalu
                    </a>
                    <a href="${product.ml_link}" target="_blank" class="store-link ml-link">
                        <i class="fas fa-shopping-bag"></i>
                        Ver no Mercado Livre
                    </a>
                </div>
            </div>
        `;
        productsContainer.appendChild(productCard);
    });

    updateStats();
    renderCategoryTabs();
};

// Tornar as funções globais
window.deleteProduct = deleteProduct;
window.editProduct = editProduct;

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

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', renderProducts); 