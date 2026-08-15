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

/**
 * Check if the currently authenticated user has the 'admin' role
 * Executes database-level SECURITY DEFINER function or user_roles query
 */
export async function supabaseCheckIsAdmin(userId) {
  if (!userId) return false;
  try {
    // 1. Attempt database RPC function is_admin()
    const { data: rpcAdmin, error: rpcErr } = await supabase.rpc('is_admin');
    if (!rpcErr && typeof rpcAdmin === 'boolean') {
      return rpcAdmin;
    }

    // 2. Direct user_roles lookup as fallback
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return false;
    return data.role === 'admin';
  } catch (err) {
    console.warn('Admin check error:', err);
    return false;
  }
}

/**
 * Fetch current user's role ('admin' or 'user')
 */
export async function supabaseGetMyRole(userId) {
  if (!userId) return 'user';
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return 'user';
    return data.role || 'user';
  } catch (e) {
    return 'user';
  }
}

/**
 * Fetch all users for Admin Dashboard (Profiles + Roles + Preferences)
 * Protected by Supabase Row Level Security (RLS)
 */
export async function supabaseGetAllUsers() {
  try {
    // 1. Fetch profiles
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (pErr) throw pErr;
    if (!profiles || profiles.length === 0) return [];

    // 2. Fetch roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*');

    const roleMap = {};
    (roles || []).forEach(r => { roleMap[r.user_id] = r.role; });

    // 3. Fetch workflow preferences
    const { data: prefs } = await supabase
      .from('workflow_preferences')
      .select('*');

    const prefMap = {};
    (prefs || []).forEach(pr => {
      prefMap[pr.user_id] = {
        phase: pr.phase || pr.workflow_phase || '',
        category: pr.category || '',
        tool: pr.tool || pr.selected_tool || ''
      };
    });

    // Merge into user records
    return profiles.map(p => ({
      ...p,
      role: roleMap[p.id] || 'user',
      status: p.status || 'active',
      preference: prefMap[p.id] || null
    }));
  } catch (err) {
    console.error('Fetch all users error:', err);
    return [];
  }
}

/**
 * Admin: Suspend or Reactivate a user account
 * Protected by Supabase Row Level Security (RLS)
 */
export async function supabaseSetUserStatus(userId, status) {
  if (!userId || !['active', 'suspended'].includes(status)) {
    return { success: false, error: 'Invalid user ID or status' };
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Set user status error:', err);
    return { success: false, error: err.message || 'Failed to update user status' };
  }
}

/**
 * Fetch Tools from public.tools table
 * Regular users receive active tools only; Admins receive all tools (enforced by RLS)
 */
export async function supabaseGetTools() {
  try {
    const { data, error } = await supabase
      .from('tools')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('tag', { ascending: true })
      .order('cat', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Fetch tools error:', err);
    return [];
  }
}

/**
 * Admin: Add a new tool to public.tools
 */
export async function supabaseCreateTool(toolData) {
  try {
    const payload = {
      tag: (toolData.tag || '').trim(),
      cat: (toolData.cat || '').trim(),
      purpose: (toolData.purpose || '').trim(),
      link: (toolData.link || '').trim(),
      is_active: toolData.is_active !== false,
      sort_order: parseInt(toolData.sort_order, 10) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!payload.tag || !payload.cat || !payload.purpose || !payload.link) {
      return { success: false, error: 'All tool fields are required.' };
    }

    const { data, error } = await supabase
      .from('tools')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Create tool error:', err);
    return { success: false, error: err.message || 'Failed to create tool' };
  }
}

/**
 * Admin: Update an existing tool in public.tools
 */
export async function supabaseUpdateTool(toolId, toolData) {
  if (!toolId) return { success: false, error: 'Tool ID is required.' };
  try {
    const payload = {
      tag: (toolData.tag || '').trim(),
      cat: (toolData.cat || '').trim(),
      purpose: (toolData.purpose || '').trim(),
      link: (toolData.link || '').trim(),
      is_active: toolData.is_active !== false,
      sort_order: parseInt(toolData.sort_order, 10) || 0,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tools')
      .update(payload)
      .eq('id', toolId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Update tool error:', err);
    return { success: false, error: err.message || 'Failed to update tool' };
  }
}

/**
 * Admin: Toggle tool active/inactive status in public.tools
 */
export async function supabaseToggleToolStatus(toolId, isActive) {
  if (!toolId) return { success: false, error: 'Tool ID is required.' };
  try {
    const { data, error } = await supabase
      .from('tools')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', toolId);

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Toggle tool status error:', err);
    return { success: false, error: err.message || 'Failed to update tool status' };
  }
}
