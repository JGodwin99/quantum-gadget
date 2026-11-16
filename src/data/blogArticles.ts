import type { BlogArticle } from '../types/store';

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'art-gan-charging',
    slug: 'why-gan-chargers-replace-brick-adapters',
    title: 'How 140W GaN Chargers Replace Every Brick in Your Travel Bag',
    category: 'Power & Desk Setup',
    author: 'Elena Rostova',
    published_at: 'November 8, 2026',
    read_time: '4 min read',
    excerpt:
      'Gallium nitride semiconductors run cooler and shrink high-wattage USB-C PD 3.1 power bricks down to pocketable dimensions.',
    image_key: 'cat_power_solutions',
    body: [
      'Traditional silicon laptop chargers waste substantial energy as heat, forcing manufacturers to build bulky plastic enclosures. Gallium nitride (GaN) switches faster at higher voltages, cutting thermal losses dramatically.',
      'With a single dual-port 140W USB-C Power Delivery 3.1 adapter, you can fast-charge a 16-inch workstation laptop alongside a tablet or magnetic power bank simultaneously.',
      'When shopping for a GaN charger, verify intelligent power allocation and active thermal protection so sustained full-wattage loads remain cool on a desk or in hotel outlets.',
    ],
  },
  {
    id: 'art-planar-audio',
    slug: 'planar-vs-dynamic-drivers-wireless-headphones',
    title: 'Planar Magnetic vs. Dynamic Drivers in Modern Wireless Headphones',
    category: 'Audio Engineering',
    author: 'Devon Park',
    published_at: 'October 29, 2026',
    read_time: '5 min read',
    excerpt:
      'Understanding transient response, bass extension, and active noise cancellation tuning when choosing daily studio headphones.',
    image_key: 'cat_audio_devices',
    body: [
      'Dynamic drivers have powered portable audio for decades using a voice coil attached to a conical diaphragm. They deliver punchy low-end energy at modest power draw.',
      'Planar magnetic drivers suspend an ultra-thin film between balanced magnet arrays, moving the entire diaphragm uniformly. The result is lower distortion across complex mid-range vocals and acoustic instruments.',
      'Paired with modern Bluetooth 5.4 lossless codecs and hybrid feedforward/feedback microphones, contemporary wireless headphones bridge commuting isolation and studio clarity.',
    ],
  },
  {
    id: 'art-nvme-creator-workflow',
    slug: 'portable-nvme-storage-for-4k-drone-creators',
    title: 'Building a Reliable 4K Field Backup Workflow with Portable NVMe SSDs',
    category: 'Creator Hardware',
    author: 'Tariq Haddad',
    published_at: 'October 14, 2026',
    read_time: '4 min read',
    excerpt:
      'Keep aerial 4K60 footage safe on location using fin-cooled USB-C 20Gbps solid-state drives and smart field power banks.',
    image_key: 'prod_portable_ssd',
    body: [
      'Shooting 10-bit 4K60 HDR drone footage fills high-speed microSD cards quickly. Offloading clips directly to an IP65-rated NVMe SSD before packing up eliminates single-card risk.',
      'Look for solid aluminum enclosures that act as passive heatsinks during multi-hundred-gigabyte transfers so write speeds do not throttle midway through a backup.',
      'Always keep one compact braided USB-C 20Gbps cable dedicated to your storage drive so transfer speeds stay locked at full bandwidth.',
    ],
  },
];

export const BRAND_PROFILES = [
  {
    name: 'SonicLab',
    specialty: 'Acoustic Engineering & ANC Audio',
    description:
      'Precision-calibrated headphones, dual-driver wireless earbuds, and room-adaptive smart speakers built with anodized aluminum and acoustic textiles.',
  },
  {
    name: 'Veloce',
    specialty: 'Titanium Wearables & Sports Telemetry',
    description:
      'Sapphire-glass GPS smartwatches engineered with multi-band positioning and multi-day battery life.',
  },
  {
    name: 'VoltCore',
    specialty: 'GaN Power Delivery & Qi2 MagPacks',
    description:
      'High-efficiency 140W GaN charging stations, braided 240W USB-C cables, and magnetic wireless battery packs.',
  },
  {
    name: 'AeroSight',
    specialty: 'Sub-250g 4K Aerial Camera Systems',
    description:
      'Foldable 3-axis gimbal drones built for crisp stabilized 4K60 capture on the move.',
  },
  {
    name: 'KeyCraft',
    specialty: 'CNC Mechanical Input Devices',
    description:
      'Gasket-mounted anodized aluminum wireless keyboards designed for focused work and minimal desk setups.',
  },
  {
    name: 'VaultDrive',
    specialty: 'Rugged High-Speed Portable Storage',
    description:
      'Fin-cooled NVMe USB-C SSDs rated for sustained creator workflows in the studio and field.',
  },
];
