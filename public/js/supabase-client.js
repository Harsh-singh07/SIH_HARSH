// Project credentials live in public/js/config.js, which is intentionally ignored by Git.
// Loading it synchronously keeps the existing static HTML pages simple.
if (!window.KISAN_SETU_CONFIG) {
  document.write('<script src="/public/js/config.js"><\/script>');
}

const supabaseConfig = window.KISAN_SETU_CONFIG || {};
window.SUPABASE_URL = supabaseConfig.url || '';
window.SUPABASE_ANON_KEY = supabaseConfig.publishableKey || '';
window.supabaseClient = window.SUPABASE_URL && window.SUPABASE_ANON_KEY
  ? window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;

window.supabaseErrorMessage = error => {
  if (!window.supabaseClient) return 'Supabase is not configured. Create public/js/config.js from config.example.js and add your project credentials.';
  if (error?.message === 'Invalid API key') return 'Supabase rejected this publishable key. Replace it with the current Project API key from Supabase Dashboard → Connect.';
  if (error?.message?.toLowerCase().includes('fetch')) return 'Unable to contact the Mandi Portal. Check your internet connection and try again.';
  return error?.message || 'The Mandi Portal could not complete this request.';
};
