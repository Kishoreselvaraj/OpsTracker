import { apiGet, apiPost, apiDelete, unwrap } from '../services/apiClient.js';

async function asData(promise) {
    const json = await promise;
    const { data, statusCode, message } = unwrap(json);
    if (statusCode && statusCode >= 400) {
        const err = new Error(message || 'Request failed');
        err.statusCode = statusCode;
        throw err;
    }
    return data;
}

async function asStatus(promise) {
    const json = await promise;
    return unwrap(json);
}

export const hierarchyApi = {
    getContext: () => asData(apiGet('/api/hierarchy/context')),

    listDepartments: (organizationId) =>
        asData(apiGet(`/api/Department/list${organizationId != null ? `?organizationId=${organizationId}` : ''}`)),

    getDepartment: (id) => asData(apiGet(`/api/Department/${id}`)),

    createDepartment: (body) => asStatus(apiPost('/api/Department/create', body)),

    updateDepartment: (body) => asStatus(apiPost('/api/Department/update', body)),

    assignDepartmentHead: (body) => asStatus(apiPost('/api/Department/assign-head', body)),

    deleteDepartment: (id) => asStatus(apiDelete(`/api/Department/${id}`)),

    listOrganizations: () => asData(apiGet('/api/Organization/list')),

    createOrganization: (body) => asStatus(apiPost('/api/Organization/create', body)),
    updateOrganization: (body) => asStatus(apiPost('/api/Organization/update', body)),
    deleteOrganization: (id) => asStatus(apiDelete(`/api/Organization/${id}`)),

    createUser: (body) => asStatus(apiPost('/api/User/create', body)),
    updateUser: (body) => asStatus(apiPost('/api/User/admin-update', body)),
    deleteUser: (id) => asStatus(apiDelete(`/api/User/${id}`)),
    getUser: (id) => asData(apiGet(`/api/User/${id}`)),

    listTaskGroups: (departmentId) =>
        asData(apiPost('/api/TaskGroup/list' + (departmentId != null ? `?departmentId=${departmentId}` : ''), {})),

    getTaskGroup: (id) => asData(apiGet(`/api/TaskGroup/${id}`)),

    createTaskGroup: (body) => asStatus(apiPost('/api/TaskGroup/add-task-group', body)),

    updateTaskGroup: (body) => asStatus(apiPost('/api/TaskGroup/update', body)),

    deleteTaskGroup: (id) => asStatus(apiDelete(`/api/TaskGroup/${id}`)),

    listTeams: (filter = {}) => asData(apiPost('/api/Team/list', filter)),

    getTeam: (id) => asData(apiGet(`/api/Team/${id}`)),

    createTeam: (body) => asStatus(apiPost('/api/Team/create', body)),

    updateTeam: (body) => asStatus(apiPost('/api/Team/update', body)),

    assignTeamMembers: (body) => asStatus(apiPost('/api/Team/assign-members', body)),

    deleteTeam: (id) => asStatus(apiDelete(`/api/Team/${id}`)),

    listTeamMembers: (teamId) => asData(apiGet(`/api/Team/${teamId}/members`)),

    listAssignableMembers: (teamId, subGroupId) => {
        const q = subGroupId != null ? `?subGroupId=${subGroupId}` : '';
        return asData(apiGet(`/api/Team/${teamId}/assignable-members${q}`));
    },

    listSubGroups: (filter = {}) => asData(apiPost('/api/SubGroup/list', filter)),

    getSubGroup: (id) => asData(apiGet(`/api/SubGroup/${id}`)),

    createSubGroup: (body) => asStatus(apiPost('/api/SubGroup/create', body)),

    updateSubGroup: (body) => asStatus(apiPost('/api/SubGroup/update', body)),

    assignSubGroupMember: (body) => asStatus(apiPost('/api/SubGroup/assign-member', body)),

    deleteSubGroup: (id) => asStatus(apiDelete(`/api/SubGroup/${id}`)),

    listSubGroupMembers: (subGroupId) => asData(apiGet(`/api/SubGroup/${subGroupId}/members`)),

    listUsers: (filter = {}) => asData(apiPost('/api/User/list', filter)),

    listAuditLogs: (filter = {}) => {
        return apiPost('/api/Audit/list', filter).then(json => {
            const u = unwrap(json);
            return { items: u.data ?? [], totalCount: json.TotalCount ?? json.totalCount ?? 0 };
        });
    }
};
