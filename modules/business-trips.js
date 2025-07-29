/**
 * Business Trips Module - Модуль управління відрядженнями
 */

class BusinessTripsModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.businessTrips = [];
        this.employees = [];
        this.departments = [];
        this.filteredTrips = [];
        this.currentView = 'list'; // list, calendar
        this.searchQuery = '';
        this.filterStatus = 'all';
        this.selectedTrip = null;
        this.saving = false; // Прапор для запобігання повторним збереженням
    }

    async render() {
        await this.loadData();

        return `
            <div class="business-trips-module">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-plane"></i> Управління відрядженнями</h1>
                        <p>Планування та облік службових відряджень</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="addTripBtn">
                            <i class="fas fa-plus"></i> Нове відрядження
                        </button>
                        <button class="btn btn-secondary" id="exportTripsBtn">
                            <i class="fas fa-download"></i> Експорт
                        </button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="stats-bar">
                    <div class="stat-item">
                        <span class="stat-number">${this.businessTrips.filter(t => t.status === 'planned').length}</span>
                        <span class="stat-label">Заплановано</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.businessTrips.filter(t => t.status === 'in_progress').length}</span>
                        <span class="stat-label">В процесі</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.businessTrips.filter(t => t.status === 'completed').length}</span>
                        <span class="stat-label">Завершено</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this.getTotalBudget()}</span>
                        <span class="stat-label">Загальний бюджет (грн)</span>
                    </div>
                </div>

                <!-- Фільтри та пошук -->
                <div class="controls-panel">
                    <div class="search-controls">
                        <div class="search-box">
                            <input type="text" id="searchInput" placeholder="Пошук за назвою, співробітником, місцем...">
                            <i class="fas fa-search"></i>
                        </div>
                        <select id="statusFilter" class="filter-select">
                            <option value="all">Всі статуси</option>
                            <option value="planned">Заплановано</option>
                            <option value="approved">Затверджено</option>
                            <option value="in_progress">В процесі</option>
                            <option value="completed">Завершено</option>
                            <option value="cancelled">Скасовано</option>
                        </select>
                        <select id="employeeFilter" class="filter-select">
                            <option value="all">Всі співробітники</option>
                            ${this.employees.map(emp => 
                                `<option value="${emp.id}">${emp.fullName}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="view-controls">
                        <button class="view-btn active" data-view="list" title="Список">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="view-btn" data-view="calendar" title="Календар">
                            <i class="fas fa-calendar"></i>
                        </button>
                    </div>
                </div>

                <!-- Основний контент -->
                <div class="trips-content">
                    <div id="tripsContainer" class="trips-container">
                        ${this.renderTripsList()}
                    </div>
                </div>

                <!-- Модальне вікно відрядження -->
                <div id="tripModal" class="modal large">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 id="tripModalTitle">
                                <i class="fas fa-plane"></i> Нове відрядження
                            </h2>
                            <button class="modal-close" id="closeTripModal">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${this.renderTripForm()}
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="saveTripBtn">Зберегти</button>
                            <button class="btn btn-secondary" id="cancelTripBtn">Скасувати</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно деталей -->
                <div id="tripDetailsModal" class="modal large">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 id="detailsModalTitle">
                                <i class="fas fa-eye"></i> Деталі відрядження
                            </h2>
                            <button class="modal-close" id="closeDetailsModal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="tripDetailsContent">
                                <!-- Контент буде завантажено динамічно -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="editFromDetailsBtn">Редагувати</button>
                            <button class="btn btn-secondary" id="closeDetailsBtn">Закрити</button>
                        </div>
                    </div>
                </div>

            </div>
        `;
    }

    async init() {
        console.log('BusinessTripsModule init() викликано');
        this.bindEvents();
        
        // Додаткова перевірка після короткої затримки
        setTimeout(() => {
            const addBtn = document.getElementById('addTripBtn');
            console.log('Кнопка addTripBtn після init:', addBtn);
            if (addBtn && !addBtn.hasAttribute('data-event-bound')) {
                console.log('Повторне прив\'язування події для кнопки');
                addBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Кнопка натиснута (додаткове прив\'язування)');
                    this.showTripModal();
                });
                addBtn.setAttribute('data-event-bound', 'true');
            }
        }, 100);
    }

    async loadData() {
        try {
            this.businessTrips = await this.database.getAll('businessTrips');
            this.employees = await this.database.getAll('employees');
            this.departments = await this.database.getAll('departments');
            this.filteredTrips = [...this.businessTrips];
        } catch (error) {
            console.error('Помилка завантаження даних відряджень:', error);
        }
    }

    bindEvents() {
        console.log('bindEvents() викликано');
        
        // Пряме прив'язування до кнопки додавання
        const addTripBtn = document.getElementById('addTripBtn');
        console.log('Знайдена кнопка addTripBtn:', addTripBtn);
        
        if (addTripBtn && !addTripBtn.hasAttribute('data-event-bound')) {
            addTripBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Кнопка "Нове відрядження" натиснута');
                this.showTripModal();
            });
            addTripBtn.setAttribute('data-event-bound', 'true');
            console.log('Подія click додана до кнопки addTripBtn');
        } else if (!addTripBtn) {
            console.error('Кнопка addTripBtn не знайдена!');
        }

        // Пошук
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterTrips();
        });

        // Фільтри
        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filterStatus = e.target.value;
            this.filterTrips();
        });

        document.getElementById('employeeFilter')?.addEventListener('change', (e) => {
            this.filterEmployee = e.target.value;
            this.filterTrips();
        });

        // Перемикання вигляду
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.updateTripsView();
            });
        });

        // Модальні вікна
        this.bindModalEvents();

        // Експорт
        document.getElementById('exportTripsBtn')?.addEventListener('click', () => {
            this.exportTrips();
        });
    }

    bindModalEvents() {
        console.log('bindModalEvents() викликано');

        // Закриття модальних вікон
        document.getElementById('closeTripModal')?.addEventListener('click', () => {
            console.log('Закриття модального вікна');
            this.hideTripModal();
        });

        document.getElementById('closeDetailsModal')?.addEventListener('click', () => {
            console.log('Закриття деталей');
            this.hideDetailsModal();
        });

        // Редагування з деталей
        document.getElementById('editFromDetailsBtn')?.addEventListener('click', () => {
            console.log('Редагування з деталей');
            this.editFromDetails();
        });
    }

    bindFormEvents() {
        console.log('bindFormEvents() викликано');
        
        // Очищуємо попередні обробники подій для уникнення дублювання
        this.clearFormEventListeners();
        
        // Обробники для форми після її рендерингу
        const saveTripBtn = document.getElementById('saveTripBtn');
        const cancelTripBtn = document.getElementById('cancelTripBtn');
        
        console.log('saveTripBtn:', saveTripBtn);
        console.log('cancelTripBtn:', cancelTripBtn);
        
        if (saveTripBtn && !saveTripBtn.hasAttribute('data-event-bound')) {
            this.saveTripHandler = (e) => {
                e.preventDefault();
                console.log('Кнопка "Зберегти" натиснута');
                // Блокуємо повторні виклики
                if (this.saving) return;
                this.saving = true;
                this.saveTrip().finally(() => {
                    this.saving = false;
                });
            };
            
            saveTripBtn.addEventListener('click', this.saveTripHandler);
            saveTripBtn.setAttribute('data-event-bound', 'true');
            console.log('Подія click додана до кнопки saveTripBtn');
        } else if (!saveTripBtn) {
            console.error('Кнопка saveTripBtn не знайдена!');
        }
        
        if (cancelTripBtn && !cancelTripBtn.hasAttribute('data-event-bound')) {
            this.cancelTripHandler = (e) => {
                e.preventDefault();
                console.log('Кнопка "Скасувати" натиснута');
                this.hideTripModal();
            };
            
            cancelTripBtn.addEventListener('click', this.cancelTripHandler);
            cancelTripBtn.setAttribute('data-event-bound', 'true');
            console.log('Подія click додана до кнопки cancelTripBtn');
        } else if (!cancelTripBtn) {
            console.error('Кнопка cancelTripBtn не знайдена!');
        }
    }
    
    clearFormEventListeners() {
        const saveTripBtn = document.getElementById('saveTripBtn');
        const cancelTripBtn = document.getElementById('cancelTripBtn');
        
        if (saveTripBtn && this.saveTripHandler) {
            saveTripBtn.removeEventListener('click', this.saveTripHandler);
            saveTripBtn.removeAttribute('data-event-bound');
        }
        
        if (cancelTripBtn && this.cancelTripHandler) {
            cancelTripBtn.removeEventListener('click', this.cancelTripHandler);
            cancelTripBtn.removeAttribute('data-event-bound');
        }
    }

    renderTripForm(trip = null) {
        const isEdit = trip !== null;
        
        return `
            <form id="tripForm">
                <input type="hidden" id="tripId" value="${isEdit ? trip.id : ''}">
                
                <!-- Основна інформація -->
                <div class="form-section">
                    <h3><i class="fas fa-info-circle"></i> Основна інформація</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="tripTitle">Назва відрядження*</label>
                            <input type="text" id="tripTitle" name="title" required 
                                   value="${isEdit ? trip.title : ''}" 
                                   placeholder="Наприклад: Навчання в Києві">
                        </div>
                        <div class="form-group">
                            <label for="employeeId">Співробітник*</label>
                            <select id="employeeId" name="employeeId" required>
                                <option value="">Виберіть співробітника</option>
                                ${this.employees.map(emp => 
                                    `<option value="${emp.id}" ${isEdit && trip.employeeId === emp.id ? 'selected' : ''}>${emp.fullName}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="purpose">Мета відрядження*</label>
                            <textarea id="purpose" name="purpose" rows="2" required 
                                      placeholder="Опишіть мету та завдання відрядження">${isEdit ? trip.purpose : ''}</textarea>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="destination">Місце призначення*</label>
                            <input type="text" id="destination" name="destination" required 
                                   value="${isEdit ? trip.destination : ''}" 
                                   placeholder="Місто, організація">
                        </div>
                        <div class="form-group">
                            <label for="status">Статус</label>
                            <select id="status" name="status">
                                <option value="planned" ${isEdit && trip.status === 'planned' ? 'selected' : ''}>Заплановано</option>
                                <option value="approved" ${isEdit && trip.status === 'approved' ? 'selected' : ''}>Затверджено</option>
                                <option value="in_progress" ${isEdit && trip.status === 'in_progress' ? 'selected' : ''}>В процесі</option>
                                <option value="completed" ${isEdit && trip.status === 'completed' ? 'selected' : ''}>Завершено</option>
                                <option value="cancelled" ${isEdit && trip.status === 'cancelled' ? 'selected' : ''}>Скасовано</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Дати -->
                <div class="form-section">
                    <h3><i class="fas fa-calendar"></i> Дати</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="startDate">Дата початку*</label>
                            <input type="date" id="startDate" name="startDate" required 
                                   value="${isEdit && trip.startDate ? trip.startDate.split('T')[0] : ''}">
                        </div>
                        <div class="form-group">
                            <label for="endDate">Дата закінчення*</label>
                            <input type="date" id="endDate" name="endDate" required 
                                   value="${isEdit && trip.endDate ? trip.endDate.split('T')[0] : ''}">
                        </div>
                    </div>
                </div>

                <!-- Фінанси -->
                <div class="form-section">
                    <h3><i class="fas fa-money-bill-wave"></i> Фінанси</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="budget">Бюджет (грн)</label>
                            <input type="number" id="budget" name="budget" min="0" step="0.01" 
                                   value="${isEdit ? trip.budget : ''}" 
                                   placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label for="advancePayment">Аванс (грн)</label>
                            <input type="number" id="advancePayment" name="advancePayment" min="0" step="0.01" 
                                   value="${isEdit ? trip.advancePayment : ''}" 
                                   placeholder="0.00">
                        </div>
                    </div>
                </div>

                <!-- Документи -->
                <div class="form-section">
                    <h3><i class="fas fa-file-alt"></i> Документи</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="orderNumber">Номер наказу</label>
                            <input type="text" id="orderNumber" name="orderNumber" 
                                   value="${isEdit ? trip.orderNumber : ''}" 
                                   placeholder="№123/2024">
                        </div>
                        <div class="form-group">
                            <label for="orderDate">Дата наказу</label>
                            <input type="date" id="orderDate" name="orderDate" 
                                   value="${isEdit && trip.orderDate ? trip.orderDate.split('T')[0] : ''}">
                        </div>
                    </div>
                </div>

                <!-- Примітки -->
                <div class="form-section">
                    <h3><i class="fas fa-sticky-note"></i> Додаткова інформація</h3>
                    <div class="form-group full-width">
                        <label for="notes">Примітки</label>
                        <textarea id="notes" name="notes" rows="3" 
                                  placeholder="Додаткова інформація про відрядження">${isEdit ? trip.notes : ''}</textarea>
                    </div>
                </div>
            </form>
        `;
    }

    renderTripsList() {
        if (this.filteredTrips.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-plane"></i>
                    <h3>Немає відряджень</h3>
                    <p>Додайте перше відрядження, натиснувши кнопку "Нове відрядження"</p>
                </div>
            `;
        }

        return `
            <div class="trips-table-container">
                <table class="trips-table">
                    <thead>
                        <tr>
                            <th>Назва</th>  
                            <th>Співробітник</th>
                            <th>Призначення</th>
                            <th>Дати</th>
                            <th>Статус</th>
                            <th>Бюджет</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredTrips.map(trip => this.renderTripRow(trip)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderTripRow(trip) {
        const employee = this.employees.find(emp => emp.id === trip.employeeId);
        const statusClass = trip.status.replace('_', '-');
        const startDate = trip.startDate ? new Date(trip.startDate).toLocaleDateString('uk-UA') : '-';
        const endDate = trip.endDate ? new Date(trip.endDate).toLocaleDateString('uk-UA') : '-';

        return `
            <tr>
                <td>
                    <div class="trip-title">
                        <strong>${trip.title}</strong>
                        <small>${trip.purpose.substring(0, 50)}${trip.purpose.length > 50 ? '...' : ''}</small>
                    </div>
                </td>
                <td>${employee ? employee.fullName : 'Невідомий співробітник'}</td>
                <td>${trip.destination}</td>
                <td>
                    <div class="trip-dates">
                        <div>${startDate} - ${endDate}</div>
                        <small>${trip.duration} днів</small>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${this.getStatusText(trip.status)}</span>
                </td>
                <td>${trip.budget ? trip.budget.toLocaleString('uk-UA') + ' грн' : '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="businessTripsModule.viewTrip(${trip.id})" title="Переглянути">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="businessTripsModule.editTrip(${trip.id})" title="Редагувати">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger" onclick="businessTripsModule.deleteTrip(${trip.id})" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    async saveTrip() {
        try {
            const formData = new FormData(document.getElementById('tripForm'));
            const tripId = document.getElementById('tripId').value;
            
            const tripData = {
                title: formData.get('title'),
                employeeId: parseInt(formData.get('employeeId')),
                purpose: formData.get('purpose'),
                destination: formData.get('destination'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                status: formData.get('status'),
                budget: parseFloat(formData.get('budget')) || 0,
                advancePayment: parseFloat(formData.get('advancePayment')) || 0,
                orderNumber: formData.get('orderNumber'),
                orderDate: formData.get('orderDate') || null,
                notes: formData.get('notes'),
                updatedAt: new Date().toISOString()
            };

            // Розрахунок тривалості
            if (tripData.startDate && tripData.endDate) {
                const start = new Date(tripData.startDate);
                const end = new Date(tripData.endDate);
                tripData.duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            }

            let savedTripId;
            if (tripId) {
                // Редагування
                tripData.id = parseInt(tripId);
                savedTripId = await this.database.update('businessTrips', tripData);
            } else {
                // Створення
                tripData.createdAt = new Date().toISOString();
                savedTripId = await this.database.add('businessTrips', tripData);
                tripData.id = savedTripId; // Додаємо ID до об'єкта
            }

            await this.loadData();
            this.filterTrips();
            this.hideTripModal();
            
            // Оновлюємо табель робочого часу
            await this.updateTimesheetForTrip(tripData);
            
            this.showNotification(
                tripId ? 'Відрядження оновлено' : 'Відрядження створено', 
                'success'
            );

        } catch (error) {
            console.error('Помилка збереження відрядження:', error);
            this.showNotification('Помилка збереження: ' + error.message, 'error');
        }
    }

    filterTrips() {
        this.filteredTrips = this.businessTrips.filter(trip => {
            // Пошук за текстом
            if (this.searchQuery) {
                const searchText = `${trip.title} ${trip.destination} ${trip.purpose}`.toLowerCase();
                const employee = this.employees.find(emp => emp.id === trip.employeeId);
                const employeeName = employee ? employee.fullName.toLowerCase() : '';
                
                if (!searchText.includes(this.searchQuery.toLowerCase()) && 
                    !employeeName.includes(this.searchQuery.toLowerCase())) {
                    return false;
                }
            }

            // Фільтр за статусом
            if (this.filterStatus !== 'all' && trip.status !== this.filterStatus) {
                return false;
            }

            // Фільтр за співробітником
            if (this.filterEmployee !== 'all' && trip.employeeId !== parseInt(this.filterEmployee)) {
                return false;
            }

            return true;
        });

        this.updateTripsView();
    }

    updateTripsView() {
        const container = document.getElementById('tripsContainer');
        if (container) {
            container.innerHTML = this.renderTripsList();
        }
    }

    showTripModal(trip = null) {
        console.log('showTripModal викликано', trip); // Діагностика
        
        const modal = document.getElementById('tripModal');
        if (!modal) {
            console.error('Модальне вікно tripModal не знайдено!');
            return;
        }
        
        const modalBody = modal.querySelector('.modal-body');
        const modalTitle = modal.querySelector('#tripModalTitle');
        
        if (modalTitle) {
            modalTitle.innerHTML = trip ? 
                '<i class="fas fa-edit"></i> Редагування відрядження' : 
                '<i class="fas fa-plane"></i> Нове відрядження';
        }
        
        if (modalBody) {
            modalBody.innerHTML = this.renderTripForm(trip);
        }
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Прив'язуємо події для елементів форми
        setTimeout(() => {
            this.bindFormEvents();
        }, 50);
        
        console.log('Модальне вікно відкрито та події прив\'язані');
    }

    hideTripModal() {
        const modal = document.getElementById('tripModal');
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    hideDetailsModal() {
        const modal = document.getElementById('tripDetailsModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    editTrip(tripId) {
        const trip = this.businessTrips.find(t => t.id === tripId);
        if (trip) {
            this.showTripModal(trip);
        }
    }

    viewTrip(tripId) {
        const trip = this.businessTrips.find(t => t.id === tripId);
        if (trip) {
            // TODO: Реалізувати перегляд деталей
            this.showNotification('Функція перегляду деталей буде реалізована', 'info');
        }
    }

    editFromDetails() {
        // TODO: Реалізувати редагування з модального вікна деталей
        this.hideDetailsModal();
        this.showNotification('Функція редагування з деталей буде реалізована', 'info');
    }

    async deleteTrip(tripId) {
        if (!confirm('Видалити це відрядження? Дію неможливо відмінити.')) {
            return;
        }

        try {
            await this.database.delete('businessTrips', tripId);
            await this.loadData();
            this.filterTrips();
            this.showNotification('Відрядження видалено', 'success');
        } catch (error) {
            console.error('Помилка видалення відрядження:', error);
            this.showNotification('Помилка видалення: ' + error.message, 'error');
        }
    }

    getTotalBudget() {
        return this.businessTrips
            .reduce((total, trip) => total + (trip.budget || 0), 0)
            .toLocaleString('uk-UA');
    }

    getStatusText(status) {
        const statusTexts = {
            'planned': 'Заплановано',
            'approved': 'Затверджено', 
            'in_progress': 'В процесі',
            'completed': 'Завершено',
            'cancelled': 'Скасовано'
        };
        return statusTexts[status] || status;
    }

    exportTrips() {
        // TODO: Реалізувати експорт в Excel
        this.showNotification('Функція експорту буде реалізована', 'info');
    }

    /**
     * Оновлює табель робочого часу після збереження відрядження
     */
    async updateTimesheetForTrip(trip) {
        try {
            const startDate = new Date(trip.startDate);
            const endDate = new Date(trip.endDate);
            
            // Отримуємо всі місяці, які торкається відрядження
            const months = [];
            let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
            
            while (currentDate <= lastMonth) {
                months.push({
                    year: currentDate.getFullYear(),
                    month: currentDate.getMonth() + 1,
                    monthKey: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
                });
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
            
            // Оновлюємо табель для кожного місяця
            for (const monthInfo of months) {
                await this.updateTimesheetMonth(trip, monthInfo);
            }
            
        } catch (error) {
            console.error('Помилка оновлення табеля:', error);
        }
    }
    
    /**
     * Оновлює табель для конкретного місяця
     */
    async updateTimesheetMonth(trip, monthInfo) {
        try {
            // Знаходимо або створюємо запис табеля
            const timesheetRecords = await this.database.getAll('timesheet');
            let record = timesheetRecords.find(r => 
                r.employeeId === trip.employeeId && r.monthYear === monthInfo.monthKey
            );
            
            if (!record) {
                // Створюємо новий запис табеля
                record = {
                    employeeId: trip.employeeId,
                    monthYear: monthInfo.monthKey,
                    days: this.generateDefaultDays(monthInfo.year, monthInfo.month),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                const savedRecord = await this.database.add('timesheet', record);
                record.id = savedRecord;
            } else {
                // Ініціалізуємо days якщо потрібно
                if (!record.days) {
                    record.days = this.generateDefaultDays(monthInfo.year, monthInfo.month);
                }
            }
            
            // Застосовуємо відрядження до днів місяця
            this.applyTripToMonth(record.days, trip, monthInfo.year, monthInfo.month);
            
            // Зберігаємо оновлений запис
            record.updatedAt = new Date().toISOString();
            await this.database.update('timesheet', record);
            
        } catch (error) {
            console.error('Помилка оновлення місяця табеля:', error);
        }
    }
    
    /**
     * Застосовує відрядження до днів місяця
     */
    applyTripToMonth(days, trip, year, month) {
        if (trip.status !== 'approved' && trip.status !== 'in_progress' && trip.status !== 'completed') return;
        
        const startDate = new Date(trip.startDate);
        const endDate = new Date(trip.endDate);
        
        // Визначаємо діапазон днів у поточному місяці
        const firstDay = Math.max(1, startDate.getMonth() === month - 1 && startDate.getFullYear() === year ? startDate.getDate() : 1);
        const lastDay = Math.min(new Date(year, month, 0).getDate(), 
            endDate.getMonth() === month - 1 && endDate.getFullYear() === year ? endDate.getDate() : new Date(year, month, 0).getDate());
        
        // Позначаємо дні відрядження
        for (let day = firstDay; day <= lastDay; day++) {
            days[day] = {
                code: 'ВК',
                hours: 8
            };
        }
    }
    
    /**
     * Генерує базові дні для табеля (спрощена версія)
     */
    generateDefaultDays(year, month) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = {};
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            days[day] = {
                code: isWeekend ? '' : 'Р',
                hours: isWeekend ? 0 : 8
            };
        }
        
        return days;
    }

    showNotification(message, type) {
        if (window.hrSystem) {
            window.hrSystem.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Глобальний екземпляр для доступу з HTML
window.businessTripsModule = null;

// Експорт для глобального доступу
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BusinessTripsModule;
}