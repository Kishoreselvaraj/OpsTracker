import { requireAuth } from '../auth/routeGuard.js';
import { hierarchyApi } from '../hierarchy/hierarchyApi.js';
import { loadHierarchyContext, effectiveDepartmentId } from '../hierarchy/hierarchyContext.js';
import { renderBreadcrumbs } from '../hierarchy/breadcrumbs.js';
import { confirmAction } from '../hierarchy/confirm.js';
import { pick, fullName, slugCode } from '../hierarchy/caseHelpers.js';
import { showToast } from '../utils/toast.js';

if (!requireAuth({ allowRoles: ['DepartmentHead', 'Admin'] })) {
    throw new Error('auth');
}

const params = new URLSearchParams(location.search);
const filterGroupId = params.get('groupId')
    ? Number(params.get('groupId'))
    : null;

const state = {
    teams: [],
    groups: [],
    users: [],
    ctx: null,
    editId: null
};

const modal = document.getElementById('team-modal');
const bsModal = modal
    ? bootstrap.Modal.getOrCreateInstance(modal)
    : null;

async function init() {

    try {

        state.ctx = await loadHierarchyContext();

        const deptId =
            effectiveDepartmentId(state.ctx);

        state.groups =
            await hierarchyApi.listTaskGroups(deptId) ?? [];

        state.users =
            await hierarchyApi.listUsers({}) ?? [];

        if (deptId) {
            state.users = state.users.filter(u => {
                const d =
                    pick(u,
                        'departmentId',
                        'DepartmentId');

                return (
                    d == null ||
                    Number(d) === Number(deptId)
                );
            });
        }

        const groupName =
            filterGroupId
                ? pick(
                    state.groups.find(
                        g =>
                            Number(
                                pick(
                                    g,
                                    'groupId',
                                    'GroupId'
                                )
                            ) === filterGroupId
                    ),
                    'groupName',
                    'GroupName'
                )
                : null;

        renderBreadcrumbs(
            'hierarchy-breadcrumbs',
            [
                {
                    label: 'Department',
                    href: '/DeptHead/Dashboard'
                },
                {
                    label: 'Task groups',
                    href: '/DeptHead/Groups'
                },
                ...(groupName
                    ? [{ label: groupName }]
                    : []),
                {
                    label: 'Teams'
                }
            ]
        );

        fillGroupSelect();

        await loadTeams();

    } catch (err) {

        console.error(err);

        showToast(
            err.message || 'Failed to load page',
            'error'
        );
    }
}

function fillGroupSelect() {

    const sel =
        document.getElementById(
            'team-group-id'
        );

    if (!sel) return;

    sel.innerHTML =
        state.groups.map(g => {

            const id =
                pick(
                    g,
                    'groupId',
                    'GroupId'
                );

            const selected =
                filterGroupId &&
                Number(id) === filterGroupId
                    ? ' selected'
                    : '';

            return `
                <option value="${id}"${selected}>
                    ${pick(
                        g,
                        'groupName',
                        'GroupName'
                    )}
                </option>`;
        }).join('');
}

function fillUserSelects() {

    const leadSel =
        document.getElementById(
            'team-lead-id'
        );

    const membersBox =
        document.getElementById(
            'team-members'
        );

    if (!leadSel || !membersBox)
        return;

    const opts =
        state.users.map(u => {

            const id =
                pick(
                    u,
                    'userId',
                    'UserId'
                );

            return {
                id,
                label:
                    `${fullName(u)} (${pick(
                        u,
                        'email',
                        'Email'
                    )})`
            };
        });

    leadSel.innerHTML =
        '<option value="">— Optional —</option>' +
        opts.map(o =>
            `<option value="${o.id}">
                ${o.label}
            </option>`
        ).join('');

    membersBox.innerHTML =
        opts.map(o =>
            `<label class="member-chip">
                <input
                    type="checkbox"
                    name="memberIds"
                    value="${o.id}" />
                ${o.label}
            </label>`
        ).join('');
}

async function loadTeams() {

    try {

        const filter = {};

        if (filterGroupId) {
            filter.groupId =
                filterGroupId;
        }

        const teams =
            await hierarchyApi.listTeams(filter);

        console.log(
            'Teams Loaded',
            teams
        );

        state.teams =
            teams ?? [];

        render();

    } catch (err) {

        console.error(err);

        showToast(
            err.message,
            'error'
        );
    }
}

function render() {

    const tbody =
        document.getElementById(
            'team-table-body'
        );

    if (!tbody) return;

    if (!state.teams.length) {

        tbody.innerHTML =
            `<tr>
                <td colspan="5"
                    class="hierarchy-empty">
                    No teams found.
                </td>
            </tr>`;

        return;
    }

    tbody.innerHTML =
        state.teams.map(t => {

            const id =
                pick(
                    t,
                    'teamId',
                    'TeamId'
                );

            return `
            <tr>

                <td>
                    <strong
                        style="color:var(--gold-2)">
                        ${pick(
                            t,
                            'teamName',
                            'TeamName'
                        )}
                    </strong>
                </td>

                <td>
                    ${pick(
                        t,
                        'groupName',
                        'GroupName'
                    ) || '—'}
                </td>

                <td>
                    ${pick(
                        t,
                        'teamLeadName',
                        'TeamLeadName'
                    ) || '—'}
                </td>

                <td>
                    ${pick(
                        t,
                        'teamCode',
                        'TeamCode'
                    ) || ''}
                </td>

                <td class="hierarchy-actions">

                    <button
                        type="button"
                        class="btn-sm-icon"
                        data-members="${id}">
                        <i class="fa-solid fa-users"></i>
                    </button>

                    <button
                        type="button"
                        class="btn-sm-icon"
                        data-edit="${id}">
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button
                        type="button"
                        class="btn-sm-icon danger"
                        data-del="${id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </td>

            </tr>`;
        }).join('');
}

