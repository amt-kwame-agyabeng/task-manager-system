'use strict';

function getUserRole(event) {
  return event.headers && event.headers['x-user-role'];
}

function getUserId(event) {
  return event.headers && event.headers['x-user-id'];
}

function checkRole(event, allowedRoles) {
  const role = getUserRole(event);
  return role && allowedRoles.includes(role);
}

module.exports = {
  checkRole,
  getUserRole,
  getUserId,
};
