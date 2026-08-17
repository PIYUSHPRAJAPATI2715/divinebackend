const router = require('express').Router();
const Banner = require('../../models/Banner');
const path = require('path');
const fs = require('fs');

// 8 Designated Locations Metadata Dictionary
const LOCATION_METADATA = {
  'home_top': {
    id: 'home_top',
    name: 'Home Page 1 (Top)',
    page: 'Home Page',
    position: 'Top',
    description: 'Hero banner at top section of main Home Page',
    path: 'Home Page -> Top Section'
  },
  'home_bottom': {
    id: 'home_bottom',
    name: 'Home Page 2 (Bottom)',
    page: 'Home Page',
    position: 'Bottom',
    description: 'Banner at bottom section of main Home Page',
    path: 'Home Page -> Bottom Section'
  },
  'donate_home_top': {
    id: 'donate_home_top',
    name: 'Donate Home Page (Top)',
    page: 'Donate Home Page',
    position: 'Top',
    description: 'Hero banner at top of Donate Home Page',
    path: 'Bottom Navigation -> Donate Button'
  },
  'daan_category_top': {
    id: 'daan_category_top',
    name: 'Select Daan Category (Top)',
    page: 'Select Daan Category',
    position: 'Top',
    description: 'Top banner on Daan Main Category selection screen',
    path: 'Donate Home Page -> Tap Daan Card'
  },
  'daan_category_bottom': {
    id: 'daan_category_bottom',
    name: 'Select Daan Category (Bottom)',
    page: 'Select Daan Category',
    position: 'Bottom',
    description: 'Bottom banner on Daan Main Category selection screen',
    path: 'Donate Home Page -> Tap Daan Card'
  },
  'campaign_list_top': {
    id: 'campaign_list_top',
    name: 'Campaign List Page (Top)',
    page: 'Campaign List Page',
    position: 'Top',
    description: 'Banner at top of Ongoing Campaigns List',
    path: 'Home Page -> Ongoing Campaigns -> View All'
  },
  'following_list_top': {
    id: 'following_list_top',
    name: 'Following List Page (Top)',
    page: 'Following List Page',
    position: 'Top',
    description: 'Banner at top of Following NGOs List',
    path: 'Home Page -> Profile -> Following NGOs'
  },
  'campaign_details_bottom': {
    id: 'campaign_details_bottom',
    name: 'Campaign Details Page (Bottom)',
    page: 'Campaign Details Page',
    position: 'Bottom',
    description: 'Banner at bottom section of Campaign Detail Page',
    path: 'Campaign Detail Page -> Bottom Section'
  }
};

// Legacy placement mapping helper
const normalizeLocation = (locStr) => {
  if (!locStr) return 'home_top';
  const clean = String(locStr).toLowerCase().trim().replace(/[-\s]/g, '_');
  if (LOCATION_METADATA[clean]) return clean;
  if (clean === 'home' || clean === 'hometop') return 'home_top';
  if (clean === 'homebottom') return 'home_bottom';
  if (clean === 'donatehometop' || clean === 'donate_top' || clean === 'donate') return 'donate_home_top';
  if (clean === 'daantop' || clean === 'daan_top') return 'daan_category_top';
  if (clean === 'daanbottom' || clean === 'daan_bottom') return 'daan_category_bottom';
  if (clean === 'campaigns' || clean === 'campaign_list' || clean === 'campaignlist') return 'campaign_list_top';
  if (clean === 'following' || clean === 'followinglist') return 'following_list_top';
  if (clean === 'campaign_details' || clean === 'campaigndetails') return 'campaign_details_bottom';
  return 'home_top';
};

// Unified Screen Name Mapping Helper
const getScreenBannerLocations = (screenInput) => {
  const clean = String(screenInput || '').toLowerCase().trim().replace(/[-\s]/g, '_');
  
  if (clean === 'home' || clean === 'homepage' || clean === 'main') {
    return { screen: 'home', page: 'Home Page', topKey: 'home_top', bottomKey: 'home_bottom' };
  }
  if (clean === 'donate' || clean === 'donate_home' || clean === 'donatehome') {
    return { screen: 'donate', page: 'Donate Home Page', topKey: 'donate_home_top', bottomKey: '' };
  }
  if (clean === 'daan_category' || clean === 'daan' || clean === 'daancategory' || clean === 'category') {
    return { screen: 'daan_category', page: 'Select Daan Category', topKey: 'daan_category_top', bottomKey: 'daan_category_bottom' };
  }
  if (clean === 'campaign_list' || clean === 'campaigns' || clean === 'campaignlist') {
    return { screen: 'campaign_list', page: 'Campaign List Page', topKey: 'campaign_list_top', bottomKey: '' };
  }
  if (clean === 'following_list' || clean === 'following' || clean === 'followinglist') {
    return { screen: 'following_list', page: 'Following List Page', topKey: 'following_list_top', bottomKey: '' };
  }
  if (clean === 'campaign_details' || clean === 'campaign_detail' || clean === 'campaigndetails') {
    return { screen: 'campaign_details', page: 'Campaign Details Page', topKey: '', bottomKey: 'campaign_details_bottom' };
  }

  return { screen: 'home', page: 'Home Page', topKey: 'home_top', bottomKey: 'home_bottom' };
};

