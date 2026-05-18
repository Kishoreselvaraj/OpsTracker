/* ============================================================
   Aetram OpsTracker — EOD Submission Calendar JS v5.1
   FIXED: Row numbering, Calendar refresh, Modal sync, Form toggle
   Multi-row Form · Save Draft · Submit EOD · Full CRUD
   ============================================================ */

$(function () {

    /* ── API Configuration ─────────────────────────────────── */
    const API_BASE = ''; // Configure: e.g. 'https://api.example.com' or '' for relative
    const API = {
        workLogsByMonth: API_BASE + '/api/worklogs/month',
        categories: API_BASE + '/api/categories',
        subCategories: API_BASE + '/api/subcategories',
        saveDraft: API_BASE + '/api/WorkLog/save',  // Single endpoint for final submit
        deleteLog: API_BASE + '/api/worklogs/delete'
    };

    /* ── Demo data ───────────────────────────────────────── */
    const DEMO = {
        user: {
            userId: 1,
            name: "Rahul Kumar",
            employeeCode: "EMP-00412",
            taskGroup: "India",
            subGroup: "Dev QA",
            teamLead: "Priya S."
        },
        categories: [
            { categoryId: 1, name: "Development" },
            { categoryId: 2, name: "QA" },
            { categoryId: 3, name: "DevOps" },
            { categoryId: 4, name: "Design" }
        ],
        subCategories: [
            { subCategoryId: 1, categoryId: 1, name: "Frontend" },
            { subCategoryId: 2, categoryId: 1, name: "Backend" },
            { subCategoryId: 3, categoryId: 2, name: "Manual Testing" },
            { subCategoryId: 4, categoryId: 2, name: "Automation" },
            { subCategoryId: 5, categoryId: 3, name: "CI/CD" },
            { subCategoryId: 6, categoryId: 4, name: "UI/UX" }
        ],
        workLogs: [
            {
                workLogId: 1,
                userId: 1,
                categoryId: 2,
                subCategoryId: 3,
                workDate: "2026-05-01",
                hoursWorked: "08:00",
                workDescription: "Sprint planning and test case review",
                approvalStatus: "APPROVED",
                approvalBy: "Priya S.",
                status: "Completed",
                workflowLogDateId: 1
            },
            {
                workLogId: 2,
                userId: 1,
                categoryId: 1,
                subCategoryId: 2,
                workDate: "2026-05-02",
                hoursWorked: "09:30",
                workDescription: "API integration for payment gateway",
                approvalStatus: "PENDING",
                approvalBy: null,
                status: "In Progress",
                workflowLogDateId: 2
            },
            {
                workLogId: 3,
                userId: 1,
                categoryId: 2,
                subCategoryId: 4,
                workDate: "2026-05-05",
                hoursWorked: "08:00",
                workDescription: "Automated regression suite update",
                approvalStatus: "APPROVED",
                approvalBy: "Priya S.",
                status: "Completed",
                workflowLogDateId: 3
            },
            {
                workLogId: 4,
                userId: 1,
                categoryId: 2,
                subCategoryId: 3,
                workDate: "2026-05-06",
                hoursWorked: "08:00",
                workDescription: "Bug verification for sprint 24",
                approvalStatus: "REJECTED",
                approvalBy: "Priya S.",
                reasonForReject: "Incorrect hours logged. Please verify and resubmit.",
                status: "In Progress",
                workflowLogDateId: 4
            },
            {
                workLogId: 5,
                userId: 1,
                categoryId: 1,
                subCategoryId: 1,
                workDate: "2026-05-07",
                hoursWorked: "08:00",
                workDescription: "Dashboard component refactoring",
                approvalStatus: "DRAFT",
                approvalBy: null,
                status: "In Progress",
                workflowLogDateId: 5
            },
            {
                workLogId: 6,
                userId: 1,
                categoryId: 2,
                subCategoryId: 3,
                workDate: "2026-05-08",
                hoursWorked: "08:00",
                workDescription: "Smoke testing for release candidate",
                approvalStatus: "PENDING",
                approvalBy: null,
                status: "In Progress",
                workflowLogDateId: 6
            },
            {
                workLogId: 7,
                userId: 1,
                categoryId: 2,
                subCategoryId: 4,
                workDate: "2026-05-12",
                hoursWorked: "08:00",
                workDescription: "Selenium script maintenance",
                approvalStatus: "APPROVED",
                approvalBy: "Priya S.",
                status: "Completed",
                workflowLogDateId: 7
            },
            {
                workLogId: 8,
                userId: 1,
                categoryId: 1,
                subCategoryId: 2,
                workDate: "2026-05-13",
                hoursWorked: "06:00",
                workDescription: "Regression testing — Auth module",
                approvalStatus: "DRAFT",
                approvalBy: null,
                status: "In Progress",
                workflowLogDateId: 8
            },
            {
                workLogId: 9,
                userId: 1,
                categoryId: 2,
                subCategoryId: 3,
                workDate: "2026-05-13",
                hoursWorked: "02:00",
                workDescription: "Bug documentation for sprint review",
                approvalStatus: "DRAFT",
                approvalBy: null,
                status: "In Progress",
                workflowLogDateId: 8
            }
        ]
    };

    /* ── State ───────────────────────────────────────────── */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
    let selectedDate = null;
    let workLogsData = [];
    let categoriesData = [];
    let subCategoriesData = [];
    let editingWorkflowLogDateId = 0;
    let draftLogs = [];
    let isFormVisible = false;
    let nextRowId = 0; // Unique ID for each row to prevent index conflicts
    let pendingDraftData = null; // Store draft data in memory until submit

    /* ── Helpers ─────────────────────────────────────────── */
    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function parseDate(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function formatDisplayDate(date) {
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    function getMonthYear(date) {
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    function getLogsForDate(dateStr) {
        return workLogsData.filter(log => log.workDate === dateStr);
    }

    function getTotalHours(logs) {
        if (!logs || logs.length === 0) return 0;
        return logs.reduce((sum, log) => {
            const h = parseTimeToDecimal(log.hoursWorked);
            return sum + h;
        }, 0);
    }

    function parseTimeToDecimal(timeStr) {
        if (!timeStr) return 0;
        if (typeof timeStr === 'number') return timeStr;
        const parts = timeStr.split(':');
        const h = parseInt(parts[0]) || 0;
        const m = parseInt(parts[1]) || 0;
        return h + m / 60;
    }

    function formatDecimalToTime(decimal) {
        const totalMinutes = Math.round(decimal * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }

    function getDayStatus(logs) {
        if (!logs || logs.length === 0) return null;
        const statuses = logs.map(l => l.approvalStatus);
        if (statuses.includes('PENDING')) return 'inprogress';
        if (statuses.includes('CORRECTION')) return 'inprogress';
        if (statuses.includes('REJECTED')) return 'inprogress';
        if (statuses.includes('DRAFT')) return 'draft';
        if (statuses.every(s => s === 'APPROVED')) return 'completed';
        return 'inprogress';
    }

    function statusLabel(status) {
        const map = { 'APPROVED': 'Approved', 'PENDING': 'Pending', 'REJECTED': 'Rejected', 'CORRECTION': 'Correction', 'DRAFT': 'Draft' };
        return map[status] || status;
    }

    function statusBadgeClass(status) {
        const map = { 'APPROVED': 'es-approved', 'PENDING': 'es-pending', 'REJECTED': 'es-rejected', 'CORRECTION': 'es-correction', 'DRAFT': 'es-draft' };
        return map[status] || 'es-pending';
    }

    function isFutureDate(dateStr) {
        const d = parseDate(dateStr);
        d.setHours(0, 0, 0, 0);
        return d > today;
    }

    function isSameMonth(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
    }

    function isDayReadOnly(logs) {
        if (!logs || logs.length === 0) return false;
        return logs.some(l => l.approvalStatus === 'PENDING' || l.approvalStatus === 'APPROVED');
    }

    function isDayDraftOnly(logs) {
        if (!logs || logs.length === 0) return false;
        return logs.every(l => l.approvalStatus === 'DRAFT' || l.approvalStatus === 'REJECTED');
    }

    function isDayEditable(logs) {
        if (!logs || logs.length === 0) return true;
        return logs.every(l => l.approvalStatus === 'DRAFT' || l.approvalStatus === 'REJECTED');
    }

    /* ── Calendar rendering ──────────────────────────────── */
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        $('#cal-month-year').text(getMonthYear(currentDate));

        const nextMonth = new Date(year, month + 1, 1);
        const canGoNext = nextMonth <= new Date(today.getFullYear(), today.getMonth(), 1);
        $('#btn-next-month').prop('disabled', !canGoNext).toggleClass('disabled', !canGoNext);

        const firstDay = new Date(year, month, 1);
        let startingDay = firstDay.getDay() - 1;
        if (startingDay < 0) startingDay = 6;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();
        const todayStr = formatDate(today);

        let html = '';
        let dayCount = 0;

        for (let i = startingDay - 1; i >= 0; i--) {
            const dayNum = prevMonthDays - i;
            const dateStr = formatDate(new Date(year, month - 1, dayNum));
            html += buildDayCell(dayNum, dateStr, [], true, false, true);
            dayCount++;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = formatDate(new Date(year, month, day));
            const isToday = dateStr === todayStr;
            const isFuture = isFutureDate(dateStr);
            const logs = getLogsForDate(dateStr);
            html += buildDayCell(day, dateStr, logs, false, isToday, isFuture);
            dayCount++;
        }

        const remaining = 42 - dayCount;
        for (let day = 1; day <= remaining; day++) {
            const dateStr = formatDate(new Date(year, month + 1, day));
            html += buildDayCell(day, dateStr, [], true, false, true);
            dayCount++;
        }

        $('#cal-grid').html(html);
    }

    function buildDayCell(dayNum, dateStr, logs, isOtherMonth, isToday = false, isDisabled = false) {
        const totalHours = getTotalHours(logs);
        const status = getDayStatus(logs);
        const todayClass = isToday ? 'today' : '';
        const otherClass = isOtherMonth ? 'other-month' : '';
        const selectedClass = (selectedDate === dateStr) ? 'selected' : '';
        const disabledClass = isDisabled ? 'disabled-day' : '';

        let contentHtml = '';
        let progressHtml = '';
        let statusHtml = '';
        let addBtnHtml = '';

        if (logs.length > 0) {
            const pct = Math.min((totalHours / 8.4) * 100, 100);
            progressHtml = `
                <div class="day-progress-wrap">
                    <div class="day-progress-label">${totalHours.toFixed(1)}h / 8.4h</div>
                    <div class="day-progress-track">
                        <div class="day-progress-fill" style="width:${pct}%"></div>
                    </div>
                </div>`;

            const entriesHtml = logs.slice(0, 3).map(log => {
                const cat = categoriesData.find(c => c.categoryId === log.categoryId);
                return `
                    <div class="day-entry">
                        <div class="day-entry-desc">${escapeHtml(log.workDescription.split('\n')[0])}</div>
                        <div class="day-entry-hours">${log.hoursWorked} · ${cat ? cat.name : 'Unknown'}</div>
                    </div>
                `;
            }).join('');

            const moreCount = logs.length > 3 ? `<div class="day-entry-more">+${logs.length - 3} more</div>` : '';
            contentHtml = `<div class="day-content">${entriesHtml}${moreCount}</div>`;

            const approvalStatus = logs[0]?.approvalStatus;
            if (approvalStatus) {
                statusHtml = `
                    <div class="day-status ${statusBadgeClass(approvalStatus)}">
                        <span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block"></span>
                        ${statusLabel(approvalStatus)}
                    </div>`;
            }
        } else if (!isOtherMonth && !isDisabled) {
            addBtnHtml = `
                <div class="day-add-btn">
                    <span>+</span> Add Entry
                </div>`;
        }

        return `
            <div class="cal-day ${todayClass} ${otherClass} ${selectedClass} ${disabledClass}" data-date="${dateStr}" ${isDisabled ? 'data-disabled="true"' : ''}>
                <div class="day-number">${dayNum}</div>
                ${progressHtml}
                ${contentHtml}
                ${statusHtml}
                ${addBtnHtml}
            </div>
        `;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* ── Month-wise data loading ────────────────────────── */
    function loadWorkLogsByMonth(year, month) {
        $('#cal-grid').html(`
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
            <div class="cal-day skeleton" style="height:170px"></div>
        `);

        const apiMonth = month + 1;

        $.ajax({
            url: API.workLogsByMonth,
            method: 'GET',
            dataType: 'json',
            data: { year: year, month: apiMonth }
        }).done(function (data) {
            workLogsData = Array.isArray(data) ? data : (data.logs || []);
            renderCalendar();
        }).fail(function () {
            console.info('[EOD] Demo fallback for month:', year, apiMonth);
            workLogsData = DEMO.workLogs.filter(log => {
                const [y, m] = log.workDate.split('-').map(Number);
                return y === year && m === apiMonth;
            });
            renderCalendar();
        });
    }

    /* ── Modal handling ───────────────────────────────────── */
    function openModal(dateStr) {
        if (isFutureDate(dateStr)) {
            showToast('Cannot log work for future dates');
            return;
        }
        if (!isSameMonth(parseDate(dateStr), currentDate)) {
            showToast('Please select a date within the current month');
            return;
        }

        selectedDate = dateStr;
        const date = parseDate(dateStr);
        const logs = getLogsForDate(dateStr);

        $('#modal-date').text(formatDisplayDate(date));
        $('#modal-date-short').text(dateStr);
        $('#workDate').val(dateStr);

        // Determine workflowLogDateId from existing logs
        editingWorkflowLogDateId = 0;
        if (logs.length > 0 && logs[0].workflowLogDateId) {
            editingWorkflowLogDateId = logs[0].workflowLogDateId;
        }

        // Check if day is read-only (submitted)
        const readOnly = isDayReadOnly(logs);
        const editable = isDayEditable(logs);

        renderModalEntries(logs, readOnly);

        // Show/hide form and buttons based on state
        if (logs.length === 0) {
            // Empty day - show Add Entry button, hide form
            hideForm();
            $('#btn-show-form').show();
        } else if (editable) {
            // Has draft/rejected entries - show Add Entry button, hide form initially
            hideForm();
            $('#btn-show-form').show();
        } else {
            // Read-only - hide everything
            hideForm();
            $('#btn-show-form').hide();
        }

        updateSubmitEodButton(logs, readOnly);

        $('#eod-modal').addClass('active');
        $('body').css('overflow', 'hidden');
        $('.cal-day').removeClass('selected');
        $(`.cal-day[data-date="${dateStr}"]`).addClass('selected');
    }

    function closeModal() {
        $('#eod-modal').removeClass('active');
        $('body').css('overflow', '');
        $('.cal-day').removeClass('selected');
        selectedDate = null;
        editingWorkflowLogDateId = 0;
        draftLogs = [];
        isFormVisible = false;
        nextRowId = 0;
        pendingDraftData = null; // Clear pending draft when closing modal
        hideForm();
    }

    function updateSubmitEodButton(logs, readOnly) {
        const $btn = $('#btn-submit-eod');
        if (readOnly || logs.length === 0) {
            $btn.hide();
        } else {
            $btn.show().prop('disabled', false).text('🚀 Submit EOD');
        }
    }

    /* ── Form Visibility ────────────────────────────────── */
    function showForm(title, prefillData = null) {
        isFormVisible = true;
        nextRowId = 0;
        $('#form-title').text(title);

        if (prefillData && prefillData.logs && prefillData.logs.length > 0) {
            draftLogs = prefillData.logs.map(log => ({...log, _rowId: nextRowId++}));
        } else {
            draftLogs = [];
        }

        renderDraftRows();

        $('#new-entry-form').slideDown(250, function() {
            // Scroll to form
            $('#new-entry-form')[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        $('#btn-show-form').hide();
        $('#btn-save-draft').show();
        $('#btn-cancel-form').show();
    }

    function hideForm() {
        isFormVisible = false;
        $('#new-entry-form').slideUp(200);
        $('#btn-show-form').show();
        $('#btn-save-draft').hide();
        $('#btn-cancel-form').hide();
        draftLogs = [];
        nextRowId = 0;
        $('#draft-rows-container').empty();
        $('#form-title').text('➕ Add New Entry');
    }

    /* ── Render entries list in modal ───────────────────── */
    function renderModalEntries(logs, readOnly = false) {
        const count = logs.length;
        $('#entries-count').text(`${count} entr${count === 1 ? 'y' : 'ies'}`);

        if (count === 0) {
            $('#entries-list').html(`
                <div style="text-align:center;padding:32px 0;color:var(--text-3);font-size:13px">
                    No entries for this day.<br>Click "Add Entry" to create your first log.
                </div>
            `);
            return;
        }

        const html = logs.map(log => {
            const cat = categoriesData.find(c => c.categoryId === log.categoryId);
            const subCat = subCategoriesData.find(s => s.subCategoryId === log.subCategoryId);

            const rejectReason = log.reasonForReject ?
                `<div class="entry-reject-reason">${escapeHtml(log.reasonForReject)}</div>` : '';

            // Edit/Delete only for DRAFT or REJECTED
            const canEdit = ['DRAFT', 'REJECTED'].includes(log.approvalStatus);
            const canDelete = log.approvalStatus === 'DRAFT';

            return `
                <div class="entry-item" data-logid="${log.workLogId}">
                    <div class="entry-main">
                        <div class="entry-header-row">
                            <span class="entry-status-badge ${statusBadgeClass(log.approvalStatus)}">
                                <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block"></span>
                                ${statusLabel(log.approvalStatus)}
                            </span>
                            ${log.approvalBy ? `<span class="entry-approver">by ${escapeHtml(log.approvalBy)}</span>` : ''}
                        </div>
                        <div class="entry-desc">${escapeHtml(log.workDescription).replace(/\n/g, '<br>')}</div>
                        <div class="entry-meta">
                            <span>⏱ ${log.hoursWorked}</span>
                            <span>📁 ${cat ? cat.name : 'Unknown'}${subCat ? ' › ' + subCat.name : ''}</span>
                            <span>📊 ${log.status || 'In Progress'}</span>
                        </div>
                        ${rejectReason}
                    </div>
                    <div class="entry-hours">${log.hoursWorked}</div>
                    <div class="entry-actions">
                        ${canEdit ? `<button class="entry-btn btn-edit-entry" data-logid="${log.workLogId}" title="Edit">✎</button>` : ''}
                        ${canDelete ? `<button class="entry-btn delete btn-delete-entry" data-logid="${log.workLogId}" title="Delete">🗑</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        $('#entries-list').html(html);
    }

    /* ── Multi-row Draft Form ───────────────────────────── */
    function renderDraftRows() {
        const $container = $('#draft-rows-container');
        $container.empty();

        if (draftLogs.length === 0) {
            addDraftRow();
            return;
        }

        draftLogs.forEach((log, index) => {
            const html = buildDraftRowHtml(log._rowId, index + 1, log);
            $container.append(html);

            // Populate the row
            const $row = $(`.draft-row[data-rowid="${log._rowId}"]`);
            $row.find('.draft-category').val(log.categoryId || '');
            loadSubCategoriesForDraftRow($row, log.categoryId, log.subCategoryId);
            $row.find('.draft-hours').val(log.hoursWorked || '');
            $row.find('.draft-status').val(log.status || 'In Progress');
            $row.find('.draft-desc').val(log.workDescription || '');
            $row.find('.draft-logid').val(log.workLogId || 0);

            // Attach time input handler
            attachTimeInputHandler($row.find('.draft-hours'));
        });
    }

    function buildDraftRowHtml(rowId, displayNumber, log) {
        const catOptions = categoriesData.map(c =>
            `<option value="${c.categoryId}">${escapeHtml(c.name)}</option>`
        ).join('');

        const statusOptions = ['Yet to Start', 'In Progress', 'Completed'];
        const statusSelectOptions = statusOptions.map(s =>
            `<option value="${s}">${s}</option>`
        ).join('');

        return `
            <div class="draft-row" data-rowid="${rowId}">
                <input type="hidden" class="draft-logid" value="${log.workLogId || 0}" />
                <div class="draft-row-header">
                    <span class="draft-row-number">LOG #${displayNumber}</span>
                    <button type="button" class="draft-row-remove" data-rowid="${rowId}" title="Remove this log">×</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select class="form-select draft-category">
                            <option value="">Select category</option>
                            ${catOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Sub-Category</label>
                        <select class="form-select draft-subcategory" disabled>
                            <option value="">Select sub-category</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Hours Worked</label>
                        <input type="text" class="form-input draft-hours custom-time-input" placeholder="08:00" maxlength="5" autocomplete="off" inputmode="numeric" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status <span style="color:var(--red)">*</span></label>
                        <select class="form-select draft-status">
                            ${statusSelectOptions}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Work Description</label>
                    <textarea class="form-textarea draft-desc" placeholder="Describe your work for this log…"></textarea>
                </div>
            </div>
        `;
    }

    function addDraftRow() {
        const newLog = {
            _rowId: nextRowId++,
            workLogId: 0,
            categoryId: '',
            subCategoryId: '',
            hoursWorked: '',
            status: 'In Progress',
            workDescription: ''
        };
        draftLogs.push(newLog);
        const displayNumber = draftLogs.length;
        const html = buildDraftRowHtml(newLog._rowId, displayNumber, newLog);
        $('#draft-rows-container').append(html);

        const $newRow = $(`.draft-row[data-rowid="${newLog._rowId}"]`);
        attachTimeInputHandler($newRow.find('.draft-hours'));

        // Scroll to new row
        $newRow[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function removeDraftRow(rowId) {
        if (draftLogs.length <= 1) {
            showToast('At least one log row is required');
            return;
        }
        const index = draftLogs.findIndex(l => l._rowId === rowId);
        if (index >= 0) {
            draftLogs.splice(index, 1);
            $(`.draft-row[data-rowid="${rowId}"]`).remove();
            // Renumber remaining rows
            $('.draft-row').each(function(idx) {
                $(this).find('.draft-row-number').text('LOG #' + (idx + 1));
            });
        }
    }

    function loadSubCategoriesForDraftRow($row, categoryId, selectedSubId = null) {
        const $sub = $row.find('.draft-subcategory');
        if (!categoryId) {
            $sub.html('<option value="">Select sub-category</option>').prop('disabled', true);
            return;
        }
        const subs = subCategoriesData.filter(s => s.categoryId == categoryId);
        let html = '<option value="">Select sub-category</option>';
        subs.forEach(s => {
            const selected = s.subCategoryId == selectedSubId ? 'selected' : '';
            html += `<option value="${s.subCategoryId}" ${selected}>${escapeHtml(s.name)}</option>`;
        });
        $sub.html(html).prop('disabled', subs.length === 0);
    }

    function attachTimeInputHandler($input) {
        $input.off('input.timeformat keydown.timeformat');
        $input.on('input.timeformat', function () {
            let val = $(this).val().replace(/\D/g, '');
            if (val.length > 4) val = val.slice(0, 4);
            if (val.length === 4) {
                let hrs = val.slice(0, 2);
                let mins = val.slice(2, 4);
                if (parseInt(hrs, 10) > 23) hrs = '23';
                if (parseInt(mins, 10) > 59) mins = '59';
                $(this).val(hrs + ':' + mins);
            } else {
                $(this).val(val);
            }
        });
        $input.on('keydown.timeformat', function (e) {
            if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 37, 38, 39, 40]) !== -1) return;
            if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        });
    }

    /* ── Collect Form Data ──────────────────────────────── */
    function collectDraftData() {
        const logs = [];
        let hasError = false;

        $('.draft-row').each(function () {
            const $row = $(this);
            const categoryId = parseInt($row.find('.draft-category').val()) || 0;
            const subCategoryId = parseInt($row.find('.draft-subcategory').val()) || null;
            const hoursWorked = $row.find('.draft-hours').val().trim();
            const status = $row.find('.draft-status').val();
            const workDescription = $row.find('.draft-desc').val().trim();
            const workLogId = parseInt($row.find('.draft-logid').val()) || 0;

            // Skip completely empty rows
            if (!categoryId && !hoursWorked && !workDescription) {
                return true;
            }

            if (!categoryId) { showToast('Please select a category for all logs'); hasError = true; return false; }
            if (!subCategoryId) { showToast('Please select a sub-category for all logs'); hasError = true; return false; }
            if (!hoursWorked) { showToast('Please enter hours worked for all logs'); hasError = true; return false; }
            if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hoursWorked)) {
                showToast('Please enter valid time format (HH:MM) for all logs'); hasError = true; return false;
            }
            if (!workDescription) { showToast('Please enter work description for all logs'); hasError = true; return false; }

            logs.push({
                workLogId: workLogId,
                groupId: categoryId,
                subGroupId: subCategoryId,
                hoursWorked: hoursWorked,
                workStatus: status,
                workDescription: workDescription
            });
        });

        if (hasError) return null;
        if (logs.length === 0) { showToast('Please add at least one log entry'); return null; }

        return {
            workflowLogDateId: editingWorkflowLogDateId || 0,
            workDate: selectedDate,
            logs: logs
        };
    }

    /* ── Save Draft ─────────────────────────────────────── */
    function saveDraft() {
        const data = collectDraftData();
        if (!data) return;

        // Store draft data in memory only - no API call
        pendingDraftData = data;
        
        // Update local workLogsData for UI display
        const newWorkflowId = data.workflowLogDateId || Math.floor(Math.random() * 1000) + 10;

        // Remove old logs for this date and workflow
        workLogsData = workLogsData.filter(l => !(l.workDate === selectedDate && l.workflowLogDateId === newWorkflowId));

        // Add new/updated logs as DRAFT
        const savedLogs = data.logs.map((log, idx) => ({
            workLogId: log.workLogId || Math.max(...workLogsData.map(l => l.workLogId), 0) + idx + 1,
            userId: DEMO.user.userId,
            categoryId: log.groupId,
            subCategoryId: log.subGroupId,
            workDate: selectedDate,
            hoursWorked: log.hoursWorked,
            workDescription: log.workDescription,
            status: log.workStatus,
            approvalStatus: 'DRAFT',
            approvalBy: null,
            workflowLogDateId: newWorkflowId
        }));

        workLogsData.push(...savedLogs);
        editingWorkflowLogDateId = newWorkflowId;

        showToast('Draft saved locally!');
        handleSaveSuccess(null, data);
    }

    function handleSaveSuccess(response, data) {
        // Update editingWorkflowLogDateId from response
        if (response && response.workflowLogDateId) {
            editingWorkflowLogDateId = response.workflowLogDateId;
        }

        // Refresh calendar
        renderCalendar();

        // Refresh modal entries list
        const logs = getLogsForDate(selectedDate);
        const readOnly = isDayReadOnly(logs);
        renderModalEntries(logs, readOnly);
        updateSubmitEodButton(logs, readOnly);

        // Hide form and show Add Entry button
        hideForm();
        $('#btn-show-form').show();

        // Re-highlight selected date
        $('.cal-day').removeClass('selected');
        $(`.cal-day[data-date="${selectedDate}"]`).addClass('selected');
    }

    /* ── Submit EOD ─────────────────────────────────────── */
    function submitEod() {
        // Check if there's pending draft data in memory
        if (!pendingDraftData && draftLogs.length === 0) {
            const logs = getLogsForDate(selectedDate);
            if (logs.length === 0) {
                showToast('No entries to submit');
                return;
            }
        }

        // Use pending draft data if available, otherwise use existing logs
        let submitData;
        if (pendingDraftData) {
            // Submit the pending draft data
            submitData = {
                workDate: pendingDraftData.workDate,
                logs: pendingDraftData.logs
            };
        } else {
            // Submit existing logs for the date
            const logs = getLogsForDate(selectedDate);
            if (logs.length === 0) {
                showToast('No entries to submit');
                return;
            }
            submitData = {
                workDate: selectedDate,
                logs: logs.map(l => ({
                    groupId: l.categoryId,
                    subGroupId: l.subCategoryId,
                    hoursWorked: l.hoursWorked,
                    workStatus: l.status || 'In Progress',
                    workDescription: l.workDescription
                }))
            };
        }

        if (!confirm('Submit EOD for ' + selectedDate + '? This will lock the entries for review.')) {
            return;
        }

        $('#btn-submit-eod').prop('disabled', true).text('Submitting…');

        $.ajax({
            url: API.saveDraft,  // Use the save endpoint for final submission
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify(submitData)
        }).done(function (response) {
            $('#btn-submit-eod').prop('disabled', false).text('🚀 Submit EOD');
            showToast('EOD submitted successfully!');
            
            // Clear pending draft after successful submit
            pendingDraftData = null;
            
            handleSubmitSuccess();
        }).fail(function (xhr, status, error) {
            console.info('[EOD] Demo submit EOD for:', submitData);
            $('#btn-submit-eod').prop('disabled', false).text('🚀 Submit EOD');

            // Demo fallback - mark as pending
            workLogsData.forEach(l => {
                if (l.workDate === selectedDate) {
                    l.approvalStatus = 'PENDING';
                }
            });

            showToast('EOD submitted!');
            
            // Clear pending draft
            pendingDraftData = null;
            
            handleSubmitSuccess();
        });
    }

    function handleSubmitSuccess() {
        // Refresh calendar
        renderCalendar();

        // Refresh modal
        const logs = getLogsForDate(selectedDate);
        const readOnly = isDayReadOnly(logs);
        renderModalEntries(logs, readOnly);
        updateSubmitEodButton(logs, readOnly);

        // Hide form
        hideForm();
        $('#btn-show-form').hide();

        // Re-highlight
        $('.cal-day').removeClass('selected');
        $(`.cal-day[data-date="${selectedDate}"]`).addClass('selected');
    }

    /* ── CRUD: Delete individual log ────────────────────── */
    function deleteEntry(logId) {
        if (!confirm('Delete this entry?')) return;

        $.ajax({
            url: API.deleteLog,
            method: 'DELETE',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({ workLogId: logId })
        }).done(function () {
            workLogsData = workLogsData.filter(l => l.workLogId !== logId);
            showToast('Entry deleted');
            refreshAfterDelete();
        }).fail(function () {
            workLogsData = workLogsData.filter(l => l.workLogId !== logId);
            showToast('Entry deleted');
            refreshAfterDelete();
        });
    }

    function refreshAfterDelete() {
        renderCalendar();
        const logs = getLogsForDate(selectedDate);
        const readOnly = isDayReadOnly(logs);
        renderModalEntries(logs, readOnly);
        updateSubmitEodButton(logs, readOnly);

        if (logs.length === 0) {
            $('#btn-show-form').show();
            hideForm();
        }

        $('.cal-day').removeClass('selected');
        $(`.cal-day[data-date="${selectedDate}"]`).addClass('selected');
    }

    /* ── Edit Entry: Load into form ─────────────────────── */
    function editEntry(logId) {
        const log = workLogsData.find(l => l.workLogId === logId);
        if (!log) return;

        // Find all logs for this date with same workflowLogDateId
        const dateLogs = getLogsForDate(selectedDate);
        const workflowId = log.workflowLogDateId || editingWorkflowLogDateId;

        // Get all logs belonging to this workflow
        const workflowLogs = dateLogs.filter(l => (l.workflowLogDateId || 0) === (workflowId || 0));

        editingWorkflowLogDateId = workflowId || 0;

        // Convert to draft format
        draftLogs = workflowLogs.map(l => ({
            _rowId: nextRowId++,
            workLogId: l.workLogId,
            categoryId: l.categoryId,
            subCategoryId: l.subCategoryId,
            hoursWorked: l.hoursWorked,
            status: l.status || 'In Progress',
            workDescription: l.workDescription
        }));

        showForm('✎ Edit Entry', { logs: draftLogs });
    }

    /* ── Toast ──────────────────────────────────────────── */
    function showToast(msg) {
        // Remove existing toasts
        $('.toast').remove();
        const $t = $('<div class="toast">').text(msg).appendTo('body');
        setTimeout(() => $t.addClass('show'), 10);
        setTimeout(() => { $t.removeClass('show'); setTimeout(() => $t.remove(), 300); }, 2800);
    }

    /* ── Data loading ───────────────────────────────────── */
    function loadData() {
        $.ajax({
            url: API.categories,
            method: 'GET',
            dataType: 'json'
        }).done(function (data) {
            categoriesData = data;
        }).fail(function () {
            categoriesData = DEMO.categories;
        });

        $.ajax({
            url: API.subCategories,
            method: 'GET',
            dataType: 'json'
        }).done(function (data) {
            subCategoriesData = data;
        }).fail(function () {
            subCategoriesData = DEMO.subCategories;
        });

        loadWorkLogsByMonth(currentDate.getFullYear(), currentDate.getMonth());
    }

    /* ── Event bindings ─────────────────────────────────── */

    // Calendar nav
    $('#btn-prev-month').on('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        loadWorkLogsByMonth(currentDate.getFullYear(), currentDate.getMonth());
    });

    $('#btn-next-month').on('click', () => {
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        if (nextMonth <= new Date(today.getFullYear(), today.getMonth(), 1)) {
            currentDate.setMonth(currentDate.getMonth() + 1);
            loadWorkLogsByMonth(currentDate.getFullYear(), currentDate.getMonth());
        }
    });

    // Day click
    $(document).on('click', '.cal-day', function () {
        const $this = $(this);
        if ($this.data('disabled') === true) return;
        openModal($this.data('date'));
    });

    // Modal close
    $('#modal-close, #btn-cancel').on('click', closeModal);
    $('#eod-modal').on('click', function (e) { if (e.target === this) closeModal(); });

    // Show form (Add Entry)
    $(document).on('click', '#btn-show-form', function () {
        editingWorkflowLogDateId = 0;
        showForm('➕ Add New Entry');
    });

    // Cancel form
    $(document).on('click', '#btn-cancel-form', function () {
        hideForm();
        $('#btn-show-form').show();
    });

    // Add another log row
    $(document).on('click', '#btn-add-row', function () {
        addDraftRow();
    });

    // Remove draft row
    $(document).on('click', '.draft-row-remove', function () {
        const rowId = parseInt($(this).data('rowid'));
        removeDraftRow(rowId);
    });

    // Category change in draft row
    $(document).on('change', '.draft-category', function () {
        const $row = $(this).closest('.draft-row');
        const catId = $(this).val();
        loadSubCategoriesForDraftRow($row, catId);
    });

    // Save Draft
    $(document).on('click', '#btn-save-draft', function (e) {
        e.preventDefault();
        saveDraft();
    });

    // Submit EOD
    $(document).on('click', '#btn-submit-eod', function (e) {
        e.preventDefault();
        submitEod();
    });

    // Edit entry
    $(document).on('click', '.btn-edit-entry', function (e) {
        e.stopPropagation();
        editEntry($(this).data('logid'));
    });

    // Delete entry
    $(document).on('click', '.btn-delete-entry', function (e) {
        e.stopPropagation();
        deleteEntry($(this).data('logid'));
    });

    // Keyboard
    $(document).on('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

    /* ── Bootstrap ────────────────────────────────────── */
    loadData();
});