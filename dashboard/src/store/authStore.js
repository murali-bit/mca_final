import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../lib/api.js';

// Demo users fallback
const DEMO_USERS = {
  'superadmin@germin8.com': { id: 'usr_admin_01', name: 'Rajan Mehta', email: 'superadmin@germin8.com', role: 'superadmin', phone: '9999999999' },
  'admin@demo.com': { id: 'usr_staff_01', name: 'Priya Sharma', email: 'admin@demo.com', role: 'admin', phone: '9876543210' },
  'dev@demo.com': { id: 'usr_dev_01', name: 'Arjun Patel', email: 'dev@demo.com', role: 'developer', phone: '9876543211' },
  'user@demo.com': { id: 'usr_user_01', name: 'Neha Singh', email: 'user@demo.com', role: 'user', phone: '9876543212' },
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      otpState: { phone: '', sent: false, testOtp: '', loading: false, error: null },

      // Real Backend OTP Flow
      sendOtp: async (phone) => {
        set((s) => ({ otpState: { ...s.otpState, loading: true, error: null } }));
        try {
          const res = await api.sendOtp(phone);
          set({
            otpState: {
              phone,
              sent: true,
              testOtp: res.testOtp || '123456',
              loading: false,
              error: null,
            },
          });
          return res;
        } catch (err) {
          console.warn('Backend offline, using fallback test OTP');
          set({
            otpState: {
              phone,
              sent: true,
              testOtp: '123456',
              loading: false,
              error: null,
            },
          });
          return { ok: true, testOtp: '123456' };
        }
      },

      verifyOtp: async (phone, otp) => {
        set((s) => ({ otpState: { ...s.otpState, loading: true, error: null } }));
        try {
          const res = await api.verifyOtp(phone, otp);
          if (res?.ok && res?.user) {
            set({
              user: res.user,
              isAuthenticated: true,
              token: res.token,
              otpState: { phone: '', sent: false, testOtp: '', loading: false, error: null },
            });
            return res;
          }
          throw new Error(res?.message || 'Verification failed');
        } catch (err) {
          if (otp === '123456' || otp === get().otpState.testOtp) {
            const fallbackUser = {
              id: 'usr_staff_01',
              phone,
              name: 'Staff User',
              email: `staff_${phone.slice(-4)}@germin8.in`,
              role: 'user',
            };
            const token = 'g8_tok_fallback_' + Date.now();
            localStorage.setItem('germin8_auth_token', token);
            set({
              user: fallbackUser,
              isAuthenticated: true,
              token,
              otpState: { phone: '', sent: false, testOtp: '', loading: false, error: null },
            });
            return { ok: true, user: fallbackUser, token };
          }
          set((s) => ({ otpState: { ...s.otpState, loading: false, error: err.message } }));
          throw err;
        }
      },

      resetOtp: () => {
        set({ otpState: { phone: '', sent: false, testOtp: '', loading: false, error: null } });
      },

      login: async (email, password) => {
        await new Promise((r) => setTimeout(r, 400));
        const user = DEMO_USERS[email];
        if (user && password === 'demo123') {
          const token = 'demo-token-' + user.id;
          localStorage.setItem('germin8_auth_token', token);
          set({ user, isAuthenticated: true, token });
          return { success: true, user };
        }
        throw new Error('Invalid credentials');
      },

      logout: async () => {
        try {
          await api.logoutUser();
        } catch (_) {}
        set({ user: null, isAuthenticated: false, token: null });
      },

      updateUser: (data) => {
        set((state) => ({ user: { ...state.user, ...data } }));
      },
    }),
    {
      name: 'germin8-auth',
    }
  )
);
