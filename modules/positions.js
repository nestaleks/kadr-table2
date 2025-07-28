/**
 * Positions Module - Модуль управління посадами
 */

class PositionsModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.positions = [];
        this.employees = [];
        this.departments = [];
        this.selectedPosition = null;
        this.searchQuery = '';
        this.filterCategory = 'all';
        this.currentView = 'list';
    }

    async render() {
        await this.loadData();

        return `
            <div class="positions-module">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-user-tie"></i> Управління посадами</h1>
                        <p>Штатний розклад та посадові інструкції</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="addPositionBtn">
                            <i class="fas fa-plus"></i> Додати посаду
                        </button>
                        <button class="btn btn-secondary" id="exportPositionsBtn">
                            <i class="fas fa-download"></i> Експорт
                        </button>
                    </div>
                </div>

                <!-- Фільтри та пошук -->
                <div class="controls-panel">
                    <div class="search-controls">
                        <div class="search-box">
                            <input type="text" id="searchInput" placeholder="Пошук посад...">
                            <i class="fas fa-search"></i>
                        </div>
                        <select id="categoryFilter" class="filter-select">
                            <option value="all">Всі категорії</option>
                            <option value="management">Керівництво</option>
                            <option value="specialists">Спеціалісти</option>
                            <option value="workers">Робітники</option>
                            <option value="support">Обслуговуючий персонал</option>
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
                        <span class="stat-number">${this.positions.length}</span>
                        <span class="stat-label">Всього посад</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getOccupiedPositions()}</span>
                        <span class="stat-label">Зайнятих</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getVacantPositions()}</span>
                        <span class="stat-label">Вакантних</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getAverageSalary()}</span>
                        <span class="stat-label">Середня зарплата</span>
                    </div>
                </div>

                <!-- Основний контент -->
                <div class="positions-content">
                    <div id="positionsContainer" class="positions-container">
                        ${this.renderPositionsView()}
                    </div>
                </div>

                <!-- Модальне вікно посади -->
                <div id="positionModal" class="modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h2 id="modalTitle">
                                <i class="fas fa-user-tie"></i> Додати посаду
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${this.renderPositionForm()}
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="savePositionBtn">Зберегти</button>
                            <button class="btn btn-secondary" id="cancelPositionBtn">Скасувати</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно деталей -->
                <div id="positionDetailsModal" class="modal">
                    <div class="modal-content extra-large">
                        <div class="modal-header">
                            <h2 id="detailsTitle">
                                <i class="fas fa-info-circle"></i> Деталі посади
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="positionDetails"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="editPositionDetailsBtn">Редагувати</button>
                            <button class="btn btn-secondary" id="closePositionDetailsBtn">Закрити</button>
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
            this.positions = await this.database.getAll('positions');
            this.employees = await this.database.getAll('employees');
            this.departments = await this.database.getAll('departments');
        } catch (error) {
            console.error('Помилка завантаження даних посад:', error);
            hrSystem.showNotification('Помилка завантаження даних: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Додавання посади
        document.getElementById('addPositionBtn')?.addEventListener('click', () => {
            this.showPositionModal();
        });

        // Пошук
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterPositions();
        });

        // Фільтри
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.filterCategory = e.target.value;
            this.filterPositions();
        });

        document.getElementById('departmentFilter')?.addEventListener('change', (e) => {
            this.filterDepartment = e.target.value;
            this.filterPositions();
        });

        // Перемикання вигляду
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.updatePositionsView();
            });
        });

        // Модальні вікна
        this.bindModalEvents();

        // Експорт
        document.getElementById('exportPositionsBtn')?.addEventListener('click', () => {
            this.exportPositions();
        });
    }

    bindModalEvents() {
        // Збереження посади
        document.getElementById('savePositionBtn')?.addEventListener('click', () => {
            this.savePosition();
        });

        // Скасування
        document.getElementById('cancelPositionBtn')?.addEventListener('click', () => {
            this.hidePositionModal();
        });

        // Редагування деталей
        document.getElementById('editPositionDetailsBtn')?.addEventListener('click', () => {
            this.hidePositionDetailsModal();
            this.showPositionModal(this.selectedPosition);
        });

        // Закриття деталей
        document.getElementById('closePositionDetailsBtn')?.addEventListener('click', () => {
            this.hidePositionDetailsModal();
        });

        // Закриття модальних вікон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
            });
        });
    }

    renderPositionsView() {
        if (this.positions.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-user-tie"></i>
                    <h3>Немає посад</h3>
                    <p>Створіть першу посаду для формування штатного розкладу</p>
                    <button class="btn btn-primary" onclick="document.getElementById('addPositionBtn').click()">
                        <i class="fas fa-plus"></i> Додати посаду
                    </button>
                </div>
            `;
        }

        if (this.currentView === 'cards') {
            return this.renderPositionsCards();
        }

        return this.renderPositionsList();
    }

    renderPositionsList() {
        return `
            <div class="positions-table-container">
                <table class="positions-table">
                    <thead>
                        <tr>
                            <th>Назва посади</th>
                            <th>Категорія</th>
                            <th>Підрозділ</th>
                            <th>Зарплата</th>
                            <th>Зайнято / Штат</th>
                            <th>Статус</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.getFilteredPositions().map(pos => this.renderPositionRow(pos)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderPositionsCards() {
        return `
            <div class="positions-cards">
                ${this.getFilteredPositions().map(pos => this.renderPositionCard(pos)).join('')}
            </div>
        `;
    }

    renderPositionRow(position) {
        const department = this.departments.find(d => d.id === position.departmentId);
        const employeesInPosition = this.employees.filter(emp => emp.positionId === position.id);
        const occupiedCount = employeesInPosition.length;

        return `
            <tr class="position-row" data-id="${position.id}">
                <td class="name-cell">
                    <div class="position-name">${position.title}</div>
                    <div class="position-code">${position.code || 'Без коду'}</div>
                </td>
                <td>
                    <span class="category-badge ${position.category}">
                        ${this.getCategoryText(position.category)}
                    </span>
                </td>
                <td>${department?.name || 'Не вказано'}</td>
                <td class="salary-cell">
                    ${position.salary ? this.formatSalary(position.salary) : 'Не встановлено'}
                </td>
                <td class="staffing-cell">
                    <div class="staffing-info">
                        <span class="current">${occupiedCount}</span>
                        <span class="separator">/</span>
                        <span class="total">${position.staffCount || 1}</span>
                    </div>
                    <div class="staffing-bar">
                        <div class="staffing-fill" style="width: ${Math.min((occupiedCount / (position.staffCount || 1)) * 100, 100)}%"></div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${position.isActive ? 'active' : 'inactive'}">
                        ${position.isActive ? 'Активна' : 'Неактивна'}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="positionsModule.showDetails(${position.id})" title="Деталі">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="positionsModule.editPosition(${position.id})" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="positionsModule.deletePosition(${position.id})" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    renderPositionCard(position) {
        const department = this.departments.find(d => d.id === position.departmentId);
        const employeesInPosition = this.employees.filter(emp => emp.positionId === position.id);
        const occupiedCount = employeesInPosition.length;

        return `
            <div class="position-card" data-id="${position.id}">
                <div class="card-header">
                    <div class="position-icon">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <span class="status-badge ${position.isActive ? 'active' : 'inactive'}">
                        ${position.isActive ? 'Активна' : 'Неактивна'}
                    </span>
                </div>
                <div class="card-content">
                    <h3 class="position-title">${position.title}</h3>
                    <p class="position-department">${department?.name || 'Не вказано'}</p>
                    <div class="position-details">
                        <div class="detail-item">
                            <span class="category-badge ${position.category}">
                                ${this.getCategoryText(position.category)}
                            </span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-money-bill-wave"></i>
                            ${position.salary ? this.formatSalary(position.salary) : 'Не встановлено'}
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            ${occupiedCount}/${position.staffCount || 1} осіб
                        </div>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-sm btn-primary" onclick="positionsModule.showDetails(${position.id})">
                        <i class="fas fa-eye"></i> Деталі
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="positionsModule.editPosition(${position.id})">
                        <i class="fas fa-edit"></i> Редагувати
                    </button>
                </div>
            </div>
        `;
    }

    renderPositionForm() {
        const position = this.selectedPosition || {};
        
        return `
            <form id="positionForm" class="position-form">
                <div class="form-tabs">
                    <button type="button" class="tab-btn active" data-tab="basic">Основна інформація</button>
                    <button type="button" class="tab-btn" data-tab="requirements">Вимоги</button>
                    <button type="button" class="tab-btn" data-tab="duties">Обов'язки</button>
                    <button type="button" class="tab-btn" data-tab="conditions">Умови</button>
                </div>

                <div class="tab-content active" id="basicTab">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Назва посади *</label>
                            <input type="text" name="title" value="${position.title || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Код посади</label>
                            <input type="text" name="code" value="${position.code || ''}" placeholder="Наприклад: POS-001">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Категорія</label>
                            <select name="category">
                                <option value="management" ${position.category === 'management' ? 'selected' : ''}>Керівництво</option>
                                <option value="specialists" ${position.category === 'specialists' ? 'selected' : ''}>Спеціалісти</option>
                                <option value="workers" ${position.category === 'workers' ? 'selected' : ''}>Робітники</option>
                                <option value="support" ${position.category === 'support' ? 'selected' : ''}>Обслуговуючий персонал</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Підрозділ</label>
                            <select name="departmentId">
                                <option value="">Не вказано</option>
                                ${this.departments.map(dept => 
                                    `<option value="${dept.id}" ${position.departmentId === dept.id ? 'selected' : ''}>${dept.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Кількість штатних одиниць</label>
                            <input type="number" name="staffCount" value="${position.staffCount || 1}" min="1">
                        </div>
                        <div class="form-group">
                            <label>Статус</label>
                            <select name="isActive">
                                <option value="true" ${position.isActive !== false ? 'selected' : ''}>Активна</option>
                                <option value="false" ${position.isActive === false ? 'selected' : ''}>Неактивна</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Короткий опис</label>
                        <textarea name="description" rows="3">${position.description || ''}</textarea>
                    </div>
                </div>

                <div class="tab-content" id="requirementsTab">
                    <div class="form-group">
                        <label>Освіта</label>
                        <select name="educationLevel">
                            <option value="">Не вказано</option>
                            <option value="secondary" ${position.requirements?.education === 'secondary' ? 'selected' : ''}>Середня</option>
                            <option value="vocational" ${position.requirements?.education === 'vocational' ? 'selected' : ''}>Професійно-технічна</option>
                            <option value="bachelor" ${position.requirements?.education === 'bachelor' ? 'selected' : ''}>Бакалавр</option>
                            <option value="master" ${position.requirements?.education === 'master' ? 'selected' : ''}>Магістр</option>
                            <option value="phd" ${position.requirements?.education === 'phd' ? 'selected' : ''}>Доктор наук</option>
                        </select>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Мінімальний досвід (років)</label>
                            <input type="number" name="experienceYears" value="${position.requirements?.experience || 0}" min="0">
                        </div>
                        <div class="form-group">
                            <label>Знання іноземних мов</label>
                            <select name="languageRequirement">
                                <option value="">Не вимагається</option>
                                <option value="basic" ${position.requirements?.languages === 'basic' ? 'selected' : ''}>Базове знання</option>
                                <option value="intermediate" ${position.requirements?.languages === 'intermediate' ? 'selected' : ''}>Середнє знання</option>
                                <option value="advanced" ${position.requirements?.languages === 'advanced' ? 'selected' : ''}>Вільне володіння</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Професійні навички</label>
                        <textarea name="skills" rows="4">${position.requirements?.skills || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label>Додаткові вимоги</label>
                        <textarea name="additionalRequirements" rows="3">${position.requirements?.additional || ''}</textarea>
                    </div>
                </div>

                <div class="tab-content" id="dutiesTab">
                    <div class="form-group">
                        <label>Основні обов'язки</label>
                        <textarea name="mainDuties" rows="6">${position.duties?.main || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label>Додаткові обов'язки</label>
                        <textarea name="additionalDuties" rows="4">${position.duties?.additional || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label>Відповідальність</label>
                        <textarea name="responsibilities" rows="4">${position.duties?.responsibilities || ''}</textarea>
                    </div>
                </div>

                <div class="tab-content" id="conditionsTab">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Тип зарплати</label>
                            <select name="salaryType">
                                <option value="monthly" ${position.salary?.type === 'monthly' ? 'selected' : ''}>Оклад</option>
                                <option value="hourly" ${position.salary?.type === 'hourly' ? 'selected' : ''}>Погодинна</option>
                                <option value="piecework" ${position.salary?.type === 'piecework' ? 'selected' : ''}>Відрядна</option>
                                <option value="commission" ${position.salary?.type === 'commission' ? 'selected' : ''}>Комісійна</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Розмір зарплати (UAH)</label>
                            <input type="number" name="salaryAmount" value="${position.salary?.amount || 0}" min="0">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Режим роботи</label>
                            <select name="workSchedule">
                                <option value="standard" ${position.workConditions?.schedule === 'standard' ? 'selected' : ''}>Стандартний (8 годин)</option>
                                <option value="flexible" ${position.workConditions?.schedule === 'flexible' ? 'selected' : ''}>Гнучкий</option>
                                <option value="shift" ${position.workConditions?.schedule === 'shift' ? 'selected' : ''}>Змінний</option>
                                <option value="remote" ${position.workConditions?.schedule === 'remote' ? 'selected' : ''}>Віддалена робота</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Тип зайнятості</label>
                            <select name="employmentType">
                                <option value="full" ${position.workConditions?.employment === 'full' ? 'selected' : ''}>Повна зайнятість</option>
                                <option value="part" ${position.workConditions?.employment === 'part' ? 'selected' : ''}>Часткова зайнятість</option>
                                <option value="contract" ${position.workConditions?.employment === 'contract' ? 'selected' : ''}>Договірна</option>
                                <option value="temporary" ${position.workConditions?.employment === 'temporary' ? 'selected' : ''}>Тимчасова</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Соціальний пакет</label>
                        <textarea name="benefits" rows="3">${position.workConditions?.benefits || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label>Умови праці</label>
                        <textarea name="workingConditions" rows="3">${position.workConditions?.conditions || ''}</textarea>
                    </div>
                </div>

                <div class="form-group">
                    <label>Примітки</label>
                    <textarea name="notes" rows="2">${position.notes || ''}</textarea>
                </div>
            </form>
        `;
    }

    // Допоміжні методи
    getFilteredPositions() {
        let filtered = [...this.positions];

        // Пошук
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(pos => 
                pos.title.toLowerCase().includes(query) ||
                (pos.code && pos.code.toLowerCase().includes(query)) ||
                (pos.description && pos.description.toLowerCase().includes(query))
            );
        }

        // Фільтр за категорією
        if (this.filterCategory !== 'all') {
            filtered = filtered.filter(pos => pos.category === this.filterCategory);
        }

        // Фільтр за підрозділом
        if (this.filterDepartment && this.filterDepartment !== 'all') {
            filtered = filtered.filter(pos => pos.departmentId == this.filterDepartment);
        }

        return filtered;
    }

    getCategoryText(category) {
        const categories = {
            management: 'Керівництво',
            specialists: 'Спеціалісти',
            workers: 'Робітники',
            support: 'Обслуговуючий персонал'
        };
        return categories[category] || category;
    }

    formatSalary(salary) {
        if (!salary || !salary.amount) return 'Не встановлено';
        
        const typeText = {
            monthly: 'грн/міс',
            hourly: 'грн/год',
            piecework: 'відрядна',
            commission: 'комісійна'
        };

        return `${salary.amount.toLocaleString('uk-UA')} ${typeText[salary.type] || 'грн'}`;
    }

    getOccupiedPositions() {
        return this.positions.filter(pos => {
            const employeesInPosition = this.employees.filter(emp => emp.positionId === pos.id);
            return employeesInPosition.length > 0;
        }).length;
    }

    getVacantPositions() {
        return this.positions.filter(pos => {
            const employeesInPosition = this.employees.filter(emp => emp.positionId === pos.id);
            return employeesInPosition.length < (pos.staffCount || 1);
        }).length;
    }

    getAverageSalary() {
        const positionsWithSalary = this.positions.filter(pos => pos.salary?.amount);
        if (positionsWithSalary.length === 0) return '0 грн';
        
        const totalSalary = positionsWithSalary.reduce((sum, pos) => sum + pos.salary.amount, 0);
        const avgSalary = totalSalary / positionsWithSalary.length;
        
        return `${Math.round(avgSalary).toLocaleString('uk-UA')} грн`;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('uk-UA');
    }

    // Дії з посадами
    async showPositionModal(position = null) {
        this.selectedPosition = position;
        const modal = document.getElementById('positionModal');
        const title = document.getElementById('modalTitle');
        
        title.innerHTML = position ? 
            '<i class="fas fa-edit"></i> Редагувати посаду' : 
            '<i class="fas fa-plus"></i> Додати посаду';

        // Перерендеримо форму з даними
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = this.renderPositionForm();

        // Налаштуємо табби
        this.setupFormTabs();

        hrSystem.showModal(modal);
    }

    hidePositionModal() {
        const modal = document.getElementById('positionModal');
        hrSystem.closeModal(modal);
        this.selectedPosition = null;
    }

    async savePosition() {
        const form = document.getElementById('positionForm');
        const formData = new FormData(form);
        
        try {
            const positionData = this.processFormData(formData);
            
            if (this.selectedPosition) {
                // Оновлення
                positionData.id = this.selectedPosition.id;
                positionData.updatedAt = new Date().toISOString();
                await this.database.update('positions', positionData);
                hrSystem.showNotification('Посаду оновлено', 'success');
            } else {
                // Додавання
                positionData.createdAt = new Date().toISOString();
                positionData.isActive = positionData.isActive !== false;
                await this.database.add('positions', positionData);
                hrSystem.showNotification('Посаду створено', 'success');
            }

            await this.loadData();
            this.updatePositionsView();
            this.hidePositionModal();

        } catch (error) {
            console.error('Помилка збереження посади:', error);
            hrSystem.showNotification('Помилка збереження: ' + error.message, 'error');
        }
    }

    processFormData(formData) {
        const data = {};
        
        // Основні поля
        data.title = formData.get('title');
        data.code = formData.get('code');
        data.category = formData.get('category');
        data.description = formData.get('description');
        data.departmentId = formData.get('departmentId') ? parseInt(formData.get('departmentId')) : null;
        data.staffCount = parseInt(formData.get('staffCount')) || 1;
        data.isActive = formData.get('isActive') === 'true';
        data.notes = formData.get('notes');
        
        // Вимоги
        data.requirements = {
            education: formData.get('educationLevel'),
            experience: parseInt(formData.get('experienceYears')) || 0,
            languages: formData.get('languageRequirement'),
            skills: formData.get('skills'),
            additional: formData.get('additionalRequirements')
        };
        
        // Обов'язки
        data.duties = {
            main: formData.get('mainDuties'),
            additional: formData.get('additionalDuties'),
            responsibilities: formData.get('responsibilities')
        };
        
        // Зарплата
        data.salary = {
            type: formData.get('salaryType') || 'monthly',
            amount: parseFloat(formData.get('salaryAmount')) || 0,
            currency: 'UAH'
        };
        
        // Умови роботи
        data.workConditions = {
            schedule: formData.get('workSchedule'),
            employment: formData.get('employmentType'),
            benefits: formData.get('benefits'),
            conditions: formData.get('workingConditions')
        };

        return data;
    }

    async editPosition(id) {
        const position = this.positions.find(p => p.id === id);
        if (position) {
            await this.showPositionModal(position);
        }
    }

    async deletePosition(id) {
        const position = this.positions.find(p => p.id === id);
        if (!position) return;

        // Перевіряємо чи є співробітники на цій посаді
        const hasEmployees = this.employees.some(emp => emp.positionId === id);
        if (hasEmployees) {
            hrSystem.showNotification('Неможливо видалити посаду, на якій є співробітники', 'warning');
            return;
        }

        if (confirm(`Ви впевнені, що хочете видалити посаду "${position.title}"?`)) {
            try {
                await this.database.delete('positions', id);
                await this.loadData();
                this.updatePositionsView();
                hrSystem.showNotification('Посаду видалено', 'success');
            } catch (error) {
                console.error('Помилка видалення посади:', error);
                hrSystem.showNotification('Помилка видалення: ' + error.message, 'error');
            }
        }
    }

    async showDetails(id) {
        const position = this.positions.find(p => p.id === id);
        if (!position) return;

        this.selectedPosition = position;
        const modal = document.getElementById('positionDetailsModal');
        const content = document.getElementById('positionDetails');
        
        const department = this.departments.find(d => d.id === position.departmentId);
        const employees = this.employees.filter(emp => emp.positionId === position.id);

        content.innerHTML = `
            <div class="position-details">
                <div class="details-header">
                    <div class="position-icon">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="position-info">
                        <h3>${position.title}</h3>
                        <p>${position.description || 'Опис відсутній'}</p>
                        <div class="position-badges">
                            <span class="status-badge ${position.isActive ? 'active' : 'inactive'}">
                                ${position.isActive ? 'Активна' : 'Неактивна'}
                            </span>
                            <span class="category-badge ${position.category}">
                                ${this.getCategoryText(position.category)}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="details-grid">
                    <div class="detail-section">
                        <h4><i class="fas fa-info-circle"></i> Загальна інформація</h4>
                        <div class="detail-item">
                            <label>Код:</label>
                            <span>${position.code || 'Не вказано'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Підрозділ:</label>
                            <span>${department?.name || 'Не вказано'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Штатних одиниць:</label>
                            <span>${position.staffCount || 1}</span>
                        </div>
                        <div class="detail-item">
                            <label>Зайнято:</label>
                            <span>${employees.length}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-money-bill-wave"></i> Зарплата та умови</h4>
                        <div class="detail-item">
                            <label>Розмір зарплати:</label>
                            <span>${position.salary ? this.formatSalary(position.salary) : 'Не встановлено'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Режим роботи:</label>
                            <span>${position.workConditions?.schedule || 'Не вказано'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Тип зайнятості:</label>
                            <span>${position.workConditions?.employment || 'Не вказано'}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-graduation-cap"></i> Вимоги</h4>
                        <div class="detail-item">
                            <label>Освіта:</label>
                            <span>${position.requirements?.education || 'Не вказано'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Досвід:</label>
                            <span>${position.requirements?.experience || 0} років</span>
                        </div>
                        <div class="detail-item">
                            <label>Іноземні мови:</label>
                            <span>${position.requirements?.languages || 'Не вимагаються'}</span>
                        </div>
                        ${position.requirements?.skills ? `
                            <div class="detail-item full-width">
                                <label>Навички:</label>
                                <span>${position.requirements.skills}</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="detail-section">
                        <h4><i class="fas fa-users"></i> Співробітники на посаді</h4>
                        <div class="employees-list">
                            ${employees.length > 0 ? 
                                employees.map(emp => `
                                    <div class="employee-item">
                                        <span class="employee-name">${emp.fullName}</span>
                                        <span class="employee-status">${emp.status}</span>
                                    </div>
                                `).join('') :
                                '<div class="no-employees">Немає співробітників</div>'
                            }
                        </div>
                    </div>
                </div>

                ${position.duties?.main ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-tasks"></i> Основні обов'язки</h4>
                        <p>${position.duties.main}</p>
                    </div>
                ` : ''}

                ${position.notes ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-sticky-note"></i> Примітки</h4>
                        <p>${position.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;

        hrSystem.showModal(modal);
    }

    hidePositionDetailsModal() {
        const modal = document.getElementById('positionDetailsModal');
        hrSystem.closeModal(modal);
        this.selectedPosition = null;
    }

    filterPositions() {
        this.updatePositionsView();
    }

    updatePositionsView() {
        const container = document.getElementById('positionsContainer');
        if (container) {
            container.innerHTML = this.renderPositionsView();
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

    hideModal(modal) {
        hrSystem.closeModal(modal);
    }

    async exportPositions() {
        try {
            const positions = this.getFilteredPositions();
            const exportData = positions.map(pos => {
                const dept = this.departments.find(d => d.id === pos.departmentId);
                const employeeCount = this.employees.filter(emp => emp.positionId === pos.id).length;
                
                return {
                    'Назва': pos.title,
                    'Код': pos.code || '',
                    'Категорія': this.getCategoryText(pos.category),
                    'Підрозділ': dept?.name || '',
                    'Зарплата': pos.salary ? this.formatSalary(pos.salary) : '',
                    'Штат': pos.staffCount || 1,
                    'Зайнято': employeeCount,
                    'Статус': pos.isActive ? 'Активна' : 'Неактивна',
                    'Дата створення': pos.createdAt ? this.formatDate(pos.createdAt) : ''
                };
            });

            // Експорт в JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Посади_${new Date().toISOString().split('T')[0]}.json`;
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
            statsItems[0].textContent = this.positions.length;
            statsItems[1].textContent = this.getOccupiedPositions();
            statsItems[2].textContent = this.getVacantPositions();
            statsItems[3].textContent = this.getAverageSalary();
        }
    }
}

// Глобальна змінна positionsModule оголошена в hr-system.js