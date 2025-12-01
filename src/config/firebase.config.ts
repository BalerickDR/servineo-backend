import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = require('../../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'conexia-400921.appspot.com',
    });
  } catch (error) {
    console.log('firebase-service-account.json no encontrado → usando firebaseConfig del .env');
    const firebaseConfig = {};
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      ...firebaseConfig,
      storageBucket: 'conexia-400921.appspot.com',
    });
  }
}

// Exportamos siempre lo mismo
export const db = admin.firestore();
export const storage = admin.storage();
export const bucket = storage.bucket();

// Configuración global recomendada para Firestore (mejor rendimiento)
db.settings({
  timestampsInSnapshots: true, // deprecated pero por si acaso
  ignoreUndefinedProperties: true,
});
