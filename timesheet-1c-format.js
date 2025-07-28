/**
 * Табель обліку робочого часу - Формат 1С
 * JavaScript функціональність
 */

class Timesheet1C {
    constructor() {
        this.employees = [];
        this.currentMonth = 2; // Березень (0-індекс)
        this.currentYear = 2025;
        this.workingDays = [];
        this.weekends = [];
        this.holidays = [];
        
        // Українські коди відсутності
        this.absenceCodes = {
            'Я': { name: 'Явка на роботу', color: '#e8f5e8', hours: 8 },
            'В': { name: 'Відпустка', color: '#fff3cd', hours: 0 },
            'Л': { name: 'Лікарняний', color: '#f8d7da', hours: 0 },
            'К': { name: 'Відрядження', color: '#d1ecf1', hours: 8 },
            'Н': { name: 'Неявка невиправдана', color: '#f8d7da', hours: 0 },
            'П': { name: 'Прогул', color: '#f5c6cb', hours: 0 },
            'Р': { name: 'Вихідний день', color: '#ffe0e0', hours: 0 },
            'С': { name: 'Святковий день', color: '#ffcccc', hours: 0 },
            'М': { name: 'Відпустка по догляду за дитиною', color: '#e2e3e5', hours: 0 },
            'Д': { name: 'Додаткова відпустка', color: '#fff3cd', hours: 0 },
            'З': { name: 'Запізнення', color: '#ffeeba', hours: 6 },
            'О': { name: 'Понаднормовий час', color: '#c3e6cb', hours: 10 }
        };
        
        // Святкові дні України 2025
        this.ukrainianHolidays = {
            '2025': {
                '0': [1, 7], // Січень: 1 - Новий рік, 7 - Різдво
                '2': [8], // Березень: 8 - Міжнародний жіночий день
                '4': [1, 9], // Травень: 1 - День праці, 9 - День Перемоги
                '5': [28], // Червень: 28 - День Конституції
                '7': [24], // Серпень: 24 - День Незалежності
                '9': [14] // Жовтень: 14 - День захисника України
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSavedData();
        this.updateCurrentDate();
        this.generateCalendar();
    }
    
    setupEventListeners() {
        // Основні кнопки
        document.getElementById('generateTimesheet').addEventListener('click', () => this.generateTimesheet());
        document.getElementById('addEmployeeBtn').addEventListener('click', () => this.showEmployeeModal());
        document.getElementById('fillWorkingDays').addEventListener('click', () => this.fillWorkingDays());
        document.getElementById('calculateTotals').addEventListener('click', () => this.calculateTotals());
        document.getElementById('exportExcel').addEventListener('click', () => this.exportToExcel());
        document.getElementById('printTimesheet').addEventListener('click', () => this.printTimesheet());
        
        // Модальне вікно
        document.getElementById('closeModal').addEventListener('click', () => this.hideEmployeeModal());
        document.getElementById('saveEmployee').addEventListener('click', () => this.saveEmployee());
        document.getElementById('cancelEmployee').addEventListener('click', () => this.hideEmployeeModal());
        
        // Зміна періоду
        document.getElementById('periodMonth').addEventListener('change', (e) => {
            this.currentMonth = parseInt(e.target.value);
            this.generateCalendar();
            this.generateTimesheet();
        });
        
        document.getElementById('periodYear').addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.generateCalendar();
            this.generateTimesheet();
        });
        
        // Закриття модального вікна по кліку поза ним
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('employeeModal');
            if (e.target === modal) {
                this.hideEmployeeModal();
            }
        });
        
        // Контекстне меню для клітинок днів
        document.addEventListener('contextmenu', (e) => {
            if (e.target.classList.contains('day-cell')) {
                e.preventDefault();
                this.showContextMenu(e, e.target);
            }
        });
        
        // Закриття контекстного меню
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    }
    
    updateCurrentDate() {
        const now = new Date();
        document.getElementById('periodMonth').value = this.currentMonth;
        document.getElementById('periodYear').value = this.currentYear;
        document.getElementById('signatureDate').value = now.toISOString().split('T')[0];
    }
    
    generateCalendar() {
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        this.workingDays = [];
        this.weekends = [];
        this.holidays = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth, day);
            const dayOfWeek = date.getDay(); // 0 = неділя, 6 = субота
            
            // Перевіряємо, чи це святковий день
            const holidaysThisMonth = this.ukrainianHolidays[this.currentYear]?.[this.currentMonth] || [];
            if (holidaysThisMonth.includes(day)) {
                this.holidays.push(day);
            }
            // Перевіряємо вихідні (субота, неділя)
            else if (dayOfWeek === 0 || dayOfWeek === 6) {
                this.weekends.push(day);
            }
            // Інакше це робочий день
            else {
                this.workingDays.push(day);
            }
        }
        
        this.updateSummaryInfo();
    }
    
    updateSummaryInfo() {
        document.getElementById('workingDaysInPeriod').textContent = this.workingDays.length;
        document.getElementById('holidaysInPeriod').textContent = this.holidays.length;
        document.getElementById('totalEmployees').textContent = this.employees.length;
    }
    
    generateTimesheet() {
        const table = document.getElementById('timesheetTable');
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        
        // Очищуємо таблицю
        table.innerHTML = '';
        
        // Створюємо заголовок
        this.createTableHeader(table, daysInMonth);
        
        // Створюємо тіло таблиці
        const tbody = document.createElement('tbody');
        
        if (this.employees.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="${daysInMonth + 7}" style="text-align: center; padding: 20px; color: #666;">
                    Немає співробітників. Натисніть "Додати співробітника" для початку роботи.
                </td>
            `;
            tbody.appendChild(emptyRow);
        } else {
            this.employees.forEach((employee, index) => {
                const row = this.createEmployeeRow(employee, index, daysInMonth);
                tbody.appendChild(row);
            });
        }
        
        table.appendChild(tbody);
        this.attachCellEvents();
    }
    
    createTableHeader(table, daysInMonth) {
        const thead = document.createElement('thead');
        
        // Перший рядок заголовка
        const headerRow1 = document.createElement('tr');
        headerRow1.innerHTML = `
            <th class="header-main" rowspan="2">№ п/п</th>
            <th class="header-main" rowspan="2">Табельний номер</th>
            <th class="header-main" rowspan="2">Прізвище, ім'я, по батькові</th>
            <th class="header-main" colspan="${daysInMonth}">Відмітки про явки і неявки на роботу по числах місяця</th>
            <th class="header-main" colspan="4">Підсумок за місяць</th>
        `;
        
        // Другий рядок заголовка
        const headerRow2 = document.createElement('tr');
        let dayHeaders = '';
        
        // Дні місяця
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth, day);
            const dayOfWeek = date.getDay();
            let cellClass = 'header-day';
            
            if (this.holidays.includes(day)) {
                cellClass += ' holiday';
            } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                cellClass += ' weekend';
            }
            
            dayHeaders += `<th class="${cellClass}">${day}</th>`;
        }
        
        headerRow2.innerHTML = dayHeaders + `
            <th class="header-summary">Відпрацьовано днів</th>
            <th class="header-summary">Відпрацьовано годин</th>
            <th class="header-summary">Неявки</th>
            <th class="header-summary">Примітки</th>
        `;
        
        thead.appendChild(headerRow1);
        thead.appendChild(headerRow2);
        table.appendChild(thead);
    }
    
    createEmployeeRow(employee, index, daysInMonth) {
        const row = document.createElement('tr');
        row.dataset.employeeIndex = index;
        
        let cellsHTML = `
            <td class="tab-number">${index + 1}</td>
            <td class="tab-number">${employee.tabNumber}</td>
            <td class="employee-name">${employee.fullName}</td>
        `;
        
        // Клітинки для днів
        for (let day = 1; day <= daysInMonth; day++) {
            const cellId = `cell-${index}-${day}`;
            let cellClass = 'day-cell';
            let cellContent = '';
            
            // Отримуємо збережені дані для цього дня
            const savedData = this.getSavedCellData(employee.tabNumber, day);
            if (savedData) {
                cellContent = savedData.code;
                cellClass += ` ${savedData.type}`;
            } else {
                // Автоматично встановлюємо тип дня
                if (this.holidays.includes(day)) {
                    cellContent = 'С';
                    cellClass += ' holiday';
                } else if (this.weekends.includes(day)) {
                    cellContent = 'Р';
                    cellClass += ' weekend';
                }
            }
            
            cellsHTML += `<td id="${cellId}" class="${cellClass}" 
                data-employee="${index}" data-day="${day}" 
                data-tab-number="${employee.tabNumber}">${cellContent}</td>`;
        }
        
        // Підсумкові колонки
        const summary = this.calculateEmployeeSummary(employee, daysInMonth);
        cellsHTML += `
            <td class="summary-cell summary-days">${summary.workingDays}</td>
            <td class="summary-cell summary-hours">${summary.workingHours}</td>
            <td class="summary-cell summary-absences">${summary.absences}</td>
            <td class="summary-cell summary-notes">
                <input type="text" class="notes-input" value="${employee.notes || ''}" 
                       onchange="timesheet.updateEmployeeNotes(${index}, this.value)">
            </td>
        `;
        
        row.innerHTML = cellsHTML;
        return row;
    }
    
    calculateEmployeeSummary(employee, daysInMonth) {
        let workingDays = 0;
        let workingHours = 0;
        let absences = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const cellData = this.getSavedCellData(employee.tabNumber, day);
            if (cellData && cellData.code) {
                const code = cellData.code;
                const codeInfo = this.absenceCodes[code];
                
                if (codeInfo) {
                    if (code === 'Я' || code === 'К' || code === 'О') {
                        workingDays++;
                        workingHours += codeInfo.hours;
                    } else if (code === 'З') {
                        workingDays++;
                        workingHours += codeInfo.hours;
                    } else if (['В', 'Л', 'Н', 'П', 'М', 'Д'].includes(code)) {
                        absences++;
                    }
                }
            }
        }
        
        return { workingDays, workingHours, absences };
    }
    
    attachCellEvents() {
        document.querySelectorAll('.day-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                this.handleCellClick(e.target);
            });
            
            cell.addEventListener('dblclick', (e) => {
                this.handleCellDoubleClick(e.target);
            });
        });
    }
    
    handleCellClick(cell) {
        const currentCode = cell.textContent.trim();
        const nextCode = this.getNextCode(currentCode);
        this.setCellCode(cell, nextCode);
    }
    
    handleCellDoubleClick(cell) {
        // При подвійному кліку відкриваємо контекстне меню
        const rect = cell.getBoundingClientRect();
        const event = { 
            clientX: rect.left + rect.width / 2, 
            clientY: rect.top + rect.height / 2 
        };
        this.showContextMenu(event, cell);
    }
    
    getNextCode(currentCode) {
        const codes = ['', 'Я', 'В', 'Л', 'Н', 'Р', 'С'];
        const currentIndex = codes.indexOf(currentCode);
        return codes[(currentIndex + 1) % codes.length];
    }
    
    setCellCode(cell, code) {
        const day = parseInt(cell.dataset.day);
        const tabNumber = cell.dataset.tabNumber;
        
        cell.textContent = code;
        cell.className = 'day-cell';
        
        if (code && this.absenceCodes[code]) {
            const codeInfo = this.absenceCodes[code];
            cell.style.backgroundColor = codeInfo.color;
            
            // Додаємо клас для стилізації
            if (code === 'Я') cell.classList.add('working');
            else if (['В', 'Д'].includes(code)) cell.classList.add('vacation');
            else if (code === 'Л') cell.classList.add('sick');
            else if (['Н', 'П'].includes(code)) cell.classList.add('absent');
            else if (['Р', 'С'].includes(code)) cell.classList.add('weekend');
        }
        
        // Зберігаємо дані
        this.saveCellData(tabNumber, day, { code, type: this.getCellTypeByCode(code) });
        
        // Оновлюємо підсумки
        this.updateEmployeeSummaryInTable(cell.dataset.employee);
        
        // Анімація оновлення
        cell.classList.add('updated');
        setTimeout(() => cell.classList.remove('updated'), 1000);
    }
    
    getCellTypeByCode(code) {
        if (code === 'Я') return 'working';
        if (['В', 'Д'].includes(code)) return 'vacation';
        if (code === 'Л') return 'sick';
        if (['Н', 'П'].includes(code)) return 'absent';
        if (['Р', 'С'].includes(code)) return 'weekend';
        return '';
    }
    
    updateEmployeeSummaryInTable(employeeIndex) {
        const employee = this.employees[employeeIndex];
        if (!employee) return;
        
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const summary = this.calculateEmployeeSummary(employee, daysInMonth);
        
        const row = document.querySelector(`tr[data-employee-index="${employeeIndex}"]`);
        if (row) {
            row.querySelector('.summary-days').textContent = summary.workingDays;
            row.querySelector('.summary-hours').textContent = summary.workingHours;
            row.querySelector('.summary-absences').textContent = summary.absences;
        }
    }
    
    showContextMenu(event, cell) {
        this.hideContextMenu();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        
        let menuHTML = '';
        Object.entries(this.absenceCodes).forEach(([code, info]) => {
            menuHTML += `
                <div class="context-menu-item" data-code="${code}">
                    <span class="legend-code" style="background-color: ${info.color}">${code}</span>
                    <span>${info.name}</span>
                </div>
            `;
        });
        
        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);
        
        // Додаємо обробники для пунктів меню
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = item.dataset.code;
                this.setCellCode(cell, code);
                this.hideContextMenu();
            });
        });
        
        // Позиціонуємо меню, щоб воно не виходило за межі екрана
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = (event.clientX - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = (event.clientY - rect.height) + 'px';
        }
    }
    
    hideContextMenu() {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }
    
    showEmployeeModal() {
        document.getElementById('employeeModal').style.display = 'block';
        document.getElementById('empTabNumber').focus();
    }
    
    hideEmployeeModal() {
        document.getElementById('employeeModal').style.display = 'none';
        this.clearEmployeeForm();
    }
    
    clearEmployeeForm() {
        document.getElementById('employeeForm').reset();
        document.getElementById('empWorkingHours').value = '8';
        document.getElementById('empSchedule').value = 'full';
    }
    
    saveEmployee() {
        const formData = {
            tabNumber: document.getElementById('empTabNumber').value.trim(),
            fullName: document.getElementById('empFullName').value.trim(),
            position: document.getElementById('empPosition').value.trim(),
            department: document.getElementById('empDepartment').value.trim(),
            schedule: document.getElementById('empSchedule').value,
            workingHours: parseFloat(document.getElementById('empWorkingHours').value),
            notes: ''
        };
        
        // Валідація
        if (!formData.tabNumber || !formData.fullName || !formData.position) {
            alert('Заповніть обов\'язкові поля: табельний номер, ПІБ та посаду');
            return;
        }
        
        // Перевіряємо унікальність табельного номера
        if (this.employees.some(emp => emp.tabNumber === formData.tabNumber)) {
            alert('Співробітник з таким табельним номером вже існує');
            return;
        }
        
        this.employees.push(formData);
        this.saveDataToStorage();
        this.updateSummaryInfo();
        this.generateTimesheet();
        this.hideEmployeeModal();
        
        // Показуємо повідомлення про успішне додавання
        this.showNotification(`Співробітника "${formData.fullName}" додано до табеля`, 'success');
    }
    
    fillWorkingDays() {
        if (this.employees.length === 0) {
            alert('Спочатку додайте співробітників');
            return;
        }
        
        const confirmed = confirm('Заповнити всі робочі дні позначкою "Я" (Явка)? Це замінить існуючі дані для робочих днів.');
        if (!confirmed) return;
        
        this.employees.forEach((employee, empIndex) => {
            this.workingDays.forEach(day => {
                const cell = document.getElementById(`cell-${empIndex}-${day}`);
                if (cell) {
                    this.setCellCode(cell, 'Я');
                }
            });
        });
        
        this.showNotification('Робочі дні заповнено', 'success');
    }
    
    calculateTotals() {
        let totalWorkingDays = 0;
        let totalWorkingHours = 0;
        let totalAbsences = 0;
        
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        
        this.employees.forEach((employee) => {
            const summary = this.calculateEmployeeSummary(employee, daysInMonth);
            totalWorkingDays += summary.workingDays;
            totalWorkingHours += summary.workingHours;
            totalAbsences += summary.absences;
        });
        
        const message = `
            Підсумок за ${this.getMonthName(this.currentMonth)} ${this.currentYear}:
            
            Загальна кількість відпрацьованих днів: ${totalWorkingDays}
            Загальна кількість відпрацьованих годин: ${totalWorkingHours}
            Загальна кількість неявок: ${totalAbsences}
            Середня кількість годин на співробітника: ${this.employees.length > 0 ? Math.round(totalWorkingHours / this.employees.length) : 0}
        `;
        
        alert(message);
    }
    
    exportToExcel() {
        if (this.employees.length === 0) {
            alert('Немає даних для експорту');
            return;
        }
        
        try {
            const wb = XLSX.utils.book_new();
            const ws_data = this.prepareDataForExport();
            const ws = XLSX.utils.aoa_to_sheet(ws_data);
            
            // Налаштування ширини колонок
            const colWidths = [
                { wch: 5 },  // № п/п
                { wch: 12 }, // Табельний номер
                { wch: 25 }, // ПІБ
            ];
            
            // Ширина для днів місяця
            const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
            for (let i = 0; i < daysInMonth; i++) {
                colWidths.push({ wch: 3 });
            }
            
            // Ширина для підсумкових колонок
            colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 20 });
            
            ws['!cols'] = colWidths;
            
            XLSX.utils.book_append_sheet(wb, ws, 'Табель');
            
            const fileName = `Табель_${this.getMonthName(this.currentMonth)}_${this.currentYear}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            this.showNotification('Табель експортовано в Excel', 'success');
            
        } catch (error) {
            console.error('Помилка експорту:', error);
            alert('Помилка експорту в Excel');
        }
    }
    
    prepareDataForExport() {
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const data = [];
        
        // Заголовок документа
        data.push([`ТАБЕЛЬ ОБЛІКУ РОБОЧОГО ЧАСУ за ${this.getMonthName(this.currentMonth)} ${this.currentYear} року`]);
        data.push([]);
        
        // Заголовки таблиці
        const headers1 = ['№ п/п', 'Табельний номер', 'Прізвище, ім\'я, по батькові'];
        for (let day = 1; day <= daysInMonth; day++) {
            headers1.push(day.toString());
        }
        headers1.push('Відпрацьовано днів', 'Відпрацьовано годин', 'Неявки', 'Примітки');
        data.push(headers1);
        
        // Дані співробітників
        this.employees.forEach((employee, index) => {
            const row = [index + 1, employee.tabNumber, employee.fullName];
            
            // Дані по днях
            for (let day = 1; day <= daysInMonth; day++) {
                const cellData = this.getSavedCellData(employee.tabNumber, day);
                row.push(cellData ? cellData.code : '');
            }
            
            // Підсумки
            const summary = this.calculateEmployeeSummary(employee, daysInMonth);
            row.push(summary.workingDays, summary.workingHours, summary.absences, employee.notes || '');
            
            data.push(row);
        });
        
        return data;
    }
    
    printTimesheet() {
        window.print();
    }
    
    updateEmployeeNotes(employeeIndex, notes) {
        if (this.employees[employeeIndex]) {
            this.employees[employeeIndex].notes = notes;
            this.saveDataToStorage();
        }
    }
    
    // Методи збереження та завантаження даних
    saveDataToStorage() {
        const data = {
            employees: this.employees,
            currentMonth: this.currentMonth,
            currentYear: this.currentYear,
            cellData: this.getCellDataFromStorage()
        };
        localStorage.setItem('timesheet1c_data', JSON.stringify(data));
    }
    
    loadSavedData() {
        try {
            const saved = localStorage.getItem('timesheet1c_data');
            if (saved) {
                const data = JSON.parse(saved);
                this.employees = data.employees || [];
                this.currentMonth = data.currentMonth ?? 2;
                this.currentYear = data.currentYear ?? 2025;
            }
        } catch (error) {
            console.error('Помилка завантаження збережених даних:', error);
        }
    }
    
    saveCellData(tabNumber, day, data) {
        const key = `cell_${tabNumber}_${day}_${this.currentMonth}_${this.currentYear}`;
        localStorage.setItem(key, JSON.stringify(data));
    }
    
    getSavedCellData(tabNumber, day) {
        try {
            const key = `cell_${tabNumber}_${day}_${this.currentMonth}_${this.currentYear}`;
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            return null;
        }
    }
    
    getCellDataFromStorage() {
        const cellData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cell_')) {
                cellData[key] = localStorage.getItem(key);
            }
        }
        return cellData;
    }
    
    // Допоміжні методи
    getMonthName(monthIndex) {
        const months = [
            'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
            'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
        ];
        return months[monthIndex];
    }
    
    showNotification(message, type = 'info') {
        // Створюємо простий toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        switch (type) {
            case 'success':
                toast.style.backgroundColor = '#28a745';
                break;
            case 'error':
                toast.style.backgroundColor = '#dc3545';
                break;
            case 'warning':
                toast.style.backgroundColor = '#ffc107';
                toast.style.color = '#212529';
                break;
            default:
                toast.style.backgroundColor = '#17a2b8';
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Показуємо з анімацією
        setTimeout(() => toast.style.opacity = '1', 100);
        
        // Приховуємо через 3 секунди
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Ініціалізація
let timesheet;
document.addEventListener('DOMContentLoaded', () => {
    timesheet = new Timesheet1C();
});