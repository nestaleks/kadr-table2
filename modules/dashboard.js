/**
 * Dashboard Module - Головна панель HR системи
 */

class DashboardModule extends BaseModule {
    constructor(database, options = {}) {
        super(database, options);
        this.stats = {};
    }

    async render() {
        // Завантажуємо статистику
        await this.loadStats();

        return `
            <div class="dashboard">
                <div class="page-header">
                    <h1><i class="fas fa-tachometer-alt"></i> Дашборд</h1>
                    <p>Огляд основних показників системи</p>
                </div>

                <!-- Швидка статистика -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon employees">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${this.stats.totalEmployees}</h3>
                            <p>Активних співробітників</p>
                            <small>${this.stats.newEmployeesThisMonth} нових цього місяця</small>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon departments">
                            <i class="fas fa-building"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${this.stats.totalDepartments}</h3>
                            <p>Підрозділів</p>
                            <small>${this.stats.activeDepartments} активних</small>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon payroll">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${this.formatCurrency(this.stats.totalPayroll)}</h3>
                            <p>Зарплатний фонд</p>
                            <small>За поточний місяць</small>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon vacations">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${this.stats.activeVacations}</h3>
                            <p>Активних відпусток</p>
                            <small>${this.stats.pendingVacations} в очікуванні</small>
                        </div>
                    </div>
                </div>

                <!-- Основний контент -->
                <div class="dashboard-content">
                    <div class="dashboard-left">
                        <!-- Останні дії -->
                        <div class="dashboard-widget">
                            <div class="widget-header">
                                <h2><i class="fas fa-history"></i> Останні дії</h2>
                                <button class="btn-link" onclick="this.refreshRecentActions()">Оновити</button>
                            </div>
                            <div class="widget-content">
                                <div id="recentActions" class="recent-actions">
                                    ${this.renderRecentActions()}
                                </div>
                            </div>
                        </div>

                        <!-- Наближені події -->
                        <div class="dashboard-widget">
                            <div class="widget-header">
                                <h2><i class="fas fa-calendar-alt"></i> Наближені події</h2>
                            </div>
                            <div class="widget-content">
                                <div id="upcomingEvents" class="upcoming-events">
                                    ${await this.renderUpcomingEvents()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="dashboard-right">
                        <!-- Швидкі дії -->
                        <div class="dashboard-widget">
                            <div class="widget-header">
                                <h2><i class="fas fa-bolt"></i> Швидкі дії</h2>
                            </div>
                            <div class="widget-content">
                                <div class="quick-actions-grid">
                                    <button class="quick-action-btn" onclick="hrSystem.loadModule('employees', {action: 'add'})">
                                        <i class="fas fa-user-plus"></i>
                                        <span>Додати співробітника</span>
                                    </button>
                                    <button class="quick-action-btn" onclick="hrSystem.loadModule('timesheet')">
                                        <i class="fas fa-clock"></i>
                                        <span>Відкрити табель</span>
                                    </button>
                                    <button class="quick-action-btn" onclick="hrSystem.loadModule('payroll', {action: 'calculate'})">
                                        <i class="fas fa-calculator"></i>
                                        <span>Розрахувати з/п</span>
                                    </button>
                                    <button class="quick-action-btn" onclick="hrSystem.loadModule('vacations', {action: 'add'})">
                                        <i class="fas fa-calendar-plus"></i>
                                        <span>Подати відпустку</span>
                                    </button>
                                    <button class="quick-action-btn" onclick="hrSystem.loadModule('reports')">
                                        <i class="fas fa-chart-bar"></i>
                                        <span>Переглянути звіти</span>
                                    </button>
                                    <button class="quick-action-btn" onclick="window.open('timesheet-original.html', '_blank')">
                                        <i class="fas fa-table"></i>
                                        <span>Оригінальний табель</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Статистика за підрозділами -->
                        <div class="dashboard-widget">
                            <div class="widget-header">
                                <h2><i class="fas fa-chart-pie"></i> За підрозділами</h2>
                            </div>
                            <div class="widget-content">
                                <div id="departmentStats" class="department-stats">
                                    ${this.renderDepartmentStats()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        // Налаштовуємо інтерактивні елементи
        this.setupInteractions();
        
        // Запускаємо автооновлення
        this.startAutoRefresh();
    }

    async loadStats() {
        try {
            // Завантажуємо основну статистику
            const employees = await this.database.getAll('employees');
            const departments = await this.database.getAll('departments');
            const positions = await this.database.getAll('positions');
            const vacations = await this.database.getAll('vacations');
            const payrolls = await this.database.getAll('payroll');

            // Поточний місяць
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

            // Рахуємо статистику
            this.stats = {
                totalEmployees: employees.filter(emp => emp.status === 'active').length,
                newEmployeesThisMonth: employees.filter(emp => {
                    if (!emp.hireDate) return false;
                    const hireDate = new Date(emp.hireDate);
                    return hireDate.getMonth() === currentMonth && hireDate.getFullYear() === currentYear;
                }).length,
                
                totalDepartments: departments.length,
                activeDepartments: departments.filter(dept => dept.isActive).length,
                
                totalPayroll: payrolls
                    .filter(p => p.monthYear === currentMonthKey)
                    .reduce((sum, p) => sum + (p.summary?.netPay || 0), 0),
                
                activeVacations: vacations.filter(v => v.status === 'active').length,
                pendingVacations: vacations.filter(v => v.status === 'planned').length,
                
                totalPositions: positions.length
            };

        } catch (error) {
            console.error('Помилка завантаження статистики:', error);
            this.stats = {
                totalEmployees: 0,
                newEmployeesThisMonth: 0,
                totalDepartments: 0,
                activeDepartments: 0,
                totalPayroll: 0,
                activeVacations: 0,
                pendingVacations: 0,
                totalPositions: 0
            };
        }
    }

    renderRecentActions() {
        // В реальній системі тут було б завантаження з логу дій
        const recentActions = [
            {
                icon: 'fas fa-user-plus',
                action: 'Додано нового співробітника',
                details: 'Іванов Іван Іванович',
                time: '2 години тому',
                type: 'success'
            },
            {
                icon: 'fas fa-calculator',
                action: 'Розраховано зарплату',
                details: 'За січень 2025',
                time: '5 годин тому',
                type: 'info'
            },
            {
                icon: 'fas fa-calendar-check',
                action: 'Затверджено відпустку',
                details: 'Петров П.П. з 15.02 по 28.02',
                time: '1 день тому',
                type: 'success'
            },
            {
                icon: 'fas fa-file-alt',
                action: 'Створено звіт',
                details: 'Звіт по зарплаті за січень',
                time: '2 дні тому',
                type: 'info'
            }
        ];

        return recentActions.map(action => `
            <div class="recent-action ${action.type}">
                <div class="action-icon">
                    <i class="${action.icon}"></i>
                </div>
                <div class="action-content">
                    <div class="action-title">${action.action}</div>
                    <div class="action-details">${action.details}</div>
                    <div class="action-time">${action.time}</div>
                </div>
            </div>
        `).join('');
    }

    async renderUpcomingEvents() {
        try {
            const events = [];
            const today = new Date();
            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

            // Наближені відпустки
            const vacations = await this.database.getAll('vacations');
            const upcomingVacations = vacations.filter(v => {
                const startDate = new Date(v.startDate);
                return startDate >= today && startDate <= nextWeek && v.status === 'approved';
            });

            upcomingVacations.forEach(vacation => {
                events.push({
                    icon: 'fas fa-umbrella-beach',
                    title: 'Початок відпустки',
                    description: `Співробітник ID: ${vacation.employeeId}`,
                    date: new Date(vacation.startDate),
                    type: 'vacation'
                });
            });

            // Наближені завершення лікарняних
            const sickLeaves = await this.database.getAll('sickLeaves');
            const endingSickLeaves = sickLeaves.filter(sl => {
                const endDate = new Date(sl.endDate);
                return endDate >= today && endDate <= nextWeek && sl.status === 'active';
            });

            endingSickLeaves.forEach(sickLeave => {
                events.push({
                    icon: 'fas fa-notes-medical',
                    title: 'Закінчення лікарняного',
                    description: `Співробітник ID: ${sickLeave.employeeId}`,
                    date: new Date(sickLeave.endDate),
                    type: 'sickleave'
                });
            });

            // Сортуємо за датою
            events.sort((a, b) => a.date - b.date);

            if (events.length === 0) {
                return '<div class="no-events">Немає наближених подій</div>';
            }

            return events.map(event => `
                <div class="upcoming-event ${event.type}">
                    <div class="event-icon">
                        <i class="${event.icon}"></i>
                    </div>
                    <div class="event-content">
                        <div class="event-title">${event.title}</div>
                        <div class="event-description">${event.description}</div>
                        <div class="event-date">${this.formatDate(event.date)}</div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Помилка завантаження подій:', error);
            return '<div class="error-message">Помилка завантаження подій</div>';
        }
    }

    renderDepartmentStats() {
        // В реальній системі тут було б завантаження статистики по підрозділах
        const departmentData = [
            { name: 'Головний підрозділ', employees: this.stats.totalEmployees, percentage: 100 }
        ];

        return departmentData.map(dept => `
            <div class="department-stat">
                <div class="dept-info">
                    <span class="dept-name">${dept.name}</span>
                    <span class="dept-count">${dept.employees} осіб</span>
                </div>
                <div class="dept-bar">
                    <div class="dept-fill" style="width: ${dept.percentage}%"></div>
                </div>
            </div>
        `).join('');
    }

    setupInteractions() {
        // Додаємо обробники для інтерактивних елементів
        document.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', () => {
                // Можна додати навігацію до відповідного модуля
            });
        });
    }

    startAutoRefresh() {
        // Оновлюємо статистику кожні 5 хвилин
        setInterval(async () => {
            await this.loadStats();
            // Оновлюємо відображення без повного перерендерингу
            this.updateStats();
        }, 5 * 60 * 1000);
    }

    updateStats() {
        // Оновлюємо числа в статистичних картках
        const statCards = document.querySelectorAll('.stat-card h3');
        if (statCards.length >= 4) {
            statCards[0].textContent = this.stats.totalEmployees;
            statCards[1].textContent = this.stats.totalDepartments;
            statCards[2].textContent = this.formatCurrency(this.stats.totalPayroll);
            statCards[3].textContent = this.stats.activeVacations;
        }
    }

    refreshRecentActions() {
        const container = document.getElementById('recentActions');
        if (container) {
            container.innerHTML = this.renderRecentActions();
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('uk-UA', {
            style: 'currency',
            currency: 'UAH',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('uk-UA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    }
}