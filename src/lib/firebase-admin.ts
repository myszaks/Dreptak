import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  
  if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
    throw new Error('FIREBASE_ADMIN_PROJECT_ID is not set')
  }
  if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    throw new Error('FIREBASE_ADMIN_CLIENT_EMAIL is not set')
  }
  if (!privateKey) {
    throw new Error('FIREBASE_ADMIN_PRIVATE_KEY is not set or empty')
  }

  try {
    return initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
    })
  } catch (err) {
    console.error('[firebase-admin] initialization failed:', err)
    console.error('[firebase-admin] projectId:', process.env.FIREBASE_ADMIN_PROJECT_ID)
    console.error('[firebase-admin] clientEmail:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
    console.error('[firebase-admin] privateKey length:', privateKey?.length)
    throw err
  }
}

export const getAdminMessaging = () => getMessaging(getAdminApp())
