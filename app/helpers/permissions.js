export function permissionsForRole(role) {
  return {
    canWrite: role === 'operator' || role === 'admin',
    canManage: role === 'admin',
  };
}

export function roleCanWrite(role) {
  return permissionsForRole(role).canWrite;
}

export function roleCanManage(role) {
  return permissionsForRole(role).canManage;
}
