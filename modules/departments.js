/**
 * Departments Module - Модуль управління підрозділами
 */

class DepartmentsModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.departments = [];
        this.employees = [];
        this.selectedDepartment = null;
        this.searchQuery = '';
        this.filterStatus = 'all';
    }

    async render() {
        await this.loadData();

        return `
            <div class="departments-module">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-building"></i> Управління підрозділами</h1>
                        <p>Організаційна структура підприємства</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="addDepartmentBtn">
                            <i class="fas fa-plus"></i> Створити підрозділ
                        </button>
                        <button class="btn btn-secondary" id="exportDepartmentsBtn">
                            <i class="fas fa-download"></i> Експорт
                        </button>
                    </div>
                </div>

                <!-- Фільтри та пошук -->
                <div class="controls-panel">
                    <div class="search-controls">
                        <div class="search-box">
                            <input type="text" id="searchInput" placeholder="Пошук підрозділів...">
                            <i class="fas fa-search"></i>
                        </div>
                        <select id="statusFilter" class="filter-select">
                            <option value="all">Всі статуси</option>
                            <option value="active">Активні</option>
                            <option value="inactive">Неактивні</option>
                        </select>
                    </div>
                    <div class="view-controls">
                        <button class="view-btn active" data-view="tree" title="Дерево">
                            <i class="fas fa-sitemap"></i>
                        </button>
                        <button class="view-btn" data-view="list" title="Список">
                            <i class="fas fa-list"></i>
                        </button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="stats-bar">
                    <div class="stat-item">
                        <span class="stat-number">${this.departments.filter(d => d.isActive).length}</span>
                        <span class="stat-label">Активних</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getTotalEmployees()}</span>
                        <span class="stat-label">Всього співробітників</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getRootDepartmentsCount()}</span>
                        <span class="stat-label">Головних підрозділів</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getMaxDepth()}</span>
                        <span class="stat-label">Рівнів ієрархії</span>
                    </div>
                </div>

                <!-- Основний контент -->
                <div class="departments-content">
                    <div id="departmentsContainer" class="departments-container">
                        ${this.renderDepartmentsView()}
                    </div>
                </div>

                <!-- Модальне вікно підрозділу -->
                <div id="departmentModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h2 id="modalTitle">
                                <i class="fas fa-building"></i> Створити підрозділ
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${this.renderDepartmentForm()}
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="saveDepartmentBtn">Зберегти</button>
                            <button class="btn btn-secondary" id="cancelDepartmentBtn">Скасувати</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно деталей -->
                <div id="departmentDetailsModal" class="modal">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h2 id="detailsTitle">
                                <i class="fas fa-info-circle"></i> Деталі підрозділу
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="departmentDetails"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="editDepartmentDetailsBtn">Редагувати</button>
                            <button class="btn btn-secondary" id="closeDepartmentDetailsBtn">Закрити</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        this.bindEvents();
        this.startPeriodicUpdate();
    }

    async loadData() {
        try {
            this.departments = await this.database.getAll('departments');
            this.employees = await this.database.getAll('employees');
        } catch (error) {
            console.error('Помилка завантаження даних підрозділів:', error);
            hrSystem.showNotification('Помилка завантаження даних: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Створення підрозділу
        document.getElementById('addDepartmentBtn')?.addEventListener('click', () => {
            this.showDepartmentModal();
        });

        // Пошук
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterDepartments();
        });

        // Фільтри
        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filterStatus = e.target.value;
            this.filterDepartments();
        });

        // Перемикання вигляду
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.updateDepartmentsView();
            });
        });

        // Модальні вікна
        this.bindModalEvents();

        // Експорт
        document.getElementById('exportDepartmentsBtn')?.addEventListener('click', () => {
            this.exportDepartments();
        });
    }

    bindModalEvents() {
        // Збереження підрозділу
        document.getElementById('saveDepartmentBtn')?.addEventListener('click', () => {
            this.saveDepartment();
        });

        // Скасування
        document.getElementById('cancelDepartmentBtn')?.addEventListener('click', () => {
            this.hideDepartmentModal();
        });

        // Редагування деталей
        document.getElementById('editDepartmentDetailsBtn')?.addEventListener('click', () => {
            this.hideDepartmentDetailsModal();
            this.showDepartmentModal(this.selectedDepartment);
        });

        // Закриття деталей
        document.getElementById('closeDepartmentDetailsBtn')?.addEventListener('click', () => {
            this.hideDepartmentDetailsModal();
        });

        // Закриття модальних вікон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
            });
        });
    }

    renderDepartmentsView() {
        if (this.departments.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-building"></i>
                    <h3>Немає підрозділів</h3>
                    <p>Створіть перший підрозділ для формування організаційної структури</p>
                    <button class="btn btn-primary" onclick="document.getElementById('addDepartmentBtn').click()">
                        <i class="fas fa-plus"></i> Створити підрозділ
                    </button>
                </div>
            `;
        }

        return this.currentView === 'tree' ? 
            this.renderDepartmentsTree() : 
            this.renderDepartmentsList();
    }

    renderDepartmentsTree() {
        const rootDepartments = this.getFilteredDepartments().filter(dept => !dept.parentId);
        
        return `
            <div class="departments-tree">
                ${rootDepartments.map(dept => this.renderDepartmentNode(dept)).join('')}
            </div>
        `;
    }

    renderDepartmentNode(department, level = 0) {
        const children = this.departments.filter(dept => dept.parentId === department.id);
        const employeeCount = this.getEmployeeCountForDepartment(department.id);
        const hasChildren = children.length > 0;

        return `
            <div class="department-node" data-id="${department.id}" style="margin-left: ${level * 20}px">
                <div class="node-content">
                    <div class="node-expand" onclick="departmentsModule.toggleNode(${department.id})">
                        ${hasChildren ? 
                            '<i class="fas fa-chevron-down"></i>' : 
                            '<i class="fas fa-circle" style="font-size: 4px; opacity: 0.3;"></i>'
                        }
                    </div>
                    <div class="node-icon">
                        <i class="fas ${department.icon || 'fa-building'}"></i>
                    </div>
                    <div class="node-info" onclick="departmentsModule.showDetails(${department.id})">
                        <div class="node-name">${department.name}</div>
                        <div class="node-details">
                            <span class="employee-count">${employeeCount} співробітників</span>
                            <span class="status-badge ${department.isActive ? 'active' : 'inactive'}">
                                ${department.isActive ? 'Активний' : 'Неактивний'}
                            </span>
                        </div>
                    </div>
                    <div class="node-actions">
                        <button class="btn-icon" onclick="departmentsModule.addSubDepartment(${department.id})" title="Додати підпідрозділ">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn-icon" onclick="departmentsModule.editDepartment(${department.id})" title="Редагувати">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger" onclick="departmentsModule.deleteDepartment(${department.id})" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="node-children" id="children-${department.id}">
                    ${children.map(child => this.renderDepartmentNode(child, level + 1)).join('')}
                </div>
            </div>
        `;
    }

    renderDepartmentsList() {
        return `
            <div class="departments-list">
                <table class="departments-table">
                    <thead>
                        <tr>
                            <th>Назва</th>
                            <th>Батьківський підрозділ</th>
                            <th>Керівник</th>
                            <th>Співробітники</th>
                            <th>Статус</th>
                            <th>Дата створення</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.getFilteredDepartments().map(dept => this.renderDepartmentRow(dept)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderDepartmentRow(department) {
        const parentDept = this.departments.find(d => d.id === department.parentId);
        const employeeCount = this.getEmployeeCountForDepartment(department.id);
        const manager = this.employees.find(emp => emp.id === department.managerId);

        return `
            <tr class="department-row" data-id="${department.id}">
                <td class="name-cell">
                    <div class="department-name">
                        <i class="fas ${department.icon || 'fa-building'}"></i>
                        ${department.name}
                    </div>
                    <div class="department-description">${department.description || ''}</div>
                </td>
                <td>${parentDept?.name || '-'}</td>
                <td>${manager?.fullName || 'Не призначено'}</td>
                <td>${employeeCount}</td>
                <td>
                    <span class="status-badge ${department.isActive ? 'active' : 'inactive'}">
                        ${department.isActive ? 'Активний' : 'Неактивний'}
                    </span>
                </td>
                <td>${department.createdAt ? this.formatDate(department.createdAt) : '-'}</td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="departmentsModule.showDetails(${department.id})" title="Деталі">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="departmentsModule.editDepartment(${department.id})" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="departmentsModule.addSubDepartment(${department.id})" title="Додати підпідрозділ">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn-icon danger" onclick="departmentsModule.deleteDepartment(${department.id})" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    renderDepartmentForm() {
        const department = this.selectedDepartment || {};
        
        return `
            <form id="departmentForm" class="department-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Назва підрозділу *</label>
                        <input type="text" name="name" value="${department.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Код підрозділу</label>
                        <input type="text" name="code" value="${department.code || ''}" placeholder="Наприклад: DEPT-001">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Батьківський підрозділ</label>
                        <select name="parentId">
                            <option value="">Головний рівень</option>
                            ${this.departments
                                .filter(d => d.id !== department.id) // Виключаємо поточний підрозділ
                                .map(dept => 
                                    `<option value="${dept.id}" ${department.parentId === dept.id ? 'selected' : ''}>${dept.name}</option>`
                                ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Керівник</label>
                        <select name="managerId">
                            <option value="">Не призначено</option>
                            ${this.employees
                                .filter(emp => emp.status === 'active')
                                .map(emp => 
                                    `<option value="${emp.id}" ${department.managerId === emp.id ? 'selected' : ''}>${emp.fullName}</option>`
                                ).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Опис</label>
                    <textarea name="description" rows="3">${department.description || ''}</textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Іконка</label>
                        <select name="icon">
                            <option value="fa-building" ${department.icon === 'fa-building' ? 'selected' : ''}>🏢 Будівля</option>
                            <option value="fa-users" ${department.icon === 'fa-users' ? 'selected' : ''}>👥 Команда</option>
                            <option value="fa-cogs" ${department.icon === 'fa-cogs' ? 'selected' : ''}>⚙️ Технічний</option>
                            <option value="fa-chart-line" ${department.icon === 'fa-chart-line' ? 'selected' : ''}>📈 Аналітика</option>
                            <option value="fa-handshake" ${department.icon === 'fa-handshake' ? 'selected' : ''}>🤝 Продажі</option>
                            <option value="fa-tools" ${department.icon === 'fa-tools' ? 'selected' : ''}>🔧 Підтримка</option>
                            <option value="fa-graduation-cap" ${department.icon === 'fa-graduation-cap' ? 'selected' : ''}>🎓 Навчання</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Статус</label>
                        <select name="isActive">
                            <option value="true" ${department.isActive !== false ? 'selected' : ''}>Активний</option>
                            <option value="false" ${department.isActive === false ? 'selected' : ''}>Неактивний</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Телефон</label>
                        <input type="tel" name="phone" value="${department.contact?.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value="${department.contact?.email || ''}">
                    </div>
                </div>

                <div class="form-group">
                    <label>Адреса</label>
                    <textarea name="address" rows="2">${department.contact?.address || ''}</textarea>
                </div>

                <div class="form-group">
                    <label>Примітки</label>
                    <textarea name="notes" rows="2">${department.notes || ''}</textarea>
                </div>
            </form>
        `;
    }

    // Допоміжні методи
    getFilteredDepartments() {
        let filtered = [...this.departments];

        // Пошук
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(dept => 
                dept.name.toLowerCase().includes(query) ||
                (dept.code && dept.code.toLowerCase().includes(query)) ||
                (dept.description && dept.description.toLowerCase().includes(query))
            );
        }

        // Фільтр за статусом
        if (this.filterStatus !== 'all') {
            const isActive = this.filterStatus === 'active';
            filtered = filtered.filter(dept => dept.isActive === isActive);
        }

        return filtered;
    }

    getEmployeeCountForDepartment(departmentId) {
        return this.employees.filter(emp => emp.departmentId === departmentId).length;
    }

    getTotalEmployees() {
        return this.employees.length;
    }

    getRootDepartmentsCount() {
        return this.departments.filter(dept => !dept.parentId).length;
    }

    getMaxDepth() {
        let maxDepth = 0;
        
        const calculateDepth = (departmentId, currentDepth = 1) => {
            maxDepth = Math.max(maxDepth, currentDepth);
            const children = this.departments.filter(dept => dept.parentId === departmentId);
            children.forEach(child => calculateDepth(child.id, currentDepth + 1));
        };

        const rootDepartments = this.departments.filter(dept => !dept.parentId);
        rootDepartments.forEach(dept => calculateDepth(dept.id));

        return maxDepth;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    // Дії з підрозділами
    async showDepartmentModal(department = null, parentId = null) {
        this.selectedDepartment = department;
        const modal = document.getElementById('departmentModal');
        const title = document.getElementById('modalTitle');
        
        if (department) {
            title.innerHTML = '<i class="fas fa-edit"></i> Редагувати підрозділ';
        } else if (parentId) {
            title.innerHTML = '<i class="fas fa-plus"></i> Створити підпідрозділ';
            this.selectedDepartment = { parentId };
        } else {
            title.innerHTML = '<i class="fas fa-plus"></i> Створити підрозділ';
        }

        // Перерендеримо форму з даними
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = this.renderDepartmentForm();

        hrSystem.showModal(modal);
    }

    hideDepartmentModal() {
        const modal = document.getElementById('departmentModal');
        hrSystem.closeModal(modal);
        this.selectedDepartment = null;
    }

    async saveDepartment() {
        const form = document.getElementById('departmentForm');
        const formData = new FormData(form);
        
        try {
            const departmentData = this.processFormData(formData);
            
            if (this.selectedDepartment?.id) {
                // Оновлення
                departmentData.id = this.selectedDepartment.id;
                departmentData.updatedAt = new Date().toISOString();
                await this.database.update('departments', departmentData);
                hrSystem.showNotification('Підрозділ оновлено', 'success');
            } else {
                // Додавання
                departmentData.createdAt = new Date().toISOString();
                departmentData.isActive = departmentData.isActive !== false;
                await this.database.add('departments', departmentData);
                hrSystem.showNotification('Підрозділ створено', 'success');
            }

            await this.loadData();
            this.updateDepartmentsView();
            this.hideDepartmentModal();

        } catch (error) {
            console.error('Помилка збереження підрозділу:', error);
            hrSystem.showNotification('Помилка збереження: ' + error.message, 'error');
        }
    }

    processFormData(formData) {
        const data = {};
        
        data.name = formData.get('name');
        data.code = formData.get('code');
        data.description = formData.get('description');
        data.parentId = formData.get('parentId') ? parseInt(formData.get('parentId')) : null;
        data.managerId = formData.get('managerId') ? parseInt(formData.get('managerId')) : null;
        data.icon = formData.get('icon') || 'fa-building';
        data.isActive = formData.get('isActive') === 'true';
        data.notes = formData.get('notes');
        
        // Контактна інформація
        data.contact = {
            phone: formData.get('phone'),
            email: formData.get('email'),
            address: formData.get('address')
        };

        return data;
    }

    async editDepartment(id) {
        const department = this.departments.find(d => d.id === id);
        if (department) {
            await this.showDepartmentModal(department);
        }
    }

    async addSubDepartment(parentId) {
        await this.showDepartmentModal(null, parentId);
    }

    async deleteDepartment(id) {
        const department = this.departments.find(d => d.id === id);
        if (!department) return;

        // Перевіряємо чи є підпідрозділи
        const hasChildren = this.departments.some(d => d.parentId === id);
        if (hasChildren) {
            hrSystem.showNotification('Неможливо видалити підрозділ, який має підпідрозділи', 'warning');
            return;
        }

        // Перевіряємо чи є співробітники
        const hasEmployees = this.employees.some(emp => emp.departmentId === id);
        if (hasEmployees) {
            hrSystem.showNotification('Неможливо видалити підрозділ, в якому є співробітники', 'warning');
            return;
        }

        if (confirm(`Ви впевнені, що хочете видалити підрозділ "${department.name}"?`)) {
            try {
                await this.database.delete('departments', id);
                await this.loadData();
                this.updateDepartmentsView();
                hrSystem.showNotification('Підрозділ видалено', 'success');
            } catch (error) {
                console.error('Помилка видалення підрозділу:', error);
                hrSystem.showNotification('Помилка видалення: ' + error.message, 'error');
            }
        }
    }

    async showDetails(id) {
        const department = this.departments.find(d => d.id === id);
        if (!department) return;

        this.selectedDepartment = department;
        const modal = document.getElementById('departmentDetailsModal');
        const content = document.getElementById('departmentDetails');
        
        const manager = this.employees.find(emp => emp.id === department.managerId);
        const parentDept = this.departments.find(d => d.id === department.parentId);
        const children = this.departments.filter(d => d.parentId === department.id);
        const employees = this.employees.filter(emp => emp.departmentId === department.id);

        content.innerHTML = `
            <div class="department-details">
                <div class="details-header">
                    <div class="dept-icon">
                        <i class="fas ${department.icon || 'fa-building'}"></i>
                    </div>
                    <div class="dept-info">
                        <h3>${department.name}</h3>
                        <p>${department.description || 'Опис відсутній'}</p>
                        <span class="status-badge ${department.isActive ? 'active' : 'inactive'}">
                            ${department.isActive ? 'Активний' : 'Неактивний'}
                        </span>
                    </div>
                </div>

                <div class="details-grid">
                    <div class="detail-section">
                        <h4><i class="fas fa-info-circle"></i> Загальна інформація</h4>
                        <div class="detail-item">
                            <label>Код:</label>
                            <span>${department.code || 'Не вказано'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Батьківський підрозділ:</label>
                            <span>${parentDept?.name || 'Головний рівень'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Керівник:</label>
                            <span>${manager?.fullName || 'Не призначено'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Дата створення:</label>
                            <span>${department.createdAt ? this.formatDate(department.createdAt) : 'Не вказано'}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-phone"></i> Контактна інформація</h4>
                        <div class="detail-item">
                            <label>Телефон:</label>
                            <span>${department.contact?.phone || 'Не вказано'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Email:</label>
                            <span>${department.contact?.email || 'Не вказано'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Адреса:</label>
                            <span>${department.contact?.address || 'Не вказано'}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-users"></i> Співробітники (${employees.length})</h4>
                        <div class="employees-list">
                            ${employees.length > 0 ? 
                                employees.map(emp => `
                                    <div class="employee-item">
                                        <span class="employee-name">${emp.fullName}</span>
                                        <span class="employee-position">${emp.position || 'Не вказано'}</span>
                                    </div>
                                `).join('') :
                                '<div class="no-employees">Немає співробітників</div>'
                            }
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-sitemap"></i> Підпідрозділи (${children.length})</h4>
                        <div class="children-list">
                            ${children.length > 0 ? 
                                children.map(child => `
                                    <div class="child-item">
                                        <i class="fas ${child.icon || 'fa-building'}"></i>
                                        <span class="child-name">${child.name}</span>
                                        <span class="child-employees">${this.getEmployeeCountForDepartment(child.id)} осіб</span>
                                    </div>
                                `).join('') :
                                '<div class="no-children">Немає підпідрозділів</div>'
                            }
                        </div>
                    </div>
                </div>

                ${department.notes ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-sticky-note"></i> Примітки</h4>
                        <p>${department.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;

        hrSystem.showModal(modal);
    }

    hideDepartmentDetailsModal() {
        const modal = document.getElementById('departmentDetailsModal');
        hrSystem.closeModal(modal);
        this.selectedDepartment = null;
    }

    toggleNode(departmentId) {
        const children = document.getElementById(`children-${departmentId}`);
        const expandBtn = document.querySelector(`.department-node[data-id="${departmentId}"] .node-expand i`);
        
        if (children.style.display === 'none') {
            children.style.display = 'block';
            expandBtn.className = 'fas fa-chevron-down';
        } else {
            children.style.display = 'none';
            expandBtn.className = 'fas fa-chevron-right';
        }
    }

    filterDepartments() {
        this.updateDepartmentsView();
    }

    updateDepartmentsView() {
        const container = document.getElementById('departmentsContainer');
        if (container) {
            container.innerHTML = this.renderDepartmentsView();
        }
    }

    hideModal(modal) {
        hrSystem.closeModal(modal);
    }

    async exportDepartments() {
        try {
            const departments = this.getFilteredDepartments();
            const exportData = departments.map(dept => {
                const parent = this.departments.find(d => d.id === dept.parentId);
                const manager = this.employees.find(emp => emp.id === dept.managerId);
                const employeeCount = this.getEmployeeCountForDepartment(dept.id);
                
                return {
                    'Назва': dept.name,
                    'Код': dept.code || '',
                    'Батьківський підрозділ': parent?.name || '',
                    'Керівник': manager?.fullName || '',
                    'Співробітники': employeeCount,
                    'Статус': dept.isActive ? 'Активний' : 'Неактивний',
                    'Телефон': dept.contact?.phone || '',
                    'Email': dept.contact?.email || '',
                    'Дата створення': dept.createdAt ? this.formatDate(dept.createdAt) : ''
                };
            });

            // Експорт в JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Підрозділи_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            hrSystem.showNotification('Дані експортовано', 'success');

        } catch (error) {
            console.error('Помилка експорту:', error);
            hrSystem.showNotification('Помилка експорту: ' + error.message, 'error');
        }
    }

    startPeriodicUpdate() {
        // Кожні 30 секунд оновлюємо статистику
        setInterval(() => {
            this.updateStats();
        }, 30000);
    }

    updateStats() {
        const statsItems = document.querySelectorAll('.stat-item .stat-number');
        if (statsItems.length >= 4) {
            statsItems[0].textContent = this.departments.filter(d => d.isActive).length;
            statsItems[1].textContent = this.getTotalEmployees();
            statsItems[2].textContent = this.getRootDepartmentsCount();
            statsItems[3].textContent = this.getMaxDepth();
        }
    }
}

// Глобальна змінна departmentsModule оголошена в hr-system.js