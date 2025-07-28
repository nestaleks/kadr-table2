/**
 * Employees Module - Модуль управління співробітниками
 */

class EmployeesModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.employees = [];
        this.departments = [];
        this.positions = [];
        this.selectedEmployee = null;
        this.currentView = 'list'; // list, form, profile
        this.searchQuery = '';
        this.filterStatus = 'all';
    }

    async render() {
        await this.loadData();

        return `
            <div class="employees-module">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-users"></i> Управління співробітниками</h1>
                        <p>Облік персоналу організації</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="addEmployeeBtn">
                            <i class="fas fa-user-plus"></i> Додати співробітника
                        </button>
                        <button class="btn btn-secondary" id="exportEmployeesBtn">
                            <i class="fas fa-download"></i> Експорт
                        </button>
                    </div>
                </div>

                <!-- Фільтри та пошук -->
                <div class="controls-panel">
                    <div class="search-controls">
                        <div class="search-box">
                            <input type="text" id="searchInput" placeholder="Пошук за ПІБ, посадою, табельним номером...">
                            <i class="fas fa-search"></i>
                        </div>
                        <select id="statusFilter" class="filter-select">
                            <option value="all">Всі статуси</option>
                            <option value="active">Активні</option>
                            <option value="dismissed">Звільнені</option>
                            <option value="vacation">У відпустці</option>
                            <option value="sick">На лікарняному</option>
                        </select>
                        <select id="departmentFilter" class="filter-select">
                            <option value="all">Всі підрозділи</option>
                            ${this.departments.map(dept => 
                                `<option value="${dept.id}">${dept.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="view-controls">
                        <button class="view-btn active" data-view="list" title="Список">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="view-btn" data-view="cards" title="Картки">
                            <i class="fas fa-th-large"></i>
                        </button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="stats-bar">
                    <div class="stat-item">
                        <span class="stat-number">${this.employees.filter(e => e.status === 'active').length}</span>
                        <span class="stat-label">Активних</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.employees.filter(e => e.status === 'vacation').length}</span>
                        <span class="stat-label">У відпустці</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.employees.filter(e => e.status === 'sick').length}</span>
                        <span class="stat-label">На лікарняному</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getNewEmployeesThisMonth()}</span>
                        <span class="stat-label">Нових цього місяця</span>
                    </div>
                </div>

                <!-- Основний контент -->
                <div class="employees-content">
                    <div id="employeesContainer" class="employees-container">
                        ${this.renderEmployeesList()}
                    </div>
                </div>

                <!-- Модальне вікно співробітника -->
                <div id="employeeModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h2 id="modalTitle">
                                <i class="fas fa-user"></i> Додати співробітника
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${this.renderEmployeeForm()}
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="saveEmployeeBtn">Зберегти</button>
                            <button class="btn btn-secondary" id="cancelEmployeeBtn">Скасувати</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно профілю -->
                <div id="profileModal" class="modal">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h2 id="profileTitle">
                                <i class="fas fa-id-card"></i> Профіль співробітника
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="profileContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="editProfileBtn">Редагувати</button>
                            <button class="btn btn-secondary" id="closeProfileBtn">Закрити</button>
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
            this.employees = await this.database.getAll('employees');
            this.departments = await this.database.getAll('departments');
            this.positions = await this.database.getAll('positions');
        } catch (error) {
            console.error('Помилка завантаження даних співробітників:', error);
            hrSystem.showNotification('Помилка завантаження даних: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Додавання співробітника
        document.getElementById('addEmployeeBtn')?.addEventListener('click', () => {
            this.showEmployeeModal();
        });

        // Пошук
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterEmployees();
        });

        // Фільтри
        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filterStatus = e.target.value;
            this.filterEmployees();
        });

        document.getElementById('departmentFilter')?.addEventListener('change', (e) => {
            this.filterDepartment = e.target.value;
            this.filterEmployees();
        });

        // Перемикання вигляду
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.updateEmployeesView();
            });
        });

        // Модальні вікна
        this.bindModalEvents();

        // Експорт
        document.getElementById('exportEmployeesBtn')?.addEventListener('click', () => {
            this.exportEmployees();
        });
    }

    bindModalEvents() {
        // Збереження співробітника
        document.getElementById('saveEmployeeBtn')?.addEventListener('click', () => {
            this.saveEmployee();
        });

        // Скасування
        document.getElementById('cancelEmployeeBtn')?.addEventListener('click', () => {
            this.hideEmployeeModal();
        });

        // Редагування профілю
        document.getElementById('editProfileBtn')?.addEventListener('click', () => {
            this.hideProfileModal();
            this.showEmployeeModal(this.selectedEmployee);
        });

        // Закриття профілю
        document.getElementById('closeProfileBtn')?.addEventListener('click', () => {
            this.hideProfileModal();
        });

        // Закриття модальних вікон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
            });
        });
    }

    renderEmployeesList() {
        if (this.employees.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Немає співробітників</h3>
                    <p>Додайте першого співробітника для початку роботи</p>
                    <button class="btn btn-primary" onclick="document.getElementById('addEmployeeBtn').click()">
                        <i class="fas fa-user-plus"></i> Додати співробітника
                    </button>
                </div>
            `;
        }

        if (this.currentView === 'cards') {
            return this.renderEmployeesCards();
        }

        return `
            <div class="employees-table-container">
                <table class="employees-table">
                    <thead>
                        <tr>
                            <th>Фото</th>
                            <th>ПІБ</th>
                            <th>Посада</th>
                            <th>Підрозділ</th>
                            <th>Табельний №</th>
                            <th>Статус</th>
                            <th>Дата прийому</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.getFilteredEmployees().map(emp => this.renderEmployeeRow(emp)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderEmployeesCards() {
        return `
            <div class="employees-cards">
                ${this.getFilteredEmployees().map(emp => this.renderEmployeeCard(emp)).join('')}
            </div>
        `;
    }

    renderEmployeeRow(employee) {
        const department = this.departments.find(d => d.id === employee.departmentId);
        const position = this.positions.find(p => p.id === employee.positionId);

        return `
            <tr class="employee-row" data-id="${employee.id}">
                <td class="photo-cell">
                    <div class="employee-avatar">
                        ${employee.photo ? 
                            `<img src="${employee.photo}" alt="${employee.fullName}">` :
                            `<i class="fas fa-user"></i>`
                        }
                    </div>
                </td>
                <td class="name-cell">
                    <div class="employee-name">${employee.fullName}</div>
                    <div class="employee-contacts">${employee.phone || ''} ${employee.email || ''}</div>
                </td>
                <td>${position?.title || '-'}</td>
                <td>${department?.name || '-'}</td>
                <td>${employee.personnelNumber}</td>
                <td>
                    <span class="status-badge ${employee.status}">
                        ${this.getStatusText(employee.status)}
                    </span>
                </td>
                <td>${employee.hireDate ? this.formatDate(employee.hireDate) : '-'}</td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="employeesModule.showProfile(${employee.id})" title="Профіль">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="employeesModule.editEmployee(${employee.id})" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="employeesModule.deleteEmployee(${employee.id})" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    renderEmployeeCard(employee) {
        const department = this.departments.find(d => d.id === employee.departmentId);
        const position = this.positions.find(p => p.id === employee.positionId);

        return `
            <div class="employee-card" data-id="${employee.id}">
                <div class="card-header">
                    <div class="employee-avatar large">
                        ${employee.photo ? 
                            `<img src="${employee.photo}" alt="${employee.fullName}">` :
                            `<i class="fas fa-user"></i>`
                        }
                    </div>
                    <span class="status-badge ${employee.status}">
                        ${this.getStatusText(employee.status)}
                    </span>
                </div>
                <div class="card-content">
                    <h3 class="employee-name">${employee.fullName}</h3>
                    <p class="employee-position">${position?.title || 'Не вказано'}</p>
                    <p class="employee-department">${department?.name || 'Не вказано'}</p>
                    <div class="employee-details">
                        <span><i class="fas fa-id-badge"></i> ${employee.personnelNumber}</span>
                        <span><i class="fas fa-calendar"></i> ${employee.hireDate ? this.formatDate(employee.hireDate) : 'Не вказано'}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-sm btn-primary" onclick="employeesModule.showProfile(${employee.id})">
                        <i class="fas fa-eye"></i> Профіль
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="employeesModule.editEmployee(${employee.id})">
                        <i class="fas fa-edit"></i> Редагувати
                    </button>
                </div>
            </div>
        `;
    }

    renderEmployeeForm() {
        const employee = this.selectedEmployee || {};
        
        return `
            <form id="employeeForm" class="employee-form">
                <div class="form-tabs">
                    <button type="button" class="tab-btn active" data-tab="basic">Основна інформація</button>
                    <button type="button" class="tab-btn" data-tab="work">Робота</button>
                    <button type="button" class="tab-btn" data-tab="personal">Особисті дані</button>
                    <button type="button" class="tab-btn" data-tab="documents">Документи</button>
                </div>

                <div class="tab-content active" id="basicTab">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Прізвище *</label>
                            <input type="text" name="lastName" value="${employee.lastName || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Ім'я *</label>
                            <input type="text" name="firstName" value="${employee.firstName || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>По батькові</label>
                            <input type="text" name="middleName" value="${employee.middleName || ''}">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Телефон</label>
                            <input type="tel" name="phone" value="${employee.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value="${employee.email || ''}">
                        </div>
                        <div class="form-group">
                            <label>Стать</label>
                            <select name="gender">
                                <option value="ч" ${employee.gender === 'ч' ? 'selected' : ''}>Чоловіча</option>
                                <option value="ж" ${employee.gender === 'ж' ? 'selected' : ''}>Жіноча</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Адреса</label>
                        <textarea name="address" rows="2">${employee.address || ''}</textarea>
                    </div>
                </div>

                <div class="tab-content" id="workTab">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Табельний номер *</label>
                            <input type="text" name="personnelNumber" value="${employee.personnelNumber || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Підрозділ</label>
                            <select name="departmentId">
                                <option value="">Виберіть підрозділ</option>
                                ${this.departments.map(dept => 
                                    `<option value="${dept.id}" ${employee.departmentId === dept.id ? 'selected' : ''}>${dept.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Посада</label>
                            <select name="positionId">
                                <option value="">Виберіть посаду</option>
                                ${this.positions.map(pos => 
                                    `<option value="${pos.id}" ${employee.positionId === pos.id ? 'selected' : ''}>${pos.title}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Дата прийому</label>
                            <input type="date" name="hireDate" value="${employee.hireDate || ''}">
                        </div>
                        <div class="form-group">
                            <label>Статус</label>
                            <select name="status">
                                <option value="active" ${employee.status === 'active' ? 'selected' : ''}>Активний</option>
                                <option value="dismissed" ${employee.status === 'dismissed' ? 'selected' : ''}>Звільнений</option>
                                <option value="vacation" ${employee.status === 'vacation' ? 'selected' : ''}>У відпустці</option>
                                <option value="sick" ${employee.status === 'sick' ? 'selected' : ''}>На лікарняному</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Базова зарплата</label>
                            <input type="number" name="baseSalary" value="${employee.salary?.amount || 0}" min="0">
                        </div>
                    </div>
                </div>

                <div class="tab-content" id="personalTab">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Дата народження</label>
                            <input type="date" name="birthDate" value="${employee.birthDate || ''}">
                        </div>
                        <div class="form-group">
                            <label>Сімейний стан</label>
                            <select name="maritalStatus">
                                <option value="неодружений" ${employee.maritalStatus === 'неодружений' ? 'selected' : ''}>Неодружений</option>
                                <option value="одружений" ${employee.maritalStatus === 'одружений' ? 'selected' : ''}>Одружений</option>
                                <option value="розлучений" ${employee.maritalStatus === 'розлучений' ? 'selected' : ''}>Розлучений</option>
                                <option value="вдівець" ${employee.maritalStatus === 'вдівець' ? 'selected' : ''}>Вдівець</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Кількість дітей</label>
                            <input type="number" name="children" value="${employee.children || 0}" min="0">
                        </div>
                    </div>
                </div>

                <div class="tab-content" id="documentsTab">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Серія паспорта</label>
                            <input type="text" name="passportSeries" value="${employee.passport?.series || ''}">
                        </div>
                        <div class="form-group">
                            <label>Номер паспорта</label>
                            <input type="text" name="passportNumber" value="${employee.passport?.number || ''}">
                        </div>
                        <div class="form-group">
                            <label>ІПН</label>
                            <input type="text" name="taxNumber" value="${employee.taxNumber || ''}">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Ким виданий</label>
                            <input type="text" name="passportIssuedBy" value="${employee.passport?.issuedBy || ''}">
                        </div>
                        <div class="form-group">
                            <label>Дата видачі</label>
                            <input type="date" name="passportIssuedDate" value="${employee.passport?.issuedDate || ''}">
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Примітки</label>
                    <textarea name="notes" rows="3">${employee.notes || ''}</textarea>
                </div>
            </form>
        `;
    }

    // Допоміжні методи
    getFilteredEmployees() {
        let filtered = [...this.employees];

        // Пошук
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(emp => 
                emp.fullName.toLowerCase().includes(query) ||
                emp.personnelNumber.toLowerCase().includes(query) ||
                (emp.phone && emp.phone.includes(query)) ||
                (emp.email && emp.email.toLowerCase().includes(query))
            );
        }

        // Фільтр за статусом
        if (this.filterStatus !== 'all') {
            filtered = filtered.filter(emp => emp.status === this.filterStatus);
        }

        // Фільтр за підрозділом
        if (this.filterDepartment && this.filterDepartment !== 'all') {
            filtered = filtered.filter(emp => emp.departmentId == this.filterDepartment);
        }

        return filtered;
    }

    getStatusText(status) {
        const statuses = {
            active: 'Активний',
            dismissed: 'Звільнений',
            vacation: 'У відпустці',
            sick: 'На лікарняному'
        };
        return statuses[status] || status;
    }

    getNewEmployeesThisMonth() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return this.employees.filter(emp => {
            if (!emp.hireDate) return false;
            const hireDate = new Date(emp.hireDate);
            return hireDate.getMonth() === currentMonth && 
                   hireDate.getFullYear() === currentYear;
        }).length;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    // Дії з співробітниками
    async showEmployeeModal(employee = null) {
        this.selectedEmployee = employee;
        const modal = document.getElementById('employeeModal');
        const title = document.getElementById('modalTitle');
        
        title.innerHTML = employee ? 
            '<i class="fas fa-user-edit"></i> Редагувати співробітника' : 
            '<i class="fas fa-user-plus"></i> Додати співробітника';

        // Перерендеримо форму з даними
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = this.renderEmployeeForm();

        // Налаштуємо табби
        this.setupFormTabs();

        hrSystem.showModal(modal);
    }

    hideEmployeeModal() {
        const modal = document.getElementById('employeeModal');
        hrSystem.closeModal(modal);
        this.selectedEmployee = null;
    }

    async saveEmployee() {
        const form = document.getElementById('employeeForm');
        const formData = new FormData(form);
        
        try {
            const employeeData = this.processFormData(formData);
            
            if (this.selectedEmployee) {
                // Оновлення
                employeeData.id = this.selectedEmployee.id;
                employeeData.updatedAt = new Date().toISOString();
                await this.database.update('employees', employeeData);
                hrSystem.showNotification('Співробітника оновлено', 'success');
            } else {
                // Додавання
                employeeData.createdAt = new Date().toISOString();
                employeeData.status = employeeData.status || 'active';
                await this.database.add('employees', employeeData);
                hrSystem.showNotification('Співробітника додано', 'success');
            }

            await this.loadData();
            this.updateEmployeesView();
            this.hideEmployeeModal();

        } catch (error) {
            console.error('Помилка збереження співробітника:', error);
            hrSystem.showNotification('Помилка збереження: ' + error.message, 'error');
        }
    }

    processFormData(formData) {
        const data = {};
        
        // Основні поля
        data.lastName = formData.get('lastName');
        data.firstName = formData.get('firstName');
        data.middleName = formData.get('middleName');
        data.fullName = `${data.lastName} ${data.firstName} ${data.middleName || ''}`.trim();
        
        data.phone = formData.get('phone');
        data.email = formData.get('email');
        data.gender = formData.get('gender');
        data.address = formData.get('address');
        
        data.personnelNumber = formData.get('personnelNumber');
        data.departmentId = formData.get('departmentId') ? parseInt(formData.get('departmentId')) : null;
        data.positionId = formData.get('positionId') ? parseInt(formData.get('positionId')) : null;
        data.hireDate = formData.get('hireDate') || null;
        data.status = formData.get('status');
        
        data.birthDate = formData.get('birthDate') || null;
        data.maritalStatus = formData.get('maritalStatus');
        data.children = parseInt(formData.get('children')) || 0;
        
        // Паспорт
        data.passport = {
            series: formData.get('passportSeries'),
            number: formData.get('passportNumber'),
            issuedBy: formData.get('passportIssuedBy'),
            issuedDate: formData.get('passportIssuedDate') || null
        };
        
        data.taxNumber = formData.get('taxNumber');
        data.notes = formData.get('notes');
        
        // Зарплата
        data.salary = {
            type: 'monthly',
            amount: parseFloat(formData.get('baseSalary')) || 0,
            currency: 'UAH'
        };

        return data;
    }

    async editEmployee(id) {
        const employee = this.employees.find(e => e.id === id);
        if (employee) {
            await this.showEmployeeModal(employee);
        }
    }

    async deleteEmployee(id) {
        const employee = this.employees.find(e => e.id === id);
        if (!employee) return;

        if (confirm(`Ви впевнені, що хочете видалити співробітника "${employee.fullName}"?`)) {
            try {
                await this.database.delete('employees', id);
                await this.loadData();
                this.updateEmployeesView();
                hrSystem.showNotification('Співробітника видалено', 'success');
            } catch (error) {
                console.error('Помилка видалення співробітника:', error);
                hrSystem.showNotification('Помилка видалення: ' + error.message, 'error');
            }
        }
    }

    filterEmployees() {
        this.updateEmployeesView();
    }

    updateEmployeesView() {
        const container = document.getElementById('employeesContainer');
        if (container) {
            container.innerHTML = this.renderEmployeesList();
        }
    }

    setupFormTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Прибираємо активний клас з усіх табів
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // Додаємо активний клас до поточного табу
                btn.classList.add('active');
                const tabId = btn.dataset.tab + 'Tab';
                document.getElementById(tabId)?.classList.add('active');
            });
        });
    }

    async showProfile(id) {
        const employee = this.employees.find(e => e.id === id);
        if (!employee) return;

        this.selectedEmployee = employee;
        const modal = document.getElementById('profileModal');
        const content = document.getElementById('profileContent');
        
        const department = this.departments.find(d => d.id === employee.departmentId);
        const position = this.positions.find(p => p.id === employee.positionId);

        content.innerHTML = `
            <div class="employee-profile">
                <div class="profile-header">
                    <div class="employee-avatar large">
                        ${employee.photo ? 
                            `<img src="${employee.photo}" alt="${employee.fullName}">` :
                            `<i class="fas fa-user"></i>`
                        }
                    </div>
                    <div class="employee-info">
                        <h3>${employee.fullName}</h3>
                        <p>${position?.title || 'Посада не вказана'}</p>
                        <p>${department?.name || 'Підрозділ не вказаний'}</p>
                        <span class="status-badge ${employee.status}">
                            ${this.getStatusText(employee.status)}
                        </span>
                    </div>
                </div>

                <div class="profile-details">
                    <div class="detail-section">
                        <h4><i class="fas fa-user-circle"></i> Особиста інформація</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Табельний номер:</label>
                                <span>${employee.personnelNumber}</span>
                            </div>
                            <div class="detail-item">
                                <label>Стать:</label>
                                <span>${employee.gender === 'ч' ? 'Чоловіча' : 'Жіноча'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Дата народження:</label>
                                <span>${employee.birthDate ? this.formatDate(employee.birthDate) : 'Не вказано'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Сімейний стан:</label>
                                <span>${employee.maritalStatus || 'Не вказано'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Кількість дітей:</label>
                                <span>${employee.children || 0}</span>
                            </div>
                            <div class="detail-item">
                                <label>Адреса:</label>
                                <span>${employee.address || 'Не вказано'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-briefcase"></i> Робоча інформація</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Дата прийому:</label>
                                <span>${employee.hireDate ? this.formatDate(employee.hireDate) : 'Не вказано'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Стаж роботи:</label>
                                <span>${this.calculateWorkExperience(employee.hireDate)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Базова зарплата:</label>
                                <span>${employee.salary?.amount ? employee.salary.amount.toLocaleString('uk-UA') + ' грн' : 'Не встановлено'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-phone"></i> Контактна інформація</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Телефон:</label>
                                <span>${employee.phone || 'Не вказано'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Email:</label>
                                <span>${employee.email || 'Не вказано'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-id-card"></i> Документи</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Паспорт:</label>
                                <span>${employee.passport?.series ? `${employee.passport.series} ${employee.passport.number}` : 'Не вказано'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Ким виданий:</label>
                                <span>${employee.passport?.issuedBy || 'Не вказано'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Дата видачі:</label>
                                <span>${employee.passport?.issuedDate ? this.formatDate(employee.passport.issuedDate) : 'Не вказано'}</span>
                            </div>
                            <div class="detail-item">
                                <label>ІПН:</label>
                                <span>${employee.taxNumber || 'Не вказано'}</span>
                            </div>
                        </div>
                    </div>

                    ${employee.notes ? `
                        <div class="detail-section">
                            <h4><i class="fas fa-sticky-note"></i> Примітки</h4>
                            <p>${employee.notes}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        hrSystem.showModal(modal);
    }

    hideProfileModal() {
        const modal = document.getElementById('profileModal');
        hrSystem.closeModal(modal);
        this.selectedEmployee = null;
    }

    calculateWorkExperience(hireDate) {
        if (!hireDate) return 'Не вказано';
        
        const hire = new Date(hireDate);
        const now = new Date();
        const diffTime = Math.abs(now - hire);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);
        
        if (years > 0) {
            return `${years} років ${months} місяців`;
        } else if (months > 0) {
            return `${months} місяців`;
        } else {
            return `${diffDays} днів`;
        }
    }

    hideModal(modal) {
        hrSystem.closeModal(modal);
    }

    async exportEmployees() {
        try {
            const employees = this.getFilteredEmployees();
            const exportData = employees.map(emp => {
                const dept = this.departments.find(d => d.id === emp.departmentId);
                const pos = this.positions.find(p => p.id === emp.positionId);
                
                return {
                    'ПІБ': emp.fullName,
                    'Табельний номер': emp.personnelNumber,
                    'Посада': pos?.title || '',
                    'Підрозділ': dept?.name || '',
                    'Телефон': emp.phone || '',
                    'Email': emp.email || '',
                    'Статус': this.getStatusText(emp.status),
                    'Дата прийому': emp.hireDate ? this.formatDate(emp.hireDate) : '',
                    'Зарплата': emp.salary?.amount || 0
                };
            });

            // Експорт в JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Співробітники_${new Date().toISOString().split('T')[0]}.json`;
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
            statsItems[0].textContent = this.employees.filter(e => e.status === 'active').length;
            statsItems[1].textContent = this.employees.filter(e => e.status === 'vacation').length;
            statsItems[2].textContent = this.employees.filter(e => e.status === 'sick').length;
            statsItems[3].textContent = this.getNewEmployeesThisMonth();
        }
    }
}

// Глобальна змінна employeesModule оголошена в hr-system.js