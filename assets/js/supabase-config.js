/**
 * ==========================================================================
 * LUVITS - SUPABASE CLIENT CONFIGURATION & CLIENT-SIDE API
 * Project: https://qrzwdgndhjsyqexznbnk.supabase.co
 * Anon Key: sb_publishable_oLH39ynQrdPlKpFDKwOVlw_cUJSOakE
 * ==========================================================================
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://qrzwdgndhjsyqexznbnk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_oLH39ynQrdPlKpFDKwOVlw_cUJSOakE';

// Create Supabase Client instance with persistent local storage session
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});

/**
 * Sign up a new user and insert their profile into public.profiles
 */
export async function supabaseSignUp(email, password, profileData = {}) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          full_name: profileData.full_name || '',
          business_name: profileData.business_name || '',
          country_code: profileData.country_code || '+91',
          mobile_number: profileData.mobile_number || '',
          business_country: profileData.business_country || '',
          business_state: profileData.business_state || '',
          business_city: profileData.business_city || ''
        }
      }
    });

    if (error) throw error;

    // If user record is created immediately, save profile to public.profiles table
    if (data && data.user) {
      await supabaseSaveProfile(data.user.id, {
        full_name: profileData.full_name || '',
        business_name: profileData.business_name || '',
        country_code: profileData.country_code || '+91',
        mobile_number: profileData.mobile_number || '',
        business_country: profileData.business_country || '',
        business_state: profileData.business_state || '',
        business_city: profileData.business_city || ''
      });
    }

    return { success: true, data };
  } catch (err) {
    console.error('Supabase SignUp Error:', err);
    return { success: false, error: err.message || 'Failed to create account.' };
  }
}

/**
 * Sign in existing user with email and password
 */
export async function supabaseSignIn(email, password) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Supabase SignIn Error:', err);
    return { success: false, error: err.message || 'Invalid email or password.' };
  }
}

/**
 * Sign out the currently authenticated user
 */
export async function supabaseSignOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Supabase SignOut Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get current session from Supabase
 */
export async function supabaseGetSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  } catch (err) {
    console.error('Supabase GetSession Error:', err);
    return null;
  }
}

/**
 * Get currently authenticated user
 */
export async function supabaseGetUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (err) {
    return null;
  }
}

/**
 * Save / Upsert user profile into public.profiles table
 */
export async function supabaseSaveProfile(userId, profileData) {
  if (!userId) return { success: false, error: 'User ID is required' };
  try {
    const payload = {
      id: userId,
      full_name: profileData.full_name || profileData.name || '',
      business_name: profileData.business_name || profileData.business || '',
      country_code: profileData.country_code || '+91',
      mobile_number: profileData.mobile_number || profileData.phone || '',
      business_country: profileData.business_country || profileData.country || '',
      business_state: profileData.business_state || profileData.state || '',
      business_city: profileData.business_city || profileData.city || '',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Upsert public.profiles warning:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.warn('Save public.profiles error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get user profile from public.profiles table
 */
export async function supabaseGetProfile(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Get public.profiles warning:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Fetch public.profiles error:', err);
    return null;
  }
}

/**
 * Save user workflow preferences to public.workflow_preferences
 * Permits one saved current preference per user (upserts on user_id)
 */
export async function supabaseSaveWorkflowPreferences(userId, prefs = {}) {
  if (!userId) return { success: false, error: 'User ID is required' };
  try {
    const phaseVal = prefs.phase || prefs.workflow_phase || '';
    const catVal = prefs.category || '';
    const toolVal = prefs.tool || prefs.selected_tool || '';

    // Primary payload matching public.workflow_preferences standard schema
    const payload = {
      user_id: userId,
      phase: phaseVal,
      category: catVal,
      tool: toolVal,
      updated_at: new Date().toISOString()
    };

    let { data, error } = await supabase
      .from('workflow_preferences')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      // Fallback in case columns are named workflow_phase or selected_tool
      const altPayload = {
        user_id: userId,
        workflow_phase: phaseVal,
        category: catVal,
        selected_tool: toolVal,
        updated_at: new Date().toISOString()
      };
      const altRes = await supabase
        .from('workflow_preferences')
        .upsert(altPayload, { onConflict: 'user_id' });

      if (altRes.error) {
        console.warn('Upsert workflow_preferences error:', error, altRes.error);
        return { success: false, error: altRes.error.message || error.message };
      }
      return { success: true, data: altRes.data };
    }

    return { success: true, data };
  } catch (err) {
    console.warn('Save workflow_preferences error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get user workflow preferences from public.workflow_preferences
 */
export async function supabaseGetWorkflowPreferences(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('workflow_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      phase: data.phase || data.workflow_phase || '',
      category: data.category || '',
      tool: data.tool || data.selected_tool || ''
    };
  } catch (err) {
    console.warn('Get workflow_preferences error:', err);
    return null;
  }
}
