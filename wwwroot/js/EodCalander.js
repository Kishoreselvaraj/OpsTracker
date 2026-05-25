/* ============================================================
   Aetram OpsTracker — EOD Submission Calendar JS v7.2
   STRICT BLACK & GOLD THEME
   - Gold icon buttons (not letters)
   - Fixed modal layout — no full popup scrolling
   - Internal scroll only in entries list
   - All action buttons always visible at bottom
   ============================================================ */

import { postWithAuth, deleteWithAuth } from "/js/services/apiService.js";
import { unwrap } from "/js/services/apiClient.js";
import { getUser } from "/js/auth/authService.js";
import { requireAuth } from "/js/auth/routeGuard.js";
import {
  getMonthlyCalendar,
  saveWorkLog,
} from "/js/services/workLogService.js";
import { submitEod as submitEodApi } from "/js/services/eodService.js";
import {
  loadTaskGroups,
  loadSubGroups,
  setHierarchyCacheFromCalendar,
  getCachedGroups,
  getCachedSubGroups,
} from "/js/services/hierarchyService.js";
import { showToast } from "/js/utils/toast.js";

$(function () {
  const CONFIG = {
    restrictPreviousDateEdit: false,
    restrictPreviousDateDelete: false,
    restrictPreviousDateCreate: false,
    allowEditAfterSubmit: true,
    allowDeleteAfterSubmit: true,
    allowResubmit: true,
    maxDaysBack: null,
  };

  const API = {
    saveWorkLog: "/api/WorkLog/save",
    deleteLog: "/api/WorkLog/delete",
  };

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
  let prevDaySelection = [];

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDisplayDate(date) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function getMonthYear(date) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function getLogsForDate(dateStr) {
    return workLogsData.filter((log) => log.workDate === dateStr);
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
    if (typeof timeStr === "number") return timeStr;
    const parts = timeStr.split(":");
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return h + m / 60;
  }

  function getDayStatus(logs) {
    if (!logs || logs.length === 0) return null;
    const statuses = logs.map((l) => l.approvalStatus);
    if (statuses.includes("PENDING")) return "inprogress";
    if (statuses.includes("CORRECTION")) return "inprogress";
    if (statuses.includes("REJECTED")) return "inprogress";
    if (statuses.includes("DRAFT")) return "draft";
    if (statuses.every((s) => s === "APPROVED")) return "completed";
    return "inprogress";
  }

  function statusLabel(status) {
    const map = {
      APPROVED: "Approved",
      PENDING: "Pending",
      REJECTED: "Rejected",
      CORRECTION: "Correction",
      DRAFT: "Draft",
    };
    return map[status] || status;
  }

  function statusBadgeClass(status) {
    const map = {
      APPROVED: "es-approved",
      PENDING: "es-pending",
      REJECTED: "es-rejected",
      CORRECTION: "es-correction",
      DRAFT: "es-draft",
    };
    return map[status] || "es-pending";
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

  function canEditEntry(log) {
    if (!log) return true;
    if (isFutureDate(log.workDate)) return false;
    if (isTooOld(log.workDate)) return false;
    if (CONFIG.restrictPreviousDateEdit && isPastDate(log.workDate))
      return false;
    if (
      !CONFIG.allowEditAfterSubmit &&
      (log.approvalStatus === "PENDING" || log.approvalStatus === "APPROVED")
    )
      return false;
    return true;
  }

  function canDeleteEntry(log) {
    if (!log) return true;
    if (isFutureDate(log.workDate)) return false;
    if (isTooOld(log.workDate)) return false;
    if (CONFIG.restrictPreviousDateDelete && isPastDate(log.workDate))
      return false;
    if (
      !CONFIG.allowDeleteAfterSubmit &&
      (log.approvalStatus === "PENDING" || log.approvalStatus === "APPROVED")
    )
      return false;
    return true;
  }

  function canCreateEntry(dateStr) {
    if (isFutureDate(dateStr)) return false;
    if (isTooOld(dateStr)) return false;
    if (CONFIG.restrictPreviousDateCreate && isPastDate(dateStr)) return false;
    return true;
  }

  function mapBackendToWorkLogs(calendarDays) {
    const flatLogs = [];
    if (!Array.isArray(calendarDays)) return flatLogs;

    calendarDays.forEach((day) => {
      const dateStr = day.workDate ? day.workDate.split("T")[0] : "";
      const dayApprovalStatus = day.approvalStatus || "DRAFT";

      if (day.tasks && Array.isArray(day.tasks)) {
        day.tasks.forEach((task) => {
          let workDescription = task.workDescription || "";
          let taskTitle = "";
          const titleMatch = workDescription.match(/^\*\*(.+?)\*\*\s*\n\n/);
          if (titleMatch) {
            taskTitle = titleMatch[1];
            workDescription = workDescription.replace(
              /^\*\*(.+?)\*\*\s*\n\n/,
              "",
            );
          }

          flatLogs.push({
            workLogId: task.workLogId || 0,
            userId: currentUser?.userId || 1,
            categoryId: task.groupId || 0,
            subCategoryId: task.subGroupId || 0,
            workDate: dateStr,
            hoursWorked: task.taskDuration || task.hoursWorked || "00:00",
            workDescription: workDescription,
            taskTitle: taskTitle,
            approvalStatus:
              task.approvalStatus && task.approvalStatus.trim()
                ? task.approvalStatus
                : dayApprovalStatus,
            approvalBy: day.approvalBy || null,
            reasonForReject: day.reasonForReject || null,
            status: task.workStatus || "In Progress",
            workflowLogDateId: day.workflowLogDateId || 0,
          });
        });
      }
    });

    return flatLogs;
  }

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    $("#cal-month-year").text(getMonthYear(currentDate));

    const nextMonth = new Date(year, month + 1, 1);
    const canGoNext =
      nextMonth <= new Date(today.getFullYear(), today.getMonth(), 1);
    $("#btn-next-month")
      .prop("disabled", !canGoNext)
      .toggleClass("disabled", !canGoNext);

    const firstDay = new Date(year, month, 1);
    let startingDay = firstDay.getDay() - 1;
    if (startingDay < 0) startingDay = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const todayStr = formatDate(today);

    let html = "";
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

    $("#cal-grid").html(html);
    updateAnalyticsHeader();
  }

  function updateAnalyticsHeader() {
    const todayStr = formatDate(today);
    const todayLogs = getLogsForDate(todayStr);
    const todayHours = getTotalHours(todayLogs);

    let totalMonthlyHours = 0;
    workLogsData.forEach((log) => {
      totalMonthlyHours += parseTimeToDecimal(log.hoursWorked);
    });

    let approvedDaysCount = 0;
    let pendingDaysCount = 0;
    let rejectedDaysCount = 0;
    let draftDaysCount = 0;

    if (Array.isArray(calendarData)) {
      calendarData.forEach((day) => {
        const dateStr = day.workDate ? day.workDate.split("T")[0] : "";
        if (!dateStr) return;

        const parts = dateStr.split("-");
        if (parts.length === 3) {
          const yearPart = parseInt(parts[0], 10);
          const monthPart = parseInt(parts[1], 10) - 1;
          if (
            yearPart !== currentDate.getFullYear() ||
            monthPart !== currentDate.getMonth()
          ) {
            return;
          }
        }

        if (!day.tasks || day.tasks.length === 0) {
          return;
        }

        const status = (day.approvalStatus || "").trim().toUpperCase();
        if (status === "APPROVED") {
          approvedDaysCount++;
        } else if (status === "PENDING" || status === "CORRECTION") {
          pendingDaysCount++;
        } else if (status === "REJECTED") {
          rejectedDaysCount++;
        } else {
          draftDaysCount++;
        }
      });
    }

    const currentMonthName = currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const html = `
            <div class="analytics-container">
                <div class="analytics-card">
                    <div class="analytics-label">Hours Logged Today</div>
                    <div class="analytics-value">
                        ${todayHours.toFixed(1)}h <span class="analytics-sub">/ 8.4h</span>
                    </div>
                    <div class="analytics-bar-track">
                        <div class="analytics-bar-fill" style="width: ${Math.min((todayHours / 8.4) * 100, 100)}%"></div>
                    </div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-label">Monthly Total (${currentMonthName})</div>
                    <div class="analytics-value">${totalMonthlyHours.toFixed(1)}h</div>
                    <div class="analytics-meta">Approved: ${approvedDaysCount}d | Pending: ${pendingDaysCount}d</div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-label">Submission Status</div>
                    <div class="analytics-value-group">
                        <div class="status-summary-item">
                            <span class="status-dot approved"></span>
                            <span class="status-count">${approvedDaysCount} Approved</span>
                        </div>
                        <div class="status-summary-item">
                            <span class="status-dot pending"></span>
                            <span class="status-count">${pendingDaysCount} Pending</span>
                        </div>
                        <div class="status-summary-item">
                            <span class="status-dot rejected"></span>
                            <span class="status-count">${rejectedDaysCount} Rejected</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    $("#eod-analytics-header").html(html);
  }

  function buildDayCell(
    dayNum,
    dateStr,
    logs,
    isOtherMonth,
    isToday = false,
    isDisabled = false,
  ) {
    const totalHours = getTotalHours(logs);
    const status = getDayStatus(logs);
    const todayClass = isToday ? "today" : "";
    const otherClass = isOtherMonth ? "other-month" : "";
    const selectedClass = selectedDate === dateStr ? "selected" : "";
    const disabledClass = isDisabled ? "disabled-day" : "";

    let contentHtml = "";
    let progressHtml = "";
    let statusHtml = "";
    let addBtnHtml = "";

    if (logs.length > 0) {
      const pct = Math.min((totalHours / 8.4) * 100, 100);
      progressHtml = `
                <div class="day-progress-wrap">
                    <div class="day-progress-label">${totalHours.toFixed(1)}h / 8.4h</div>
                    <div class="day-progress-track">
                        <div class="day-progress-fill" style="width:${pct}%"></div>
                    </div>
                </div>`;

      const entriesHtml = logs
        .slice(0, 3)
        .map((log) => {
          const cat = categoriesData.find(
            (c) => c.categoryId === log.categoryId,
          );
          const displayText =
            log.taskTitle || (log.workDescription || "").split("\n")[0];
          return `
                    <div class="day-entry">
                        <div class="day-entry-desc">${escapeHtml(displayText)}</div>
                        <div class="day-entry-hours">${log.hoursWorked} · ${cat ? cat.name : "Unknown"}</div>
                    </div>
                `;
        })
        .join("");

      const moreCount =
        logs.length > 3
          ? `<div class="day-entry-more">+${logs.length - 3} more</div>`
          : "";
      contentHtml = `<div class="day-content">${entriesHtml}${moreCount}</div>`;

      const approvalStatus = logs[0]?.approvalStatus;
      if (approvalStatus) {
        statusHtml = `
                    <div class="day-status ${statusBadgeClass(approvalStatus)}">
                        ${statusLabel(approvalStatus)}
                    </div>`;
      }
    }

    const hasLockedEntries =
      logs.length > 0 &&
      logs.some(
        (l) =>
          l.approvalStatus === "APPROVED" || l.approvalStatus === "PENDING",
      );
    if (
      !isOtherMonth &&
      !isDisabled &&
      canCreateEntry(dateStr) &&
      !hasLockedEntries
    ) {
      addBtnHtml = `<div class="day-add-btn">+ Add</div>`;
    }

    return `
            <div class="cal-day ${todayClass} ${otherClass} ${selectedClass} ${disabledClass}" data-date="${dateStr}" ${isDisabled ? 'data-disabled="true"' : ""}>
                <div class="day-number">${dayNum}</div>
                ${progressHtml}
                ${contentHtml}
                ${statusHtml}
                ${addBtnHtml}
            </div>
        `;
  }

  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  async function loadWorkLogsByMonth(year, month) {
    $("#cal-grid").html(
      Array(14)
        .fill('<div class="cal-day skeleton" style="height:160px"></div>')
        .join(""),
    );

    try {
      const calendarDays = await getMonthlyCalendar(month + 1, year);
      calendarData = calendarDays;
      setHierarchyCacheFromCalendar(calendarDays);
      workLogsData = mapBackendToWorkLogs(calendarData);
    } catch (err) {
      workLogsData = [];
      calendarData = [];
      showToast(err.message || "Failed to load calendar", "error");
    }
    renderCalendar();
  }

  function openModal(dateStr) {
    if (isFutureDate(dateStr)) {
      showToast("Cannot log work for future dates");
      return;
    }

    selectedDate = dateStr;
    const date = parseDate(dateStr);
    const logs = getLogsForDate(dateStr);

    $("#modal-date").text(formatDisplayDate(date));
    $("#modal-date-short").text(dateStr);
    $("#workDate").val(dateStr);

    editingWorkflowLogDateId = 0;
    if (logs.length > 0 && logs[0].workflowLogDateId) {
      editingWorkflowLogDateId = logs[0].workflowLogDateId;
    }

    renderModalEntries(logs);
    hideForm();

    const hasLockedEntries =
      logs.length > 0 &&
      logs.some(
        (l) =>
          l.approvalStatus === "APPROVED" || l.approvalStatus === "PENDING",
      );
    if (hasLockedEntries) {
      $("#btn-show-form").show();
    } else {
      $("#btn-show-form").show();
    }

    updateActionButtons(logs);
    $("#eod-modal").addClass("active");
    $("body").css("overflow", "hidden");
    $(".cal-day").removeClass("selected");
    $(`.cal-day[data-date="${dateStr}"]`).addClass("selected");
  }

  async function closeModal() {
    $("#eod-modal").removeClass("active");
    $("body").css("overflow", "");
    $(".cal-day").removeClass("selected");
    selectedDate = null;
    editingWorkflowLogDateId = 0;
    draftLogs = [];
    isFormVisible = false;
    nextRowId = 0;
    hasUnsavedFormData = false;
    hideForm();
    $("#prev-day-selector").remove();
  }

  function updateActionButtons(logs) {
    const $submitBtn = $("#btn-submit-eod");
    if (logs.length === 0) {
      $submitBtn.hide();
    } else {
      $submitBtn.show().prop("disabled", false).text("Submit");
    }
  }

  function showForm(title, prefillData = null) {
    isFormVisible = true;
    hasUnsavedFormData = true;
    nextRowId = 0;
    $("#form-title").text(title);

    if (prefillData && prefillData.logs && prefillData.logs.length > 0) {
      draftLogs = prefillData.logs.map((log) => ({
        ...log,
        _rowId: nextRowId++,
      }));
    } else {
      draftLogs = [];
    }

    renderDraftRows();
    $("#new-entry-form").slideDown(250);
    $("#btn-show-form").hide();
    $("#btn-submit-eod").show();
    $("#btn-pull-yesterday").show();
  }

  function hideForm() {
    isFormVisible = false;
    hasUnsavedFormData = false;
    $("#new-entry-form").slideUp(200);
    $("#btn-show-form").show();
    $("#btn-submit-eod").hide();
    $("#btn-pull-yesterday").hide();
    $("#prev-day-selector").remove();
    draftLogs = [];
    nextRowId = 0;
    $("#draft-rows-container").empty();
    $("#form-title").text("New Entry");
  }

  function renderModalEntries(logs) {
    const count = logs.length;
    $("#entries-count").text(`${count} entr${count === 1 ? "y" : "ies"}`);

    if (count === 0) {
      $("#entries-list").html(`
                <div class="entries-empty">
                    <div class="entries-empty-icon">◌</div>
                    No entries yet
                </div>
            `);
      return;
    }

    const html = logs
      .map((log) => {
        const cat = categoriesData.find((c) => c.categoryId === log.categoryId);
        const subCat = subCategoriesData.find(
          (s) => s.subCategoryId === log.subCategoryId,
        );
        const rejectReason = log.reasonForReject
          ? `<div class="entry-reject-reason">${escapeHtml(log.reasonForReject)}</div>`
          : "";

        const editBtn = canEditEntry(log)
          ? `<button class="icon-btn edit-btn" data-logid="${log.workLogId}" title="Edit"></button>`
          : "";
        const deleteBtn = canDeleteEntry(log)
          ? `<button class="icon-btn delete-btn" data-logid="${log.workLogId}" title="Delete"></button>`
          : "";

        const metaHtml = `
                <span>${log.hoursWorked}</span>
                <span>·</span>
                <span>${cat ? cat.name : "Unknown"}${subCat ? " › " + subCat.name : ""}</span>
                <span>·</span>
                <span>${log.status || "In Progress"}</span>
            `;

        return `
                <div class="entry-item" data-logid="${log.workLogId}" data-status="${log.approvalStatus}">
                    <div class="entry-main">
                        <div class="entry-header-row">
                            <span class="entry-status-badge ${statusBadgeClass(log.approvalStatus)}">
                                ${statusLabel(log.approvalStatus)}
                            </span>
                            ${log.approvalBy ? `<span class="entry-approver">by ${escapeHtml(log.approvalBy)}</span>` : ""}
                        </div>
                        <div class="entry-desc">${escapeHtml(log.workDescription).replace(/\n/g, "<br>")}</div>
                        <div class="entry-meta">${metaHtml}</div>
                        ${rejectReason}
                    </div>
                    <div class="entry-hours">${log.hoursWorked}</div>
                    <div class="entry-actions">
                        ${editBtn}
                        ${deleteBtn}
                    </div>
                </div>
            `;
      })
      .join("");

    $("#entries-list").html(html);
  }

  function renderDraftRows() {
    const $container = $("#draft-rows-container");
    $container.empty();

    if (draftLogs.length === 0) {
      addDraftRow();
      return;
    }

    draftLogs.forEach((log, index) => {
      const html = buildDraftRowHtml(log._rowId, index + 1, log);
      $container.append(html);

      const $row = $(`.draft-row[data-rowid="${log._rowId}"]`);
      $row.find(".draft-category").val(log.categoryId || "");
      loadSubCategoriesForDraftRow($row, log.categoryId, log.subCategoryId);
      $row.find(".draft-hours").val(log.hoursWorked || "");
      $row.find(".draft-status").val(log.status || "In Progress");
      $row.find(".draft-desc").val(log.workDescription || "");
      $row.find(".draft-title").val(log.taskTitle || "");
      $row.find(".draft-logid").val(log.workLogId || 0);
      $row
        .find(".draft-workflowid")
        .val(log.workflowLogDateId || editingWorkflowLogDateId || 0);

      if (log._isPulled) {
        $row.addClass("pulled");
      }

      attachTimeInputHandler($row.find(".draft-hours"));
    });
  }

  function buildDraftRowHtml(rowId, displayNumber, log) {
    const catOptions = categoriesData
      .map(
        (c) => `<option value="${c.categoryId}">${escapeHtml(c.name)}</option>`,
      )
      .join("");

    const statusOptions = ["Yet to Start", "In Progress", "Completed"];
    const statusSelectOptions = statusOptions
      .map((s) => `<option value="${s}">${s}</option>`)
      .join("");

    return `
            <div class="draft-row" data-rowid="${rowId}">
                <input type="hidden" class="draft-logid" value="${log.workLogId || 0}" />
                <input type="hidden" class="draft-workflowid" value="${log.workflowLogDateId || editingWorkflowLogDateId || 0}" />
                <div class="draft-row-header">
                    <span class="draft-row-number">LOG #${displayNumber}</span>
                    <button type="button" class="draft-row-remove" data-rowid="${rowId}" title="Remove">×</button>
                </div>
                <div class="form-group">
                    <label class="form-label">Title <span style="color:var(--gold)">*</span></label>
                    <input type="text" class="form-input draft-title" placeholder="Task title" maxlength="120" autocomplete="off" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select class="form-select draft-category">
                            <option value="">Select</option>
                            ${catOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Sub-Category</label>
                        <select class="form-select draft-subcategory" disabled>
                            <option value="">Select</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Hours</label>
                        <input type="text" class="form-input draft-hours custom-time-input" placeholder="08:00" maxlength="5" autocomplete="off" inputmode="numeric" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status <span style="color:var(--gold)">*</span></label>
                        <select class="form-select draft-status">
                            ${statusSelectOptions}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-textarea draft-desc" placeholder="Describe your work..."></textarea>
                </div>
            </div>
        `;
  }

  function addDraftRow() {
    const newLog = {
      _rowId: nextRowId++,
      workLogId: 0,
      workflowLogDateId: editingWorkflowLogDateId || 0,
      categoryId: "",
      subCategoryId: "",
      hoursWorked: "",
      status: "In Progress",
      workDescription: "",
      taskTitle: "",
    };
    draftLogs.push(newLog);
    const displayNumber = draftLogs.length;
    const html = buildDraftRowHtml(newLog._rowId, displayNumber, newLog);
    $("#draft-rows-container").append(html);

    const $newRow = $(`.draft-row[data-rowid="${newLog._rowId}"]`);
    attachTimeInputHandler($newRow.find(".draft-hours"));
    $newRow[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function removeDraftRow(rowId) {
    if (draftLogs.length <= 1) {
      showToast("At least one log required");
      return;
    }
    const index = draftLogs.findIndex((l) => l._rowId === rowId);
    if (index >= 0) {
      draftLogs.splice(index, 1);
      $(`.draft-row[data-rowid="${rowId}"]`).remove();
      $(".draft-row").each(function (idx) {
        $(this)
          .find(".draft-row-number")
          .text("LOG #" + (idx + 1));
      });
    }
  }

  function loadSubCategoriesForDraftRow(
    $row,
    categoryId,
    selectedSubId = null,
  ) {
    const $sub = $row.find(".draft-subcategory");
    if (!categoryId) {
      $sub.html('<option value="">Select</option>').prop("disabled", true);
      return;
    }
    const subs = subCategoriesData.filter((s) => s.categoryId == categoryId);
    let html = '<option value="">Select</option>';
    subs.forEach((s) => {
      const selected = s.subCategoryId == selectedSubId ? "selected" : "";
      html += `<option value="${s.subCategoryId}" ${selected}>${escapeHtml(s.name)}</option>`;
    });
    $sub.html(html).prop("disabled", subs.length === 0);

    console.log("CategoryId", categoryId);

    const subs1 = subCategoriesData.filter((s) => s.categoryId == categoryId);

    console.log("Matched Subs", subs1);
  }

  function attachTimeInputHandler($input) {
    $input.off("input.timeformat keydown.timeformat");
    $input.on("input.timeformat", function () {
      let val = $(this).val().replace(/\D/g, "");
      if (val.length > 4) val = val.slice(0, 4);
      if (val.length === 4) {
        let hrs = val.slice(0, 2);
        let mins = val.slice(2, 4);
        if (parseInt(hrs, 10) > 23) hrs = "23";
        if (parseInt(mins, 10) > 59) mins = "59";
        $(this).val(hrs + ":" + mins);
      } else {
        $(this).val(val);
      }
    });
    $input.on("keydown.timeformat", function (e) {
      if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 37, 38, 39, 40]) !== -1)
        return;
      if (
        (e.keyCode < 48 || e.keyCode > 57) &&
        (e.keyCode < 96 || e.keyCode > 105)
      ) {
        e.preventDefault();
      }
    });
  }

  /* ── SELECTABLE Previous Day Pull ───────────────────── */
  async function showPreviousDaySelector() {
    const yesterday = new Date(selectedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const yesterdayLogs = getLogsForDate(yesterdayStr);

    if (yesterdayLogs.length === 0) {
      showToast("No entries found for yesterday");
      return;
    }

    prevDaySelection = [];

    const itemsHtml = yesterdayLogs
      .map((log, idx) => {
        const cat = categoriesData.find((c) => c.categoryId === log.categoryId);
        const title =
          log.taskTitle ||
          (log.workDescription || "").split("\n")[0] ||
          "Untitled";
        return `
                <div class="prev-day-item" data-idx="${idx}">
                    <div class="prev-day-item-title">${escapeHtml(title)}</div>
                    <div class="prev-day-item-meta">${log.hoursWorked} · ${cat ? cat.name : "N/A"}</div>
                    <div class="prev-day-checkbox"></div>
                </div>
            `;
      })
      .join("");

    const panelHtml = `
            <div id="prev-day-selector" class="prev-day-panel">
                <div class="prev-day-header">Select tasks from ${yesterdayStr}</div>
                <div class="prev-day-items-list">
                    ${itemsHtml}
                </div>
                <div class="prev-day-actions">
                    <button class="btn-outline btn-sm" id="btn-cancel-pull">Cancel</button>
                    <button class="btn-gold btn-sm" id="btn-confirm-pull">Pull Selected</button>
                </div>
            </div>
        `;

    $("#prev-day-selector").remove();
    $(".modal-panel").append(panelHtml);
    $("#prev-day-selector").hide().slideDown(200);

    $(document).off("click.prevday");
    $(document).on("click.prevday", ".prev-day-item", function () {
      const idx = parseInt($(this).data("idx"));
      const pos = prevDaySelection.indexOf(idx);
      if (pos >= 0) {
        prevDaySelection.splice(pos, 1);
        $(this).removeClass("selected");
      } else {
        prevDaySelection.push(idx);
        $(this).addClass("selected");
      }
    });

    $(document).off("click.cancelpull");
    $(document).on("click.cancelpull", "#btn-cancel-pull", function () {
      $("#prev-day-selector").slideUp(150, function () {
        $(this).remove();
      });
      prevDaySelection = [];
    });

    $(document).off("click.confirmpull");
    $(document).on("click.confirmpull", "#btn-confirm-pull", function () {
      if (prevDaySelection.length === 0) {
        showToast("Select at least one task");
        return;
      }

      draftLogs = [];
      nextRowId = 0;

      prevDaySelection
        .sort((a, b) => a - b)
        .forEach((idx) => {
          const log = yesterdayLogs[idx];
          draftLogs.push({
            _rowId: nextRowId++,
            _isPulled: true,
            workLogId: 0,
            workflowLogDateId: 0,
            categoryId: log.categoryId,
            subCategoryId: log.subCategoryId,
            hoursWorked: log.hoursWorked,
            status: log.status || "In Progress",
            workDescription: log.workDescription,
            taskTitle: log.taskTitle || "",
          });
        });

      $("#prev-day-selector").slideUp(150, function () {
        $(this).remove();
      });
      renderDraftRows();
      showToast(`${prevDaySelection.length} task(s) pulled`);
      prevDaySelection = [];
    });
  }

  function collectFormData() {
    const logs = [];
    let hasError = false;

    $(".draft-row").each(function () {
      const $row = $(this);
      const categoryId = parseInt($row.find(".draft-category").val()) || 0;
      const subCategoryId =
        parseInt($row.find(".draft-subcategory").val()) || null;
      const hoursWorked = $row.find(".draft-hours").val().trim();
      const status = $row.find(".draft-status").val();
      const workDescription = $row.find(".draft-desc").val().trim();
      const taskTitle = $row.find(".draft-title").val().trim();
      const workLogId = parseInt($row.find(".draft-logid").val()) || 0;

      if (!categoryId && !hoursWorked && !workDescription && !taskTitle) {
        return true;
      }

      if (!taskTitle) {
        showToast("Title required");
        hasError = true;
        return false;
      }
      if (!categoryId) {
        showToast("Category required");
        hasError = true;
        return false;
      }
      if (!subCategoryId) {
        showToast("Sub-category required");
        hasError = true;
        return false;
      }
      if (!hoursWorked) {
        showToast("Hours required");
        hasError = true;
        return false;
      }
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hoursWorked)) {
        showToast("Invalid time format (HH:MM)");
        hasError = true;
        return false;
      }
      if (!workDescription) {
        showToast("Description required");
        hasError = true;
        return false;
      }

      const fullDescription = `**${taskTitle}**\n\n${workDescription}`;

      logs.push({
        workLogId: workLogId,
        groupId: categoryId,
        subGroupId: subCategoryId,
        hoursWorked: hoursWorked,
        workStatus: status,
        workDescription: fullDescription,
      });
    });

    if (hasError) return null;
    if (logs.length === 0) {
      showToast("Add at least one log");
      return null;
    }

    let existingWorkflowId = 0;
    if (editingWorkflowLogDateId > 0) {
      existingWorkflowId = editingWorkflowLogDateId;
    } else {
      const dateLogs = getLogsForDate(selectedDate);
      if (dateLogs.length > 0 && dateLogs[0].workflowLogDateId > 0) {
        existingWorkflowId = dateLogs[0].workflowLogDateId;
      }
    }

    return {
      workflowLogDateId: existingWorkflowId,
      workDate: new Date(selectedDate).toISOString(),
      logs: logs,
    };
  }

  async function submitEod() {
    const logs = getLogsForDate(selectedDate);
    const dateLogs = logs.length > 0;

    if (isFormVisible) {
      const data = collectFormData();
      if (!data) return;
      const confirmedSave = await showAlert({
        type: "confirm",
        title: "Save entries",
        message: `Save work logs for ${selectedDate} before submitting?`,
        showCancel: true,
        confirmText: "Save",
        cancelText: "Cancel",
      });
      if (!confirmedSave) return;
      $("#btn-submit-eod").prop("disabled", true).text("Saving...");
      try {
        const saveResult = await saveWorkLog(data);
        const wfId =
          saveResult.data?.workflowLogDateId ??
          saveResult.raw?.workflowLogDateId ??
          data.workflowLogDateId;
        if (wfId) editingWorkflowLogDateId = wfId;
        hasUnsavedFormData = false;
        hideForm();
        await refreshMonthData();
      } catch (err) {
        $("#btn-submit-eod").prop("disabled", false).text("Submit EOD");
        showToast(err.message || "Save failed", "error");
        return;
      }
    }

    if (!dateLogs && !editingWorkflowLogDateId) {
      showToast("Add at least one work log before submitting EOD", "error");
      $("#btn-submit-eod").prop("disabled", false).text("Submit EOD");
      return;
    }

    const refreshedLogs = getLogsForDate(selectedDate);
    const eodId =
      editingWorkflowLogDateId || refreshedLogs[0]?.workflowLogDateId || 0;

    if (!eodId) {
      showToast("No EOD record found for this date", "error");
      $("#btn-submit-eod").prop("disabled", false).text("Submit EOD");
      return;
    }

    const confirmed = await showAlert({
      type: "confirm",
      title: "Submit EOD",
      message: `Submit EOD for ${selectedDate} to your Team Lead?`,
      showCancel: true,
      confirmText: "Submit EOD",
      cancelText: "Cancel",
    });
    if (!confirmed) {
      $("#btn-submit-eod").prop("disabled", false).text("Submit EOD");
      return;
    }

    $("#btn-submit-eod").prop("disabled", true).text("Submitting...");

    try {
      await submitEodApi(eodId);
      showToast("EOD submitted for approval", "success");
      await refreshMonthData();
    } catch (err) {
      showToast(err.message || "EOD submit failed", "error");
    } finally {
      $("#btn-submit-eod").prop("disabled", false).text("Submit EOD");
    }
  }

  async function refreshMonthData() {
    try {
      const calendarDays = await getMonthlyCalendar(
        currentDate.getMonth() + 1,
        currentDate.getFullYear(),
      );
      calendarData = calendarDays;
      setHierarchyCacheFromCalendar(calendarDays);
      workLogsData = mapBackendToWorkLogs(calendarData);
      renderCalendar();
      const logs = getLogsForDate(selectedDate);
      renderModalEntries(logs);
      updateActionButtons(logs);
      $(".cal-day").removeClass("selected");
      $(`.cal-day[data-date="${selectedDate}"]`).addClass("selected");
    } catch (err) {
      renderCalendar();
      const logs = getLogsForDate(selectedDate);
      renderModalEntries(logs);
      updateActionButtons(logs);
    }
  }

  async function deleteEntry(logId) {
    const log = workLogsData.find((l) => l.workLogId === logId);
    if (!canDeleteEntry(log)) {
      showToast("Delete not allowed");
      return;
    }

    const confirmed = await showAlert({
      type: "danger",
      title: "Delete Entry",
      message: "Delete this entry permanently?",
      showCancel: true,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    try {
      await deleteWithAuth(API.deleteLog, { workLogId: logId });
      showToast("Deleted");
      await refreshMonthData();
    } catch (err) {
      showToast("Delete failed. Retry.");
    }
  }

  function editEntry(logId) {
    const log = workLogsData.find((l) => l.workLogId === logId);
    if (!log) return;
    if (!canEditEntry(log)) {
      showToast("Edit not allowed");
      return;
    }

    editingWorkflowLogDateId = log.workflowLogDateId || 0;
    draftLogs = [
      {
        _rowId: nextRowId++,
        workLogId: log.workLogId,
        workflowLogDateId: log.workflowLogDateId,
        categoryId: log.categoryId,
        subCategoryId: log.subCategoryId,
        hoursWorked: log.hoursWorked,
        status: log.status || "In Progress",
        workDescription: log.workDescription,
        taskTitle: log.taskTitle || "",
      },
    ];

    showForm("Edit Entry", { logs: draftLogs });
  }

  function showToastLocal(msg) {
    showToast(msg);
  }

  let alertResolve = null;

  function showAlert(options) {
    return new Promise((resolve) => {
      alertResolve = resolve;
      const type = options.type || "info";
      const iconMap = {
        info: "◆",
        warning: "▲",
        danger: "▼",
        success: "●",
        confirm: "?",
      };
      const icon = options.icon || iconMap[type] || "◆";
      const btnClass =
        type === "danger" ? "alert-btn-danger" : "alert-btn-primary";

      let actionsHtml = "";
      if (options.showCancel) {
        actionsHtml = `
                    <button class="alert-btn alert-btn-secondary" id="alert-cancel">${options.cancelText || "Cancel"}</button>
                    <button class="alert-btn ${btnClass}" id="alert-confirm">${options.confirmText || "OK"}</button>
                `;
      } else {
        actionsHtml = `<button class="alert-btn ${btnClass}" id="alert-confirm">${options.confirmText || "OK"}</button>`;
      }

      const html = `
                <div class="alert-overlay" id="custom-alert">
                    <div class="alert-panel">
                        <div class="alert-icon ${type}">${icon}</div>
                        <div class="alert-title">${escapeHtml(options.title || "Notice")}</div>
                        <div class="alert-message">${escapeHtml(options.message || "")}</div>
                        <div class="alert-actions ${options.showCancel ? "" : "single"}">
                            ${actionsHtml}
                        </div>
                    </div>
                </div>
            `;

      $("#custom-alert").remove();
      $("body").append(html);
      $("body").addClass("alert-open");
      setTimeout(() => $("#custom-alert").addClass("active"), 10);

      $(document).off("click.alert");
      $(document).on("click.alert", "#alert-confirm", function () {
        closeAlert(true);
      });
      $(document).on("click.alert", "#alert-cancel", function () {
        closeAlert(false);
      });

      $(document).off("keydown.alert");
      $(document).on("keydown.alert", function (e) {
        if (e.key === "Escape") {
          closeAlert(false);
        } else if (e.key === "Enter") {
          closeAlert(true);
        }
      });
    });
  }

  function closeAlert(result) {
    $("#custom-alert").removeClass("active");
    $("body").removeClass("alert-open");
    setTimeout(() => {
      $("#custom-alert").remove();
      $(document).off("click.alert keydown.alert");
      if (alertResolve) {
        alertResolve(result);
        alertResolve = null;
      }
    }, 250);
  }

  async function loadCategories() {
    categoriesData = await loadTaskGroups();
    if (!categoriesData.length) categoriesData = getCachedGroups();
  }

  async function loadSubCategories() {
    subCategoriesData = await loadSubGroups();
    if (!subCategoriesData.length) subCategoriesData = getCachedSubGroups();
  }

  async function loadData() {
    if (
      !requireAuth({
        allowRoles: ["Member", "TeamLead", "DepartmentHead", "Admin"],
      })
    )
      return;
    try {
      currentUser = getUser();
    } catch (e) {
      currentUser = null;
    }
    await Promise.all([loadCategories(), loadSubCategories()]);
    await loadWorkLogsByMonth(
      currentDate.getFullYear(),
      currentDate.getMonth(),
    );
  }

  /* ── Event bindings ─────────────────────────────────── */
  $("#btn-prev-month").on("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    loadWorkLogsByMonth(currentDate.getFullYear(), currentDate.getMonth());
  });

  $("#btn-next-month").on("click", () => {
    const nextMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );
    if (nextMonth <= new Date(today.getFullYear(), today.getMonth(), 1)) {
      currentDate.setMonth(currentDate.getMonth() + 1);
      loadWorkLogsByMonth(currentDate.getFullYear(), currentDate.getMonth());
    }
  });

  $(document).on("click", ".cal-day", function () {
    const $this = $(this);
    if ($this.data("disabled") === true) return;
    openModal($this.data("date"));
  });

  $("#modal-close, #btn-cancel").on("click", async function () {
    await closeModal();
  });
  $("#eod-modal").on("click", async function (e) {
    if (e.target === this) await closeModal();
  });

  $(document).on("click", "#btn-show-form", function () {
    const dateLogs = getLogsForDate(selectedDate);
    if (dateLogs.length > 0 && dateLogs[0].workflowLogDateId > 0) {
      editingWorkflowLogDateId = dateLogs[0].workflowLogDateId;
    } else {
      editingWorkflowLogDateId = 0;
    }
    showForm("New Entry");
  });

  $(document).on("click", "#btn-cancel-form", function () {
    hideForm();
    $("#btn-show-form").show();
  });

  $(document).on("click", "#btn-add-row", function () {
    addDraftRow();
  });

  $(document).on("click", ".draft-row-remove", function () {
    removeDraftRow(parseInt($(this).data("rowid")));
  });

  $(document).on("change", ".draft-category", function () {
    loadSubCategoriesForDraftRow($(this).closest(".draft-row"), $(this).val());
  });

  $(document).on("click", "#btn-submit-eod", function (e) {
    e.preventDefault();
    submitEod();
  });

  $(document).on("click", "#btn-pull-yesterday", function (e) {
    e.preventDefault();
    showPreviousDaySelector();
  });

  $(document).on("click", ".icon-btn.edit-btn", function (e) {
    e.stopPropagation();
    editEntry($(this).data("logid"));
  });

  $(document).on("click", ".icon-btn.delete-btn", function (e) {
    e.stopPropagation();
    deleteEntry($(this).data("logid"));
  });

  $(document).on("keydown", async function (e) {
    if (e.key === "Escape") await closeModal();
  });

  loadData();
});
