/**
 * Deep Linking Utility for Cognisphere PWA
 * Handles intelligent routing to installed native apps on Android and iOS
 * (Instagram, Email/Gmail, GitHub, YouTube) with seamless browser fallbacks.
 */

export const isAndroid = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
};

export const isIOS = () => {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

export const isMobile = () => isAndroid() || isIOS();

/**
 * Open native Mail app (Gmail, Apple Mail, Samsung Email, Outlook)
 * On Android, dispatches an ACTION_SENDTO intent to launch the email client directly.
 * On iOS and desktop, triggers window.location.href with mailto:
 */
export function openEmail({
  email = 'cognisphere.club@gmail.com',
  subject = 'Inquiry - Cognisphere AIML Club',
  body = ''
} = {}) {
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  const query = params.length ? `?${params.join('&')}` : '';
  const mailtoUrl = `mailto:${email}${query}`;

  if (isAndroid()) {
    // Official Android Intent for SENDTO action targeting email clients directly
    const sendToIntent = `intent:#Intent;action=android.intent.action.SENDTO;data=mailto:${email}${query};end`;
    try {
      window.location.href = sendToIntent;
    } catch {
      window.location.href = mailtoUrl;
    }
    return;
  }

  // iOS, macOS, Windows: Direct protocol invocation
  window.location.href = mailtoUrl;
}

/**
 * Open Instagram profile in the native Instagram app if installed,
 * falling back to browser if not installed or on desktop.
 */
export function openInstagram(username = 'cognisphereaiml') {
  const cleanUser = username.replace(/^@/, '').trim();
  const webUrl = `https://instagram.com/${cleanUser}`;

  if (isAndroid()) {
    // Android Chrome & PWA Intent: checks package com.instagram.android
    // If installed -> opens Instagram app directly to profile
    // If not installed -> automatically redirects to S.browser_fallback_url
    const intentUrl = `intent://instagram.com/_u/${cleanUser}#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
    window.location.href = intentUrl;
    return;
  }

  if (isIOS()) {
    const iosScheme = `instagram://user?username=${cleanUser}`;
    let hasBlurred = false;
    const onVisibilityChange = () => {
      if (document.hidden) hasBlurred = true;
    };
    const onPageHide = () => {
      hasBlurred = true;
    };

    document.addEventListener('visibilitychange', onVisibilityChange, { once: true });
    window.addEventListener('pagehide', onPageHide, { once: true });

    window.location.href = iosScheme;

    setTimeout(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      if (!hasBlurred && !document.hidden) {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      }
    }, 750);
    return;
  }

  // Desktop
  window.open(webUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Open Instagram direct link (e.g. ig.me direct message or reel)
 */
export function openInstagramLink(url = 'https://ig.me/m/cognisphereaiml') {
  if (isAndroid()) {
    const stripped = url.replace(/^https?:\/\//, '');
    const intentUrl = `intent://${stripped}#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=${encodeURIComponent(url)};end`;
    window.location.href = intentUrl;
    return;
  }

  if (isIOS()) {
    // Attempt Instagram app scheme or open link
    let hasBlurred = false;
    const onVisibilityChange = () => {
      if (document.hidden) hasBlurred = true;
    };
    document.addEventListener('visibilitychange', onVisibilityChange, { once: true });
    window.location.href = 'instagram://user?username=cognisphereaiml';

    setTimeout(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (!hasBlurred && !document.hidden) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }, 750);
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open GitHub organization or repository in the native GitHub app if installed
 */
export function openGitHub(orgOrRepo = 'Cognisphere-AIML-Club') {
  const cleanPath = orgOrRepo.replace(/^https?:\/\/github\.com\//, '').trim();
  const webUrl = `https://github.com/${cleanPath}`;

  if (isAndroid()) {
    // Android Chrome & PWA Intent: checks package com.github.android
    const intentUrl = `intent://github.com/${cleanPath}#Intent;package=com.github.android;scheme=https;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
    window.location.href = intentUrl;
    return;
  }

  if (isIOS()) {
    // On iOS, navigating directly to github.com without target="_blank" triggers Universal Links to GitHub app
    window.location.href = webUrl;
    return;
  }

  // Desktop
  window.open(webUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Open YouTube video in native YouTube app if installed
 */
export function openYouTubeVideo(videoId = 'ScMzIvxBSi4') {
  const webUrl = `https://www.youtube.com/watch?v=${videoId}`;

  if (isAndroid()) {
    // Android Chrome & PWA Intent: checks package com.google.android.youtube
    const intentUrl = `intent://www.youtube.com/watch?v=${videoId}#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
    window.location.href = intentUrl;
    return;
  }

  if (isIOS()) {
    const iosScheme = `vnd.youtube://www.youtube.com/watch?v=${videoId}`;
    let hasBlurred = false;
    const onVisibilityChange = () => {
      if (document.hidden) hasBlurred = true;
    };
    document.addEventListener('visibilitychange', onVisibilityChange, { once: true });
    window.location.href = iosScheme;

    setTimeout(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (!hasBlurred && !document.hidden) {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      }
    }, 750);
    return;
  }

  // Desktop
  window.open(webUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Open YouTube Channel or Shorts
 */
export function openYouTubeChannel(url = 'https://youtube.com') {
  if (isAndroid()) {
    const intentUrl = `intent://www.youtube.com#Intent;package=com.google.android.youtube;scheme=https;S.browser_fallback_url=${encodeURIComponent(url)};end`;
    window.location.href = intentUrl;
    return;
  }

  if (isIOS()) {
    window.location.href = url;
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

