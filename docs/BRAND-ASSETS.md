# ITP HRM branding source and deployment

The emblem displayed in HRM is the **original ITP brand mark** from the live
ITP Platform. It is not a newly invented illustration.

The two paths in `public/brand/itp-mark.svg` come unchanged from the
`#Logo` symbol of the platform's `assets/logo-CRktiCv8.svg` (paths
1 and 2 only). The official mark colors were verified against the
`assets/Logo-Cgy1c_jI.png` image:

- emblem background: `#F7F7F7`
- ITP lettering: `#0697E0`

The `HRM` word is live text, not a rasterized logo. This preserves readable
type in light/dark themes and permits localization without changing the emblem.

The same version-controlled SVG is used by the sidebar, login page and favicon.
The asset is included in the Vue build, rather than loaded from another
project's `/assets/` path. `%BASE_URL%` in `index.html` adapts the favicon
URL for both root/Vercel and the real `/hrm/` Apache subpath.

Do not modify the original platform's assets, favicon or Apache routes during
an HRM branding release. Deploy only the built HRM `dist`, retaining the
HRM-only HTTPS redirect and security headers from
`deploy/hrm-htaccess.example`. Run htdocs E2E against `/hrm/login`
before release.
