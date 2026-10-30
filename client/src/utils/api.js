const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('cp_token') || localStorage.getItem('token');
  
  const headers = {
    ...(options.headers || {})
  };

  // If body is NOT FormData, set application/json
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (data && data.error) || (typeof data === 'string' ? data : 'An error occurred');
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function formatTimeRemaining(dueDateString) {
  if (!dueDateString) return { text: 'No deadline', isExpired: false, isUrgent: false };
  const now = new Date();
  const due = new Date(dueDateString);
  const diffMs = due.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { text: 'Deadline passed', isExpired: true, isUrgent: false };
  }

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 1) {
    return { text: `${diffDays} days left`, isExpired: false, isUrgent: diffDays <= 2 };
  } else if (diffDays === 1) {
    const remHours = diffHours % 24;
    return { text: `1 day ${remHours}h left`, isExpired: false, isUrgent: true };
  } else if (diffHours > 0) {
    const remMins = diffMins % 60;
    return { text: `${diffHours}h ${remMins}m left`, isExpired: false, isUrgent: true };
  } else {
    return { text: `${Math.max(1, diffMins)}m left`, isExpired: false, isUrgent: true };
  }
}

export async function downloadFile(url, fileName, inline = false) {
  const token = localStorage.getItem('cp_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const targetUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const res = await fetch(targetUrl, { headers });
  if (!res.ok) {
    let errText = 'Failed to download file';
    try {
      const errJson = await res.json();
      if (errJson.error) errText = errJson.error;
    } catch (e) {}
    throw new Error(errText);
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  if (inline) {
    window.open(blobUrl, '_blank');
  } else {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
}

