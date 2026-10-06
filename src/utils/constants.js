// Shared allowlists. Keeping these server-side means a tampered client cannot
// inject arbitrary categories/statuses into the database.

const REPORT_CATEGORIES = [
  'Police',
  'Judiciary',
  'Government',
  'Healthcare',
  'Education',
  'Land',
  'Procurement',
  'Elections',
  'Other',
];

const REPORT_STATUSES = ['pending', 'reviewing', 'resolved', 'closed'];

const REPORT_PRIORITIES = ['low', 'medium', 'high', 'critical'];

// All 47 counties of Kenya.
const KENYA_COUNTIES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta',
  'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru',
  'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua',
  'Nyeri', 'Kirinyaga', "Murang'a", 'Kiambu', 'Turkana', 'West Pokot',
  'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi',
  'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet',
  'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay',
  'Migori', 'Kisii', 'Nyamira', 'Nairobi',
];

const USER_ROLES = ['admin', 'reviewer', 'viewer'];

module.exports = {
  REPORT_CATEGORIES,
  REPORT_STATUSES,
  REPORT_PRIORITIES,
  KENYA_COUNTIES,
  USER_ROLES,
};