document
    .getElementById(
        'btn-team-create'
    )
    ?.addEventListener(
        'click',
        () => {

            state.editId = null;

            fillUserSelects();

            document.getElementById(
                'team-name'
            ).value = '';

            document.getElementById(
                'team-code'
            ).value =
                slugCode(
                    'team',
                    'TEAM'
                );

            document.getElementById(
                'team-desc'
            ).value = '';

            document.getElementById(
                'team-lead-id'
            ).value = '';

            document
                .querySelectorAll(
                    '#team-members input'
                )
                .forEach(
                    x => x.checked = false
                );

            bsModal?.show();
        }
    );

document
    .getElementById(
        'team-table-body'
    )
    ?.addEventListener(
        'click',
        async e => {

            const del =
                e.target.closest(
                    '[data-del]'
                );

            const edit =
                e.target.closest(
                    '[data-edit]'
                );

            const members =
                e.target.closest(
                    '[data-members]'
                );

            if (del) {

                const id =
                    Number(
                        del.dataset.del
                    );

                const ok =
                    await confirmAction({
                        title:
                            'Deactivate team?',
                        danger: true,
                        confirmLabel:
                            'Deactivate'
                    });

                if (!ok) return;

                try {

                    await hierarchyApi
                        .deleteTeam(id);

                    showToast(
                        'Team deactivated',
                        'success'
                    );

                    await loadTeams();

                } catch (err) {

                    showToast(
                        err.message,
                        'error'
                    );
                }
            }

            if (members) {

                const id =
                    Number(
                        members.dataset.members
                    );

                try {

                    const team =
                        await hierarchyApi
                            .getTeam(id);

                    showToast(
                        `${team.teamName} (${team.teamCode})`,
                        'info',
                        4000
                    );

                } catch (err) {

                    showToast(
                        err.message,
                        'error'
                    );
                }
            }

            if (edit) {

                const id =
                    Number(
                        edit.dataset.edit
                    );

                try {

                    fillUserSelects();

                    const team =
                        await hierarchyApi
                            .getTeam(id);

                    state.editId = id;

                    document
                        .getElementById(
                            'team-group-id'
                        )
                        .value =
                        team.groupId ?? '';

                    document
                        .getElementById(
                            'team-code'
                        )
                        .value =
                        team.teamCode ?? '';

                    document
                        .getElementById(
                            'team-name'
                        )
                        .value =
                        team.teamName ?? '';

                    document
                        .getElementById(
                            'team-desc'
                        )
                        .value =
                        team.description ?? '';

                    document
                        .getElementById(
                            'team-lead-id'
                        )
                        .value =
                        team.teamLeadId ?? '';

                    bsModal?.show();

                } catch (err) {

                    console.error(err);

                    showToast(
                        err.message,
                        'error'
                    );
                }
            }
        }
    );

document
    .getElementById(
        'team-form'
    )
    ?.addEventListener(
        'submit',
        async e => {

            e.preventDefault();

            const name =
                document
                    .getElementById(
                        'team-name'
                    )
                    .value
                    .trim();

            const code =
                document
                    .getElementById(
                        'team-code'
                    )
                    .value
                    .trim();

            const groupId =
                Number(
                    document
                        .getElementById(
                            'team-group-id'
                        )
                        .value
                );

            const leadId =
                document
                    .getElementById(
                        'team-lead-id'
                    )
                    .value;

            const memberIds =
                [...document.querySelectorAll(
                    '#team-members input:checked'
                )].map(
                    c => Number(c.value)
                );

            try {

                if (state.editId) {

                    await hierarchyApi
                        .updateTeam({
                            teamId:
                                state.editId,
                            teamName:
                                name,
                            description:
                                document
                                    .getElementById(
                                        'team-desc'
                                    )
                                    .value
                                    .trim() || null,
                            isBillable:
                                false
                        });

                    await hierarchyApi
                        .assignTeamMembers({
                            teamId:
                                state.editId,
                            teamLeadId:
                                leadId
                                    ? Number(
                                        leadId
                                    )
                                    : null,
                            memberUserIds:
                                memberIds
                        });

                    showToast(
                        'Team updated',
                        'success'
                    );

                } else {

                    const result =
                        await hierarchyApi
                            .createTeam({
                                groupId,
                                teamCode:
                                    code,
                                teamName:
                                    name,
                                description:
                                    document
                                        .getElementById(
                                            'team-desc'
                                        )
                                        .value
                                        .trim() || null,
                                teamLeadId:
                                    leadId
                                        ? Number(
                                            leadId
                                        )
                                        : null,
                                memberUserIds:
                                    memberIds,
                                isBillable:
                                    false
                            });

                    showToast(
                        result.message ||
                        'Team created',
                        'success'
                    );
                }

                bsModal?.hide();

                state.editId = null;

                await loadTeams();

            } catch (err) {

                console.error(err);

                showToast(
                    err.message,
                    'error'
                );
            }
        }
    );

init();