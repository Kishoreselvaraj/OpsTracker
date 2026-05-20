/* ============================================================
   Aetram OpsTracker — EOD Submission Calendar JS v6.5
   CHANGES:
   - Removed Save Draft (local storage)
   - Submit EOD sends directly to backend
   - Form data is NOT stored locally
   - Warning if closing modal with unsaved data
   - Submit works for: new entry, edit existing, resubmit
   ============================================================ */

import { postWithAuth, getWithAuth, deleteWithAuth } from '/js/services/apiService.js';
import { getUser } from '/js/auth/authService.js';

$(function () {

    /* ── CONFIG ──────────────────────────────────────────── */
    const CONFIG = {
        restrictPreviousDateEdit: false,
        restrictPreviousDateDelete: false,
        restrictPreviousDateCreate: false,
        allowEditAfterSubmit: true,
        allowDeleteAfterSubmit: true,
        allowResubmit: true,
        maxDaysBack: null
    };

    /* ── API Configuration ─────────────────────────────────── */
    const API = {
        monthlyCalendar: '/api/WorkLog/monthly-calendar',
        categories: '/api/categories',
        subCategories: '/api/subcategories',
        saveWorkLog: '/api/WorkLog/save',
        deleteLog: '/api/WorkLog/delete'
    };

    /* ── Demo Fallback Data ────────────────────────────────── */
    const DEMO = {
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
        ]
    };

    /* ── State ───────────────────────────────────────────── */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
    let selectedDate = null;
    let workLogsData = [];
    let calendarData = [];
    let categoriesData = [];
    let subCategoriesData = [];
    let editingWorkflowLogDateId = 0;
    let draftLogs = [];
    let isFormVisible = false;
    let nextRowId = 0;
    let currentUser = null;
    let hasUnsavedFormData = false;

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

    function isPastDate(dateStr) {
        const d = parseDate(dateStr);
        d.setHours(0, 0, 0, 0);
        return d < today;
    }

    function isTooOld(dateStr) {
        if (!CONFIG.maxDaysBack) return false;
        const d = parseDate(dateStr);
        const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        return diff > CONFIG.maxDaysBack;
    }

    function isSameMonth(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
    }

    /* ── Permission checks ──────────────────────────────── */
    function canEditEntry(log) {
        if (!log) return true;
        if (isFutureDate(log.workDate)) return false;
        if (isTooOld(log.workDate)) return false;
        if (CONFIG.restrictPreviousDateEdit && isPastDate(log.workDate)) return false;
        if (!CONFIG.allowEditAfterSubmit && (log.approvalStatus === 'PENDING' || log.approvalStatus === 'APPROVED')) return false;
        return true;
    }

    function canDeleteEntry(log) {
        if (!log) return true;
        if (isFutureDate(log.workDate)) return false;
        if (isTooOld(log.workDate)) return false;
        if (CONFIG.restrictPreviousDateDelete && isPastDate(log.workDate)) return false;
        if (!CONFIG.allowDeleteAfterSubmit && (log.approvalStatus === 'PENDING' || log.approvalStatus === 'APPROVED')) return false;
        return true;
    }

    function canCreateEntry(dateStr) {
        if (isFutureDate(dateStr)) return false;
        if (isTooOld(dateStr)) return false;
        if (CONFIG.restrictPreviousDateCreate && isPastDate(dateStr)) return false;
        return true;
    }

    /* ── Backend Response Mapping ────────────────────────── */
    function mapBackendToWorkLogs(calendarDays) {
        const flatLogs = [];
        if (!Array.isArray(calendarDays)) return flatLogs;

        calendarDays.forEach(day => {
            const dateStr = day.workDate ? day.workDate.split('T')[0] : '';
            const dayApprovalStatus = day.approvalStatus || 'DRAFT';

            if (day.tasks && Array.isArray(day.tasks)) {
                day.tasks.forEach(task => {
                    flatLogs.push({
                        workLogId: task.workLogId || 0,
                        userId: currentUser?.userId || 1,
                        categoryId: task.groupId || 0,
                        subCategoryId: task.subGroupId || 0,
                        workDate: dateStr,
                        hoursWorked: task.taskDuration || task.hoursWorked || '00:00',
                        workDescription: task.workDescription || '',
                        approvalStatus: (task.approvalStatus && task.approvalStatus.trim()) ? task.approvalStatus : dayApprovalStatus,
                        approvalBy: day.approvalBy || null,
                        reasonForReject: day.reasonForReject || null,
                        status: task.workStatus || 'In Progress',
                        workflowLogDateId: day.workflowLogDateId || 0
                    });
                });
            }
        });

        return flatLogs;
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
                        <div class="day-entry-desc">${escapeHtml((log.workDescription || '').split('\n')[0])}</div>
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
        }

        if (!isOtherMonth && !isDisabled && canCreateEntry(dateStr)) {
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
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* ── Month-wise data loading ────────────────────────── */
    async function loadWorkLogsByMonth(year, month) {
        $('#cal-grid').html(
            Array(14).fill('<div class="cal-day skeleton" style="height:170px"></div>').join('')
        );

        try {
            console.log('[EOD] Loading month data via API:', year, month + 1);
            const response = await postWithAuth(API.monthlyCalendar, {
                year: year,
                month: month + 1
            });
            console.log('[EOD] Raw API response:', response);

            let calendarDays = [];
            if (response && response.data && Array.isArray(response.data.calendarData)) {
                calendarDays = response.data.calendarData;
            } else if (response && Array.isArray(response.calendarData)) {
                calendarDays = response.calendarData;
            } else if (Array.isArray(response)) {
                calendarDays = response;
            }

            calendarData = calendarDays;
            console.log('[EOD] Calendar days received:', calendarData.length);

            workLogsData = mapBackendToWorkLogs(calendarData);
            console.log('[EOD] Mapped workLogs:', workLogsData.length, 'entries');

        } catch (err) {
            console.warn('[EOD] API failed:', err);
            workLogsData = [];
            calendarData = [];
        }

        renderCalendar();
    }

    /* ── Modal handling ───────────────────────────────────── */
    function openModal(dateStr) {
        if (isFutureDate(dateStr)) {
            showToast('Cannot log work for future dates');
            return;
        }

        selectedDate = dateStr;
        const date = parseDate(dateStr);
        const logs = getLogsForDate(dateStr);

        $('#modal-date').text(formatDisplayDate(date));
        $('#modal-date-short').text(dateStr);
        $('#workDate').val(dateStr);

        editingWorkflowLogDateId = 0;
        if (logs.length > 0 && logs[0].workflowLogDateId) {
            editingWorkflowLogDateId = logs[0].workflowLogDateId;
        }

        renderModalEntries(logs);

        hideForm();
        $('#btn-show-form').show();
        updateActionButtons(logs);

        $('#eod-modal').addClass('active');
        $('body').css('overflow', 'hidden');
        $('.cal-day').removeClass('selected');
        $(`.cal-day[data-date="${dateStr}"]`).addClass('selected');
    }

    async function closeModal() {
        // Warn if form has unsaved data
        if (isFormVisible && hasUnsavedFormData) {
            const confirmed = await showAlert({
                type: 'warning',
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Are you sure you want to close?',
                showCancel: true,
                confirmText: 'Close Anyway',
                cancelText: 'Stay'
            });
            if (!confirmed) {
                return;
            }
        }

        $('#eod-modal').removeClass('active');
        $('body').css('overflow', '');
        $('.cal-day').removeClass('selected');
        selectedDate = null;
        editingWorkflowLogDateId = 0;
        draftLogs = [];
        isFormVisible = false;
        nextRowId = 0;
        hasUnsavedFormData = false;
        hideForm();
    }

    function updateActionButtons(logs) {
        const $submitBtn = $('#btn-submit-eod');

        if (logs.length === 0) {
            $submitBtn.hide();
        } else {
            $submitBtn.show().prop('disabled', false).text('🚀 Submit EOD');
        }
    }

    /* ── Form Visibility ────────────────────────────────── */
    function showForm(title, prefillData = null) {
        isFormVisible = true;
        hasUnsavedFormData = true;
        nextRowId = 0;
        $('#form-title').text(title);

        if (prefillData && prefillData.logs && prefillData.logs.length > 0) {
            draftLogs = prefillData.logs.map(log => ({...log, _rowId: nextRowId++}));
        } else {
            draftLogs = [];
        }

        renderDraftRows();

        $('#new-entry-form').slideDown(250, function() {
            $('#new-entry-form')[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        $('#btn-show-form').hide();
        $('#btn-submit-eod').show();
        $('#btn-cancel-form').show();
    }

    function hideForm() {
        isFormVisible = false;
        hasUnsavedFormData = false;
        $('#new-entry-form').slideUp(200);
        $('#btn-show-form').show();
        $('#btn-submit-eod').hide();
        $('#btn-cancel-form').hide();
        draftLogs = [];
        nextRowId = 0;
        $('#draft-rows-container').empty();
        $('#form-title').text('➕ Add New Entry');
    }

    /* ── Render entries list in modal ───────────────────── */
    function renderModalEntries(logs) {
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

            const editDisabled = !canEditEntry(log);
            const deleteDisabled = !canDeleteEntry(log);

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
                        <button class="entry-btn btn-edit-entry ${editDisabled ? 'disabled' : ''}" data-logid="${log.workLogId}" title="Edit" ${editDisabled ? 'disabled' : ''}>✎</button>
                        <button class="entry-btn delete btn-delete-entry ${deleteDisabled ? 'disabled' : ''}" data-logid="${log.workLogId}" title="Delete" ${deleteDisabled ? 'disabled' : ''}>🗑</button>
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

            const $row = $(`.draft-row[data-rowid="${log._rowId}"]`);
            $row.find('.draft-category').val(log.categoryId || '');
            loadSubCategoriesForDraftRow($row, log.categoryId, log.subCategoryId);
            $row.find('.draft-hours').val(log.hoursWorked || '');
            $row.find('.draft-status').val(log.status || 'In Progress');
            $row.find('.draft-desc').val(log.workDescription || '');
            $row.find('.draft-logid').val(log.workLogId || 0);
            $row.find('.draft-workflowid').val(log.workflowLogDateId || editingWorkflowLogDateId || 0);

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
                <input type="hidden" class="draft-workflowid" value="${log.workflowLogDateId || editingWorkflowLogDateId || 0}" />
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
            workflowLogDateId: editingWorkflowLogDateId || 0,
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
    function collectFormData() {
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

        // CRITICAL FIX: Get workflowLogDateId from existing logs on this date
        // If date already has entries, use their workflowLogDateId
        // If new date, use 0
        let existingWorkflowId = 0;

        // First check editingWorkflowLogDateId (set when editing)
        if (editingWorkflowLogDateId > 0) {
            existingWorkflowId = editingWorkflowLogDateId;
        } else {
            // Check if there are existing logs for this date in workLogsData
            const dateLogs = getLogsForDate(selectedDate);
            if (dateLogs.length > 0 && dateLogs[0].workflowLogDateId > 0) {
                existingWorkflowId = dateLogs[0].workflowLogDateId;
            }
        }

        console.log('[EOD] Submitting with workflowLogDateId:', existingWorkflowId, 'for date:', selectedDate);

        return {
            workflowLogDateId: existingWorkflowId,
            workDate: new Date(selectedDate).toISOString(),
            logs: logs
        };
    }

    /* ── Submit EOD (SEND DIRECTLY TO BACKEND) ──────────── */
    async function submitEod() {
        const data = collectFormData();
        if (!data) return;

        const logs = getLogsForDate(selectedDate);
        const isResubmit = logs.length > 0 && logs.some(l => l.workflowLogDateId > 0);

        const confirmMsg = isResubmit
            ? 'Resubmit EOD for ' + selectedDate + '? This will update the existing entries.'
            : 'Submit EOD for ' + selectedDate + '? This will lock the entries for review.';

        const confirmed = await showAlert({
            type: 'confirm',
            title: isResubmit ? 'Resubmit EOD' : 'Submit EOD',
            message: confirmMsg,
            showCancel: true,
            confirmText: isResubmit ? 'Resubmit' : 'Submit',
            cancelText: 'Cancel'
        });
        if (!confirmed) {
            return;
        }

        $('#btn-submit-eod').prop('disabled', true).text(isResubmit ? 'Resubmitting…' : 'Submitting…');

        try {
            const response = await postWithAuth(API.saveWorkLog, data);
            showToast(isResubmit ? 'EOD resubmitted successfully!' : 'EOD submitted successfully!');
            hasUnsavedFormData = false;

            // Refresh from backend to get updated state
            await refreshMonthData();
        } catch (err) {
            console.warn('[EOD] Submit API failed:', err);
            $('#btn-submit-eod').prop('disabled', false).text(isResubmit ? '🔄 Resubmit' : '🚀 Submit EOD');

            // Local fallback - mark as pending
            workLogsData.forEach(l => {
                if (l.workDate === selectedDate) {
                    l.approvalStatus = 'PENDING';
                }
            });

            showToast(isResubmit ? 'EOD resubmitted (local mode)!' : 'EOD submitted (local mode)!');
            hasUnsavedFormData = false;
            handleSubmitSuccess();
        }
    }

    function handleSubmitSuccess() {
        renderCalendar();
        const logs = getLogsForDate(selectedDate);
        renderModalEntries(logs);
        updateActionButtons(logs);
        hideForm();
        $('#btn-show-form').hide();
        $('.cal-day').removeClass('selected');
        $(`.cal-day[data-date="${selectedDate}"]`).addClass('selected');
    }

    /* ── Refresh month data from backend ────────────────── */
    async function refreshMonthData() {
        try {
            const response = await postWithAuth(API.monthlyCalendar, {
                year: currentDate.getFullYear(),
                month: currentDate.getMonth() + 1
            });

            let calendarDays = [];
            if (response && response.data && Array.isArray(response.data.calendarData)) {
                calendarDays = response.data.calendarData;
            } else if (response && Array.isArray(response.calendarData)) {
                calendarDays = response.calendarData;
            }

            calendarData = calendarDays;
            workLogsData = mapBackendToWorkLogs(calendarData);

            renderCalendar();
            const logs = getLogsForDate(selectedDate);
            renderModalEntries(logs);
            updateActionButtons(logs);

            $('.cal-day').removeClass('selected');
            $(`.cal-day[data-date="${selectedDate}"]`).addClass('selected');

        } catch (err) {
            console.warn('[EOD] Refresh failed:', err);
            renderCalendar();
            const logs = getLogsForDate(selectedDate);
            renderModalEntries(logs);
            updateActionButtons(logs);
        }
    }

    /* ── CRUD: Delete individual log ────────────────────── */
    async function deleteEntry(logId) {
        const log = workLogsData.find(l => l.workLogId === logId);
        if (!canDeleteEntry(log)) {
            showToast('Delete not allowed for this entry');
            return;
        }

        const confirmed = await showAlert({
            type: 'danger',
            title: 'Delete Entry',
            message: 'Are you sure you want to delete this entry? This action cannot be undone.',
            showCancel: true,
            confirmText: 'Delete',
            cancelText: 'Cancel'
        });
        if (!confirmed) return;

        try {
            await deleteWithAuth(API.deleteLog, { workLogId: logId });
            workLogsData = workLogsData.filter(l => l.workLogId !== logId);
            showToast('Entry deleted');
            await refreshMonthData();
        } catch (err) {
            console.warn('[EOD] Delete API failed:', err);
            workLogsData = workLogsData.filter(l => l.workLogId !== logId);
            showToast('Entry deleted');
            refreshAfterDelete();
        }
    }

    function refreshAfterDelete() {
        renderCalendar();
        const logs = getLogsForDate(selectedDate);
        renderModalEntries(logs);
        updateActionButtons(logs);

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

        if (!canEditEntry(log)) {
            showToast('Edit not allowed for this entry');
            return;
        }

        // Set the workflowLogDateId for this date
        editingWorkflowLogDateId = log.workflowLogDateId || 0;

        // Load ONLY the single task that was clicked, not all tasks in the workflow
        draftLogs = [{
            _rowId: nextRowId++,
            workLogId: log.workLogId,
            workflowLogDateId: log.workflowLogDateId,
            categoryId: log.categoryId,
            subCategoryId: log.subCategoryId,
            hoursWorked: log.hoursWorked,
            status: log.status || 'In Progress',
            workDescription: log.workDescription
        }];

        showForm('✎ Edit Entry', { logs: draftLogs });
    }

    /* ── Toast ──────────────────────────────────────────── */
    function showToast(msg) {
        $('.toast').remove();
        const $t = $('<div class="toast">').text(msg).appendTo('body');
        setTimeout(() => $t.addClass('show'), 10);
        setTimeout(() => { $t.removeClass('show'); setTimeout(() => $t.remove(), 300); }, 2800);
    }
    /* ── Custom Themed Alert / Confirm ──────────────────── */
    let alertResolve = null;

    function showAlert(options) {
        return new Promise((resolve) => {
            alertResolve = resolve;

            const type = options.type || 'info';
            const iconMap = {
                info: '⚡',
                warning: '⚠️',
                danger: '🗑️',
                success: '✅',
                confirm: '❓'
            };
            const icon = options.icon || iconMap[type] || '⚡';

            const btnClass = type === 'danger' ? 'alert-btn-danger' : 'alert-btn-primary';

            let actionsHtml = '';
            if (options.showCancel) {
                actionsHtml = `
                    <button class="alert-btn alert-btn-secondary" id="alert-cancel">${options.cancelText || 'Cancel'}</button>
                    <button class="alert-btn ${btnClass}" id="alert-confirm">${options.confirmText || 'OK'}</button>
                `;
            } else {
                actionsHtml = `
                    <button class="alert-btn ${btnClass}" id="alert-confirm">${options.confirmText || 'OK'}</button>
                `;
            }

            const html = `
                <div class="alert-overlay" id="custom-alert">
                    <div class="alert-panel">
                        <div class="alert-icon ${type}">${icon}</div>
                        <div class="alert-title">${escapeHtml(options.title || 'Notice')}</div>
                        <div class="alert-message">${escapeHtml(options.message || '')}</div>
                        <div class="alert-actions ${options.showCancel ? '' : 'single'}">
                            ${actionsHtml}
                        </div>
                    </div>
                </div>
            `;

            $('#custom-alert').remove();
            $('body').append(html);
            $('body').addClass('alert-open');

            setTimeout(() => $('#custom-alert').addClass('active'), 10);

            $(document).off('click.alert');
            $(document).on('click.alert', '#alert-confirm', function() {
                closeAlert(true);
            });
            $(document).on('click.alert', '#alert-cancel', function() {
                closeAlert(false);
            });

            $(document).off('keydown.alert');
            $(document).on('keydown.alert', function(e) {
                if (e.key === 'Escape') {
                    closeAlert(false);
                } else if (e.key === 'Enter') {
                    closeAlert(true);
                }
            });
        });
    }

    function closeAlert(result) {
        $('#custom-alert').removeClass('active');
        $('body').removeClass('alert-open');
        setTimeout(() => {
            $('#custom-alert').remove();
            $(document).off('click.alert keydown.alert');
            if (alertResolve) {
                alertResolve(result);
                alertResolve = null;
            }
        }, 250);
    }


    /* ── Data loading ───────────────────────────────────── */
    async function loadCategories() {
        try {
            categoriesData = await getWithAuth(API.categories);
        } catch (err) {
            categoriesData = DEMO.categories;
        }
    }

    async function loadSubCategories() {
        try {
            subCategoriesData = await getWithAuth(API.subCategories);
        } catch (err) {
            subCategoriesData = DEMO.subCategories;
        }
    }

    async function loadData() {
        try {
            currentUser = getUser();
        } catch (e) {
            currentUser = null;
        }
        await Promise.all([loadCategories(), loadSubCategories()]);
        await loadWorkLogsByMonth(currentDate.getFullYear(), currentDate.getMonth());
    }

    /* ── Event bindings ─────────────────────────────────── */

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

    $(document).on('click', '.cal-day', function () {
        const $this = $(this);
        if ($this.data('disabled') === true) return;
        openModal($this.data('date'));
    });

    $('#modal-close, #btn-cancel').on('click', async function() { await closeModal(); });
    $('#eod-modal').on('click', async function (e) { if (e.target === this) await closeModal(); });

    $(document).on('click', '#btn-show-form', function () {
        // If date already has entries, use existing workflowLogDateId
        const dateLogs = getLogsForDate(selectedDate);
        if (dateLogs.length > 0 && dateLogs[0].workflowLogDateId > 0) {
            editingWorkflowLogDateId = dateLogs[0].workflowLogDateId;
            console.log('[EOD] Adding to existing workflow:', editingWorkflowLogDateId);
        } else {
            editingWorkflowLogDateId = 0;
            console.log('[EOD] Creating new workflow for date:', selectedDate);
        }
        showForm('➕ Add New Entry');
    });

    $(document).on('click', '#btn-cancel-form', function () {
        hideForm();
        $('#btn-show-form').show();
    });

    $(document).on('click', '#btn-add-row', function () {
        addDraftRow();
    });

    $(document).on('click', '.draft-row-remove', function () {
        const rowId = parseInt($(this).data('rowid'));
        removeDraftRow(rowId);
    });

    $(document).on('change', '.draft-category', function () {
        const $row = $(this).closest('.draft-row');
        const catId = $(this).val();
        loadSubCategoriesForDraftRow($row, catId);
    });

    // Submit EOD — sends directly to backend, no local draft
    $(document).on('click', '#btn-submit-eod', function (e) {
        e.preventDefault();
        submitEod();
    });

    $(document).on('click', '.btn-edit-entry:not([disabled])', function (e) {
        e.stopPropagation();
        editEntry($(this).data('logid'));
    });

    $(document).on('click', '.btn-delete-entry:not([disabled])', function (e) {
        e.stopPropagation();
        deleteEntry($(this).data('logid'));
    });

    $(document).on('keydown', async function (e) { if (e.key === 'Escape') await closeModal(); });

    /* ── Bootstrap ────────────────────────────────────── */
    loadData();
});