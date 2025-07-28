class OriginalTimesheet {
    constructor() {
        this.currentMonth = 2; // березень (індекс 2)
        this.currentYear = 2025;
        this.employees = [];
        this.employeeCounter = 1;
        
        this.initializeElements();
        this.bindEvents();
        this.generateTimesheet();
    }

    initializeElements() {
        this.monthSelect = document.getElementById('month');
        this.yearInput = document.getElementById('year');
        this.tableContainer = document.getElementById('tableContainer');
        this.employeeForm = document.getElementById('employeeForm');
        
        // Встановлюємо поточні значення
        this.monthSelect.value = this.currentMonth;
        this.yearInput.value = this.currentYear;
        
        // Приховуємо форму спочатку
        this.employeeForm.style.display = 'none';
    }

    bindEvents() {
        document.getElementById('generateTable').addEventListener('click', () => {
            this.currentMonth = parseInt(this.monthSelect.value);
            this.currentYear = parseInt(this.yearInput.value);
            this.generateTimesheet();
        });

        document.getElementById('addEmployee').addEventListener('click', () => {
            this.showEmployeeForm();
        });

        document.getElementById('submitEmployee').addEventListener('click', () => {
            this.addEmployee();
        });

        document.getElementById('cancelEmployee').addEventListener('click', () => {
            this.hideEmployeeForm();
        });

        document.getElementById('exportExcel').addEventListener('click', () => {
            this.exportToExcel();
        });
    }

    getDaysInMonth(month, year) {
        return new Date(year, month + 1, 0).getDate();
    }

    isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6; // неділя або субота
    }

    isHoliday(date) {
        // Тут можна додати логіку для святкових днів
        const holidays = [
            // Приклад: Новий рік
            { month: 0, day: 1 },
            // Різдво
            { month: 0, day: 7 },
            // День захисника України
            { month: 9, day: 14 },
            // День незалежності
            { month: 7, day: 24 }
        ];

        return holidays.some(holiday => 
            holiday.month === date.getMonth() && holiday.day === date.getDate()
        );
    }

    generateTimesheet() {
        const daysInMonth = this.getDaysInMonth(this.currentMonth, this.currentYear);
        
        const table = document.createElement('table');
        table.className = 'timesheet-table';
        table.id = 'timesheetTable';

        // Створюємо заголовки
        this.createTableHeaders(table, daysInMonth);
        
        // Додаємо рядки працівників
        this.employees.forEach(employee => {
            this.createEmployeeRow(table, employee, daysInMonth);
        });

        this.tableContainer.innerHTML = '';
        this.tableContainer.appendChild(table);
    }

    createTableHeaders(table, daysInMonth) {
        // Перший рядок заголовків
        const headerRow1 = document.createElement('tr');
        headerRow1.className = 'header-row-1';

        // Основні колонки
        const basicHeaders = [
            { text: '№ п/п', rowspan: 2, width: '40px' },
            { text: 'Прізвище, ім\'я, по батькові', rowspan: 2, width: '200px' },
            { text: 'Посада (спеціальність, професія), розряд, клас (категорія) кваліфікації', rowspan: 2, width: '150px' },
            { text: 'Табельний номер', rowspan: 2, width: '80px' },
            { text: 'Стать', rowspan: 2, width: '50px' }
        ];

        basicHeaders.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.text;
            th.rowSpan = header.rowspan;
            th.style.width = header.width;
            th.className = 'basic-header';
            headerRow1.appendChild(th);
        });

        // Заголовок для днів місяця
        const daysHeader = document.createElement('th');
        daysHeader.textContent = 'Відмітки про явки та неявки на роботу за числами місяця';
        daysHeader.colSpan = daysInMonth;
        daysHeader.className = 'days-main-header';
        headerRow1.appendChild(daysHeader);

        // Підсумкові заголовки
        const summaryHeaders = [
            'Відпрацьовано днів',
            'Відпрацьовано годин всього',
            'у т.ч. надурочних',
            'у т.ч. нічних',
            'у т.ч. вечірніх',
            'у т.ч. святкових',
            'Неявки з причин',
            'Основна та додаткова відпустки',
            'Відпустка у зв\'язку з навч.',
            'Відпустка без збереження з/п',
            'Відпустка вагітність та пологи',
            'Відпустка догляд за дитиною до 3 років',
            'Додаткова оплачувана відпустка',
            'Тимчасова непрацездатність',
            'Відрядження',
            'Інші причини неявок'
        ];

        summaryHeaders.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.rowSpan = 2;
            th.className = 'summary-header';
            headerRow1.appendChild(th);
        });

        // Кнопка дій
        const actionsHeader = document.createElement('th');
        actionsHeader.textContent = 'Дії';
        actionsHeader.rowSpan = 2;
        actionsHeader.className = 'actions-header';
        headerRow1.appendChild(actionsHeader);

        table.appendChild(headerRow1);

        // Другий рядок заголовків (дні місяця)
        const headerRow2 = document.createElement('tr');
        headerRow2.className = 'header-row-2';

        for (let day = 1; day <= daysInMonth; day++) {
            const th = document.createElement('th');
            th.textContent = day;
            th.className = 'day-header';
            
            const date = new Date(this.currentYear, this.currentMonth, day);
            if (this.isWeekend(date)) {
                th.classList.add('weekend');
            }
            if (this.isHoliday(date)) {
                th.classList.add('holiday');
            }
            
            headerRow2.appendChild(th);
        }

        table.appendChild(headerRow2);
    }

    createEmployeeRow(table, employee, daysInMonth) {
        const row = document.createElement('tr');
        row.className = 'employee-row';
        row.id = `employee-${employee.id}`;

        // Основні дані працівника
        const basicData = [
            employee.number,
            employee.fullName,
            employee.position,
            employee.personnelNumber,
            employee.gender
        ];

        basicData.forEach((data, index) => {
            const td = document.createElement('td');
            td.className = 'basic-cell';
            td.textContent = data;
            row.appendChild(td);
        });

        // Дні місяця
        for (let day = 1; day <= daysInMonth; day++) {
            const td = document.createElement('td');
            td.className = 'day-cell';
            
            const date = new Date(this.currentYear, this.currentMonth, day);
            if (this.isWeekend(date)) {
                td.classList.add('weekend');
            }
            if (this.isHoliday(date)) {
                td.classList.add('holiday');
            }

            // Контейнер для двох рядків
            const container = document.createElement('div');
            container.className = 'day-container';

            // Верхній рядок для коду
            const codeInput = document.createElement('input');
            codeInput.type = 'text';
            codeInput.className = 'day-code';
            codeInput.maxLength = 3;
            codeInput.id = `emp-${employee.id}-day-${day}-code`;
            codeInput.addEventListener('input', () => this.calculateTotals(employee.id));

            // Нижній рядок для годин
            const hoursInput = document.createElement('input');
            hoursInput.type = 'number';
            hoursInput.className = 'day-hours';
            hoursInput.min = '0';
            hoursInput.max = '24';
            hoursInput.step = '0.5';
            hoursInput.id = `emp-${employee.id}-day-${day}-hours`;
            hoursInput.addEventListener('input', () => this.calculateTotals(employee.id));

            // Заповнюємо вихідні дні
            if (this.isWeekend(date)) {
                codeInput.value = 'В';
                hoursInput.value = '0';
                codeInput.readOnly = true;
                hoursInput.readOnly = true;
            }

            container.appendChild(codeInput);
            container.appendChild(hoursInput);
            td.appendChild(container);
            row.appendChild(td);
        }

        // Підсумкові колонки
        for (let i = 0; i < 16; i++) {
            const td = document.createElement('td');
            td.className = 'summary-cell';
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'summary-input';
            input.id = `emp-${employee.id}-summary-${i}`;
            input.readOnly = true;
            input.min = '0';
            td.appendChild(input);
            row.appendChild(td);
        }

        // Кнопка видалення
        const actionTd = document.createElement('td');
        actionTd.className = 'action-cell';
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.className = 'delete-btn';
        deleteBtn.title = 'Видалити працівника';
        deleteBtn.addEventListener('click', () => this.removeEmployee(employee.id));
        actionTd.appendChild(deleteBtn);
        row.appendChild(actionTd);

        table.appendChild(row);
    }

    showEmployeeForm() {
        this.employeeForm.style.display = 'block';
        document.getElementById('empFullName').focus();
    }

    hideEmployeeForm() {
        this.employeeForm.style.display = 'none';
        this.clearEmployeeForm();
    }

    clearEmployeeForm() {
        document.getElementById('empFullName').value = '';
        document.getElementById('empPosition').value = '';
        document.getElementById('empPersonnelNumber').value = '';
        document.getElementById('empGender').value = 'ч';
    }

    addEmployee() {
        const fullName = document.getElementById('empFullName').value.trim();
        const position = document.getElementById('empPosition').value.trim();
        const personnelNumber = document.getElementById('empPersonnelNumber').value.trim();
        const gender = document.getElementById('empGender').value;

        if (!fullName || !position || !personnelNumber) {
            alert('Будь ласка, заповніть всі обов\'язкові поля!');
            return;
        }

        const employee = {
            id: Date.now(),
            number: this.employeeCounter++,
            fullName: fullName,
            position: position,
            personnelNumber: personnelNumber,
            gender: gender
        };

        this.employees.push(employee);
        this.generateTimesheet();
        this.hideEmployeeForm();
    }

    removeEmployee(employeeId) {
        if (confirm('Ви впевнені, що хочете видалити цього працівника?')) {
            this.employees = this.employees.filter(emp => emp.id !== employeeId);
            this.generateTimesheet();
        }
    }

    calculateTotals(employeeId) {
        const daysInMonth = this.getDaysInMonth(this.currentMonth, this.currentYear);
        
        let stats = {
            workedDays: 0,
            totalHours: 0,
            overtimeHours: 0,
            nightHours: 0,
            eveningHours: 0,
            holidayHours: 0,
            weekendDays: 0,
            basicVacation: 0,
            educationalVacation: 0,
            unpaidVacation: 0,
            maternityVacation: 0,
            childcareVacation: 0,
            additionalVacation: 0,
            sickLeave: 0,
            businessTrip: 0,
            otherAbsences: 0
        };

        for (let day = 1; day <= daysInMonth; day++) {
            const codeInput = document.getElementById(`emp-${employeeId}-day-${day}-code`);
            const hoursInput = document.getElementById(`emp-${employeeId}-day-${day}-hours`);
            
            if (!codeInput || !hoursInput) continue;
            
            const code = codeInput.value.trim().toUpperCase();
            const hours = parseFloat(hoursInput.value) || 0;
            
            const date = new Date(this.currentYear, this.currentMonth, day);
            if (this.isWeekend(date)) {
                stats.weekendDays++;
            }

            if (code && hours > 0) {
                switch (code) {
                    case 'Р':
                        stats.workedDays++;
                        stats.totalHours += hours;
                        break;
                    case 'ВЧ':
                        stats.workedDays++;
                        stats.totalHours += hours;
                        stats.eveningHours += hours;
                        break;
                    case 'РН':
                        stats.workedDays++;
                        stats.totalHours += hours;
                        stats.nightHours += hours;
                        break;
                    case 'НУ':
                        stats.workedDays++;
                        stats.totalHours += hours;
                        stats.overtimeHours += hours;
                        break;
                    case 'РВ':
                        stats.additionalVacation += hours;
                        break;
                    case 'Ч':
                        stats.additionalVacation += hours;
                        break;
                    case 'ТН':
                        stats.sickLeave += hours;
                        break;
                    case 'ІН':
                        stats.otherAbsences += hours;
                        break;
                    case 'ВБ':
                        stats.basicVacation += hours;
                        break;
                }
            }
        }

        // Оновлюємо підсумкові поля
        const summaryValues = [
            stats.workedDays,
            stats.totalHours,
            stats.overtimeHours,
            stats.nightHours,
            stats.eveningHours,
            stats.holidayHours,
            stats.weekendDays,
            stats.basicVacation,
            stats.educationalVacation,
            stats.unpaidVacation,
            stats.maternityVacation,
            stats.childcareVacation,
            stats.additionalVacation,
            stats.sickLeave,
            stats.businessTrip,
            stats.otherAbsences
        ];

        summaryValues.forEach((value, index) => {
            const input = document.getElementById(`emp-${employeeId}-summary-${index}`);
            if (input) {
                input.value = value;
            }
        });
    }

    exportToExcel() {
        const table = document.getElementById('timesheetTable');
        if (!table) {
            alert('Спочатку згенеруйте табель!');
            return;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.table_to_sheet(table);
        
        const monthNames = [
            'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
            'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'
        ];
        
        const sheetName = `Табель_${monthNames[this.currentMonth]}_${this.currentYear}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        const fileName = `Табель_${monthNames[this.currentMonth]}_${this.currentYear}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', () => {
    new OriginalTimesheet();
});