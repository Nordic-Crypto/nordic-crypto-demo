/* NordicCrypto — trust blocks data. Edit ONLY this file. Empty list = that block stays hidden.
   Use real partners (contract signed + permission to use the logo) and real reviews (client agreed to publish). */
(function () {
  var MOCKUP = false;   // true = show SAMPLE data + SAMPLE badges + ribbon (design review only). false = production.

  var REAL = {
    /* { name: "Binance", url: "https://www.binance.com", logo: "logos/binance.svg" }
       logo = official file from the partner's brand kit (SVG/PNG, transparent). Without a logo the name is shown as text. */
    /* Compatibility, NOT partnership: crypto can be sent to/from these exchanges and wallets (any address on a supported network).
       Names only, no logos, no links, with a trademark disclaimer. To claim a real partnership later, set partnersKind to 'partners'
       and add logos from each company's official brand kit, but only with a signed agreement that allows it. */
    partnersKind: 'compatible',
    partners: [
      { name: 'Binance', logo: 'binance.png', h: 46 },
      { name: 'Bybit', logo: 'bybit.png', h: 34 },
      { name: 'BingX', logo: 'bingx.png', h: 34 },
      { name: 'Trust Wallet', logo: 'trust.png', h: 48 },
      { name: 'Exodus', logo: 'exodus.png', h: 44 }
    ],

    /* { text: "1-2 sentences", name: "Anna K.", location: "Berlin, DE", rating: 5 } */
    reviews: [],

    /* A real number you can back up, e.g. people on the waiting list. 0 = hidden. kind: 'waiting' | 'expected' */
    stat: { value: 0, kind: 'waiting' },

    /* Founder quote shown next to the waitlist form. name empty = no signature. */
    founder: { quote: '', name: '', role: '' },

    /* Waitlist form on/off */
    waitlist: false,

    /* Reviews written by real clients in their account and approved by you in Admin -> Reviews appear here automatically. */
    liveReviews: true
  };

  // --- MOCKUP SAMPLE DATA (not real clients / partners) ---
  var SAMPLE = {
    partnersKind: 'compatible',
    partners: [
      { name: 'Partner One', url: '#' }, { name: 'Partner Two', url: '#' }, { name: 'Partner Three', url: '#' },
      { name: 'Partner Four', url: '#' }, { name: 'Partner Five', url: '#' }, { name: 'Partner Six', url: '#' }
    ],
    reviews: [
      { text: "I've been using NordicCrypto for over two years and it's honestly changed how I travel. No hidden fees, instant currency exchange, and the app is so clean. I don't even carry a physical card anymore — Apple Pay works everywhere. Highly recommend.", name: 'Emily R.', location: 'London, UK', rating: 5 },
      { text: 'Opened my account with NordicCrypto in under 10 minutes. The virtual card was ready instantly and I used it the same day online. Transfers to my friends are instant and free. The analytics feature that tracks my spending is a nice bonus. Really impressed so far.', name: 'Daniel K.', location: 'Berlin, Germany', rating: 5 },
      { text: 'Best banking app I\'ve ever used. I send money to my family abroad every month with NordicCrypto and the exchange rate is way better than my old bank. Customer support helped me reverse a duplicate charge within a day. Five stars from me.', name: 'Sofia M.', location: 'Madrid, Spain', rating: 5 },
      { text: 'I use NordicCrypto mainly for travel and online shopping. The disposable virtual cards give me peace of mind when paying on unfamiliar websites. The design is beautiful and everything just works. No complaints at all.', name: 'James T.', location: 'Manchester, UK', rating: 5 },
      { text: "Switched to NordicCrypto for my freelance work and I'm not looking back. Invoicing, receiving payments in different currencies, and saving pots — all in one place. The app is fast, secure, and genuinely easy to use.", name: 'Anna P.', location: 'Warsaw, Poland', rating: 5 }
    ],
    stat: { value: 1234, kind: 'waiting' },
    founder: { quote: 'Sample founder quote. A bank account that understands crypto, and a crypto account that feels like a bank.', name: 'Sample Founder', role: 'Founder' },
    waitlist: true
  };
  // --- END MOCKUP SAMPLE DATA ---

  var D = MOCKUP ? SAMPLE : REAL;
  window.NC_TRUST = {
    liveReviews: !MOCKUP && D.liveReviews !== false, reviewsUrl: 'https://nordic-deposit-checker.otis-790.workers.dev?action=publicReviews', mockup: MOCKUP, partnersKind: D.partnersKind, partners: D.partners, reviews: D.reviews, stat: D.stat, founder: D.founder, waitlist: D.waitlist,
    endpoint: 'https://nordic-deposit-checker.otis-790.workers.dev?action=waitlistJoin'
  };
})();