// Helper: Save Base64 file upload (Images or Videos)
const saveBase64Media = (base64Str, req, defaultPrefix = 'banner') => {
  if (!base64Str || typeof base64Str !== 'string') return '';
  if (!base64Str.startsWith('data:') && !base64Str.includes(';base64,')) {
    return base64Str;
  }
  try {
    let ext = 'png';
    let rawData = base64Str;
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('video/mp4')) ext = 'mp4';
      else if (mime.includes('video/webm')) ext = 'webm';
      else if (mime.includes('image/jpeg')) ext = 'jpg';
      else if (mime.includes('image/png')) ext = 'png';
      else if (mime.includes('image/webp')) ext = 'webp';
      else if (mime.includes('image/gif')) ext = 'gif';
      rawData = matches[2];
    }
    const buffer = Buffer.from(rawData, 'base64');
    const filename = `${defaultPrefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    const protocol = (req && (req.secure || req.headers?.['x-forwarded-proto'] === 'https')) ? 'https' : 'http';
    const host = (req && req.get) ? req.get('host') : 'divinebackend-v5gl.onrender.com';
    return `${protocol}://${host}/uploads/${filename}`;
  } catch (err) {
    return base64Str;
  }
};

// Helper: Ensure URL is a public HTTP URL and never a base64 string
const ensurePublicUrl = (urlStr, req = null, defaultPrefix = 'banner') => {
  if (!urlStr || typeof urlStr !== 'string') return '';
  if (urlStr.startsWith('data:') || urlStr.includes(';base64,')) {
    return saveBase64Media(urlStr, req, defaultPrefix);
  }
  if (urlStr.startsWith('/uploads/')) {
    const protocol = (req && (req.secure || req.headers?.['x-forwarded-proto'] === 'https')) ? 'https' : 'http';
    const host = (req && req.get) ? req.get('host') : 'divinebackend-v5gl.onrender.com';
    return `${protocol}://${host}${urlStr}`;
  }
  return urlStr;
};

// Helper: compute effective timeline status
const getBannerTimeline = (banner) => {
  const now = new Date();
  if (banner.status === 'Inactive') return 'Inactive';
  if (banner.startDate && banner.endDate) {
    if (now < new Date(banner.startDate)) return 'Scheduled';
    if (now > new Date(banner.endDate)) return 'Expired';
    return 'Live';
  }
  if (banner.startDate && now < new Date(banner.startDate)) return 'Scheduled';
  if (banner.endDate && now > new Date(banner.endDate)) return 'Expired';
  return 'Live';
};

const enrichBanner = (b, req = null) => {
  const obj = b.toObject ? b.toObject() : b;
  const locKey = normalizeLocation(obj.location || obj.placement);
  const meta = LOCATION_METADATA[locKey] || LOCATION_METADATA['home_top'];

  const mediaType = obj.mediaType || (obj.videoUrl ? 'video' : 'image');
  const rawMediaUrl = obj.mediaUrl || (mediaType === 'video' ? (obj.videoUrl || obj.imageUrl) : (obj.imageUrl || obj.videoUrl));

  const finalMediaUrl = ensurePublicUrl(rawMediaUrl, req, 'banner_media');
  const finalImageUrl = ensurePublicUrl(obj.imageUrl || finalMediaUrl, req, 'banner_img');
  const finalVideoUrl = mediaType === 'video' ? ensurePublicUrl(obj.videoUrl || finalMediaUrl, req, 'banner_vid') : '';

  return {
    ...obj,
    location: locKey,
    placement: locKey,
    page: meta.page,
    position: meta.position,
    locationName: meta.name,
    locationPath: meta.path,
    mediaType,
    mediaUrl: finalMediaUrl,
    imageUrl: finalImageUrl || finalMediaUrl,
    videoUrl: finalVideoUrl,
    timelineStatus: getBannerTimeline(obj)
  };
};

