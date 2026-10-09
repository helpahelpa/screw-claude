/* Social share link builders. Pure: parameters are encoded, nothing is opened. */

                                              

                                                                   

export const SOCIAL_TARGETS                 = ['x', 'facebook', 'telegram', 'weibo'];

                            
                       
                                                               
              
 

function withParams(base        , params                        )         {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `${base}?${search.toString()}`;
}

/** Build one destination link. Posting and signing in happen on the service. */
export function buildSocialLink(target              , summary              )         {
  switch (target) {
    case 'x':
      return withParams('https://twitter.com/intent/tweet', { text: summary.body, url: summary.url });
    case 'facebook':
      return withParams('https://www.facebook.com/sharer/sharer.php', {
        u: summary.url,
        quote: summary.body,
      });
    case 'telegram':
      return withParams('https://t.me/share/url', { url: summary.url, text: summary.body });
    case 'weibo':
      return withParams('https://service.weibo.com/share/share.php', {
        url: summary.url,
        title: summary.body,
      });
    default:
      throw new Error(`Unknown share target: ${String(target)}`);
  }
}

export function buildSocialLinks(summary              )              {
  return SOCIAL_TARGETS.map(target => ({ target, url: buildSocialLink(target, summary) }));
}
