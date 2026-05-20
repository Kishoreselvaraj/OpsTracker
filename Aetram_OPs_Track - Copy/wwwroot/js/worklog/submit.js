// wwwroot/js/worklog/submit.js
import { postWithAuth } from '../services/apiService.js';
import { getToken } from '../auth/authService.js';

document.getElementById('submitWorklogBtn').addEventListener('click', async () => {
    const tasks = collectDraftTasks();
    const workDate = getWorkDate();

    // Validation
    if (!workDate) {
        showError('Work date is required.');
        return;
    }
    if (!tasks.length) {
        showError('Please add at least one task.');
        return;
    }
    for (const t of tasks) {
        if (!t.groupId || !t.subGroupId || !t.hoursWorked || !t.workStatus || !t.workDescription) {
            showError('All fields are required for each task.');
            return;
        }
    }

    // Build payload
    const payload = {
        workDate: new Date(workDate).toISOString(),
        logs: tasks.map(t => ({
            groupId: Number(t.groupId),
            subGroupId: Number(t.subGroupId),
            hoursWorked: t.hoursWorked,
            workStatus: t.workStatus,
            workDescription: t.workDescription
        }))
    };

    // API call
    try {
        setLoading(true);
        const token = getToken();
        const result = await postWithAuth('/api/WorkLog/save', payload, token);
        showSuccess('Worklog saved successfully!');
        clearDraftTasks();
    } catch (err) {
        showError(err.message || 'Failed to save worklog.');
    } finally {
        setLoading(false);
    }
});

// Helper: Collect all draft tasks from UI
function collectDraftTasks() {
    return Array.from(document.querySelectorAll('.task-row')).map(row => ({
        groupId: row.querySelector('.group-id').value,
        subGroupId: row.querySelector('.subgroup-id').value,
        hoursWorked: row.querySelector('.hours-worked').value,
        workStatus: row.querySelector('.work-status').value,
        workDescription: row.querySelector('.work-description').value
    }));
}

function getWorkDate() {
    return document.getElementById('workDateInput').value;
}

function showError(msg) {
    document.getElementById('worklogError').textContent = msg;
}
function showSuccess(msg) {
    document.getElementById('worklogSuccess').textContent = msg;
}
function setLoading(isLoading) {
    document.getElementById('submitWorklogBtn').disabled = isLoading;
}
function clearDraftTasks() {
    // Implement as needed: Remove all task rows from UI
}
