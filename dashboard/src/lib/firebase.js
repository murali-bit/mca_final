/**
 * Firebase Client SDK Configuration
 * Project: germin8-e6079
 * Provides 10,000 Free Phone SMS OTPs per month
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDrn4HAfjJ75-_iZho2SoLzAo0H0hBNehs",
  authDomain: "germin8-e6079.firebaseapp.com",
  projectId: "germin8-e6079",
  storageBucket: "germin8-e6079.firebasestorage.app",
  messagingSenderId: "1040283940234",
  appId: "1:1040283940234:web:c09987bc1d85f34e090473",
  measurementId: "G-8C8V27YNJ2"
};

// Initialize Firebase once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// Configure invisible reCAPTCHA for phone OTP
export function initRecaptcha(elementId = 'recaptcha-container') {
  if (typeof window === 'undefined') return null;

  // Ensure element exists in DOM
  let container = document.getElementById(elementId);
  if (!container) {
    container = document.createElement('div');
    container.id = elementId;
    document.body.appendChild(container);
  }

  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (_) {}
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, container, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired');
    }
  });

  return window.recaptchaVerifier;
}

// Send real SMS OTP to phone (+91...)
export async function sendFirebasePhoneOtp(formattedPhone) {
  try {
    const verifier = initRecaptcha('recaptcha-container');
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
    window.confirmationResult = confirmationResult;
    return confirmationResult;
  } catch (err) {
    console.error('Firebase signInWithPhoneNumber error:', err);
    throw err;
  }
}

// Verify the SMS OTP code
export async function confirmFirebasePhoneOtp(confirmationResult, code) {
  const res = confirmationResult || window.confirmationResult;
  if (!res) throw new Error('No OTP request found. Please request a new code.');
  const userCredential = await res.confirm(code);
  return userCredential.user;
}

