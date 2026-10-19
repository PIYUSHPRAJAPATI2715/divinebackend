/**
 * Dynamic respective avatar generator and photo resolver
 * Eliminates static stock placeholders and ensures every NGO and User
 * displays their actual uploaded photo or a dedicated dynamic respective avatar.
 */

// Legacy dummy stock URLs that should NEVER be displayed as user or NGO photos
const LEGACY_STATIC_UNSPLASH_URLS = [
  'photo-1552519507-da3b142c6e3d', // Sports car
  'photo-1560179707-f14e90ef3623', // Office building
  'photo-1441986300917-64674bd600d8', // Clothes rack
  'photo-1532629345422-7515f3d16bb6', // Hands reaching out
  'photo-1509062522246-3755977927d7', // School classroom
  'photo-1570042225831-d98fa7577f1e', // Cows
  'photo-1488521787991-ed7bbaae773c', // Child smiling
  'photo-1469571486292-0ba58a3f068b', // Volunteers
  'photo-1518495973542-4542c06a5843', // Forest sunlight
  'photo-1486406146926-c627a92ad1ab', // Financial building
  'catbox.moe',
  'via.placeholder.com'
];

/**
 * Checks if a given image URL is missing, invalid, or is a legacy static placeholder
 */
function isStaticPlaceholder(url) {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase().trim();
  if (lower === '' || lower === 'null' || lower === 'undefined') return true;
  return LEGACY_STATIC_UNSPLASH_URLS.some(p => lower.includes(p));
}

/**
 * Formats relative upload URLs to full URLs using server host
 */
function formatImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const base = process.env.BASE_URL || process.env.SERVER_URL || 'http://195.35.20.150:8000';
    return `${base.replace(/\/+$/, '')}${cleanPath}`;
  }
  return trimmed;
}

/**
 * Generates a clean respective high-resolution dynamic avatar badge
 * using UI-Avatars with deterministic background colors based on the entity's real name.
 */
function getDynamicAvatarUrl(name, type = 'ngo', seed = '') {
  const cleanName = (name || (type === 'ngo' ? 'NGO Partner' : 'Donor User')).trim();
  
  // High contrast vibrant brand color palettes
  const palette = type === 'ngo'
    ? ['4F46E5', '0D9488', '2563EB', '7C3AED', '059669', 'D97706', 'DC2626', '0891B2']
    : ['0284C7', '10B981', '8B5CF6', 'F59E0B', 'EC4899', '6366F1', '14B8A6', 'E11D48'];
  
  const hashStr = (seed || cleanName).toString();
  let hash = 0;
  for (let i = 0; i < hashStr.length; i++) {
    hash = hashStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = palette[Math.abs(hash) % palette.length];
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=${color}&color=fff&size=256&bold=true&format=png`;
}

/**
 * Resolves the actual profile image or logo for an NGO or User.
 * 1. Checks entity's actual uploaded logo/photo
 * 2. If entity has linkedUser, checks linkedUser's uploaded photo
 * 3. Never returns static Unsplash stock photos of cars/buildings/clothes
 * 4. Falls back to deterministic dynamic avatar badge with real initials
 */
function resolveEntityPhoto(entity, type = 'ngo', linkedUser = null) {
  if (!entity && !linkedUser) {
    return getDynamicAvatarUrl(type === 'ngo' ? 'NGO' : 'User', type);
  }
  
  // 1. Check possible photo fields on entity
  if (entity) {
    const possiblePhotos = [
      entity.logo,
      entity.profilePhoto,
      entity.profileImage,
      entity.image,
      entity.imageUrl,
      entity.avatar
    ];
    
    for (const p of possiblePhotos) {
      if (!isStaticPlaceholder(p)) {
        return formatImageUrl(p);
      }
    }
  }

  // 2. Check linked user if available
  if (linkedUser) {
    const userPhotos = [
      linkedUser.profilePhoto,
      linkedUser.logo,
      linkedUser.image,
      linkedUser.imageUrl,
      linkedUser.avatar
    ];
    for (const p of userPhotos) {
      if (!isStaticPlaceholder(p)) {
        return formatImageUrl(p);
      }
    }
  }
  
  // 3. Dynamic respective avatar based on real name and ID
  const displayName = (
    (entity && (entity.name || entity.organizationName || entity.fullName)) ||
    (linkedUser && (linkedUser.name || linkedUser.organizationName)) ||
    (type === 'ngo' ? 'NGO' : 'User')
  ).trim();

  const seed = (entity && (entity._id || entity.id)) || (linkedUser && (linkedUser._id || linkedUser.id)) || displayName;
  
  return getDynamicAvatarUrl(displayName, type, seed);
}

/**
 * Enriches an entity with all common photo field aliases
 */
function enrichEntityPhotos(entity, type = 'ngo', linkedUser = null) {
  const photo = resolveEntityPhoto(entity, type, linkedUser);
  return {
    logo: photo,
    profilePhoto: photo,
    profileImage: photo,
    imageUrl: photo,
    image: photo,
    avatar: photo,
    photo: photo,
    userImage: photo
  };
}

module.exports = {
  getDynamicAvatarUrl,
  resolveEntityPhoto,
  enrichEntityPhotos,
  formatImageUrl,
  isStaticPlaceholder
};
