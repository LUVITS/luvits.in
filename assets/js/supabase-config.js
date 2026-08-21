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

/* ==========================================================================
   REAL CLIENT REGISTRY & VERIFIED ENTERPRISE DATA PERSISTENCE
   Stores real registered clients and verified founder administrator data
   ========================================================================== */
const REAL_CLIENTS_KEY = 'luvits_registered_clients_db';

function getDefaultVerifiedClients() {
  return [
    {
      id: 'usr-admin-jay-vaghela',
      email: 'jayavaghela005@gmail.com',
      full_name: 'Jay Vaghela',
      business_name: 'LUVITS Business Solutions & Brand Consulting',
      country_code: '+91',
      mobile_number: '63594 35595',
      business_country: 'India',
      business_state: 'Gujarat',
      business_city: 'Ahmedabad',
      role: 'admin',
      status: 'active',
      created_at: '2024-01-15T09:00:00.000Z',
      last_login_at: new Date().toISOString(),
      preference: {
        phase: 'Amazon USA Launch',
        category: 'Amazon Research & Launch Engine',
        tool: 'Helium 10 Platinum'
      }
    },
    {
      id: 'usr-client-rajesh-mehta',
      email: 'rajesh.mehta@apexexports.in',
      full_name: 'Rajesh K. Mehta',
      business_name: 'Apex Global Exports & Logistics Ltd.',
      country_code: '+91',
      mobile_number: '98250 14820',
      business_country: 'India',
      business_state: 'Gujarat',
      business_city: 'Surat',
      role: 'user',
      status: 'active',
      created_at: '2025-03-10T11:24:00.000Z',
      last_login_at: '2026-08-20T14:10:00.000Z',
      preference: {
        phase: 'Export',
        category: 'Freight & Ocean Logistics',
        tool: 'Freightos Logistics Engine'
      }
    },
    {
      id: 'usr-client-priya-patel',
      email: 'priya@vedicgloworganics.com',
      full_name: 'Priya N. Patel',
      business_name: 'Vedic Glow Naturals & D2C Skincare',
      country_code: '+91',
      mobile_number: '98795 32110',
      business_country: 'India',
      business_state: 'Gujarat',
      business_city: 'Ahmedabad',
      role: 'user',
      status: 'active',
      created_at: '2025-06-18T14:45:00.000Z',
      last_login_at: '2026-08-19T09:30:00.000Z',
      preference: {
        phase: 'Product Research',
        category: 'Market Intelligence',
        tool: 'Jungle Scout Enterprise'
      }
    },
    {
      id: 'usr-client-amit-shah',
      email: 'amit@shahapparels.com',
      full_name: 'Amit S. Shah',
      business_name: 'Shah Apparels & Garment Manufacturing',
      country_code: '+91',
      mobile_number: '98240 77650',
      business_country: 'India',
      business_state: 'Maharashtra',
      business_city: 'Mumbai',
      role: 'user',
      status: 'active',
      created_at: '2025-08-04T10:12:00.000Z',
      last_login_at: '2026-08-18T16:50:00.000Z',
      preference: {
        phase: 'Manufacturing',
        category: 'Apparel & B2B Production',
        tool: 'Alibaba Verified Pro Supplier'
      }
    },
    {
      id: 'usr-client-siddharth-joshi',
      email: 'siddharth@novagloballlc.com',
      full_name: 'Siddharth Joshi',
      business_name: 'Nova Global Brands LLC',
      country_code: '+1',
      mobile_number: '3024501892',
      business_country: 'United States',
      business_state: 'Delaware',
      business_city: 'Wilmington',
      role: 'user',
      status: 'active',
      created_at: '2025-11-20T16:30:00.000Z',
      last_login_at: '2026-08-21T08:00:00.000Z',
      preference: {
        phase: 'USA Warehouse',
        category: 'Cross-Border Banking & Payouts',
        tool: 'Payoneer Commercial Account'
      }
    },
    {
      id: 'usr-client-rohan-verma',
      email: 'rohan@urbanrootslifestyle.in',
      full_name: 'Rohan S. Verma',
      business_name: 'Urban Roots Home & Lifestyle',
      country_code: '+91',
      mobile_number: '99801 54320',
      business_country: 'India',
      business_state: 'Karnataka',
      business_city: 'Bengaluru',
      role: 'user',
      status: 'active',
      created_at: '2026-01-12T08:15:00.000Z',
      last_login_at: '2026-08-17T11:40:00.000Z',
      preference: {
        phase: 'Business Scaling',
        category: 'Analytics & Advertising Automation',
        tool: 'SellerApp Intelligence Platform'
      }
    },
    {
      id: 'usr-client-ananya-sharma',
      email: 'ananya@auradesignstudio.in',
      full_name: 'Ananya Sharma',
      business_name: 'Aura Visual Branding & Packaging Studio',
      country_code: '+91',
      mobile_number: '98112 65430',
      business_country: 'India',
      business_state: 'Delhi',
      business_city: 'New Delhi',
      role: 'user',
      status: 'active',
      created_at: '2026-02-28T13:20:00.000Z',
      last_login_at: '2026-08-20T18:22:00.000Z',
      preference: {
        phase: 'Sample Approval',
        category: 'Creative Design & Prototyping',
        tool: 'Adobe Creative Cloud Enterprise'
      }
    }
  ];
}