// 1. Get 8 Designated Locations Dictionary
router.get('/locations', async (req, res) => {
  try {
    const banners = await Banner.find();
    const locationsArray = Object.keys(LOCATION_METADATA).map(locKey => {
      const meta = LOCATION_METADATA[locKey];
      const locBanners = banners.filter(b => normalizeLocation(b.location || b.placement) === locKey);
      const activeCount = locBanners.filter(b => b.status === 'Active').length;
      return {
        ...meta,
        totalBannersCount: locBanners.length,
        activeBannersCount: activeCount
      };
    });
    res.json({ status: true, data: locationsArray, locations: locationsArray });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 2. ⭐ UNIFIED SCREEN BANNER API (Returns BOTH Top & Bottom Banners by Screen Name)
// Route: GET /api/banners/screen/:screenName (e.g., home, donate, daan_category, campaign_list, following_list, campaign_details)
router.get('/screen/:screenName', async (req, res) => {
  try {
    const screenInfo = getScreenBannerLocations(req.params.screenName);
    const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
    const enriched = banners
      .map(b => enrichBanner(b, req))
      .filter(b => b.status === 'Active' && b.timelineStatus === 'Live');

    const topBanners = screenInfo.topKey ? enriched.filter(b => b.location === screenInfo.topKey) : [];
    const bottomBanners = screenInfo.bottomKey ? enriched.filter(b => b.location === screenInfo.bottomKey) : [];

    const topBanner = topBanners.length > 0 ? topBanners[0] : null;
    const bottomBanner = bottomBanners.length > 0 ? bottomBanners[0] : null;

    res.json({
      status: true,
      screen: screenInfo.screen,
      page: screenInfo.page,
      topKey: screenInfo.topKey,
      bottomKey: screenInfo.bottomKey,
      top: topBanners,
      bottom: bottomBanners,
      topBanner: topBanner,
      bottomBanner: bottomBanner,
      data: {
        top: topBanners,
        bottom: bottomBanners,
        topBanner: topBanner,
        bottomBanner: bottomBanner
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 3. ⭐ UNIFIED ALL SCREENS BANNER MAP
// Route: GET /api/banners/screens
router.get('/screens', async (req, res) => {
  try {
    const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
    const enriched = banners
      .map(b => enrichBanner(b, req))
      .filter(b => b.status === 'Active' && b.timelineStatus === 'Live');

    const screenKeys = ['home', 'donate', 'daan_category', 'campaign_list', 'following_list', 'campaign_details'];
    const screenMap = {};

    screenKeys.forEach(sName => {
      const info = getScreenBannerLocations(sName);
      const topBanners = info.topKey ? enriched.filter(b => b.location === info.topKey) : [];
      const bottomBanners = info.bottomKey ? enriched.filter(b => b.location === info.bottomKey) : [];
      screenMap[sName] = {
        screen: info.screen,
        page: info.page,
        top: topBanners,
        bottom: bottomBanners,
        topBanner: topBanners.length > 0 ? topBanners[0] : null,
        bottomBanner: bottomBanners.length > 0 ? bottomBanners[0] : null
      };
    });

    res.json({ status: true, data: screenMap, screens: screenMap });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 4. Get all banners (with location filter support)
router.get('/', async (req, res) => {
  try {
    const { location, page, status, screen } = req.query;

    if (screen) {
      const screenInfo = getScreenBannerLocations(screen);
      const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
      const enriched = banners
        .map(b => enrichBanner(b, req))
        .filter(b => b.status === 'Active' && b.timelineStatus === 'Live');

      const topBanners = screenInfo.topKey ? enriched.filter(b => b.location === screenInfo.topKey) : [];
      const bottomBanners = screenInfo.bottomKey ? enriched.filter(b => b.location === screenInfo.bottomKey) : [];

      return res.json({
        status: true,
        screen: screenInfo.screen,
        page: screenInfo.page,
        top: topBanners,
        bottom: bottomBanners,
        topBanner: topBanners.length > 0 ? topBanners[0] : null,
        bottomBanner: bottomBanners.length > 0 ? bottomBanners[0] : null,
        data: {
          top: topBanners,
          bottom: bottomBanners
        }
      });
    }

    let query = {};
    if (status) query.status = status;

    const banners = await Banner.find(query).sort({ displayOrder: 1, createdAt: -1 });
    let enriched = banners.map(b => enrichBanner(b, req));

    if (location) {
      const targetLoc = normalizeLocation(location);
      enriched = enriched.filter(b => b.location === targetLoc);
    } else if (page) {
      enriched = enriched.filter(b => b.page.toLowerCase().includes(page.toLowerCase()));
    }

    res.json({
      status: true,
      count: enriched.length,
      data: enriched,
      banners: enriched
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 5. Get banners by specific location (e.g. GET /api/banners/location/:locationKey)
router.get('/location/:locationKey', async (req, res) => {
  try {
    const locKey = normalizeLocation(req.params.locationKey);
    const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
    const enriched = banners
      .map(b => enrichBanner(b, req))
      .filter(b => b.location === locKey && b.status === 'Active' && b.timelineStatus === 'Live');

    const meta = LOCATION_METADATA[locKey] || LOCATION_METADATA['home_top'];
    res.json({
      status: true,
      location: locKey,
      meta,
      count: enriched.length,
      data: enriched,
      banners: enriched
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 6. Add a banner (supports base64 media & URLs)
router.post('/', async (req, res) => {
  try {
    const bannerId = req.body.bannerId || `BNR-${Date.now().toString().slice(-6)}`;
    const locKey = normalizeLocation(req.body.location || req.body.placement);
    const meta = LOCATION_METADATA[locKey] || LOCATION_METADATA['home_top'];

    const rawImage = req.body.imageUrl || req.body.mediaUrl || req.body.image;
    const rawVideo = req.body.videoUrl || req.body.video;

    const processedImage = saveBase64Media(rawImage, req, 'banner_img');
    const processedVideo = saveBase64Media(rawVideo, req, 'banner_vid');

    const mediaType = req.body.mediaType || (processedVideo ? 'video' : 'image');
    const finalMediaUrl = mediaType === 'video' ? (processedVideo || processedImage) : (processedImage || processedVideo);

    const bannerData = {
      ...req.body,
      bannerId,
      location: locKey,
      placement: locKey,
      page: meta.page,
      position: meta.position,
      mediaType,
      imageUrl: processedImage || finalMediaUrl,
      videoUrl: processedVideo || (mediaType === 'video' ? finalMediaUrl : ''),
      mediaUrl: finalMediaUrl,
      targetRoute: req.body.targetRoute || req.body.linkUrl || '',
      status: req.body.status || 'Active',
      isSubscriptionActive: req.body.isSubscriptionActive !== undefined ? req.body.isSubscriptionActive : true,
      subscriptionPlan: req.body.subscriptionPlan || 'Standard'
    };

    const newBanner = new Banner(bannerData);
    const savedBanner = await newBanner.save();
    const enriched = enrichBanner(savedBanner, req);

    res.status(201).json({
      status: true,
      message: 'Banner created successfully',
      data: enriched,
      ...enriched
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// 7. Update banner
router.put('/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ status: false, message: 'Banner not found' });
    }

    const locKey = req.body.location || req.body.placement ? normalizeLocation(req.body.location || req.body.placement) : banner.location;
    const meta = LOCATION_METADATA[locKey] || LOCATION_METADATA['home_top'];

    const rawImage = req.body.imageUrl || req.body.mediaUrl || req.body.image;
    const rawVideo = req.body.videoUrl || req.body.video;

    const processedImage = rawImage ? saveBase64Media(rawImage, req, 'banner_img') : banner.imageUrl;
    const processedVideo = rawVideo ? saveBase64Media(rawVideo, req, 'banner_vid') : banner.videoUrl;

    const mediaType = req.body.mediaType || (processedVideo ? 'video' : banner.mediaType || 'image');
    const finalMediaUrl = mediaType === 'video' ? (processedVideo || processedImage) : (processedImage || processedVideo);

    const updateData = {
      ...req.body,
      location: locKey,
      placement: locKey,
      page: meta.page,
      position: meta.position,
      mediaType,
      imageUrl: processedImage || finalMediaUrl,
      videoUrl: processedVideo || (mediaType === 'video' ? finalMediaUrl : ''),
      mediaUrl: finalMediaUrl
    };

    const updatedBanner = await Banner.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    const enriched = enrichBanner(updatedBanner, req);
    res.json({
      status: true,
      message: 'Banner updated successfully',
      data: enriched,
      ...enriched
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// 8. Delete banner
router.delete('/:id', async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ status: false, message: 'Banner not found' });
    res.json({ status: true, message: 'Banner deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 9. Fallback route for GET /api/banners/:idOrLocation (MUST BE AT THE VERY BOTTOM)
router.get('/:idOrLocation', async (req, res, next) => {
  try {
    const param = req.params.idOrLocation;
    if (param === 'locations' || param === 'screens' || param === 'screen' || param === 'location') return next();

    const normalized = normalizeLocation(param);
    if (LOCATION_METADATA[normalized] || param.includes('_') || param.includes('-')) {
      const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
      const enriched = banners
        .map(b => enrichBanner(b, req))
        .filter(b => b.location === normalized && b.status === 'Active');

      return res.json({
        status: true,
        location: normalized,
        count: enriched.length,
        data: enriched,
        banners: enriched
      });
    }

    let banner = await Banner.findById(param).catch(() => null);
    if (!banner) {
      banner = await Banner.findOne({ bannerId: param });
    }
    if (!banner) {
      return res.status(404).json({ status: false, message: 'Banner not found' });
    }
    const enriched = enrichBanner(banner, req);
    res.json({ status: true, data: enriched, ...enriched });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
