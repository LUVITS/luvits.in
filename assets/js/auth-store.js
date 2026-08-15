/**
 * ==========================================================================
 * LUVITS - AUTHENTICATION STATE & USER STORE (SUPABASE POWERED)
 * Project: https://qrzwdgndhjsyqexznbnk.supabase.co
 * No passwords are ever stored in localStorage or memory.
 * ==========================================================================
 */

import {
  supabase,
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignOut,
  supabaseGetSession,
  supabaseGetUser,
  supabaseGetProfile,
  supabaseSaveProfile,
  supabaseGetWorkflowPreferences,
  supabaseSaveWorkflowPreferences
} from './supabase-config.js';

class AuthStore {
  constructor() {
    this.storageKey = 'luvits_user_profile';
    this.currentUser = this.loadCachedProfile();
    this.initSupabaseListener();
    this.refreshSession();
  }

  /**
   * Load cached user profile (non-sensitive: id, email, full_name, etc.)
   * NEVER STORES PASSWORDS.
   */
  loadCachedProfile() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Save sanitized user profile (NO PASSWORDS)
   */
  saveProfile(userData) {
    if (!userData) {
      this.currentUser = null;
      localStorage.removeItem(this.storageKey);
    } else {
      this.currentUser = {
        id: userData.id || '',
        email: userData.email || '',
        full_name: userData.full_name || userData.name || userData.user_metadata?.full_name || userData.user_metadata?.name || (userData.email ? userData.email.split('@')[0] : 'Member'),
        name: userData.full_name || userData.name || userData.user_metadata?.full_name || userData.user_metadata?.name || (userData.email ? userData.email.split('@')[0] : 'Member'),
        business_name: userData.business_name || userData.business || userData.user_metadata?.business_name || userData.user_metadata?.business || 'LUVITS Enterprise',
        country_code: userData.country_code || userData.user_metadata?.country_code || '+91',
        mobile_number: userData.mobile_number || userData.phone || userData.user_metadata?.mobile_number || userData.user_metadata?.phone || '',
        business_country: userData.business_country || userData.country || userData.user_metadata?.business_country || 'India',
        business_state: userData.business_state || userData.state || userData.user_metadata?.business_state || '',
        business_city: userData.business_city || userData.city || userData.user_metadata?.business_city || '',
        role: userData.role || userData.user_metadata?.role || 'member'
      };
      localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser));
    }
    this.notifyStateChange();
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated() {
    return this.currentUser !== null && !!this.currentUser.id;
  }

  /**
   * Check / refresh Supabase session directly from Supabase API
   */
  async refreshSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data || !data.session) {
        if (!this.currentUser || !this.currentUser.id) {
          this.saveProfile(null);
        }
        return null;
      }

      const user = data.session.user;
      if (user) {
        // Fetch detailed profile from public.profiles
        const dbProfile = await supabaseGetProfile(user.id);
        const metadata = user.user_metadata || {};

        const fullProfile = {
          id: user.id,
          email: user.email,
          full_name: dbProfile?.full_name || metadata.full_name || metadata.name || (user.email ? user.email.split('@')[0] : 'Member'),
          business_name: dbProfile?.business_name || metadata.business_name || metadata.business || 'LUVITS Enterprise',
          country_code: dbProfile?.country_code || metadata.country_code || '+91',
          mobile_number: dbProfile?.mobile_number || metadata.mobile_number || metadata.phone || '',
          business_country: dbProfile?.business_country || metadata.business_country || 'India',
          business_state: dbProfile?.business_state || metadata.business_state || '',
          business_city: dbProfile?.business_city || metadata.business_city || '',
          role: metadata.role || 'member'
        };
        this.saveProfile(fullProfile);
        return fullProfile;
      }
    } catch (e) {
      console.warn('Session refresh warning:', e);
    }
    return null;
  }

  /**
   * Sign in with Supabase using Email & Password
   */
  async loginWithEmail(email, password) {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPass = (password || '').toString();

    if (!trimmedEmail || !trimmedPass) {
      return { success: false, error: 'Please provide both email and password.' };
    }

    const res = await supabaseSignIn(trimmedEmail, trimmedPass);
    if (res.success && res.data && res.data.user) {
      const user = res.data.user;
      // Fetch profile from public.profiles
      const dbProfile = await supabaseGetProfile(user.id);
      const metadata = user.user_metadata || {};

      const profile = {
        id: user.id,
        email: user.email,
        full_name: dbProfile?.full_name || metadata.full_name || metadata.name || (user.email ? user.email.split('@')[0] : 'Member'),
        business_name: dbProfile?.business_name || metadata.business_name || metadata.business || 'LUVITS Enterprise',
        country_code: dbProfile?.country_code || metadata.country_code || '+91',
        mobile_number: dbProfile?.mobile_number || metadata.mobile_number || metadata.phone || '',
        business_country: dbProfile?.business_country || metadata.business_country || 'India',
        business_state: dbProfile?.business_state || metadata.business_state || '',
        business_city: dbProfile?.business_city || metadata.business_city || '',
        role: metadata.role || 'member'
      };

      // If dbProfile didn't exist yet, save it to public.profiles
      if (!dbProfile) {
        await supabaseSaveProfile(user.id, profile);
      }

      this.saveProfile(profile);
      return { success: true, user: profile, redirectUrl: '/LUVITS_WorkFlow.html' };
    }

    return { success: false, error: res.error || 'Invalid email or password. Please try again.' };
  }

  /**
   * Sign up with Supabase using Email, Password, and Profile metadata
   * Automatically saves to public.profiles table
   */
  async signUpWithEmail(email, password, profileFields = {}) {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPass = (password || '').toString();

    if (!trimmedEmail) return { success: false, error: 'Email address is required.' };
    if (!trimmedPass || trimmedPass.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

    const profileData = {
      full_name: (profileFields.full_name || profileFields.name || '').trim(),
      business_name: (profileFields.business_name || profileFields.business || '').trim(),
      country_code: (profileFields.country_code || '+91').trim(),
      mobile_number: (profileFields.mobile_number || profileFields.phone || '').trim(),
      business_country: (profileFields.business_country || profileFields.country || 'India').trim(),
      business_state: (profileFields.business_state || profileFields.state || '').trim(),
      business_city: (profileFields.business_city || profileFields.city || '').trim()
    };

    const res = await supabaseSignUp(trimmedEmail, trimmedPass, profileData);

    if (res.success && res.data) {
      const user = res.data.user;
      if (user) {
        // Save to public.profiles table
        await supabaseSaveProfile(user.id, profileData);

        const profile = {
          id: user.id,
          email: user.email,
          ...profileData,
          role: 'member'
        };
        this.saveProfile(profile);
      }

      return {
        success: true,
        data: res.data,
        redirectUrl: '/LUVITS_WorkFlow.html',
        requiresConfirmation: !res.data.session
      };
    }

    return { success: false, error: res.error || 'Failed to create account.' };
  }

  /**
   * Sign out and redirect to auth.html
   */
  async logout() {
    try {
      await supabaseSignOut();
    } catch (e) {
      console.warn('Supabase sign out error:', e);
    }
    this.saveProfile(null);
    window.location.href = '/auth.html';
  }

  /**
   * Initialize Supabase auth state listener
   */
  initSupabaseListener() {
    try {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && session.user) {
          const user = session.user;
          const dbProfile = await supabaseGetProfile(user.id);
          const metadata = user.user_metadata || {};

          this.saveProfile({
            id: user.id,
            email: user.email,
            full_name: dbProfile?.full_name || metadata.full_name || metadata.name || (user.email ? user.email.split('@')[0] : 'Member'),
            business_name: dbProfile?.business_name || metadata.business_name || metadata.business || 'LUVITS Enterprise',
            country_code: dbProfile?.country_code || metadata.country_code || '+91',
            mobile_number: dbProfile?.mobile_number || metadata.mobile_number || metadata.phone || '',
            business_country: dbProfile?.business_country || metadata.business_country || 'India',
            business_state: dbProfile?.business_state || metadata.business_state || '',
            business_city: dbProfile?.business_city || metadata.business_city || '',
            role: metadata.role || 'member'
          });
        } else if (event === 'SIGNED_OUT') {
          this.saveProfile(null);
        }
      });
    } catch (e) {
      console.warn('Supabase auth state listener warning:', e);
    }
  }

  getUserInitial() {
    if (!this.currentUser) return 'U';
    const name = this.currentUser.full_name || this.currentUser.name || this.currentUser.email || 'User';
    return name.trim().charAt(0).toUpperCase();
  }

  renderHeaderAuth(container) {
    if (!container) return;

    if (this.isAuthenticated()) {
      const initial = this.getUserInitial();
      const name = this.currentUser.full_name || this.currentUser.name || 'User';
      const email = this.currentUser.email || '';

      container.innerHTML = `
        <div class="auth-wrapper" style="position: relative;">
          <button type="button" class="auth-avatar-btn" id="user-avatar-btn" aria-expanded="false" aria-label="User Account Menu">
            ${initial}
          </button>
          <div class="user-dropdown" id="user-dropdown-menu" role="menu">
            <div class="dropdown-header">
              <div class="dropdown-user-name">${name}</div>
              <div class="dropdown-user-email">${email}</div>
              <span class="badge badge-gold" style="font-size: 0.65rem; padding: 2px 6px; margin-top: 4px; display: inline-block;">
                Verified Member
              </span>
            </div>
            <a href="/LUVITS_WorkFlow.html" class="dropdown-item" role="menuitem" style="color: var(--gold-light); font-weight: 600;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              ⚡ LUVITS WorkFlow
            </a>
            <a href="/workflow/tools" target="_blank" rel="noopener noreferrer" class="dropdown-item" role="menuitem" style="color: var(--text-primary); font-size: var(--fs-xs);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              🚀 Prescribed Tools ↗
            </a>
            <a href="/dashboard" class="dropdown-item" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Dashboard
            </a>
            <button type="button" class="dropdown-item text-danger" id="logout-btn" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Log Out
            </button>
          </div>
        </div>
      `;

      this.bindDropdownEvents();
    } else {
      container.innerHTML = `
        <a href="/auth.html#login" class="btn btn-outline btn-sm">Log In</a>
        <a href="/auth.html#signup" class="btn btn-gold btn-sm">Sign Up</a>
      `;
    }
  }

  bindDropdownEvents() {
    const avatarBtn = document.getElementById('user-avatar-btn');
    const dropdown = document.getElementById('user-dropdown-menu');
    const logoutBtn = document.getElementById('logout-btn');

    if (avatarBtn && dropdown) {
      avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.toggle('is-open');
        avatarBtn.setAttribute('aria-expanded', String(isOpen));
      });

      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== avatarBtn) {
          dropdown.classList.remove('is-open');
          avatarBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  }

  notifyStateChange() {
    const container = document.querySelector('[data-auth-container]');
    if (container) this.renderHeaderAuth(container);
    window.dispatchEvent(new CustomEvent('luvits:auth-change', {
      detail: { user: this.currentUser, isAuthenticated: this.isAuthenticated() }
    }));
  }
}

export const authStore = new AuthStore();
