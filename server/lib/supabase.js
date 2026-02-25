const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  logger.error('Missing Supabase configuration: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. Database operations will fail.');
}

const supabase = createClient(
  SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY || ''
);

module.exports = supabase;
