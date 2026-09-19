import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import app from '../firebase';

const auth = getAuth(app);

// Request Google Drive access for storing files & photos
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

const TOKEN_KEY = 'cast_inspect_drive_token';
const EMAIL_KEY = 'cast_inspect_drive_email';

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
let cachedDriveEmail: string | null = typeof window !== 'undefined' ? localStorage.getItem(EMAIL_KEY) : null;
let googleUser: User | null = null;

// Initialize Google Auth state listener
export const initGoogleAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (u: User | null) => {
    googleUser = u;
    if (u) {
      if (u.email) {
        cachedDriveEmail = u.email;
        localStorage.setItem(EMAIL_KEY, u.email);
      }
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(u, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onFailure) onFailure();
      }
    } else {
      if (!cachedAccessToken && onFailure) {
        onFailure();
      }
    }
  });
};

export const getCachedGoogleToken = () => {
  if (!cachedAccessToken && typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem(TOKEN_KEY);
  }
  return cachedAccessToken;
};

export const getGoogleUser = () => googleUser;
export const getDriveEmail = () => cachedDriveEmail || googleUser?.email || null;
export const isGoogleDriveConnected = () => !!getCachedGoogleToken();

// Google Sign-In with popup to acquire Drive token
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso do Google Drive.');
    }
    cachedAccessToken = credential.accessToken;
    googleUser = result.user;
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, credential.accessToken);
      if (result.user.email) {
        cachedDriveEmail = result.user.email;
        localStorage.setItem(EMAIL_KEY, result.user.email);
      }
    }
    return { user: result.user, accessToken: credential.accessToken };
  } finally {
    isSigningIn = false;
  }
};

export const disconnectGoogleDrive = async () => {
  cachedAccessToken = null;
  cachedDriveEmail = null;
  googleUser = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  }
  try {
    await signOut(auth);
  } catch (e) {
    // ignore
  }
};

// Helper to find or create a folder in Google Drive
export const findOrCreateFolder = async (folderName: string, parentFolderId?: string): Promise<string> => {
  if (!cachedAccessToken) {
    throw new Error('Não autenticado com o Google Drive');
  }

  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
      },
    }
  );

  if (searchRes.status === 401) {
    await disconnectGoogleDrive();
    throw new Error('Sessão do Google Drive expirada. Clique para conectar novamente.');
  }

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!createRes.ok) {
    if (createRes.status === 401) {
      await disconnectGoogleDrive();
      throw new Error('Sessão do Google Drive expirada. Clique para conectar novamente.');
    }
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao criar pasta no Google Drive');
  }

  const created = await createRes.json();
  return created.id;
};

// Upload photo/file (Data URL or base64) to Google Drive
export const uploadFileToDrive = async ({
  name,
  mimeType,
  dataUrl,
  parentFolderId,
}: {
  name: string;
  mimeType: string;
  dataUrl: string;
  parentFolderId?: string;
}): Promise<{ id: string; webViewLink?: string }> => {
  if (!cachedAccessToken) {
    throw new Error('Google Drive não conectado.');
  }

  // Convert base64 dataUrl to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  const metadata: any = {
    name,
    mimeType,
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', blob);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
      },
      body: form,
    }
  );

  if (!uploadRes.ok) {
    if (uploadRes.status === 401) {
      await disconnectGoogleDrive();
      throw new Error('Sessão do Google Drive expirada. Clique no botão do Drive para renovar o acesso.');
    }
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao enviar arquivo para o Google Drive.');
  }

  return await uploadRes.json();
};
