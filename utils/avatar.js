/**
 * Dynamic respective avatar generator and photo resolver
 * Eliminates static placeholders and ensures every NGO and User
 * displays a dedicated, dynamic, respective profile image or logo.
 */

const NGO_DEFAULT_LOGOS = {
  'divine foundation': 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=300',
  'pratham education foundation': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=300',
  'krishnayan gaushala': 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=300',
  'gau seva trust': 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=300',
  'save the children': 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=300',
  'hope foundation': 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&q=80&w=300',
  'divine nakshatra': 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&q=80&w=300',
  'eoxysit solution llp': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300',
  'karan motors': 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=300',
  'laxmi enterprises': 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=300',
  'vinayak collection': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=300'
};

function getDynamicAvatarUrl(name, type = 'ngo', seed = '') {
  const cleanName = (name || (type === 'ngo' ? 'NGO Partner' : 'Donor User')).trim();
  
  // High contrast vibrant color palettes
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

function resolveEntityPhoto(entity, type = 'ngo') {
  if (!entity) return getDynamicAvatarUrl('User', type);
  
  const possiblePhotos = [
    entity.logo,
    entity.profilePhoto,
    entity.profileImage,
    entity.image,
    entity.imageUrl,
    entity.avatar
  ];
  
  for (const p of possiblePhotos) {
    if (p && typeof p === 'string' && p.trim() !== '' && !p.includes('catbox.moe')) {
      return p.trim();
    }
  }
  
  const displayName = (entity.name || entity.organizationName || '').trim();
  const lowerName = displayName.toLowerCase();
  
  if (type === 'ngo' && NGO_DEFAULT_LOGOS[lowerName]) {
    return NGO_DEFAULT_LOGOS[lowerName];
  }
  
  return getDynamicAvatarUrl(displayName || (type === 'ngo' ? 'NGO' : 'User'), type, entity._id || entity.id || displayName);
}

module.exports = {
  getDynamicAvatarUrl,
  resolveEntityPhoto,
  NGO_DEFAULT_LOGOS
};
