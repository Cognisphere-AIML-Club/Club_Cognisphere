/**
 * Deep Linking Utility for Cognisphere PWA
 * Generates direct native app intent and custom scheme URLs for Android & iOS
 * to open installed mobile apps (Instagram, Gmail/Mail, GitHub, YouTube)
 * with graceful browser fallbacks.
 */

export const isAndroid = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
};

export const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

export const isMobileDevice = () => isAndroid() || isIOS();

/**
 * Returns the best URL for Email composition based on device OS.
 * On Android, uses Gmail intent with automatic fallback to standard mailto.
 * On iOS and desktop, uses standard RFC mailto.
 */
export function getEmailHref(
  email = 'cognisphere.club@gmail.com',
  subject = 'Inquiry - Cognisphere AIML Club'
) {
  const encSubject = encodeURIComponent(subject);
  const mailtoUrl = `mailto:${email}?subject=${encSubject}`;

  if (isAndroid()) {
    // Android Intent: Directly targets Gmail app if installed,
    // falling back cleanly to system mailto if not installed.
    return `intent://#Intent;scheme=mailto;package=com.google.android.gm;S.android.intent.extra.EMAIL=${encodeURIComponent(email)};S.android.intent.extra.SUBJECT=${encSubject};S.browser_fallback_url=${encodeURIComponent(mailtoUrl)};end`;
  }

  return mailtoUrl;
}

/**
 * Returns the best URL to open the Instagram profile in the native app.
 * On Android: Chrome Intent targeting com.instagram.android with web fallback.
 * On iOS: instagram:// custom scheme.
 * On Desktop: standard https web URL.
 */
export function getInstagramHref(username = 'cognisphereaiml') {
  const clean = username.replace(/^@/, '').trim();
  const webUrl = `https://www.instagram.com/${clean}`;

  if (isAndroid()) {
    return `intent://instagram.com/_u/${clean}#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
  }

  if (isIOS()) {
    return `instagram://user?username=${clean}`;
  }

  return webUrl;
}

/**
 * Returns the best URL for Instagram DMs or shorts.
 */
export function getInstagramLinkHref(url = 'https://ig.me/m/cognisphereaiml', fallbackUser = 'cognisphereaiml') {
  const webUrl = url;
  if (isAndroid()) {
    return `intent://instagram.com/_u/${fallbackUser}#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
  }
  if (isIOS()) {
    return `instagram://user?username=${fallbackUser}`;
  }
  return webUrl;
}

/**
 * Returns the best URL to open GitHub in native app if installed.
 */
export function getGitHubHref(orgOrRepo = 'Cognisphere-AIML-Club') {
  const clean = orgOrRepo.replace(/^https?:\/\/github\.com\//, '').trim();
  const webUrl = `https://github.com/${clean}`;

  if (isAndroid()) {
    return `intent://github.com/${clean}#Intent;package=com.github.android;scheme=https;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
  }

  return webUrl;
}

/**
 * Returns the best URL to open a YouTube video in the native app.
 */
export function getYouTubeVideoHref(videoId = 'ScMzIvxBSi4') {
  const webUrl = `https://www.youtube.com/watch?v=${videoId}`;

  if (isAndroid()) {
    return `intent://www.youtube.com/watch?v=${videoId}#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
  }

  if (isIOS()) {
    return `vnd.youtube://www.youtube.com/watch?v=${videoId}`;
  }

  return webUrl;
}
