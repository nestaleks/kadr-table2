/**
 * Production Calendar Module - Модуль виробничого календаря
 * Управління святами, вихідними та робочими днями
 */

class ProductionCalendarModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.calendar = [];
        this.holidays = [];
        this.workingDayAdjustments = [];
        this.currentYear = new Date().getFullYear();
        this.selectedDate = null;
        this.viewMode = 'year'; // year, month
        this.isInitialized = false;
    }

    async render() {
        await this.loadData();

        return `
            <div class="production-calendar-module">
                <div class="page-header">
                    <div class="header-left">
                        <h1><i class="fas fa-calendar-day"></i> Виробничий календар</h1>
                        <p>Управління робочими днями, святами та вихідними</p>
                    </div>
                    <div class="header-actions">
                        <div class="year-selector">
                            <button class="btn btn-secondary" id="prevYearBtn">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <span class="current-year">${this.currentYear}</span>
                            <button class="btn btn-secondary" id="nextYearBtn">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        <button class="btn btn-primary" id="addHolidayBtn">
                            <i class="fas fa-plus"></i> Додати свято
                        </button>
                        <button class="btn btn-secondary" id="exportCalendarBtn">
                            <i class="fas fa-download"></i> Експорт
                        </button>
                        <button class="btn btn-secondary" id="resetCalendarBtn">
                            <i class="fas fa-refresh"></i> Скинути
                        </button>
                    </div>
                </div>

                <!-- Статистика року -->
                <div class="calendar-stats">
                    <div class="stat-item working">
                        <span class="stat-number">${this.getWorkingDaysCount()}</span>
                        <span class="stat-label">Робочих днів</span>
                    </div>
                    <div class="stat-item weekend">
                        <span class="stat-number">${this.getWeekendDaysCount()}</span>
                        <span class="stat-label">Вихідних</span>
                    </div>
                    <div class="stat-item holiday">
                        <span class="stat-number">${this.getHolidaysCount()}</span>
                        <span class="stat-label">Святкових</span>
                    </div>
                    <div class="stat-item shortened">
                        <span class="stat-number">${this.getShortenedDaysCount()}</span>
                        <span class="stat-label">Скорочених</span>
                    </div>
                </div>

                <!-- Легенда -->
                <div class="calendar-legend">
                    <div class="legend-item">
                        <span class="legend-color working"></span>
                        <span>Робочий день</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color weekend"></span>
                        <span>Вихідний</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color holiday"></span>
                        <span>Святковий день</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color shortened"></span>
                        <span>Скорочений день</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color transferred"></span>
                        <span>Перенесений вихідний</span>
                    </div>
                </div>

                <!-- Календарна сітка -->
                <div class="production-calendar-grid">
                    ${this.renderCalendarGrid()}
                </div>

                <!-- Список свят -->
                <div class="holidays-section">
                    <h3>Державні свята ${this.currentYear} року</h3>
                    <div class="holidays-list">
                        ${this.renderHolidaysList()}
                    </div>
                </div>

                <!-- Модальне вікно додавання/редагування свята -->
                <div id="holidayModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 id="holidayModalTitle">
                                <i class="fas fa-plus"></i> Додати свято
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${this.renderHolidayForm()}
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="saveHolidayBtn">Зберегти</button>
                            <button class="btn btn-secondary" id="cancelHolidayBtn">Скасувати</button>
                        </div>
                    </div>
                </div>

                <!-- Модальне вікно налаштування дня -->
                <div id="daySettingsModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 id="daySettingsTitle">
                                <i class="fas fa-cog"></i> Налаштування дня
                            </h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="daySettingsContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="saveDaySettingsBtn">Зберегти</button>
                            <button class="btn btn-secondary" id="cancelDaySettingsBtn">Скасувати</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        await this.initializeDefaultCalendar();
        this.bindEvents();
        this.isInitialized = true;
    }

    async loadData() {
        try {
            this.calendar = await this.database.getAll('productionCalendar') || [];
            this.holidays = await this.database.getAll('holidays') || [];
            this.workingDayAdjustments = await this.database.getAll('workingDayAdjustments') || [];
        } catch (error) {
            console.error('Помилка завантаження даних календаря:', error);
            hrSystem.showNotification('Помилка завантаження даних: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Навігація по роках
        document.getElementById('prevYearBtn')?.addEventListener('click', () => {
            this.changeYear(-1);
        });

        document.getElementById('nextYearBtn')?.addEventListener('click', () => {
            this.changeYear(1);
        });

        // Додавання свята
        document.getElementById('addHolidayBtn')?.addEventListener('click', () => {
            this.showHolidayModal();
        });

        // Експорт календаря
        document.getElementById('exportCalendarBtn')?.addEventListener('click', () => {
            this.exportCalendar();
        });

        // Скидання календаря
        document.getElementById('resetCalendarBtn')?.addEventListener('click', () => {
            this.resetToDefaultCalendar();
        });

        // Кліки по дням календаря
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('calendar-day')) {
                const dateStr = e.target.dataset.date;
                if (dateStr) {
                    this.showDaySettings(dateStr);
                }
            }
        });

        // Модальні вікна
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Збереження свята
        document.getElementById('saveHolidayBtn')?.addEventListener('click', () => {
            this.saveHoliday();
        });

        document.getElementById('cancelHolidayBtn')?.addEventListener('click', () => {
            this.hideHolidayModal();
        });

        // Налаштування дня
        document.getElementById('saveDaySettingsBtn')?.addEventListener('click', () => {
            this.saveDaySettings();
        });

        document.getElementById('cancelDaySettingsBtn')?.addEventListener('click', () => {
            this.hideDaySettingsModal();
        });

        // Закриття модальних вікон
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
            });
        });
    }

    renderCalendarGrid() {
        const months = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];

        return `
            <div class="calendar-year-grid">
                ${months.map((month, index) => `
                    <div class="calendar-month">
                        <div class="month-header">
                            <h4>${month} ${this.currentYear}</h4>
                            <div class="month-stats">
                                <span class="working-days">${this.getMonthWorkingDays(index)}</span>
                                <span class="total-days">/${this.getDaysInMonth(this.currentYear, index)}</span>
                            </div>
                        </div>
                        <div class="month-calendar">
                            ${this.renderMonthGrid(index)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderMonthGrid(monthIndex) {
        const daysInMonth = this.getDaysInMonth(this.currentYear, monthIndex);
        const firstDay = new Date(this.currentYear, monthIndex, 1).getDay();
        const startDay = firstDay === 0 ? 7 : firstDay; // Понеділок = 1

        let grid = '';
        
        // Заголовки днів тижня
        const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
        grid += `<div class="weekdays">${dayNames.map(day => `<div class="weekday">${day}</div>`).join('')}</div>`;
        
        // Дні місяця
        grid += '<div class="month-days">';
        
        // Пусті клітинки для початку місяця
        for (let i = 1; i < startDay; i++) {
            grid += '<div class="calendar-day empty"></div>';
        }
        
        // Дні місяця
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, monthIndex, day);
            const dateStr = this.formatDateKey(date);
            const dayInfo = this.getDayInfo(date);
            
            grid += `
                <div class="calendar-day ${dayInfo.type} ${dayInfo.isToday ? 'today' : ''}" 
                     data-date="${dateStr}" 
                     title="${dayInfo.title}">
                    <span class="day-number">${day}</span>
                    ${dayInfo.hasHoliday ? `<span class="holiday-indicator"></span>` : ''}
                </div>
            `;
        }
        
        grid += '</div>';
        return grid;
    }

    renderHolidaysList() {
        const currentYearHolidays = this.holidays.filter(h => 
            new Date(h.date).getFullYear() === this.currentYear
        );

        if (currentYearHolidays.length === 0) {
            return `
                <div class="empty-holidays">
                    <i class="fas fa-calendar-times"></i>
                    <p>Немає святкових днів для ${this.currentYear} року</p>
                </div>
            `;
        }

        return currentYearHolidays
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(holiday => `
                <div class="holiday-item ${holiday.type}">
                    <div class="holiday-date">
                        <span class="day">${new Date(holiday.date).getDate()}</span>
                        <span class="month">${this.getMonthName(new Date(holiday.date).getMonth())}</span>
                    </div>
                    <div class="holiday-info">
                        <h4>${holiday.name}</h4>
                        <p>${this.getHolidayTypeText(holiday.type)}</p>
                        ${holiday.description ? `<small>${holiday.description}</small>` : ''}
                    </div>
                    <div class="holiday-actions">
                        ${holiday.isRecurring ? '<i class="fas fa-repeat" title="Щорічне свято"></i>' : ''}
                        <button class="btn-icon" onclick="productionCalendarModule.editHoliday(${holiday.id})" title="Редагувати">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger" onclick="productionCalendarModule.deleteHoliday(${holiday.id})" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
    }

    renderHolidayForm() {
        const holiday = this.selectedHoliday || {};
        
        return `
            <form id="holidayForm" class="holiday-form">
                <div class="form-group">
                    <label>Назва свята *</label>
                    <input type="text" name="name" value="${holiday.name || ''}" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Дата *</label>
                        <input type="date" name="date" value="${holiday.date || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Тип свята</label>
                        <select name="type">
                            <option value="national" ${holiday.type === 'national' ? 'selected' : ''}>Державне свято</option>
                            <option value="religious" ${holiday.type === 'religious' ? 'selected' : ''}>Релігійне свято</option>
                            <option value="professional" ${holiday.type === 'professional' ? 'selected' : ''}>Професійне свято</option>
                            <option value="memorial" ${holiday.type === 'memorial' ? 'selected' : ''}>День пам'яті</option>
                            <option value="company" ${holiday.type === 'company' ? 'selected' : ''}>Корпоративне свято</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="isRecurring" ${holiday.isRecurring ? 'checked' : ''}>
                            Щорічне свято
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="isWorkingDay" ${holiday.isWorkingDay ? 'checked' : ''}>
                            Робочий день (якщо свято випадає на вихідний)
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label>Опис</label>
                    <textarea name="description" rows="3">${holiday.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Скорочений попередній день</label>
                    <select name="shortenPreviousDay">
                        <option value="none" ${holiday.shortenPreviousDay === 'none' ? 'selected' : ''}>Ні</option>
                        <option value="1hour" ${holiday.shortenPreviousDay === '1hour' ? 'selected' : ''}>На 1 годину</option>
                        <option value="2hours" ${holiday.shortenPreviousDay === '2hours' ? 'selected' : ''}>На 2 години</option>
                    </select>
                </div>
            </form>
        `;
    }

    // Основні методи роботи з календарем
    getDayInfo(date) {
        const dateKey = this.formatDateKey(date);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Неділя або субота
        const isToday = this.isToday(date);
        
        // Перевіряємо чи є це свято
        const holiday = this.holidays.find(h => 
            this.formatDateKey(new Date(h.date)) === dateKey
        );
        
        // Перевіряємо налаштування робочого дня
        const adjustment = this.workingDayAdjustments.find(a => 
            this.formatDateKey(new Date(a.date)) === dateKey
        );
        
        let type = 'working';
        let title = this.formatDate(date);
        
        if (holiday) {
            type = 'holiday';
            title += ` - ${holiday.name}`;
            if (holiday.isWorkingDay && isWeekend) {
                type = 'working transferred';
                title += ' (робочий день)';
            }
        } else if (adjustment) {
            type = adjustment.type;
            title += ` - ${adjustment.description || ''}`;
        } else if (isWeekend) {
            type = 'weekend';
            title += ' - вихідний';
        }
        
        // Перевіряємо скорочені дні
        if (this.isShortenedDay(date)) {
            type += ' shortened';
            title += ' (скорочений)';
        }
        
        return {
            type,
            title,
            isToday,
            hasHoliday: !!holiday,
            holiday,
            adjustment
        };
    }

    isShortenedDay(date) {
        // Перевіряємо чи день перед святом є скороченим
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const nextDayHoliday = this.holidays.find(h => 
            this.formatDateKey(new Date(h.date)) === this.formatDateKey(nextDay)
        );
        
        return nextDayHoliday && nextDayHoliday.shortenPreviousDay && 
               nextDayHoliday.shortenPreviousDay !== 'none';
    }

    // Статистичні методи
    getWorkingDaysCount() {
        let count = 0;
        const startDate = new Date(this.currentYear, 0, 1);
        const endDate = new Date(this.currentYear, 11, 31);
        
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dayInfo = this.getDayInfo(date);
            if (dayInfo.type.includes('working')) {
                count++;
            }
        }
        
        return count;
    }

    getWeekendDaysCount() {
        let count = 0;
        const startDate = new Date(this.currentYear, 0, 1);
        const endDate = new Date(this.currentYear, 11, 31);
        
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dayInfo = this.getDayInfo(date);
            if (dayInfo.type === 'weekend') {
                count++;
            }
        }
        
        return count;
    }

    getHolidaysCount() {
        return this.holidays.filter(h => 
            new Date(h.date).getFullYear() === this.currentYear
        ).length;
    }

    getShortenedDaysCount() {
        let count = 0;
        const startDate = new Date(this.currentYear, 0, 1);
        const endDate = new Date(this.currentYear, 11, 31);
        
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            if (this.isShortenedDay(date)) {
                count++;
            }
        }
        
        return count;
    }

    getMonthWorkingDays(monthIndex) {
        let count = 0;
        const daysInMonth = this.getDaysInMonth(this.currentYear, monthIndex);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, monthIndex, day);
            const dayInfo = this.getDayInfo(date);
            if (dayInfo.type.includes('working')) {
                count++;
            }
        }
        
        return count;
    }

    // API методи для інших модулів
    isWorkingDay(date) {
        const dayInfo = this.getDayInfo(date);
        return dayInfo.type.includes('working');
    }

    isHoliday(date) {
        const dayInfo = this.getDayInfo(date);
        return dayInfo.type === 'holiday';
    }

    isWeekend(date) {
        const dayInfo = this.getDayInfo(date);
        return dayInfo.type === 'weekend';
    }

    getWorkingDaysInPeriod(startDate, endDate) {
        let count = 0;
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            if (this.isWorkingDay(date)) {
                count++;
            }
        }
        return count;
    }

    getWorkingHoursForDay(date) {
        const dayInfo = this.getDayInfo(date);
        
        if (!dayInfo.type.includes('working')) {
            return 0;
        }
        
        if (dayInfo.type.includes('shortened')) {
            // Стандартний робочий день 8 годин мінус скорочення
            const holiday = this.holidays.find(h => {
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);
                return this.formatDateKey(new Date(h.date)) === this.formatDateKey(nextDay);
            });
            
            if (holiday) {
                switch (holiday.shortenPreviousDay) {
                    case '1hour': return 7;
                    case '2hours': return 6;
                    default: return 8;
                }
            }
        }
        
        return 8; // Стандартний робочий день
    }

    // Допоміжні методи
    formatDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    formatDate(date) {
        return date.toLocaleDateString('uk-UA');
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    getMonthName(monthIndex) {
        const months = [
            'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
            'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
        ];
        return months[monthIndex];
    }

    getHolidayTypeText(type) {
        const types = {
            national: 'Державне свято',
            religious: 'Релігійне свято',
            professional: 'Професійне свято',
            memorial: 'День пам\'яті',
            company: 'Корпоративне свято'
        };
        return types[type] || type;
    }

    // Дії з календарем
    async changeYear(delta) {
        this.currentYear += delta;
        document.querySelector('.current-year').textContent = this.currentYear;
        await this.loadData();
        this.updateCalendarView();
    }

    updateCalendarView() {
        const container = document.querySelector('.production-calendar-grid');
        if (container) {
            container.innerHTML = this.renderCalendarGrid();
        }
        
        const stats = document.querySelector('.calendar-stats');
        if (stats) {
            stats.querySelector('.working .stat-number').textContent = this.getWorkingDaysCount();
            stats.querySelector('.weekend .stat-number').textContent = this.getWeekendDaysCount();
            stats.querySelector('.holiday .stat-number').textContent = this.getHolidaysCount();
            stats.querySelector('.shortened .stat-number').textContent = this.getShortenedDaysCount();
        }
        
        const holidaysList = document.querySelector('.holidays-list');
        if (holidaysList) {
            holidaysList.innerHTML = this.renderHolidaysList();
        }
    }

    showHolidayModal(holiday = null) {
        this.selectedHoliday = holiday;
        const modal = document.getElementById('holidayModal');
        const title = document.getElementById('holidayModalTitle');
        
        title.innerHTML = holiday ? 
            '<i class="fas fa-edit"></i> Редагувати свято' : 
            '<i class="fas fa-plus"></i> Додати свято';
            
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = this.renderHolidayForm();
        
        hrSystem.showModal(modal);
    }

    hideHolidayModal() {
        const modal = document.getElementById('holidayModal');
        hrSystem.closeModal(modal);
        this.selectedHoliday = null;
    }

    async saveHoliday() {
        const form = document.getElementById('holidayForm');
        const formData = new FormData(form);
        
        try {
            const holidayData = {
                name: formData.get('name'),
                date: formData.get('date'),
                type: formData.get('type'),
                isRecurring: formData.get('isRecurring') === 'on',
                isWorkingDay: formData.get('isWorkingDay') === 'on',
                description: formData.get('description'),
                shortenPreviousDay: formData.get('shortenPreviousDay')
            };
            
            if (this.selectedHoliday) {
                holidayData.id = this.selectedHoliday.id;
                holidayData.updatedAt = new Date().toISOString();
                await this.database.update('holidays', holidayData);
                hrSystem.showNotification('Свято оновлено', 'success');
            } else {
                holidayData.createdAt = new Date().toISOString();
                await this.database.add('holidays', holidayData);
                hrSystem.showNotification('Свято додано', 'success');
            }
            
            await this.loadData();
            this.updateCalendarView();
            this.hideHolidayModal();
            
        } catch (error) {
            console.error('Помилка збереження свята:', error);
            hrSystem.showNotification('Помилка збереження: ' + error.message, 'error');
        }
    }

    async editHoliday(id) {
        const holiday = this.holidays.find(h => h.id === id);
        if (holiday) {
            this.showHolidayModal(holiday);
        }
    }

    async deleteHoliday(id) {
        const holiday = this.holidays.find(h => h.id === id);
        if (!holiday) return;
        
        if (confirm(`Ви впевнені, що хочете видалити свято "${holiday.name}"?`)) {
            try {
                await this.database.delete('holidays', id);
                await this.loadData();
                this.updateCalendarView();
                hrSystem.showNotification('Свято видалено', 'success');
            } catch (error) {
                hrSystem.showNotification('Помилка видалення: ' + error.message, 'error');
            }
        }
    }

    showDaySettings(dateStr) {
        this.selectedDate = dateStr;
        const date = new Date(dateStr);
        const dayInfo = this.getDayInfo(date);
        
        const modal = document.getElementById('daySettingsModal');
        const title = document.getElementById('daySettingsTitle');
        const content = document.getElementById('daySettingsContent');
        
        title.innerHTML = `<i class="fas fa-cog"></i> Налаштування ${this.formatDate(date)}`;
        content.innerHTML = this.renderDaySettingsForm(date, dayInfo);
        
        hrSystem.showModal(modal);
    }

    renderDaySettingsForm(date, dayInfo) {
        return `
            <div class="day-settings-form">
                <div class="current-status">
                    <h4>Поточний статус дня:</h4>
                    <span class="status-badge ${dayInfo.type}">${dayInfo.title}</span>
                </div>
                
                <form id="daySettingsForm">
                    <div class="form-group">
                        <label>Тип дня</label>
                        <select name="dayType">
                            <option value="auto">Автоматично (за замовчуванням)</option>
                            <option value="working" ${dayInfo.type.includes('working') ? 'selected' : ''}>Робочий день</option>
                            <option value="weekend">Вихідний день</option>
                            <option value="holiday">Святковий день</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Кількість робочих годин</label>
                        <select name="workingHours">
                            <option value="auto">Автоматично</option>
                            <option value="0">0 годин (неробочий день)</option>
                            <option value="4">4 години</option>
                            <option value="6">6 годин</option>
                            <option value="7">7 годин (скорочений)</option>
                            <option value="8">8 годин (повний)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Примітка</label>
                        <textarea name="note" rows="3" placeholder="Додаткова інформація про цей день"></textarea>
                    </div>
                </form>
            </div>
        `;
    }

    hideDaySettingsModal() {
        const modal = document.getElementById('daySettingsModal');
        hrSystem.closeModal(modal);
        this.selectedDate = null;
    }

    async saveDaySettings() {
        const form = document.getElementById('daySettingsForm');
        const formData = new FormData(form);
        
        try {
            const adjustment = {
                date: this.selectedDate,
                type: formData.get('dayType'),
                workingHours: parseInt(formData.get('workingHours')) || null,
                note: formData.get('note'),
                createdAt: new Date().toISOString()
            };
            
            // Видаляємо попереднє налаштування для цієї дати
            const existing = this.workingDayAdjustments.find(a => 
                this.formatDateKey(new Date(a.date)) === this.selectedDate
            );
            
            if (existing) {
                await this.database.delete('workingDayAdjustments', existing.id);
            }
            
            if (adjustment.type !== 'auto') {
                await this.database.add('workingDayAdjustments', adjustment);
            }
            
            await this.loadData();
            this.updateCalendarView();
            this.hideDaySettingsModal();
            hrSystem.showNotification('Налаштування дня збережено', 'success');
            
        } catch (error) {
            hrSystem.showNotification('Помилка збереження: ' + error.message, 'error');
        }
    }

    async resetToDefaultCalendar() {
        if (confirm('Ви впевнені, що хочете скинути календар до стандартних налаштувань? Всі користувацькі зміни будуть втрачені.')) {
            try {
                // Видаляємо всі налаштування
                await this.database.clear('workingDayAdjustments');
                await this.database.clear('holidays');
                
                // Додаємо стандартні свята
                await this.initializeDefaultCalendar();
                await this.loadData();
                this.updateCalendarView();
                
                hrSystem.showNotification('Календар скинуто до стандартних налаштувань', 'success');
            } catch (error) {
                hrSystem.showNotification('Помилка скидання: ' + error.message, 'error');
            }
        }
    }

    async exportCalendar() {
        try {
            const calendarData = {
                year: this.currentYear,
                holidays: this.holidays.filter(h => 
                    new Date(h.date).getFullYear() === this.currentYear
                ),
                workingDays: this.getWorkingDaysCount(),
                weekends: this.getWeekendDaysCount(),
                exportDate: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(calendarData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Виробничий_календар_${this.currentYear}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            hrSystem.showNotification('Календар експортовано', 'success');
            
        } catch (error) {
            hrSystem.showNotification('Помилка експорту: ' + error.message, 'error');
        }
    }

    async initializeDefaultCalendar() {
        // Додаємо стандартні українські державні свята
        const defaultHolidays = [
            {
                name: 'Новий рік',
                date: `${this.currentYear}-01-01`,
                type: 'national',
                isRecurring: true,
                shortenPreviousDay: '2hours'
            },
            {
                name: 'Різдво Христове (православне)',
                date: `${this.currentYear}-01-07`,
                type: 'religious',
                isRecurring: true
            },
            {
                name: 'Міжнародний жіночий день',
                date: `${this.currentYear}-03-08`,
                type: 'national',
                isRecurring: true,
                shortenPreviousDay: '1hour'
            },
            {
                name: 'День праці',
                date: `${this.currentYear}-05-01`,
                type: 'national',
                isRecurring: true
            },
            {
                name: 'День перемоги над нацизмом у Другій світовій війні',
                date: `${this.currentYear}-05-09`,
                type: 'national',
                isRecurring: true,
                shortenPreviousDay: '1hour'
            },
            {
                name: 'Трійця',
                date: this.calculateEasterDate(),
                type: 'religious',
                isRecurring: true
            },
            {
                name: 'День Конституції України',
                date: `${this.currentYear}-06-28`,
                type: 'national',
                isRecurring: true
            },
            {
                name: 'День незалежності України',
                date: `${this.currentYear}-08-24`,
                type: 'national',
                isRecurring: true
            },
            {
                name: 'День захисників і захисниць України',
                date: `${this.currentYear}-10-01`,
                type: 'national',
                isRecurring: true
            },
            {
                name: 'Різдво Христове (католицьке)',
                date: `${this.currentYear}-12-25`,
                type: 'religious',
                isRecurring: true,
                shortenPreviousDay: '2hours'
            }
        ];
        
        for (const holiday of defaultHolidays) {
            holiday.createdAt = new Date().toISOString();
            holiday.description = 'Державне свято України';
            try {
                await this.database.add('holidays', holiday);
            } catch (error) {
                // Ігноруємо помилки дублювання
            }
        }
    }

    calculateEasterDate() {
        // Спрощений розрахунок православної Пасхи (Трійця - через 49 днів після Пасхи)
        // Для точного розрахунку потрібна складніша формула
        const easter = new Date(this.currentYear, 3, 15); // Приблизна дата
        const trinity = new Date(easter);
        trinity.setDate(trinity.getDate() + 49);
        return trinity.toISOString().split('T')[0];
    }

    hideModal(modal) {
        hrSystem.closeModal(modal);
    }
}

// Глобальна змінна productionCalendarModule оголошена в hr-system.js