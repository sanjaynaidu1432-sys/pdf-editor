import type { DocumentData, EditOperation, SampleItem } from '../types';

const API_BASE = '/api';

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSamples(): Promise<SampleItem[]> {
  const res = await fetch(`${API_BASE}/samples`);
  if (!res.ok) throw new Error('Failed to fetch samples');
  const data = await res.json();
  return data.samples;
}

export async function loadSample(sampleId: string): Promise<DocumentData> {
  const res = await fetch(`${API_BASE}/sample/${sampleId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to load sample PDF');
  }
  return res.json();
}

export async function uploadPdfFile(file: File): Promise<DocumentData> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload PDF file');
  }

  return res.json();
}

export async function applyDocumentEdits(
  sessionId: string,
  edits: EditOperation[]
): Promise<{ success: boolean; editedPdfBase64: string }> {
  const res = await fetch(`${API_BASE}/apply-edits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
      edits,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to apply text edits');
  }

  return res.json();
}

export async function deleteDocumentSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/session/${sessionId}`, {
    method: 'DELETE',
  });
}

export function getDownloadUrl(sessionId: string, version: 'edited' | 'original' = 'edited'): string {
  return `${API_BASE}/download/${sessionId}?type=${version}`;
}
