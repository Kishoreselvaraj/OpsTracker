/* ============================================================
   Aetram OpsTracker — Member Dashboard JS
   Uses jQuery AJAX · Falls back to demo data if API not ready
   ============================================================ */

$(function () {

    /* ── Demo data (replace URLs with real API endpoints) ─── */
    const DEMO = {
        user: {
            name: "Rahul Kumar",
            employeeCode: "EMP-00412",
            designation: "QA Engineer",
            department: "Development",
            taskGroup: "India",
            subGroup: "Dev QA",
            teamLead: "Priya S.",
            submissionRate: 92
        },
        stats: {
            weeklyHours: "28.5",
            streak: 12,
            pendingReview: 2,
            todayStatus: "Draft"
        },
        todayEod: {
            date: "Wednesday, 13 May 2026",
            status: "draft",
            tasks: [
                { tag: "QA",  name: "Regression testing — Auth module",       hours: 3.5 },
                { tag: "QA",  name: "Bug documentation for sprint review",     hours: 1.5 },
                { tag: "Dev", name: "Code review — PR #214",                   hours: 1.0 }
            ]
        },
        recentSubmissions: [
            { date: "Tue 12 May", taskCount: 4, hours: 7.5, status: "approved"   },
            { date: "Mon 11 May", taskCount: 3, hours: 6.0, status: "approved"   },
            { date: "Fri 8 May",  taskCount: 5, hours: 8.0, status: "pending"    },
            { date: "Thu 7 May",  taskCount: 2, hours: 4.5, status: "correction" },
            { date: "Wed 6 May",  taskCount: 3, hours: 6.5, status: "rejected"   }
        ],
        notifications: [
            { type: "green", icon: "✓", msg: "Your EOD for 12 May was <strong>approved</strong> by Team Lead Priya S.", time: "2 hours ago",      unread: true  },
            { type: "amber", icon: "✎", msg: "Your EOD for 7 May needs correction. Review TL comments.",               time: "Yesterday 4:30 pm", unread: true  },
            { type: "blue",  icon: "🔔", msg: "Reminder: EOD not yet submitted for today. Submit before cutoff.",       time: "Today 5:00 pm",     unread: true  },
            { type: "green", icon: "✓", msg: "Your EOD for 8 May is pending TL review.",                               time: "Fri 8 May, 6:12 pm", unread: false }
        ],
        weekData: [
            { day: "Mon", hours: 6.0,  state: "done"    },
            { day: "Tue", hours: 7.5,  state: "done"    },
            { day: "Wed", hours: 6.0,  state: "today"   },
            { day: "Thu", hours: null, state: "missing"  },
            { day: "Fri", hours: null, state: "missing"  }
        ]
    };

    /* ── API config (swap to real endpoints) ──────────────── */
    const API = {
        stats:         '/api/dashboard/stats',
        todayEod:      '/api/eod/today',
        submissions:   '/api/eod/recent',
        notifications: '/api/notifications',
        weekData:      '/api/eod/week',
        userDetails:   '/api/user/me'
    };

    /* ── Helpers ──────────────────────────────────────────── */
    const statusMap = {
        approved:   { cls: 's-approved',   label: 'Approved'    },
        pending:    { cls: 's-pending',     label: 'Pending'     },
        rejected:   { cls: 's-rejected',    label: 'Rejected'    },
        correction: { cls: 's-correction',  label: 'Correction'  },
        draft:      { cls: 's-draft',       label: 'Not submitted' }
    };

    function statusBadge(status) {
        const s = statusMap[status] || statusMap.draft;
        return `<span class="status-badge ${s.cls}"><span class="status-dot"></span>${s.label}</span>`;
    }

    function pillFor(key) {
        const map = {
            weeklyHours:   '<span class="stat-pill pill-green">↑ On track</span>',
            streak:        '<span class="stat-pill pill-green">🔥 Active</span>',
            pendingReview: '<span class="stat-pill pill-amber">⏳ Pending TL</span>',
            todayStatus:   '<span class="stat-pill pill-amber">⚠ Due today</span>'
        };
        return map[key] || '';
    }

    /* fetch with demo fallback */
    function fetchOrDemo(url, demoKey) {
        return $.ajax({ url, method: 'GET', dataType: 'json' })
            .catch(function () {
                console.info('[Dashboard] Using demo data for:', demoKey);
                return DEMO[demoKey];
            });
    }

    /* ── Render functions ─────────────────────────────────── */

    function renderStats(data) {
        const keys = ['weeklyHours', 'streak', 'pendingReview', 'todayStatus'];
        keys.forEach(function (k) {
            $('#stat-' + k).text(data[k]).removeClass('skeleton');
            $('#pill-' + k).html(pillFor(k));
        });
    }

    function renderTodayEod(data) {
        $('#eod-date').text('Today\'s EOD — ' + data.date);
        $('#eod-status').html(statusBadge(data.status));

        let totalHours = 0;
        const rows = data.tasks.map(function (t) {
            totalHours += t.hours;
            return `
                <div class="task-row">
                    <span class="task-tag">${t.tag}</span>
                    <span class="task-name">${t.name}</span>
                    <span class="task-hours">${t.hours.toFixed(1)} h</span>
                </div>`;
        }).join('');

        $('#task-list').html(rows);
        $('#eod-total-hours').text(totalHours.toFixed(1) + ' h');
    }

    function renderSubmissions(list) {
        const rows = list.map(function (s) {
            return `
                <div class="history-row">
                    <span class="history-date">${s.date}</span>
                    <span class="history-desc">${s.taskCount} task${s.taskCount !== 1 ? 's' : ''}</span>
                    <span class="history-hours">${s.hours.toFixed(1)} h</span>
                    ${statusBadge(s.status)}
                </div>`;
        }).join('');
        $('#submissions-list').html(rows);
    }

    function renderNotifications(list) {
        const items = list.map(function (n) {
            const unread = n.unread ? '<div class="notif-unread"></div>' : '';
            return `
                <div class="notif-item">
                    <div class="notif-icon ni-${n.type}">${n.icon}</div>
                    <div class="notif-body">
                        <div class="notif-msg">${n.msg}</div>
                        <div class="notif-time">${n.time}</div>
                    </div>
                    ${unread}
                </div>`;
        }).join('');
        $('#notif-list').html(items);

        const unreadCount = list.filter(function (n) { return n.unread; }).length;
        if (unreadCount > 0) {
            $('#notif-unread-count').text(unreadCount).show();
        }
    }

    function renderWeek(days) {
        const maxHours = Math.max(...days.filter(function (d) { return d.hours; }).map(function (d) { return d.hours; }), 8);

        const cols = days.map(function (d) {
            const barClass = 'wb-' + d.state;
            const heightPx = d.hours ? Math.round((d.hours / maxHours) * 60) + 28 : 28;
            const label    = d.hours ? d.hours.toFixed(1) + 'h' : '—';
            const tick     = d.state === 'done' ? '<div style="font-size:9px;color:var(--green)">✓</div>' : '';
            const now      = d.state === 'today' ? '<div style="font-size:9px;color:var(--gold)">now</div>' : '';

            return `
                <div class="week-col">
                    <div class="week-bar ${barClass}" style="height:${heightPx}px">
                        <span class="week-bar-hours">${label}</span>
                        ${tick}${now}
                    </div>
                    <div class="week-day-label">${d.day}</div>
                </div>`;
        }).join('');

        $('#week-bars').html(cols);
    }

    function renderUserDetails(user) {
        $('#user-name').text(user.name);
        $('#user-code').text('EMP · ' + user.employeeCode.replace('EMP-', ''));
        $('#user-dept').text(user.department);
        $('#user-taskgroup').text(user.taskGroup);
        $('#user-subgroup').text(user.subGroup);
        $('#user-lead').text(user.teamLead);
        $('#user-empcode').text(user.employeeCode);
        $('#submission-rate-pct').text(user.submissionRate + '%');
        $('#submission-rate-bar').css('width', user.submissionRate + '%');
    }

    /* ── Button actions ───────────────────────────────────── */

    $('#btn-submit-eod').on('click', function () {
        const $btn = $(this);
        $btn.prop('disabled', true).text('Submitting…');

        /* Replace with real POST */
        setTimeout(function () {
            $('#eod-status').html(statusBadge('pending'));
            $btn.prop('disabled', false).html('&#10003; Submitted');
            showToast('EOD submitted successfully! Awaiting TL review.');
        }, 1200);
    });

    $('#btn-save-draft').on('click', function () {
        showToast('Draft saved.');
    });

    $('#btn-mark-all-read').on('click', function () {
        $('.notif-unread').fadeOut(200, function () { $(this).remove(); });
        $('#notif-unread-count').hide();
    });

    /* ── Toast ────────────────────────────────────────────── */

    function showToast(msg) {
        const $t = $('<div>')
            .css({
                position:     'fixed',
                bottom:       '28px',
                right:        '28px',
                background:   '#C9A84C',
                color:        '#111',
                padding:      '10px 20px',
                borderRadius: '8px',
                fontFamily:   "'Sora', sans-serif",
                fontSize:     '13px',
                fontWeight:   '600',
                zIndex:       9999,
                boxShadow:    '0 4px 20px rgba(0,0,0,0.4)',
                opacity:      0
            })
            .text(msg)
            .appendTo('body')
            .animate({ opacity: 1, bottom: '32px' }, 200);

        setTimeout(function () {
            $t.animate({ opacity: 0 }, 300, function () { $t.remove(); });
        }, 2800);
    }

    /* ── Bootstrap: fetch all data ────────────────────────── */

    function loadDashboard() {
        /* Stats */
        fetchOrDemo(API.stats, 'stats').then(renderStats);

        /* Today's EOD */
        fetchOrDemo(API.todayEod, 'todayEod').then(renderTodayEod);

        /* Recent submissions */
        fetchOrDemo(API.submissions, 'recentSubmissions').then(renderSubmissions);

        /* Notifications */
        fetchOrDemo(API.notifications, 'notifications').then(renderNotifications);

        /* Week chart */
        fetchOrDemo(API.weekData, 'weekData').then(renderWeek);

        /* User details */
        fetchOrDemo(API.userDetails, 'user').then(renderUserDetails);
    }

    loadDashboard();
});