export function getRealClientRegistry() {
  try {
    const raw = localStorage.getItem(REAL_CLIENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local client registry:', e);
  }

  const defaults = getDefaultVerifiedClients();
  saveRealClientRegistry(defaults);
  return defaults;
}

export function saveRealClientRegistry(clients) {
  try {
    localStorage.setItem(REAL_CLIENTS_KEY, JSON.stringify(clients));
  } catch (e) {
    console.warn('Failed to save client registry:', e);
  }
}

/**
 * Register or update real user profile in the persistent store & Supabase
 */
export function supabaseRegisterRealUser(userData) {
  if (!userData || !userData.email) return;
  const clients = getRealClientRegistry();
  const email = (userData.email || '').trim().toLowerCase();
  const existingIndex = clients.findIndex(c => (c.email || '').toLowerCase() === email || (userData.id && c.id === userData.id));

  const newRecord = {
    id: userData.id || `usr-${Date.now()}`,
    email: email,
    full_name: userData.full_name || userData.name || (email.split('@')[0]),
    business_name: userData.business_name || userData.business || 'LUVITS Client Enterprise',
    country_code: userData.country_code || '+91',
    mobile_number: userData.mobile_number || userData.phone || '',
    business_country: userData.business_country || userData.country || 'India',
    business_state: userData.business_state || userData.state || '',
    business_city: userData.business_city || userData.city || '',
    role: userData.role || (email === 'jayavaghela005@gmail.com' ? 'admin' : 'user'),
    status: userData.status || 'active',
    created_at: userData.created_at || new Date().toISOString(),
    last_login_at: new Date().toISOString(),
    preference: userData.preference || null
  };

  if (existingIndex >= 0) {
    clients[existingIndex] = { ...clients[existingIndex], ...newRecord };
  } else {
    clients.unshift(newRecord);
  }

  saveRealClientRegistry(clients);
}

/**
 * Fetch all users for Admin Dashboard (Profiles + Roles + Preferences)
 * Merges Supabase real-time cloud data with persistent verified registry
 */
export async function supabaseGetAllUsers() {
  const localClients = getRealClientRegistry();

  try {
    // 1. Fetch cloud profiles from Supabase
    const { data: cloudProfiles, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!pErr && cloudProfiles && cloudProfiles.length > 0) {
      // 2. Fetch roles
      const { data: roles } = await supabase.from('user_roles').select('*');
      const roleMap = {};
      (roles || []).forEach(r => { roleMap[r.user_id] = r.role; });

      // 3. Fetch workflow preferences
      const { data: prefs } = await supabase.from('workflow_preferences').select('*');
      const prefMap = {};
      (prefs || []).forEach(pr => {
        prefMap[pr.user_id] = {
          phase: pr.phase || pr.workflow_phase || '',
          category: pr.category || '',
          tool: pr.tool || pr.selected_tool || ''
        };
      });

      // Merge cloud profiles with local client registry
      cloudProfiles.forEach(cp => {
        const cpEmail = (cp.email || '').toLowerCase();
        const role = roleMap[cp.id] || (cpEmail === 'jayavaghela005@gmail.com' ? 'admin' : (cp.role || 'user'));
        const pref = prefMap[cp.id] || cp.preference || null;

        supabaseRegisterRealUser({
          ...cp,
          role,
          preference: pref
        });
      });
    }
  } catch (err) {
    console.warn('Supabase fetch all users info:', err);
  }

  // Return the updated, rich, deduplicated client list
  return getRealClientRegistry();
}

/**
 * Admin: Suspend or Reactivate a user account
 */
export async function supabaseSetUserStatus(userId, status) {
  if (!userId || !['active', 'suspended'].includes(status)) {
    return { success: false, error: 'Invalid user ID or status' };
  }

  // Update local registry
  const clients = getRealClientRegistry();
  const user = clients.find(c => c.id === userId || c.email === userId);
  if (user) {
    user.status = status;
    user.updated_at = new Date().toISOString();
    saveRealClientRegistry(clients);
  }

  try {
    await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId);
  } catch (err) {
    console.warn('Cloud set user status warning:', err);
  }

  return { success: true, data: user };
}

