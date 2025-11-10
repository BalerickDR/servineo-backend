import { makeRawCollectionWalletAdapter } from './adapter';

const collection = process.env.FIXERS_COLLECTION || 'users';
// Adapter que apunta a tu colección real
export const walletAdapterReal = makeRawCollectionWalletAdapter(collection);
