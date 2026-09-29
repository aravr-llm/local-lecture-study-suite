export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;

  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred';
    let details: any = undefined;
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
      details = data.details;
    } catch {}
    throw new ApiError(errorMsg, response.status, details);
  }

  return response.json();
}

export const api = {
  // Auth
  getStatus: () => request<{ initialized: boolean; userCount: number }>('/api/auth/status'),
  getMe: () => request<{ user: { id: string; email: string; name: string } }>('/api/auth/me'),
  login: (data: { email: string; password: string }) =>
    request<{ message: string; user: { id: string; email: string; name: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  register: (data: { email: string; password: string; name: string }) =>
    request<{ message: string; user: { id: string; email: string; name: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAccount: () => request<{ message: string }>('/api/auth/account', { method: 'DELETE' }),

  // Lectures
  getLectures: (q?: string, sort?: string) => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (sort) params.append('sort', sort);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<{ lectures: any[] }>(`/api/lectures${query}`);
  },
  createLecture: (data: { title: string; subject: string }) =>
    request<{ lecture: any }>('/api/lectures', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getLecture: (id: string) => request<any>(`/api/lectures/${id}`),
  deleteLecture: (id: string) => request<{ message: string }>(`/api/lectures/${id}`, { method: 'DELETE' }),
  deleteAudio: (id: string) => request<{ message: string }>(`/api/lectures/${id}/audio`, { method: 'DELETE' }),
  reprocessLecture: (id: string) => request<{ message: string }>(`/api/lectures/${id}/reprocess`, { method: 'POST' }),

  // Recording
  finishRecording: (id: string, data: { durationSeconds: number; format?: string }) =>
    request<{ message: string; lectureId: string }>(`/api/lectures/${id}/finish-record`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Study
  getTranscript: (id: string) => request<{ transcript: any; segments: any[] }>(`/api/lectures/${id}/transcript`),
  getNotes: (id: string) => request<{ note: any }>(`/api/study/lectures/${id}/notes`),
  saveNotes: (id: string, data: any) =>
    request<{ message: string }>(`/api/study/lectures/${id}/notes`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getFlashcards: (id: string) => request<{ flashcards: any[] }>(`/api/study/lectures/${id}/flashcards`),
  getDueFlashcards: () => request<{ dueCards: any[] }>('/api/study/flashcards/due'),
  createFlashcard: (data: any) =>
    request<{ message: string; cardId: string }>('/api/study/flashcards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  editFlashcard: (id: string, data: any) =>
    request<{ message: string }>(`/api/study/flashcards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteFlashcard: (id: string) =>
    request<{ message: string }>(`/api/study/flashcards/${id}`, { method: 'DELETE' }),
  reviewFlashcard: (id: string, rating: number) =>
    request<{ message: string }>(`/api/study/flashcards/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    }),

  // Quizzes
  getQuizzes: (id: string) => request<{ quizSets: any[] }>(`/api/study/lectures/${id}/quizzes`),
  submitQuiz: (id: string, answers: Record<string, string>) =>
    request<{ result: any }>(`/api/study/quizzes/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
  getProgress: () => request<{ metrics: any; recentAttempts: any[] }>('/api/study/progress'),

  // Diagnostics & Settings
  getDiagnostics: () => request<any>('/api/settings/diagnostics'),
  getSettings: () => request<{ settings: any }>('/api/settings'),
  saveSetting: (key: string, value: any) =>
    request<{ message: string }>('/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    }),

  // Source Repository Sync
  getSyncScan: () => request<{ scan: { isSafe: boolean; violations: string[] } }>('/api/source/scan'),
  triggerSync: (repoName?: string) =>
    request<{ success: boolean; repositoryUrl: string; message: string }>('/api/source/upload', {
      method: 'POST',
      body: JSON.stringify({ repoName }),
    }),
};