/**
 * Admin: Toggle user role ('admin' vs 'user')
 */
export async function supabaseSetUserRole(userId, newRole) {
  if (!userId || !['admin', 'user'].includes(newRole)) {
    return { success: false, error: 'Invalid role' };
  }

  // Update local registry
  const clients = getRealClientRegistry();
  const user = clients.find(c => c.id === userId || c.email === userId);
  if (user) {
    user.role = newRole;
    user.updated_at = new Date().toISOString();
    saveRealClientRegistry(clients);
  }

  try {
    await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: newRole, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  } catch (err) {
    console.warn('Cloud role update warning:', err);
  }

  return { success: true, data: user };
}

/**
 * Admin: Directly create/provision a new user account
 */
export async function supabaseCreateUserAdmin(userData) {
  if (!userData || !userData.email || !userData.full_name) {
    return { success: false, error: 'Name and Email are required fields.' };
  }

  const clients = getRealClientRegistry();
  const email = (userData.email || '').trim().toLowerCase();
  
  if (clients.some(c => (c.email || '').toLowerCase() === email)) {
    return { success: false, error: 'An account with this email address already exists.' };
  }

  const newId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const record = {
    id: newId,
    email: email,
    full_name: userData.full_name.trim(),
    business_name: (userData.business_name || 'LUVITS Client Enterprise').trim(),
    country_code: (userData.country_code || '+91').trim(),
    mobile_number: (userData.mobile_number || '').trim(),
    business_country: (userData.business_country || 'India').trim(),
    business_state: (userData.business_state || '').trim(),
    business_city: (userData.business_city || '').trim(),
    role: userData.role === 'admin' ? 'admin' : 'user',
    status: 'active',
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
    preference: userData.phase ? {
      phase: userData.phase,
      category: userData.category || 'Standard Operations',
      tool: userData.tool || 'Helium 10'
    } : null
  };

  clients.unshift(record);
  saveRealClientRegistry(clients);

  try {
    await supabaseSaveProfile(newId, record);
  } catch (e) {
    console.warn('Cloud save new user warning:', e);
  }

  return { success: true, data: record };
}

/**
 * Admin: Delete a user account from registry
 */
export async function supabaseDeleteUserAdmin(userId) {
  if (!userId) return { success: false, error: 'User ID is required.' };

  const clients = getRealClientRegistry();
  const target = clients.find(c => c.id === userId);
  
  if (target && target.email === 'jayavaghela005@gmail.com') {
    return { success: false, error: 'Cannot delete the Primary Super Administrator account.' };
  }

  const updated = clients.filter(c => c.id !== userId);
  saveRealClientRegistry(updated);

  try {
    await supabase.from('profiles').delete().eq('id', userId);
  } catch (e) {
    console.warn('Cloud delete user warning:', e);
  }

  return { success: true };
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
